export interface V2Thread {
  id: string;
  server: string;
  dueArchive: number;
  watching: number;
}

export interface V2Channel {
  id: string;
  server: string;
  regex: string | null;
  roles: string | null;
  tags: string | null;
}

export interface V2Config {
  server: string;
  cfg_id: string;
  value: string;
}
