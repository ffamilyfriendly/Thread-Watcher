import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentEmojiResolvable,
} from "discord.js";
import TwGenericComponent from "../interfaces/genericComponent";

type buttonOnClick = (interaction: ButtonInteraction) => void;
export type buttonFilter = (interaction: ButtonInteraction) => boolean;

const ButtonInteractionQueue: Map<string, TwButton> = new Map<
  string,
  TwButton
>();

export { ButtonInteractionQueue };

/**
 * I am truly the smartest brogrammer that has ever lived
 * so this mf master class that i was cooking up at 0230 will construct the button and make a random id and take a callback
 * after the callback is taken it will be added to the ButtonInteractionQueue Map and will be keyed by the button id
 * and when a button interaction that matches the id of the button pops into interactionCreate it will call the onclick func.
 */
export default class TwButton implements TwGenericComponent<ButtonInteraction> {
  public button: ButtonBuilder;
  public id: string;

  private callback?: buttonOnClick;
  public filter?: buttonFilter;

  constructor(
    label: string,
    style: ButtonStyle,
    misc?: {
      disabled?: boolean;
      emoji?: ComponentEmojiResolvable;
      url?: string;
    },
  ) {
    // There is a chance that an id collision can happen but its very VERY slight
    // esp as the button only exists temporarily
    this.id = `${Math.floor(Math.random() * 10_000_000)}`;

    this.button = new ButtonBuilder()
      .setLabel(label)
      .setStyle(style)
      .setCustomId(this.id);

    if (!misc) return;
    if (typeof misc.disabled != "undefined")
      this.button.setDisabled(misc.disabled);
    if (misc.emoji) this.button.setEmoji(misc.emoji);
    if (misc.url) this.button.setURL(misc.url);
  }

  _middleware(interaction: ButtonInteraction) {
    if (this.filter && this.callback && this.filter(interaction)) {
      this.callback(interaction);
    } else {
      interaction.reply({
        ephemeral: true,
        content: "Nuh uh <:statusurgent:960959148848214017>",
      });
    }
  }

  close(setDisabled: boolean) {
    ButtonInteractionQueue.delete(this.id);
    if (setDisabled) {
      this.button.setDisabled(true);
    }
  }

  onclick(callback: buttonOnClick) {
    this.callback = callback;
    ButtonInteractionQueue.set(this.id, this);
  }
}
