export interface ContractDefinition {
  id: string;
  props: Record<string, { type: "string" | "number"; desc: string }>;
}

export const CONTRACTS = {
  USER: {
    id: "user",
    props: {
      id: { type: "string", desc: "the discord ID" },
      username: { type: "string", desc: "the account username" },
      tag: { type: "string", desc: "the user tag/mention" },
    },
  },
  ROLE: {
    id: "role",
    props: {
      id: { type: "string", desc: "the role ID" },
      name: { type: "string", desc: "the role name" },
    },
  },
} as const satisfies Record<string, ContractDefinition>;

export type ContractType = keyof typeof CONTRACTS;
