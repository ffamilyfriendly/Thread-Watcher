import { Module } from 'interfaces/Module';
import on_interaction from './_on_interaction';
import on_message_create from './_on_message';

const module: Module = {
  name: 'Ticket',
  on_interaction,
  on_message_create,
};

export default module;
