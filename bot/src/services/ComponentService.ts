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

export default class ComponentService {
  // 5 minutes as a fallback timeout in case one was not supplied
  static readonly DEFAULT_TIMEOUT_IN_MS = 1000 * 60 * 60 * 5;
  private component_events = new Map<string, InternalCallbackType>();

  wait_for_interaction<T extends ComponentTypes>(
    component: T,
    filter: FilterFunction<InteractionForComponent<T>>,
    timeout = ComponentService.DEFAULT_TIMEOUT_IN_MS,
  ): Promise<Result<InteractionForComponent<T>, string>> {
    return new Promise((resolve) => {
      const component_type_name = component.constructor.name;
      const component_instance_id = `${component_type_name}-${crypto.randomUUID()}`;

      component.setCustomId(component_instance_id);

      const remove_listener_timeout = setTimeout(() => {
        this.component_events.delete(component_instance_id);
        return resolve(err('listener timed out'));
      }, timeout);

      this.component_events.set(component_instance_id, (interaction) => {
        const interaction_typed = interaction as InteractionForComponent<T>;
        if (!filter(interaction_typed)) return;

        clearTimeout(remove_listener_timeout);
        resolve(ok(interaction_typed));
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
