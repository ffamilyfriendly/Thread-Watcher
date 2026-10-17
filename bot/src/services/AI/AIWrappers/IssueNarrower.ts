import {
  ConversationRequest,
  MessageOutputContentChunks,
  MessageOutputEntry,
} from '@mistralai/mistralai/models/components';
import { config } from '@providers/config';
import { ValueContainer } from '#/modules/ticket/_pipeline/ValueContainter';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import AiService from '#/services/AI/AiService';
import { safe_json } from '#/utilities/parsing';
import z from 'zod';
import { search_tool } from '../tools';
import ConversationalAi from './Conversational';
import issue_narrower_agent from '../agents/IssueNarrower';

const ZNarrowAnswer = z
  .object({
    is_clarified: z.boolean(),
    clarification_query: z.string().nullish(),
    internal_summary: z.string(),
    missing_data_points: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      if (!data.is_clarified && !data.clarification_query) {
        return false;
      }
      return true;
    },
    {
      error: 'clarification_query is required when is_clarified is false',
    },
  );

export type NarrowAnswer = z.output<typeof ZNarrowAnswer>;

export class IssueNarrower {
  private convo: ConversationalAi;
  constructor(
    private service: AiService,
    private persona: string,
    private rules: string,
    private variables: ValueContainer,
    private guild_id: string,
  ) {
    this.convo = new ConversationalAi(service, guild_id);
  }

  private async get_tool_list() {
    // const chunk_res = await lib_service.get_chunk_count(this.guild_id);
    // if (chunk_res.isErr()) return err(chunk_res.error);
    //return ok(chunk_res.value > 0 ? [search_tool.tool] : []);
    return ok([search_tool.tool]);
  }

  async start_conversation() {
    const system_prompt = `
    <persona>
    ${this.persona}
    </persona>
    <rules>
    ${this.rules}
    </rules>
    <variables>
    ${JSON.stringify(this.variables.all())}
    </variables>
    `;

    const tools = (await this.get_tool_list()).unwrapOr([]);

    const res = await this.convo.open(
      {
        inputs: [
          {
            role: 'user',
            content: system_prompt,
          },
        ],
        tools,
      },
      issue_narrower_agent,
    );
    if (res.isErr()) return err(res.error);

    return ok(res.value);
  }

  async narrow(input?: string) {
    const preflight = await this.service.preflight(
      this.guild_id,
      'mistral-medium-latest',
      500,
      500,
    );

    if (preflight.isErr()) return err(preflight.error);
    if (!preflight.value) return err(new Error('you do not have enough tokens!'));
    if (this.convo.is_active && !input)
      return err(new Error(`'conversation_id' was set but no input passed.`));

    let answer: Result<MessageOutputEntry, Error>;

    if (this.convo.is_active) answer = await this.convo.followup({ inputs: input! });
    else answer = await this.start_conversation();
    if (answer.isErr()) return err(answer.error);

    const answer_text = answer.value.content;

    if (typeof answer_text !== 'string')
      return err(
        new Error(`AI answer was of type '${typeof answer.value}' when we expected 'string'`),
      );

    const parsed = safe_json(answer_text);
    if (parsed.isErr()) return err(parsed.error);

    const formatted = ZNarrowAnswer.safeParse(parsed.value);
    if (!formatted.success) return err(formatted.error);

    if (formatted.data.is_clarified) {
      await this.convo.delete_conversation();
    }

    return ok(formatted.data);
  }
}
