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
} from "../schemas/tickets/ticket";
import { type AllowedTypes, CONTRACTS, type ContractType } from "./contracts";

export interface ModuleProperty {
  name: string;
  description?: string;
  value: AllowedTypes | ModuleProperty[];
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

const generate_user = (name = "user", is_array_of = false) =>
  from_contract(name, "USER", is_array_of);

const generate_role = (name = "role", is_array_of = false) =>
  from_contract(name, "ROLE", is_array_of);

const generate_string_select = (name = "selection", is_array_of = false) =>
  from_contract(name, "STRINGSELECT", is_array_of);

const ASSIGN_ROLE: ModuleObject = {
  properties: () => [generate_role("selected")],
  name: "Assign Role",
  category: ModuleCategory.ASSIGNMENT,
  schema: ZAssignRole,
};

const NARROW_ISSUE: ModuleObject = {
  name: "Define Issue",
  properties: () => [
    { name: "issue", value: "string", description: "The narrowed down issue" },
  ],
  category: ModuleCategory.AI,
  schema: ZAIIssueNarrower,
};

const ROOT_ENV_MODULE: ModuleObject = {
  name: "ROOT ENVIROMENT MODULE (THIS SHOULD NOT BE SHOWN)",
  properties: (_self, panel) => {
    const props: ModuleProperty[] = [
      generate_user("user"),
      generate_role("assigned_roles", true),
      {
        name: "ID",
        value: "string",
        description: "the ID of this ticket",
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
  category: ModuleCategory.ASSIGNMENT,
  properties: (_self) => [from_contract("channel", "CHANNEL")],
  schema: ZAssignChannel,
};

const ASSIGN_NAME: ModuleObject = {
  name: "Assign Name",
  category: ModuleCategory.ASSIGNMENT,
  properties: (_self) => {
    return [];
  },
  schema: ZAssignName,
};

const OPEN_TICKET: ModuleObject = {
  name: "Open Ticket",
  category: ModuleCategory.RESOLVERS,
  properties: () => [],
  schema: ZOpenTicket,
};

const SILENT_RESOLVE: ModuleObject = {
  name: "Silently Resolve",
  category: ModuleCategory.RESOLVERS,
  properties: () => [],
  schema: ZSilentlyResolve,
};

const MODAL_QUESTION: ModuleObject<QuestionModal> = {
  name: "Modal Question",
  category: ModuleCategory.INPUTS,
  schema: ZQuestionModal,
  properties: (self) => {
    return self.labels.map((label) => {
      const comp = label.component;

      const is_array = comp.max_values > 1;

      if (comp.type === "TEXT_INPUT") {
        return {
          name: comp.custom_id,
          value: "string",
          description: "answer",
        };
      }

      if (comp.type === "USER_SELECT")
        return from_contract(comp.custom_id, "USER", is_array);
      if (comp.type === "CHANNEL_SELECT")
        return from_contract(comp.custom_id, "CHANNEL", is_array);
      if (comp.type === "FILE_UPLOAD")
        return from_contract(comp.custom_id, "FILE", is_array);
      if (comp.type === "ROLE_SELECT")
        return from_contract(comp.custom_id, "ROLE", is_array);
      if (comp.type === "STRING_SELECT")
        return from_contract(comp.custom_id, "STRINGSELECT", is_array);

      // We should never ever reach this provided we handle all component types.
      // had to provide a return here tho as the type checker gets angry otherwise
      return {
        name: "__ERR",
        value: "boolean",
        description:
          "this should NEVER be seen. If you see this, please contact dev.",
      };
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
