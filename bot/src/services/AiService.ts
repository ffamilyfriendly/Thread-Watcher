import { Mistral } from '@mistralai/mistralai';
import GuildService from './GuildService';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import {
  AgentsCompletionRequest,
  ConversationRequest,
  UsageInfo,
} from '@mistralai/mistralai/models/components';
import { config } from '@providers/config';
import { map_err } from 'utilities/error';
import { ZAiRegexResponse } from '@watcher/shared';
import { logger } from '@providers/logger';
import EntitlementService from './EntitlementService';
import { client } from '@providers/client';
import { IssueNarrower } from './AIWrappers/IssueNarrower';
import { ValueContainer } from 'modules/ticket/_pipeline/ValueContainter';

export interface AIModel {
  model_name: string;
  eur_per_1m_tokens_input: number;
  eur_per_1m_token_output: number;
}

export const AiModels = {
  'mistral-tiny-latest': {
    model_name: 'mistral-tiny_latest',
    eur_per_1m_token_output: 0.13,
    eur_per_1m_tokens_input: 0.13,
  },
  'mistral-medium-latest': {
    model_name: 'mistral-medium-latest',
    eur_per_1m_token_output: 1.7,
    eur_per_1m_tokens_input: 0.34,
  },
};

export type AiModelName = keyof typeof AiModels;

export default class AiService {
  private logger = logger.getSubLogger({ name: 'AiService' });

  constructor(
    public client: Mistral,
    private guild_service: GuildService,
    private entitlement_service: EntitlementService,
  ) {}

  private should_be_given_tokens(d: Date) {
    const avg_month = 1000 * 60 * 60 * 24 * 30;
    const now = new Date();
    const delta_time = now.getTime() - d.getTime();

    return delta_time > avg_month;
  }

  static token_to_millicent(model_name: AiModelName, tokens: number) {
    const model = AiModels[model_name];
    return (tokens * model.eur_per_1m_token_output) / 10;
  }

  async check_quota_for_guild(guild_id: string) {
    const guild_obj = await this.guild_service.get_guild_info(guild_id);
    if (guild_obj.isErr()) return err(guild_obj.error);
    if (!guild_obj.value) {
      const grant_monthly = await this.grant_monthly_tokens(guild_id);
      if (grant_monthly.isErr()) return err(grant_monthly.error);

      const persistent = config.ai.initial_free_tokens;
      const new_monthly = grant_monthly.value;
      const total = persistent + new_monthly;

      return ok({
        total,
        persistent,
        monthly: new_monthly,
        last_granted_monthly_tokens: new Date(),
        should_be_granted_tokens: false,
      });
    }

    const quota_total = guild_obj.value.persistent_tokens + guild_obj.value.monthly_tokens;
    const last_granted_monthly_tokens = guild_obj.value.monthly_tokens_last_granted;

    return ok({
      total: quota_total,
      persistent: guild_obj.value.persistent_tokens,
      monthly: guild_obj.value.monthly_tokens,
      last_granted_monthly_tokens,
      should_be_granted_tokens: last_granted_monthly_tokens
        ? this.should_be_given_tokens(last_granted_monthly_tokens)
        : true,
    });
  }

  private async grant_monthly_tokens(guild_id: string) {
    const premium_res = await this.entitlement_service.has_premium(guild_id);
    if (premium_res.isErr()) return err(premium_res.error);
    if (!premium_res.value) return ok(0);

    return (
      await this.guild_service.set_monthly_tokens(guild_id, config.ai.monthly_tokens_premium)
    ).andThen((_v) => {
      return ok(config.ai.monthly_tokens_premium);
    });
  }

  /**
   * @description Makes sure the guild has been given monthly credits &
   * @param guild_id
   * @param required_tokens
   */
  private async preflight(guild_id: string, model_name: AiModelName, required_tokens: number) {
    let token_count = 0;
    const guild_quota_info = await this.check_quota_for_guild(guild_id);
    if (guild_quota_info.isErr()) return err(guild_quota_info.error);
    if (guild_quota_info.value.should_be_granted_tokens) {
      const tokens_given = await this.grant_monthly_tokens(guild_id);
      if (tokens_given.isErr()) return err(tokens_given.error);

      token_count = guild_quota_info.value.persistent + tokens_given.value;
    } else token_count = guild_quota_info.value.total;

    return ok(token_count > AiService.token_to_millicent(model_name, required_tokens));
  }

  async deduct_quota(guild_id: string, model_name: AiModelName, tokens_used: number) {
    const cost_of_operation = AiService.token_to_millicent(model_name, tokens_used);
    return this.guild_service.deduct_ai_tokens(guild_id, cost_of_operation);
  }

  async get_regex(prompt: string, guild_id: string) {
    const allowed_run_function = (await this.preflight(guild_id, 'mistral-tiny-latest', 500)).match(
      (v) => v,
      (error) => {
        this.logger.error(`Could not run preflight checks for 'get_regex'`, error);
        return false;
      },
    );
    if (!allowed_run_function) return err(new Error('Preflight checks failed'));

    const req: AgentsCompletionRequest = {
      agentId: config.ai.agents.regex_agent,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    let ai_res = await ResultAsync.fromPromise(this.client.agents.complete(req), map_err);
    if (ai_res.isErr()) return err(ai_res);
    if (!ai_res.value.usage.totalTokens) return err(new Error('could not get tokens used!'));

    this.deduct_quota(guild_id, 'mistral-tiny-latest', ai_res.value.usage.totalTokens).then((r) => {
      if (r.isErr()) this.logger.error(`Could not deduct points for '${guild_id}'`, r.error);
    });

    const answer = ai_res.value.choices.shift();
    if (!answer) {
      return err(new Error('AI agent returned no response'));
    }
    if (typeof answer.message.content !== 'string')
      return err(new Error('AI answer had wrong format'));

    const parsed = ZAiRegexResponse.safeParse(JSON.parse(answer.message.content));
    if (parsed.success) return ok(parsed.data);
    else return err(parsed.error);
  }

  async wrap_promise<T extends { usage: UsageInfo }>(
    t: Promise<T>,
    model_name: AiModelName,
    guild_id: string,
  ): Promise<Result<T, Error>> {
    const result_async = await ResultAsync.fromPromise(t, map_err);

    if (result_async.isOk()) {
      if (!result_async.value.usage.totalTokens) {
        this.logger.warn(`Could not deduct AI quota for '${guild_id}' as 'totalTokens' was null`);
      } else {
        this.deduct_quota(guild_id, model_name, result_async.value.usage.totalTokens).then((r) => {
          if (r.isErr()) {
            this.logger.warn(`Could not deduct AI quota for '${guild_id}'`, r.error);
          }
        });
      }
    }

    return result_async;
  }

  get_issue_narrower(guild_id: string, persona: string, rules: string, variables: ValueContainer) {
    return new IssueNarrower(this, persona, rules, variables, guild_id);
  }
}
