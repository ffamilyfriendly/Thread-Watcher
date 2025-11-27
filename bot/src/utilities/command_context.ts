/*
export interface CommandExecutionContext {
  build_embed: (props: EmbedBuilderProps) => EmbedBuilder;
  send_audit: (
    embed_param: EmbedBuilder | EmbedBuilder[],
    overwrite_interaction?: Interaction,
  ) => void;
  // i18n
  t: (
    key: string,
    options?: {
      [key: string]: unknown;
    },
  ) => string;
  logger: Logger<unknown>;
}
*/

import { ColorResolvable, CommandInteraction, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import { CommandError } from 'interfaces/Command';
import { ok, err, Result } from 'neverthrow';
import { EmbedBuilderProps } from './embed';
import { config, logger } from 'bot';
import { Logger } from 'tslog';

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

  send_audit(...args: any[]) {
    // IMPLEMENT
    /*
        So we need to figure out how to handle logging proper.
        For cases where:
        - no logging channel is set (send log as response to current interaction)
        - logging channel is set (send log to log channel, update(?) current interaction w/ link to interaction)
        - to-be-logged event happened automatically. No interaction to reply to / update.

        Would be nice if we somehow "centralised" it so we dont repeat code. Obviously that would not be fit in a CommandContext instance
        as automatic events will not have an interaction to respond to. 

        Leaving this function blank for now while i think about it
    */
    this.logger.warn("IMPLEMENT 'send_audit' you idiot");
  }

  build_embed({ title, auto_respond, ...props }: EmbedBuilderProps) {
    const style = typeof props.style === 'string' ? config.style[props.style] : props.style;

    const embed = new EmbedBuilder();
    embed.setTitle(title);
    embed.setColor(style.colour as ColorResolvable);

    if (props.description) embed.setDescription(props.description);
    if (props.fields) embed.addFields(props.fields);

    return embed;
  }

  get_execution_promise() {
    return this.promise;
  }

  ok() {
    this.resolve(ok());
    return ok();
  }
}
