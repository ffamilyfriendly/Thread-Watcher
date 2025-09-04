import {
  ButtonBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  Interaction,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';

type SelectionBuilders = StringSelectMenuBuilder | RoleSelectMenuBuilder | ChannelSelectMenuBuilder;
type ComponentTypes = ButtonBuilder | SelectionBuilders;
type InternalCallbackType = (arg: Interaction) => void;
type FilterFunction<T extends Interaction> = (arg: T) => boolean;

type InteractionForComponent<T> = T extends ButtonBuilder
  ? ButtonInteraction
  : T extends StringSelectMenuBuilder
    ? StringSelectMenuInteraction
    : T extends RoleSelectMenuBuilder
      ? RoleSelectMenuInteraction
      : T extends ChannelSelectMenuBuilder
        ? ChannelSelectMenuInteraction
        : never;

type CleanupItem = { cleanup: () => void };
export class Vacuum {
  to_be_cleaned: CleanupItem[] = [];
  constructor() {}

  add(...items: CleanupItem[]) {
    for (const item of Array.isArray(items) ? items : [items]) {
      this.to_be_cleaned.push(item);
    }
  }

  clean() {
    for (const trash of this.to_be_cleaned) {
      trash.cleanup();
    }
  }
}

export default class ComponentService {
  // 5 minutes as a fallback timeout in case one was not supplied
  static readonly DEFAULT_TIMEOUT_IN_MS = 1000 * 60 * 60 * 5;
  private component_events = new Map<string, InternalCallbackType>();

  wait_for_interaction_callback<T extends ComponentTypes>(
    component: T,
    filter: FilterFunction<InteractionForComponent<T>>,
    callback: (interaction: InteractionForComponent<T>) => void,
    timeout = ComponentService.DEFAULT_TIMEOUT_IN_MS,
  ) {
    const component_type_name = component.constructor.name;
    const component_instance_id = `${component_type_name}-${crypto.randomUUID()}`;

    component.setCustomId(component_instance_id);

    this.component_events.set(component_instance_id, (interaction) => {
      const interaction_typed = interaction as InteractionForComponent<T>;
      if (!filter(interaction_typed)) return;
      callback(interaction_typed);
    });

    return {
      component_instance_id,
      cleanup: () => this.component_events.delete(component_instance_id),
    };
  }

  wait_for_interaction<T extends ComponentTypes>(
    component: T,
    filter: FilterFunction<InteractionForComponent<T>>,
    timeout = ComponentService.DEFAULT_TIMEOUT_IN_MS,
  ): Promise<Result<InteractionForComponent<T>, string>> {
    return new Promise((resolve) => {
      const remove_listener_timeout = setTimeout(() => {
        cleanup();
        return resolve(err('listener timed out'));
      }, timeout);

      const { cleanup } = this.wait_for_interaction_callback(component, filter, (interaction) => {
        cleanup();
        clearTimeout(remove_listener_timeout);
        resolve(ok(interaction));
      });
    });
  }

  recieve_interaction(interaction: Interaction) {
    if (!('customId' in interaction)) return;

    const callback = this.component_events.get(interaction.customId);
    if (!callback) return;

    callback(interaction);
  }
}
