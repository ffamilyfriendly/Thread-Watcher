import { EditTicketPanel, Ticket, TicketPanel, ZTicket, ZTicketPanel } from '@watcher/shared';
import { Database, TicketInsertion } from 'interfaces/Database';
import Redis from 'ioredis';
import { ok } from 'neverthrow';
import RedisWrapper from 'utilities/redis';

export default class TicketService {
  static readonly CACHE_TTL_SECONDS = 900;
  private r: RedisWrapper;
  constructor(
    private db: Database,
    private redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, TicketService.CACHE_TTL_SECONDS, 'ticketservice');
  }

  async get_panel(panel_id: string) {
    const cached = await this.r.get(['panel', panel_id], ZTicketPanel);
    if (cached.isOk() && cached.value) return ok(cached.value);

    const db_res = await this.db.get_ticket_panel(panel_id);

    if (db_res.isOk() && db_res.value) {
      this.r.set(['panel', panel_id], db_res.value, ZTicketPanel);
    }

    return db_res;
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

  async get_ticket(ticket_id: string) {
    const cached = await this.r.get(['ticket', ticket_id], ZTicket);
    if (cached.isOk() && cached.value) return ok(cached.value);

    const db_res = await this.db.get_ticket(ticket_id);
    if (db_res.isOk()) {
      this.r.set(['ticket', ticket_id], db_res.value, ZTicket);
    }

    return db_res;
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
}
