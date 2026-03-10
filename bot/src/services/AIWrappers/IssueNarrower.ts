import {
  ConversationAppendRequest,
  ConversationRequest,
  MessageOutputContentChunks,
} from '@mistralai/mistralai/models/components';
import { AgentsApiV1ConversationsAppendRequest } from '@mistralai/mistralai/models/operations';
import { config } from '@providers/config';
import { ValueContainer } from 'modules/ticket/_pipeline/DefaultModule';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import AiService from 'services/AiService';
import { map_err } from 'utilities/error';
import z from 'zod';

const ZNarrowAnswer = z
  .object({
    is_clarified: z.boolean(),
    clarification_query: z.string().optional(),
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
  private conversation_id?: string;
  constructor(
    private service: AiService,
    private persona: string,
    private rules: string,
    private variables: ValueContainer,
    private guild_id: string,
  ) {}

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

    const req: ConversationRequest = {
      agentId: config.ai.agents.issue_narrower,
      inputs: [
        {
          role: 'user',
          content: system_prompt,
        },
      ],
    };

    const res = await this.service.wrap_promise(
      this.service.client.beta.conversations.start(req),
      'mistral-medium-latest',
      this.guild_id,
    );
    if (res.isErr()) return err(res.error);

    const response = res.value.outputs.at(0);
    if (!response) return err(new Error('AI returned no response!'));
    if (response.type !== 'message.output')
      return err(
        new Error(`AI response was wrong type. Expected 'message.output' got '${response.type}'`),
      );

    this.conversation_id = res.value.conversationId;

    return ok(response.content);
  }

  async continue_conversation(followup: string) {
    if (!this.conversation_id)
      return err(new Error("tried to continue conversation with no 'conversation_id' assigned"));
    const req: AgentsApiV1ConversationsAppendRequest = {
      conversationId: this.conversation_id,
      conversationAppendRequest: {
        inputs: [
          {
            role: 'user',
            content: `<followup>${followup}</followup>`,
          },
        ],
      },
    };

    const res = await this.service.wrap_promise(
      this.service.client.beta.conversations.append(req),
      'mistral-medium-latest',
      this.guild_id,
    );
    if (res.isErr()) return err(res.error);
    const response = res.value.outputs.at(0);
    if (!response) return err(new Error('AI returned no response!'));
    if (response.type !== 'message.output')
      return err(
        new Error(`AI response was wrong type. Expected 'message.output' got '${response.type}'`),
      );

    return ok(response.content);
  }

  async narrow(input?: string) {
    let answer: Result<string | MessageOutputContentChunks[], Error>;
    if (this.conversation_id && !input)
      return err(new Error(`'conversation_id' was set but no input passed.`));

    if (this.conversation_id) answer = await this.continue_conversation(input!);
    else answer = await this.start_conversation();
    if (answer.isErr()) return err(answer.error);
    if (typeof answer.value !== 'string')
      return err(
        new Error(`AI answer was of type '${typeof answer.value}' when we expected 'string'`),
      );

    const formatted = ZNarrowAnswer.safeParse(JSON.parse(answer.value));
    if (!formatted.success) return err(formatted.error);

    return ok(formatted.data);
  }

  async delete_conversation() {
    if (!this.conversation_id) return err("this instance has no 'conversation_id'. Cannot delete");
    const promise = this.service.client.beta.conversations.delete({
      conversationId: this.conversation_id,
    });
    return ResultAsync.fromPromise(promise, map_err);
  }
}
