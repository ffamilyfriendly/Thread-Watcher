import { Mistral } from '@mistralai/mistralai';
import GuildService from './GuildService';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { AgentsCompletionRequest, UsageInfo } from '@mistralai/mistralai/models/components';
import { config } from '@providers/config';
import { map_err } from '#/utilities/error';
import { IntermediaryMessage, TicketSummarySegment, ZAiRegexResponse } from '@watcher/shared';
import { logger } from '@providers/logger';
import EntitlementService from './EntitlementService';
import { IssueNarrower } from './AIWrappers/IssueNarrower';
import { ValueContainer } from '#/modules/ticket/_pipeline/ValueContainter';
import { database } from '@providers/database';
import z from 'zod';
import { safe_json } from '#/utilities/parsing';

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
  'mistral-small-latest': {
    model_name: 'mistral-small-latest',
    eur_per_1m_token_output: 0.51,
    eur_per_1m_tokens_input: 0.13,
  },
};

const ZSummaryResult = z.object({
  summary: z.string(),
  title: z.string(),
});

export type AiModelName = keyof typeof AiModels;

export default class AiService {
  private logger = logger.getSubLogger({ name: 'AiService' });

  constructor(
    public client: Mistral,
    private guild_service: GuildService,
    private entitlement_service: EntitlementService,
  ) {}

  static compute_cost_micro_eurocents(
    model_name: AiModelName,
    input_tokens: number,
    output_tokens: number,
  ): number {
    const model = AiModels[model_name];
    const input_cost = (input_tokens * model.eur_per_1m_tokens_input) / 10_000;
    const output_cost = (output_tokens * model.eur_per_1m_token_output) / 10_000;
    return Math.ceil((input_cost + output_cost) * 10_000);
  }

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

    const quota_total =
      guild_obj.value.persistent_budget_eurocents + guild_obj.value.monthly_budget_eurocents;
    const last_granted_monthly_tokens = guild_obj.value.monthly_budget_last_granted;

    return ok({
      total: quota_total,
      persistent: guild_obj.value.persistent_budget_eurocents,
      monthly: guild_obj.value.monthly_budget_eurocents,
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
  public async preflight(
    guild_id: string,
    model_name: AiModelName,
    estimated_input_tokens: number,
    estimated_output_tokens: number,
  ) {
    const guild_quota = await this.check_quota_for_guild(guild_id);
    if (guild_quota.isErr()) return err(guild_quota.error);

    let remaining = guild_quota.value.total;

    if (guild_quota.value.should_be_granted_tokens) {
      const granted = await this.grant_monthly_tokens(guild_id);
      if (granted.isErr()) return err(granted.error);
      remaining += granted.value;
    }

    const estimated_cose = AiService.compute_cost_micro_eurocents(
      model_name,
      estimated_input_tokens,
      estimated_output_tokens,
    );
    return ok(remaining >= estimated_cose);
  }

  async deduct_quota(
    guild_id: string,
    model_name: AiModelName,
    input_tokens: number,
    output_tokens: number,
  ) {
    const cost_of_operation = AiService.compute_cost_micro_eurocents(
      model_name,
      input_tokens,
      output_tokens,
    );
    return this.guild_service.deduct_ai_tokens(guild_id, cost_of_operation);
  }

  async get_regex(prompt: string, guild_id: string) {
    const allowed_run_function = (
      await this.preflight(guild_id, 'mistral-tiny-latest', 300, 200)
    ).match(
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

    const { promptTokens, completionTokens } = ai_res.value.usage;
    if (!promptTokens || !completionTokens) return err(new Error('could not get usage tokens'));

    this.deduct_quota(guild_id, 'mistral-tiny-latest', promptTokens, completionTokens).then((r) => {
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

  get_summaries(ticket_id: string) {
    return database.get_summaries(ticket_id);
  }

  async do_simple_summary(ticket_id: string, guild_id: string, messages: IntermediaryMessage[]) {
    const allowed_run_function = (
      await this.preflight(guild_id, 'mistral-small-latest', 300, 200)
    ).match(
      (v) => v,
      (error) => {
        this.logger.error(`Could not run preflight checks for 'do_simple_summary'`, error);
        return false;
      },
    );
    if (!allowed_run_function) return err(new Error('Preflight checks failed'));

    const previous_summaries = await this.get_summaries(ticket_id);
    if (previous_summaries.isErr()) return err(previous_summaries.error);

    const prev_summaries_str = previous_summaries.value.map(
      (s) =>
        `<summary start_message_id="${s.start_message_id}" end_message_id="${s.end_message_id}" involved_users="${s.involved_users.join(',')}" created_at="${s.created_at.toISOString()}" >${s.summary_text}</summary>`,
    );

    const prev_messages_str = messages.map(
      (msg) => `
      <message
        author_id="${msg.author_id}"
        created_at="${msg.created_at}"
        message_id="${msg.message_id}"
        ${msg.reply_to_message_id ? `reply_to="${msg.reply_to_message_id}"` : ''}
      >

      ${msg.text_content} 
      ${msg.embeds.map((embed) => `<embed>${JSON.stringify(embed)}</embed>`)}
      </message>`,
    );

    const req: AgentsCompletionRequest = {
      agentId: config.ai.agents.ticket_summarizer,
      messages: [
        {
          role: 'system',
          content:
            'You are a summarization agent. You ONLY respond with valid JSON. Never use XML or markdown.',
        },
        {
          role: 'user',
          content: `<PREVIOUS_SUMMARIES>${prev_summaries_str.join('\n')}</PREVIOUS_SUMMARIES>\n<MESSAGES>${prev_messages_str.join('\n')}</MESSAGES>`,
        },
      ],
    };

    const got_response = await this.wrap_promise(
      this.client.agents.complete(req),
      'mistral-small-latest',
      guild_id,
    );
    if (got_response.isErr()) return err(got_response.error);

    const answer = got_response.value.choices.shift();
    if (!answer) {
      return err(new Error('AI agent returned no response'));
    }
    if (typeof answer.message.content !== 'string')
      return err(new Error('AI answer had wrong format'));

    const json_parsed = safe_json(answer.message.content);
    if (json_parsed.isErr()) return err(json_parsed.error);
    const parsed_res = ZSummaryResult.safeParse(json_parsed.value);
    if (!parsed_res.success) return err(parsed_res.error);

    const involved_users = new Set(messages.map((msg) => msg.author_id)).values().toArray();

    return database.insert_summary({
      ticket_id,
      involved_users,
      summary_text: parsed_res.data.summary,
      summary_title: parsed_res.data.title,
      start_message_id: messages[0].message_id,
      end_message_id: messages[messages.length - 1].message_id,
      is_master_summary: false,
    });
  }

  async do_final_summary(ticket_id: string, guild_id: string, messages: IntermediaryMessage[]) {
    const allowed_run_function = (
      await this.preflight(guild_id, 'mistral-small-latest', 300, 200)
    ).match(
      (v) => v,
      (error) => {
        this.logger.error(`Could not run preflight checks for 'do_simple_summary'`, error);
        return false;
      },
    );
    if (!allowed_run_function) return err(new Error('Preflight checks failed'));

    const previous_summaries = await this.get_summaries(ticket_id);
    if (previous_summaries.isErr()) return err(previous_summaries.error);

    const prev_summaries_str = previous_summaries.value.map(
      (s) =>
        `<summary start_message_id="${s.start_message_id}" end_message_id="${s.end_message_id}" involved_users="${s.involved_users.join(',')}" created_at="${s.created_at.toISOString()}" >${s.summary_text}</summary>`,
    );

    const prev_messages_str = messages.map(
      (msg) => `
      <message
        author_id="${msg.author_id}"
        created_at="${msg.created_at}"
        message_id="${msg.message_id}"
        ${msg.reply_to_message_id ? `reply_to="${msg.reply_to_message_id}"` : ''}
      >

      ${msg.text_content} 
      ${msg.embeds.map((embed) => `<embed>${JSON.stringify(embed)}</embed>`)}
      </message>`,
    );

    const req: AgentsCompletionRequest = {
      agentId: config.ai.agents.ticket_summarizer,
      messages: [
        {
          role: 'system',
          content:
            'You are a summarization agent. You ONLY respond with valid JSON. Never use XML or markdown.\nTHIS IS THE FINAL SUMMARY OF THIS THREAD. SUMMARIZE THE ENTIRE THREAD',
        },
        {
          role: 'user',
          content: `<PREVIOUS_SUMMARIES>${prev_summaries_str.join('\n')}</PREVIOUS_SUMMARIES>\n<MESSAGES>${prev_messages_str.join('\n')}</MESSAGES>`,
        },
      ],
    };

    const got_response = await this.wrap_promise(
      this.client.agents.complete(req),
      'mistral-small-latest',
      guild_id,
    );
    if (got_response.isErr()) return err(got_response.error);

    const answer = got_response.value.choices.shift();
    if (!answer) {
      return err(new Error('AI agent returned no response'));
    }
    if (typeof answer.message.content !== 'string')
      return err(new Error('AI answer had wrong format'));

    const json_parsed = safe_json(answer.message.content);
    if (json_parsed.isErr()) return err(json_parsed.error);
    const parsed_res = ZSummaryResult.safeParse(json_parsed.value);
    if (!parsed_res.success) return err(parsed_res.error);

    const involved_users = new Set(messages.map((msg) => msg.author_id)).values().toArray();

    return database.insert_summary({
      ticket_id,
      involved_users,
      summary_text: parsed_res.data.summary,
      summary_title: parsed_res.data.title,
      start_message_id: messages[0].message_id,
      end_message_id: messages[messages.length - 1].message_id,
      is_master_summary: true,
    });
  }

  async wrap_promise<T extends { usage: UsageInfo }>(
    t: Promise<T>,
    model_name: AiModelName,
    guild_id: string,
  ): Promise<Result<T, Error>> {
    const result_async = await ResultAsync.fromPromise(t, map_err);

    if (result_async.isOk()) {
      const { promptTokens, completionTokens } = result_async.value.usage;
      if (!promptTokens || !completionTokens) return err(new Error('could not get usage tokens'));
      this.deduct_quota(guild_id, model_name, promptTokens, completionTokens).then((r) => {
        if (r.isErr()) this.logger.warn(`Could not deduct AI quota for '${guild_id}'`, r.error);
      });
    }

    return result_async;
  }

  get_issue_narrower(guild_id: string, persona: string, rules: string, variables: ValueContainer) {
    return new IssueNarrower(this, persona, rules, variables, guild_id);
  }
}
