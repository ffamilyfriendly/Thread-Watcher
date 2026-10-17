import { ai_service } from '@providers/services/ai_service';
import { lib_service } from '@providers/services/library_service';
import { err, ok, Result } from 'neverthrow';

export interface ToolProperty {
  type: 'string' | 'number';
  description: string;
}

export interface ToolParameters<
  TProps extends Record<string, ToolProperty> = Record<string, ToolProperty>,
> {
  type: 'object';
  properties: TProps;
  required: (keyof TProps)[];
}

export interface Tool<TProps extends Record<string, ToolProperty> = Record<string, ToolProperty>> {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters<TProps>;
  };
}

type InferToolArguments<TProps extends Record<string, ToolProperty>> = {
  [K in keyof TProps]: TProps[K]['type'] extends 'number' ? number : string;
};

interface Axioms {
  guild_id: string;
}

export interface ToolPackage<
  TProps extends Record<string, ToolProperty> = Record<string, ToolProperty>,
> {
  tool: Tool<TProps>;
  run: (data: InferToolArguments<TProps>, opts: Axioms) => Promise<Result<unknown, Error>>;
}

export function define_tool<TProps extends Record<string, ToolProperty>>(
  config: {
    name: string;
    description: string;
    properties: TProps;
    required: (keyof TProps)[];
  },
  on_run: (data: InferToolArguments<TProps>, opts: Axioms) => Promise<Result<unknown, Error>>,
): ToolPackage<TProps> {
  return {
    tool: {
      type: 'function',
      function: {
        name: config.name,
        description: config.description,
        parameters: {
          type: 'object',
          properties: config.properties,
          required: config.required,
        },
      },
    },
    run: on_run,
  };
}

export const search_tool = define_tool(
  {
    name: 'search_tool',
    description: 'searches the uploaded files for this Discord guild',
    properties: {
      query: {
        type: 'string',
        description: 'Search term to use. This will be embedded before matching is done',
      },
      limit: {
        type: 'number',
        description: 'how many results to return (default: 20)',
      },
    },
    required: ['query'],
  },
  async (data, { guild_id }) => {
    const embedded_query = await ai_service.embed_text([data.query]);
    if (embedded_query.isErr()) return err(embedded_query.error);

    const limit = data.limit ?? 20;

    return (
      await lib_service.find_close_matches(guild_id, embedded_query.value.data[0].embedding!, limit)
    ).map((r) =>
      r.map((mtch) => ({
        content: mtch.content,
        file_id: mtch.file_id,
        idx: mtch.chunk_idx,
      })),
    );
  },
);

export const read_file_tool = define_tool(
  {
    name: 'read_file',
    description: 'reads chunks from a certain file',
    properties: {
      file_id: { type: 'string', description: 'The file_id of this file' },
      from_chunk: { type: 'number', description: 'the chunk to start reading from (default: 0)' },
      limit: { type: 'number', description: 'how many chunks to read' },
    },
    required: ['file_id'],
  },
  async (data, { guild_id }) => {
    return ok('not implemented');
  },
);

export const TOOLS: Record<string, ToolPackage<any>> = {
  search_tool,
};
