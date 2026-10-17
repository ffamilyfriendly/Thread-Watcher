import {
  ConversationAppendRequest,
  ConversationRequest,
  ConversationResponse,
  FunctionResultEntry,
  MessageOutputEntry,
} from '@mistralai/mistralai/models/components';
import AiService, { AiModelName } from '../AiService';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err, mapped_err } from '#/utilities/error';
import { ToolPackage, TOOLS } from '../tools';
import { AgentsApiV1ConversationsAppendRequest } from '@mistralai/mistralai/models/operations';
import { AiAgent } from '../agents/def';

export default class ConversationalAi {
  private conversation_id?: string;
  private _TOOLS = TOOLS;
  private is_closed = false;

  constructor(
    private ai_service: AiService,
    private guild_id: string,
    private model_name?: AiModelName,
  ) {}

  get is_active() {
    return !!this.conversation_id;
  }

  set tools(tools: Record<string, ToolPackage<any>>) {
    this._TOOLS = tools;
  }

  add_tool(tool: ToolPackage, tool_name?: string) {
    const name = tool_name ?? tool.tool.function.name;
    this._TOOLS[name] = tool;
  }

  add_tools(tools: ToolPackage<any>[]) {
    for (const tool of tools) this._TOOLS[tool.tool.function.name] = tool;
  }

  private async handle_response(
    response: ConversationResponse,
  ): Promise<Result<MessageOutputEntry, Error>> {
    const output = response.outputs[response.outputs.length - 1];

    if (output.type === 'function.call') {
      const tool = this._TOOLS[output.name];

      if (!tool) return err(new Error(`Tool '${output.name}' requested by model was not found!`));

      const args = output.arguments as unknown as string;

      const parsed_args = Result.fromThrowable(JSON.parse)(args);
      if (parsed_args.isErr()) return mapped_err(parsed_args.error);

      const func_res = (await tool.run(parsed_args.value, { guild_id: this.guild_id })).andThen(
        (t) => Result.fromThrowable(JSON.stringify)(t),
      );
      if (func_res.isErr()) {
        return mapped_err(func_res.error);
      }

      const user_func_call_entry: FunctionResultEntry = {
        toolCallId: output.toolCallId,
        result: func_res.value,
      };

      return this.__append_conversation({
        conversationId: this.conversation_id!,
        conversationAppendRequest: {
          inputs: [user_func_call_entry],
        },
      });
    } else if (output.type === 'message.output') {
      return ok(output);
    } else return err(new Error('Unsupported'));
  }

  public async __append_conversation(req: AgentsApiV1ConversationsAppendRequest) {
    if (!this.model_name) return err(new Error('No model_name provided!'));
    if (this.is_closed) return err(new Error('This Conversation is closed.'));
    const resp = await this.ai_service.wrap_promise(
      this.ai_service.client.beta.conversations.append(req),
      this.model_name,
      this.guild_id,
    );
    if (resp.isErr()) return err(resp.error);
    return this.handle_response(resp.value);
  }

  followup(data: ConversationAppendRequest) {
    if (!this.conversation_id) return err(new Error('no conversation_id'));
    return this.__append_conversation({
      conversationId: this.conversation_id,
      conversationAppendRequest: data,
    });
  }

  public async open(req: ConversationRequest, agent?: AiAgent) {
    let init: ConversationRequest = structuredClone(req);

    if (agent) {
      init.model = agent.model_name;
      init.instructions = Array.isArray(agent.system_prompt)
        ? agent.system_prompt.join('\n')
        : agent.system_prompt;
      this.model_name = agent.model_name;

      init.completionArgs = {
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
        topP: agent.top_p,
        responseFormat: agent.response_format,
      };
    }

    if (!init.tools) init.tools = Object.values(this._TOOLS).map((tool) => tool.tool);

    if (!this.model_name) return err(new Error('No model_name provided!'));

    const preflight = await this.ai_service.preflight(this.guild_id, this.model_name, 1000, 600);
    if (preflight.isErr()) return err(preflight.error);
    if (!preflight.value) return err(new Error('Preflight checks failed'));

    const res = await this.ai_service.wrap_promise(
      this.ai_service.client.beta.conversations.start(init),
      this.model_name,
      this.guild_id,
    );
    if (res.isErr()) return err(res.error);
    this.conversation_id = res.value.conversationId;

    return this.handle_response(res.value);
  }

  async delete_conversation() {
    if (!this.conversation_id) return err("this instance has no 'conversation_id'. Cannot delete");
    const promise = this.ai_service.client.beta.conversations.delete({
      conversationId: this.conversation_id,
    });
    this.is_closed = true;
    return ResultAsync.fromPromise(promise, map_err);
  }

  public async [Symbol.asyncDispose]() {
    if (this.is_active) {
      await this.delete_conversation();
    }
  }
}
