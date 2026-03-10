import { ModalComponent, TypedComponent, TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import {
  BaseSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ComponentType,
  LabelBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  SelectMenuType,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { component_service } from '@providers/services/component_service';
import { map_err } from 'utilities/error';
import { safe_update } from '../helpers/safe_reply';
import { ValueContainer } from '../ValueContainter';

export default class ModalQuestion extends DefaultModule<TypedPipelineModule<'MODAL_QUESTION'>> {
  constructor(self: TypedPipelineModule<'MODAL_QUESTION'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);

    super(self, pipeline, exports);
  }

  set_default_select_values(
    v: TypedComponent<'CHANNEL_SELECT' | 'USER_SELECT' | 'MENTIONABLE_SELECT' | 'STRING_SELECT'>,
    builder: BaseSelectMenuBuilder<any>,
  ) {
    builder.setRequired(v.required);
    builder.setCustomId(v.custom_id);
    builder.setMaxValues(v.max_values);
    builder.setMinValues(v.min_values);
    builder.setPlaceholder(v.placeholder);
  }

  create_channel_sel(v: TypedComponent<'CHANNEL_SELECT'>): ChannelSelectMenuBuilder {
    const sm = new ChannelSelectMenuBuilder();
    this.set_default_select_values(v, sm);
    if (v.channel_types) sm.setChannelTypes(v.channel_types);
    return sm;
  }

  create_text_input(v: TypedComponent<'TEXT_INPUT'>): TextInputBuilder {
    const ti = new TextInputBuilder();
    ti.setCustomId(v.custom_id);
    ti.setMinLength(Math.max(v.min_values, 1));
    ti.setMaxLength(v.max_values);
    ti.setRequired(v.required);
    ti.setStyle(TextInputStyle.Paragraph);
    if (v.placeholder) ti.setPlaceholder(v.placeholder);
    if (v.value) ti.setValue(v.value);
    return ti;
  }

  create_user_select(v: TypedComponent<'USER_SELECT'>): UserSelectMenuBuilder {
    const us = new UserSelectMenuBuilder();
    this.set_default_select_values(v, us);
    return us;
  }

  create_modal(): ModalBuilder {
    const m = new ModalBuilder();
    m.setTitle('Questions');

    for (const label of this.self.labels) {
      const l = new LabelBuilder();
      l.setLabel(label.label);
      if (label.description) l.setDescription(label.description);

      const comp = label.component;

      switch (comp.type) {
        case 'CHANNEL_SELECT':
          l.setChannelSelectMenuComponent(this.create_channel_sel(comp));
          break;
        case 'TEXT_INPUT':
          l.setTextInputComponent(this.create_text_input(comp));
          break;
        case 'USER_SELECT':
          l.setUserSelectMenuComponent(this.create_user_select(comp));
          break;
      }

      m.addLabelComponents(l);
    }

    return m;
  }

  populate_variables(int: ModalSubmitInteraction) {
    for (const option of this.self.labels) {
      const comp = option.component;

      if (comp.type === 'TEXT_INPUT') {
        const value = int.fields.getTextInputValue(comp.custom_id);
        this.exports.set(comp.custom_id, value);
      } else if (comp.type === 'USER_SELECT') {
        const field = int.fields.getSelectedUsers(comp.custom_id);
        const user_arr = field?.values().toArray();
        this.exports.set(comp.custom_id, ValueContainer.from_users(user_arr ?? []));
      } else if (comp.type === 'STRING_SELECT') {
        const field = int.fields.getStringSelectValues(comp.custom_id);
        this.exports.set(comp.custom_id, field.values().toArray());
      } else if (comp.type === 'CHANNEL_SELECT') {
        const field = int.fields.getSelectedChannels(comp.custom_id);
        const chan_arr = field?.values().toArray();
        this.exports.set(comp.custom_id, ValueContainer.from_channels(chan_arr ?? []));
      }
    }
  }

  async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    const modal = this.create_modal();

    const int_res = await this.ensure_fresh_interaction(interaction);
    if (int_res.isErr()) return err(int_res.error);

    const modal_promise = component_service.wait_for_interaction(
      modal,
      (int) => int.user.id === int_res.value.user.id,
    );

    const show_modal_promise = await ResultAsync.fromPromise(
      int_res.value.showModal(modal),
      map_err,
    );
    if (show_modal_promise.isErr()) {
      this.l.error('Could not show question modal', show_modal_promise.error);
      return err(show_modal_promise.error);
    }

    const modal_res = await modal_promise;
    if (modal_res.isErr()) {
      this.l.error(`Modal response error`, modal_res.error);
      return err(map_err(modal_res.error));
    }

    this.populate_variables(modal_res.value);

    const upd_repl = await safe_update(modal_res.value, { content: 'hi' });
    if (upd_repl.isErr()) {
      console.error(upd_repl.error);
      this.l.error('ERROR!!!!!');
      return err(upd_repl.error);
    }

    return ok();
  }
}
