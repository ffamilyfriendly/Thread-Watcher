import database from '@providers/database';
import { redis } from '@providers/redis';
import { create_singleton } from '@providers/singleton';
import TicketService from 'services/TicketService';

const singleton = create_singleton(() => new TicketService(database.instance, redis));
export default singleton;
export const ticket_service = singleton.instance;
