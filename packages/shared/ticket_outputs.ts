import type z from "zod";
import {
  ZAssignRole,
  ZGenerateAnswer,
  type PipelineModule,
} from "./schemas/ticket";

export type ModulePropertyTypes = "string" | "number";
export interface ModuleProperty {
  name: string;
  description?: string;
  value: ModulePropertyTypes | ModuleProperty[];
}

export enum ModuleCategory {
  ASSIGNMENT,
  UNASSIGNED,
}

export interface ModuleObject<T extends PipelineModule = PipelineModule> {
  properties: (mod: T) => ModuleProperty[];
  name: string;
  accent_clr: `#${string}`;
  is_meta_module?: boolean;
  category?: ModuleCategory;
  schema?: z.ZodType<T>;
}

type CategoryNames = {
  [K in ModuleCategory]: string;
};

type ModuleRegistry = {
  [K in PipelineModule["type"]]: ModuleObject;
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
      {
        name: "tag",
        value: "string",
        description: "tags the user",
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

const ASSIGN_ROLE: ModuleObject = {
  properties: () => [generate_role("selected")],
  name: "Assign Role",
  accent_clr: "#5865F2",
  category: ModuleCategory.ASSIGNMENT,
  schema: ZAssignRole,
};

const GENERATE_ANSWER: ModuleObject = {
  name: "Generate Answer",
  accent_clr: "#10A37F",
  properties: () => [
    { name: "answer", value: "string", description: "The AI generated answer" },
  ],
  schema: ZGenerateAnswer,
};

const ROOT_ENV_MODULE: ModuleObject = {
  name: "ROOT ENVIROMENT MODULE (THIS SHOULD NOT BE SHOWN)",
  accent_clr: "#676767",
  properties: () => [generate_user("user"), generate_role("assigned_role")],
  is_meta_module: true,
};

export const MODULE_OUTPUTS: ModuleRegistry = {
  ASSIGN_ROLE,
  GENERATE_ANSWER,
  ROOT_ENV_MODULE,
};

export const CATEGORY_NAMES: CategoryNames = {
  [ModuleCategory.ASSIGNMENT]: "Assignment",
  [ModuleCategory.UNASSIGNED]: "Misc",
};

export type ModuleType = keyof typeof MODULE_OUTPUTS;
