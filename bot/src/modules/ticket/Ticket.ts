import { Module } from 'interfaces/Module';
import on_interaction from './_on_interaction';

const module: Module = {
  name: 'Ticket',
  on_interaction,
};

export default module;
