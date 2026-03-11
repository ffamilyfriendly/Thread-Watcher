export class TicketNotFound extends Error {
  constructor(readonly ticket_id: string) {
    super(`Ticket ${ticket_id} not found!`);
  }
}
