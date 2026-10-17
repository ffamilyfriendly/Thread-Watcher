// I had gemini cook these types up from https://json-schema.org/draft-07/schema#

import { AiModelName } from '../AiService';

// I AM SORRY FOR SLOPPING
export type JSONSchema7TypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type JSONSchema7Type = JSONSchema7TypeName | JSONSchema7TypeName[];

export interface JSONSchema7 {
  $schema?: string;
  $id?: string;
  $ref?: string;
  $comment?: string;

  /** Core metadata */
  title?: string;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];

  /** Type constraints */
  type?: JSONSchema7Type;
  enum?: unknown[];
  const?: unknown;

  /** Numeric validation */
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  /** String validation */
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  format?: string;

  /** Array validation */
  items?: JSONSchema7 | JSONSchema7[];
  additionalItems?: boolean | JSONSchema7;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchema7;

  /** Object validation */
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: Record<string, JSONSchema7 | boolean>;
  patternProperties?: Record<string, JSONSchema7 | boolean>;
  additionalProperties?: boolean | JSONSchema7;
  dependencies?: Record<string, JSONSchema7 | boolean | string[]>;
  propertyNames?: JSONSchema7;

  /** Conditional / Combinators */
  if?: JSONSchema7 | boolean;
  then?: JSONSchema7 | boolean;
  else?: JSONSchema7 | boolean;
  allOf?: (JSONSchema7 | boolean)[];
  anyOf?: (JSONSchema7 | boolean)[];
  oneOf?: (JSONSchema7 | boolean)[];
  not?: JSONSchema7 | boolean;

  /** Definitions */
  definitions?: Record<string, JSONSchema7 | boolean>;
}

export interface MistralResponseFormat {
  type: 'json_schema';
  jsonSchema: {
    name: string;
    description?: string;
    schemaDefinition: JSONSchema7;
    strict?: boolean;
  };
}

export function define_schema(
  name: string,
  schema: JSONSchema7,
  options: { description?: string; strict?: boolean } = { strict: true },
): MistralResponseFormat {
  return {
    type: 'json_schema',
    jsonSchema: {
      name,
      description: options.description,
      schemaDefinition: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: options.strict ? false : schema.additionalProperties,
        ...schema,
      },
      strict: options.strict,
    },
  };
}

export interface AiAgent {
  model_name: AiModelName;
  temperature: number;
  max_tokens: number;
  top_p: number;
  system_prompt: string | string[];
  response_format?: MistralResponseFormat;
}
