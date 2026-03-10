import type z from "zod";
import {
  type TicketPanelMeta,
  ZAssignRole,
  ZAIIssueNarrower,
  type PipelineModule,
  ZAssignChannel,
  ZAssignName,
  ZOpenTicket,
  ZSilentlyResolve,
  ZQuestionModal,
  type QuestionModal,
} from "../schemas/ticket";
import { CONTRACTS, type ContractType } from "./contracts";

export type ModulePropertyTypes = "string" | "number" | "array" | `${string}[]`;
export interface ModuleProperty {
  name: string;
  description?: string;
  value: ModulePropertyTypes | ModuleProperty[];
  is_array?: boolean;
}

function from_contract(
  name: string,
  type: ContractType,
  is_array = false,
): ModuleProperty {
  const contract = CONTRACTS[type];

  const properties = Object.entries(contract.props).map(
    ([prop_name, info]) => ({
      name: prop_name,
      value: info.type,
      description: info.desc,
    }),
  );

  return {
    name,
    value: properties,
    is_array,
    description: is_array ? `a list of ${type.toLowerCase()}s` : undefined,
  };
}

export enum ModuleCategory {
  ASSIGNMENT,
  AI,
  RESOLVERS,
  UNASSIGNED,
  INPUTS,
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
  [K in PipelineModule["type"]]: ModuleObject<any>;
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

function generate_channel(name = "channel"): ModuleProperty {
  return {
    name,
    value: [
      {
        name: "id",
        value: "string",
        description: "the channels discord ID",
      },
      {
        name: "name",
        value: "string",
        description: "the name",
      },
      {
        name: "tag",
        value: "string",
        description: "tags the user",
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

const NARROW_ISSUE: ModuleObject = {
  name: "Define Issue",
  accent_clr: "#10A37F",
  properties: () => [
    { name: "issue", value: "string", description: "The narrowed down issue" },
  ],
  category: ModuleCategory.AI,
  schema: ZAIIssueNarrower,
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

const OPEN_TICKET: ModuleObject = {
  name: "Open Ticket",
  accent_clr: "#24a411",
  category: ModuleCategory.RESOLVERS,
  properties: () => [],
  schema: ZOpenTicket,
};

const SILENT_RESOLVE: ModuleObject = {
  name: "Silently Resolve",
  accent_clr: "#a43d11",
  category: ModuleCategory.RESOLVERS,
  properties: () => [],
  schema: ZSilentlyResolve,
};

const MODAL_QUESTION: ModuleObject<QuestionModal> = {
  name: "Modal Question",
  accent_clr: "#143123",
  category: ModuleCategory.INPUTS,
  schema: ZQuestionModal,
  properties: (self) => {
    return self.labels.map((label) => {
      const comp = label.component;

      if (comp.type === "USER_SELECT")
        return from_contract(comp.custom_id, "USER", comp.max_values > 1);
      if (comp.type === "TEXT_INPUT") {
        return {
          name: comp.custom_id,
          value: "string",
          is_array: comp.max_values > 1,
        };
      }
      return { name: comp.custom_id, value: "string" };
    });
  },
};

export const MODULE_OUTPUTS: ModuleRegistry = {
  ASSIGN_ROLE,
  NARROW_ISSUE,
  ROOT_ENV_MODULE,
  ASSIGN_CHANNEL,
  ASSIGN_NAME,
  OPEN_TICKET,
  SILENT_RESOLVE,
  MODAL_QUESTION,
};

export const CATEGORY_NAMES: CategoryNames = {
  [ModuleCategory.ASSIGNMENT]: "Assignment",
  [ModuleCategory.UNASSIGNED]: "Misc",
  [ModuleCategory.AI]: "Ai",
  [ModuleCategory.RESOLVERS]: "Resolvers",
  [ModuleCategory.INPUTS]: "Inputs",
};

export type ModuleType = keyof typeof MODULE_OUTPUTS;
