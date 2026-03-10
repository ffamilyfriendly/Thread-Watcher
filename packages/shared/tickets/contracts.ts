type TypeMap = {
  string: string;
  "string?": string | null;
  boolean: boolean;
  number: number;
};

export type ContractLeafValue = TypeMap[keyof TypeMap];
export type AllowedTypes = keyof TypeMap;

export interface ContractDefinition {
  id: string;
  props: Record<string, { type: AllowedTypes; desc: string }>;
}

const FILE: ContractDefinition = {
  id: "file",
  props: {
    width: { type: "number", desc: "the width of the file" },
    height: { type: "number", desc: "the width of the file" },
    size: { type: "number", desc: "the size of the file" },
    duration: {
      type: "number",
      desc: "the duration of the file (if video/audio)",
    },
    title: { type: "string", desc: "the title of the file" },
    name: { type: "string", desc: "the name of the file" },
    description: { type: "string?", desc: "the description of the file" },
    spoiler: { type: "boolean", desc: "if the file is marked as a spoiler" },
    url: { type: "string", desc: "the direct URL to the file" },
    proxy_url: { type: "string", desc: "the proxied URL to the file" },
    content_type: { type: "string", desc: "the content type of the file" },
  },
};

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
  STRINGSELECT: {
    id: "stringselect",
    props: {
      id: { type: "string", desc: "the ID of this option" },
      label: { type: "string?", desc: "the label of this option" },
      description: { type: "string?", desc: "the description of this option" },
    },
  },
  CHANNEL: {
    id: "channel",
    props: {
      id: { type: "string", desc: "the ID of this channel" },
      name: { type: "string?", desc: "the name of this channel" },
    },
  },
  FILE,
} as const satisfies Record<string, ContractDefinition>;

export type ContractType = keyof typeof CONTRACTS;

// This iterates over the props of a specific contract and builds an object
export type ContractObject<T extends ContractType> = {
  [K in keyof (typeof CONTRACTS)[T]["props"]]: TypeMap[Extract<
    (typeof CONTRACTS)[T]["props"][K],
    { type: AllowedTypes }
  >["type"]];
};
