import type { PipelineModule } from "./schemas/ticket";

export type ModulePropertyTypes = "string" | "number";
export interface ModuleProperty {
  name: string;
  description?: string;
  value: ModulePropertyTypes | ModuleProperty[];
}

type ModuleRegistry = {
  [K in PipelineModule["type"]]: ModuleProperty[];
};

function generate_user(name = "user"): ModuleProperty {
  return {
    name,
    value: [
      {
        name: "id",
        value: "string",
        description: "the users discord ID",
      },
      {
        name: "username",
        value: "string",
        description: "the username",
      },
    ],
  };
}

function generate_role(name = "role"): ModuleProperty {
  return {
    name,
    value: [
      {
        name: "id",
        value: "string",
        description: "id of the role",
      },
      {
        name: "name",
        value: "string",
        description: "name of role",
      },
    ],
  };
}

export const MODULE_OUTPUTS: ModuleRegistry = {
  ASSIGN_ROLE: [generate_role("selected")],
  GENERATE_ANSWER: [
    { name: "answer", value: "string", description: "The AI generated answer" },
  ],
  ROOT_ENV_MODULE: [generate_user("user"), generate_role("assigned_role")],
};

export type ModuleType = keyof typeof MODULE_OUTPUTS;
