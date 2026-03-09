import {
  AnyComponentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ComponentType,
  Interaction,
  ModalBuilder,
  ModalSubmitInteraction,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';

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
        : T extends ModalBuilder
          ? ModalSubmitInteraction
          : T extends RoleSelectMenuBuilder
            ? RoleSelectMenuInteraction
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

export type AnyInteractionEmitterBuilder =
  | AnyComponentBuilder
  | ModalBuilder
  | RoleSelectMenuBuilder;

export default class ComponentService {
  // 5 minutes as a fallback timeout in case one was not supplied
  static readonly DEFAULT_TIMEOUT_IN_MS = 1000 * 60 * 5;
  private component_events = new Map<string, InternalCallbackType>();
  private named_components = new Map<string, AnyComponentBuilder[]>();

  wait_for_interaction_callback<T extends AnyInteractionEmitterBuilder>(
    component: T,
    filter: FilterFunction<InteractionForComponent<T>>,
    callback: (interaction: InteractionForComponent<T>) => void,
    timeout_in_ms = ComponentService.DEFAULT_TIMEOUT_IN_MS,
    on_timeout?: () => void,
  ) {
    const component_type_name = component.constructor.name;
    let component_instance_id = `${component_type_name}-${crypto.randomUUID()}`;

    const existing_custom_id = (component.data as any).custom_id;

    // We DO NOT set a custom ID if there already is one and it starts with '_'
    // This is to allow the functionality I need in the IssueNarrower class among other where the button and event handling is abstracted away
    const existing_custom_id_already_exists =
      existing_custom_id &&
      typeof existing_custom_id === 'string' &&
      existing_custom_id.startsWith('_');

    if (existing_custom_id_already_exists) component_instance_id = existing_custom_id;
    else component.setCustomId(component_instance_id);

    const auto_cleanup = setTimeout(() => {
      this.component_events.delete(component_instance_id);
      if (on_timeout) on_timeout();
    }, timeout_in_ms);

    const cleanup = () => {
      clearTimeout(auto_cleanup);
      this.component_events.delete(component_instance_id);
    };

    this.component_events.set(component_instance_id, (interaction) => {
      const interaction_typed = interaction as InteractionForComponent<T>;
      if (!filter(interaction_typed)) return;
      callback(interaction_typed);
    });

    return {
      component_instance_id,
      cleanup,
    };
  }

  get_managed_components<T extends AnyComponentBuilder>(name: string) {
    return this.named_components.get(name)?.map((comp) => comp as T);
  }

  set_managed_component(name: string, component: AnyComponentBuilder) {
    const arr = this.named_components.get(name) ?? [];
    arr.push(component);
    this.named_components.set(name, arr);
  }

  set_managed_components(name: string, components: AnyComponentBuilder[]) {
    components.forEach((component) => this.set_managed_component(name, component));
  }

  wait_for_interaction<T extends AnyInteractionEmitterBuilder>(
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
    if (!('customId' in interaction)) return ok();

    const callback = this.component_events.get(interaction.customId);
    if (!callback) return ok();

    callback(interaction);
    return ok();
  }
}
