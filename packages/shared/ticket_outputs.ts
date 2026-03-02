import type z from "zod";
import {
  type TicketPanelMeta,
  ZAssignRole,
  ZGenerateAnswer,
  type PipelineModule,
  ZAssignChannel,
  ZAssignName,
} from "./schemas/ticket";

export type ModulePropertyTypes = "string" | "number" | "array";
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
  properties: (mod: T, panel: TicketPanelMeta) => ModuleProperty[];
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

function generate_string_select(name = "selection"): ModuleProperty {
  return {
    name,
    value: [
      {
        name: "id",
        value: "string",
        description: "the ID of this option",
      },
      {
        name: "label",
        value: "string",
        description: "the label of this option",
      },
      {
        name: "description",
        value: "string",
        description: "the description of this option",
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
  properties: (_self, panel) => {
    const props: ModuleProperty[] = [
      generate_user("user"),
      {
        name: "assigned_roles",
        value: "array",
        description: "the role(s) assigned",
      },
      {
        name: "ID",
        value: "string",
        description: "the ID of this ticket",
      },
      {
        name: "number",
        value: "number",
      },
      {
        name: "name",
        value: "string",
        description: "the name of this ticket",
      },
    ];

    if (panel.commencement_method.type === "SELECTION") {
      props.push(generate_string_select());
    }

    return props;
  },
  is_meta_module: true,
};

const ASSIGN_CHANNEL: ModuleObject = {
  name: "Assign Channel",
  accent_clr: "#121212",
  category: ModuleCategory.ASSIGNMENT,
  properties: (_self) => {
    return [];
  },
  schema: ZAssignChannel,
};

const ASSIGN_NAME: ModuleObject = {
  name: "Assign Name",
  accent_clr: "#121212",
  category: ModuleCategory.ASSIGNMENT,
  properties: (_self) => {
    return [];
  },
  schema: ZAssignName,
};

export const MODULE_OUTPUTS: ModuleRegistry = {
  ASSIGN_ROLE,
  GENERATE_ANSWER,
  ROOT_ENV_MODULE,
  ASSIGN_CHANNEL,
  ASSIGN_NAME,
};

export const CATEGORY_NAMES: CategoryNames = {
  [ModuleCategory.ASSIGNMENT]: "Assignment",
  [ModuleCategory.UNASSIGNED]: "Misc",
};

export type ModuleType = keyof typeof MODULE_OUTPUTS;
