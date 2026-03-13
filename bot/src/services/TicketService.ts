import { logger } from '@providers/logger';
import { attachment_service } from '@providers/services/attachment_service';
import {
  DiscordUser,
  EditTicket,
  EditTicketPanel,
  InsertTicketNote,
  IntermediaryMessage,
  PublicTicketMessage,
  Ticket,
  TicketPanel,
  TicketView,
  ZTicket,
  ZTicketPanel,
} from '@watcher/shared';
import { Message } from 'discord.js';
import { UserFetcher } from 'fetchers/user_fetcher';
import { Database, TicketInsertion } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result } from 'neverthrow';
import { map_err, mapped_err } from 'utilities/error';
import { PanelNotFound, ThreadIdNotFound, TicketNotFound } from 'utilities/error/def';
import RedisWrapper from 'utilities/redis';
import z from 'zod';

export default class TicketService {
  static readonly CACHE_TTL_SECONDS = 900;
  private fetch_users?: UserFetcher;
  private l = logger.getSubLogger({ name: 'TicketService' });
  private r: RedisWrapper;
  constructor(
    private db: Database,
    private redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, TicketService.CACHE_TTL_SECONDS, 'ticketservice');
  }

  public set_user_fetcher(fetcher: UserFetcher) {
    this.fetch_users = fetcher;
  }

  async get_panel(panel_id: string): Promise<Result<TicketPanel, Error>> {
    const cached = await this.r.get(['panel', panel_id], ZTicketPanel);
    if (cached.isOk() && cached.value) return ok(cached.value);

    const db_res = await this.db.get_ticket_panel(panel_id);
    if (db_res.isErr()) return err(map_err(db_res.error));
    if (!db_res.value) return err(new PanelNotFound(panel_id));

    this.r.set(['panel', panel_id], db_res.value, ZTicketPanel);
    return ok(db_res.value);
  }

  async insert_panel(panel_data: TicketPanel) {
    const db_res = await this.db.insert_ticket_panel(panel_data.guild_id, panel_data);

    if (db_res.isOk()) {
      panel_data.panel_id = db_res.value;
      this.r.set(['panel', panel_data.panel_id], panel_data, ZTicketPanel);
    }

    return db_res;
  }

  async insert_ticket(ticket_data: TicketInsertion) {
    return this.db.insert_ticket(ticket_data);
  }

  async update_ticket(ticket_id: string, data: EditTicket) {
    this.r.del(['ticket', ticket_id]);
    return this.db.update_ticket(ticket_id, data);
  }

  async mark_resolved(ticket_id: string) {
    this.r.del(['ticket', ticket_id]);
    return this.db.update_ticket(ticket_id, { status: 'CLOSED', closed_at: new Date() });
  }

  async get_ticket_id_from_thread_id(thread_id: string) {
    const cached = await this.r.get(['assoc', thread_id], z.string());
    if (cached.isOk() && cached.value) return ok(cached.value);

    const db_res = await this.db.get_ticket_id_from_thread(thread_id);
    if (db_res.isErr()) return err(db_res.error);
    if (!db_res.value) return err(new ThreadIdNotFound(thread_id));
    this.r.set(['assoc', thread_id], db_res.value, z.string());
    return ok(db_res.value);
  }

  async get_ticket_from_thread_id(thread_id: string) {
    const ticket_id = await this.get_ticket_id_from_thread_id(thread_id);
    if (ticket_id.isErr()) return err(ticket_id.error);
    return this.get_ticket(ticket_id.value);
  }

  async get_ticket(ticket_id: string): Promise<Result<Ticket, Error>> {
    const cached = await this.r.get(['ticket', ticket_id], ZTicket);
    if (cached.isOk() && cached.value) return ok(cached.value);

    const db_res = await this.db.get_ticket(ticket_id);
    if (db_res.isErr()) return err(map_err(db_res.error));
    if (!db_res.value) return err(new TicketNotFound(ticket_id));

    this.r.set(['ticket', ticket_id], db_res.value, ZTicket);
    return ok(db_res.value);
  }

  async insert_ticket_note(note: InsertTicketNote) {
    return this.db.insert_ticket_note(note);
  }

  async delete_ticket_note(note_id: string) {
    return this.db.delete_ticket_note(note_id);
  }

  async get_ticket_notes(ticket_id: string, limit: number, offset: number) {
    return this.db.get_ticket_notes(ticket_id, limit, offset);
  }

  async update_panel(panel_id: string, data: EditTicketPanel) {
    const res = await this.db.update_ticket_panel(panel_id, data);
    if (res.isOk()) this.r.del(['panel', panel_id]);
    return res;
  }

  async delete_panel(panel_id: string) {
    this.r.del(['panel', panel_id]);
    return this.db.delete_ticket_panel(panel_id);
  }

  async get_panels_in_guild(guild_id: string) {
    return this.db.get_ticket_panels(guild_id);
  }

  async append_message(ticket_id: string, message: Message<true>) {
    const insert_res = await this.db.insert_message({
      message_id: message.id,
      text_content: message.content,
      ticket_id,
      author_id: message.author.id,
      created_at: message.createdAt,
      embeds: message.embeds,
    });
    if (insert_res.isErr()) return err(insert_res.error);

    return await attachment_service.add_attachments(message);
  }

  async hydrate_messages(
    messages: IntermediaryMessage[],
    guild_id?: string,
  ): Promise<
    Result<{ messages: PublicTicketMessage[]; users: Record<string, DiscordUser> }, Error>
  > {
    let user_map: Record<string, DiscordUser> = {};
    const unique_users = new Set(messages.map((m) => m.author_id));
    if (guild_id && this.fetch_users) {
      const users_list = await this.fetch_users({
        guild_id,
        user_ids: [...unique_users],
      });
      if (users_list.isErr()) return mapped_err(users_list.error);
      user_map = Object.fromEntries(users_list.value.map((u) => [u.id, u]));
    } else {
      this.l.warn('No user fetcher set, skipping user hydration.');
    }

    return ok({
      messages: messages.map((msg) => ({
        ...msg,
        attachments: attachment_service.into_api_type(msg.attachments),
      })),
      users: user_map,
    });
  }

  async get_ticket_view(ticket_id: string): Promise<Result<TicketView, Error>> {
    console.log('GETTING TICKET');
    const inter = await this.db.get_extended_ticket(ticket_id);
    if (inter.isErr()) return mapped_err(inter.error);
    console.log('GOT TICKET');

    const { messages, ...rest } = inter.value;

    console.log('HYDRATING MESSAGES');
    const hydrated_messages = await this.hydrate_messages(messages, rest.guild_id);
    if (hydrated_messages.isErr()) return err(hydrated_messages.error);
    console.log('HYDRATED MESSAGES');

    return ok({
      ...rest,
      messages: {
        has_more: hydrated_messages.value.messages.length === 51,
        items: hydrated_messages.value.messages.slice(0, 50),
      },
      users: hydrated_messages.value.users,
    });
  }
}
