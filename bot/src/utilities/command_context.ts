import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  CommandInteraction,
  EmbedBuilder,
  Interaction,
  Message,
  messageLink,
} from 'discord.js';
import i18next from 'i18next';
import { CommandError } from 'interfaces/BaseCommandInterface';
import { ok, err, Result, ResultAsync } from 'neverthrow';

import { Logger } from 'tslog';
import { get_audit_embed, PartialAuditObject } from 'services/AuditService';
import { map_err } from './error';
import { log_event_in_log_channel } from './log_channel_stuff';
import { type ConfigType } from './config';
import { config, logger } from 'bot';

type StyleOption = keyof ConfigType['style'];
export interface EmbedBuilderProps {
  title: string;
  description?: string;
  style: StyleOption | { colour: string; emoji?: string };
  auto_respond?: boolean;
  ephermal?: boolean;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export class CommandContext {
  promise: Promise<Result<void, CommandError>>;
  resolve!: (value: Result<void, CommandError> | PromiseLike<Result<void, CommandError>>) => void;
  t: (key: string, options?: { [key: string]: unknown }) => string;
  logger: Logger<unknown>;

  constructor(private interaction: CommandInteraction) {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });

    this.t = (key: string, options?: { [key: string]: unknown }) =>
      i18next.t(key, { lng: interaction.locale, ...options });

    let logger_name = interaction.commandName;
    let sub_command_name = interaction.isChatInputCommand()
      ? interaction.options.getSubcommand(false)
      : null;
    if (sub_command_name) logger_name += `:${sub_command_name}`;

    this.logger = logger.getSubLogger({
      name: `${logger_name}`,
    });
  }

  private async with_audit_channel(
    interaction: ButtonInteraction | CommandInteraction,
    msg: Message<true>,
    embeds: EmbedBuilder[],
  ) {
    const message_link = messageLink(msg.channel.id, msg.id);

    const button_row = new ActionRowBuilder<ButtonBuilder>();
    const log_msg_button = new ButtonBuilder();
    log_msg_button.setLabel(this.t('audit.view_log'));
    log_msg_button.setURL(message_link);
    log_msg_button.setStyle(ButtonStyle.Link);
    button_row.addComponents(log_msg_button);

    if (interaction.isButton())
      return interaction.update({
        components: [button_row],
      });

    const has_been_replied = interaction.replied || interaction.deferred;

    if (has_been_replied) {
      interaction.editReply({
        embeds,
        components: [button_row],
      });
    } else {
      interaction.reply({
        embeds,
        flags: 'Ephemeral',
        components: [button_row],
      });
    }
  }

  async send_audit(
    events: PartialAuditObject | PartialAuditObject[],
    override_interaction?: Interaction,
  ) {
    const interaction = override_interaction ?? this.interaction;
    if (!interaction.guildId || !(interaction.isButton() || interaction.isCommand())) return;

    let embeds: EmbedBuilder[] = [];
    let events_arr = Array.isArray(events) ? events : [events];

    for (const event of events_arr) {
      const embed = get_audit_embed(
        event,
        interaction.guildLocale ?? interaction.locale,
        interaction.user,
      ).match(
        (embed_builder) => embed_builder,
        (error) => {
          this.err(error);
          return null;
        },
      );
      if (!embed) {
        continue;
      }
      embeds.push(embed);
    }

    if (embeds.length == 0) return;

    const msg = await log_event_in_log_channel(embeds, interaction.guildId);

    if (msg.isOk()) return this.with_audit_channel(interaction, msg.value, embeds);

    let content;
    if (msg.isErr()) content = msg.error.message;

    const has_been_replied = interaction.replied || interaction.deferred;

    if (has_been_replied) {
      interaction.followUp({ embeds, content });
    } else interaction.reply({ embeds, content });
  }

  build_embed({ title, auto_respond, ...props }: EmbedBuilderProps) {
    const style = typeof props.style === 'string' ? config.style[props.style] : props.style;

    const embed = new EmbedBuilder();
    embed.setTitle(title);
    embed.setColor(style.colour as ColorResolvable);

    if (props.description) embed.setDescription(props.description);
    if (props.fields) embed.addFields(props.fields);

    if (auto_respond) {
      ResultAsync.fromPromise(this.interaction.reply({ embeds: [embed] }), map_err).then((res) => {
        if (res.isErr()) this.logger.error(`could not auto_respond:`, res.error);
      });
    }

    return embed;
  }

  get_execution_promise() {
    return this.promise;
  }

  err(error: CommandError) {
    this.resolve(err(error));
    return ok();
  }

  ok() {
    this.resolve(ok());
    return ok();
  }
}
