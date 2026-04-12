import { TypedComponent, TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { err, ok, Result } from 'neverthrow';
import {
  BaseSelectMenuBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  LabelBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  FileUploadBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  SelectMenuComponentOptionData,
  EmbedBuilder,
  ColorResolvable,
} from 'discord.js';
import { safe_edit_reply } from '../helpers/safe_reply';
import { ValueContainer } from '../ValueContainter';

export default class ModalQuestion extends DefaultModule<TypedPipelineModule<'MODAL_QUESTION'>> {
  constructor(self: TypedPipelineModule<'MODAL_QUESTION'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);

    super(self, pipeline, exports);
  }

  set_default_select_values(
    v: TypedComponent<
      'CHANNEL_SELECT' | 'USER_SELECT' | 'STRING_SELECT' | 'FILE_UPLOAD' | 'ROLE_SELECT'
    >,
    builder: BaseSelectMenuBuilder<any> | FileUploadBuilder,
  ) {
    builder.setRequired(v.required);
    builder.setCustomId(v.custom_id);
    builder.setMaxValues(v.max_values);
    builder.setMinValues(v.min_values);
    if ('placeholder' in v && !(builder instanceof FileUploadBuilder))
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
    if (v.max_values < 50) ti.setStyle(TextInputStyle.Short);
    else ti.setStyle(TextInputStyle.Paragraph);
    if (v.placeholder) ti.setPlaceholder(v.placeholder);
    if (v.value) ti.setValue(v.value);

    return ti;
  }

  create_user_select(v: TypedComponent<'USER_SELECT'>): UserSelectMenuBuilder {
    const us = new UserSelectMenuBuilder();
    this.set_default_select_values(v, us);
    return us;
  }

  create_file_select(v: TypedComponent<'FILE_UPLOAD'>): FileUploadBuilder {
    const fu = new FileUploadBuilder();
    this.set_default_select_values(v, fu);
    return fu;
  }

  create_string_select(v: TypedComponent<'STRING_SELECT'>): StringSelectMenuBuilder {
    const ss = new StringSelectMenuBuilder();
    this.set_default_select_values(v, ss);

    for (const option of v.options) {
      const opt: SelectMenuComponentOptionData = {
        value: option.option_id,
        label: option.title,
        description: option.description ?? undefined,
      };

      ss.addOptions(opt);
    }

    return ss;
  }

  create_role_select(v: TypedComponent<'ROLE_SELECT'>): RoleSelectMenuBuilder {
    const rs = new RoleSelectMenuBuilder();
    this.set_default_select_values(v, rs);
    return rs;
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
        case 'FILE_UPLOAD':
          l.setFileUploadComponent(this.create_file_select(comp));
          break;
        case 'STRING_SELECT':
          l.setStringSelectMenuComponent(this.create_string_select(comp));
          break;
        case 'ROLE_SELECT':
          l.setRoleSelectMenuComponent(this.create_role_select(comp));
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
        const field = int.fields.getSelectedUsers(comp.custom_id, comp.required);
        const user_arr = field?.values().toArray();
        this.exports.set(comp.custom_id, ValueContainer.from_users(user_arr ?? []));
      } else if (comp.type === 'STRING_SELECT') {
        const field = int.fields.getStringSelectValues(comp.custom_id);
        this.exports.set(
          comp.custom_id,
          ValueContainer.from_string_selections(field.values().toArray() ?? [], comp.options),
        );
      } else if (comp.type === 'CHANNEL_SELECT') {
        const field = int.fields.getSelectedChannels(
          comp.custom_id,
          comp.required,
          comp.channel_types ?? [],
        );
        const chan_arr = field?.values().toArray();
        this.exports.set(comp.custom_id, ValueContainer.from_channels(chan_arr ?? []));
      } else if (comp.type === 'ROLE_SELECT') {
        const chan_arr = int.fields
          .getSelectedRoles(comp.custom_id, comp.required)
          ?.values()
          .toArray()
          .filter((ch) => ch !== null);
        this.exports.set(comp.custom_id, ValueContainer.from_roles(chan_arr ?? []));
      } else if (comp.type === 'FILE_UPLOAD') {
        const file_arr =
          int.fields.getUploadedFiles(comp.custom_id, comp.required)?.values().toArray() ?? [];
        this.exports.set(comp.custom_id, ValueContainer.from_files(file_arr));
      }
    }
  }

  async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    const modal = this.create_modal();

    const modal_res = await super.ensure_modal_shown(interaction, modal, { skip_button: false });
    if (modal_res.isErr()) return err(modal_res.error);

    // This is here due to the return type of modal_res.
    // It will never returns a ButtonInteraction with 'skip_button' set to true but the type checker does not know that
    if (modal_res.value instanceof ButtonInteraction) {
      this.l.error('Question Modal was skipped (not supported)');
      return err(new Error('was skipped'));
    }

    // As we're using 'skip_button: false' we're assured that ensure_modal_shown will only return a ModalInteraction.
    // Never hurts to double check tho
    if (modal_res.value.int instanceof ModalSubmitInteraction)
      this.populate_variables(modal_res.value.int);

    /* Hello future me, I know you're asking WHY we are editing instead of updating.
     * If the interaction is "fresh", we show the modal straight away without having to click CTA button.
     * If we were to use update() here with the case of the modal opening on the initial interaction, that would edit the Panel embed itself which we don't want.
     * Using safe_edit_reply will ensure that we specifically target the CTA message itself. This leads to an extra request but I don't think ratelimits will be an issue
     */
    const fetch_and_edit_msg = await safe_edit_reply(interaction, {
      message: modal_res.value.msg.id,
      components: [],
    });
    if (fetch_and_edit_msg.isErr()) {
      this.l.warn('could not edit CTA message', fetch_and_edit_msg.error);
    }

    // This casting is done as typechecker is unsure **.value.int has a guildID defined.
    // We know it does, so we can safely cast it.
    return ok(modal_res.value.int as SupportedInteractionTypeWithGuild);
  }
}
