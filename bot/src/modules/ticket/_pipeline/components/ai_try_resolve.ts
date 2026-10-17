import {
  ActionRowBuilder,
  ButtonBuilder,
  RGBTuple,
  SeparatorBuilder,
  TextDisplayBuilder,
} from '@discordjs/builders';
import {
  ActionRow,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

const CTA_TEXT = `Thread-Watcher has sent you a DM`;
const OPEN_DM_BTN_TEXT = 'Open DM';

export function show_cta_open_dm(dm_msg_link: `https://${string}`) {
  const container = new ContainerBuilder();
  container.setAccentColor([255, 255, 255]);

  container.addSectionComponents((sec) =>
    sec
      .addTextDisplayComponents((txt) => txt.setContent(CTA_TEXT))
      .setButtonAccessory((btn) =>
        btn.setStyle(ButtonStyle.Link).setURL(dm_msg_link).setLabel(OPEN_DM_BTN_TEXT),
      ),
  );

  return { components: [container] };
}

const AI_DISCLAIMER_TEXT = `This conversation is facilitated by AI`;
const AI_SKIP_BTN_TEXT = `Skip AI`;

export function create_opening_message(
  content: string,
  skip_ai_button: ButtonBuilder,
  ticket_id: string,
  guild_info: { guild_name: string; guild_id: string },
) {
  const container = new ContainerBuilder();
  container.setAccentColor([255, 255, 255]);

  const section = new SectionBuilder();
  skip_ai_button.setLabel(AI_SKIP_BTN_TEXT);
  skip_ai_button.setStyle(ButtonStyle.Secondary);
  section.addTextDisplayComponents((txt) => txt.setContent(AI_DISCLAIMER_TEXT));
  section.setButtonAccessory(skip_ai_button);

  container.addSectionComponents(section);
  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents((txt) =>
    txt.setContent(
      `-# DM opened in relation to ticket [${ticket_id}](<https://cdn.threadwatcher.xyz/logs/${ticket_id}_pipeline.txt>) in **${guild_info.guild_name}** (\`${guild_info.guild_id}\`)`,
    ),
  );

  const text_display = new TextDisplayBuilder();
  text_display.setContent(content);

  return { components: [container, text_display] };
}

const AI_PROP_SOLUTION_TITLE = `# Proposed Solution\n`;
const AI_PROP_SOLUTION_ACCEPT = 'Accept Solution';
const AI_PROP_SOLUTION_REJECT = 'Reject Solution';

export function create_proposed_solution_message(
  content: string,
  accept_btn: ButtonBuilder,
  reject_btn: ButtonBuilder,
) {
  const btn_row = new ActionRowBuilder<ButtonBuilder>();
  accept_btn.setStyle(ButtonStyle.Primary);
  accept_btn.setLabel(AI_PROP_SOLUTION_ACCEPT);
  reject_btn.setStyle(ButtonStyle.Secondary);
  reject_btn.setLabel(AI_PROP_SOLUTION_REJECT);
  btn_row.addComponents(accept_btn, reject_btn);

  const container = new ContainerBuilder()
    .setAccentColor([255, 255, 255])
    .addTextDisplayComponents((txt) => txt.setContent(`${AI_PROP_SOLUTION_TITLE}\n${content}`))
    .addSeparatorComponents((sep) => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents(btn_row);

  return { components: [container] };
}

export function create_handled_solution_message(content: string, accepted: boolean) {
  const clr: RGBTuple = accepted ? [0, 255, 0] : [255, 0, 0];

  const container = new ContainerBuilder()
    .setAccentColor(clr)
    .addTextDisplayComponents((txt) => txt.setContent(`${AI_PROP_SOLUTION_TITLE}\n${content}`))
    .addSeparatorComponents((sep) => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((t) =>
      t.setContent(accepted ? 'this solution was accepted.' : 'this solution was rejected.'),
    );

  return { components: [container] };
}

const CHAT_TERMINATED_TEXT = `# AI session terminated\nThis AI chat is now terminated. Please proceed in the server!`;
export function chat_terminated(proceed_url: `https://${string}`) {
  const container = new ContainerBuilder()
    .setAccentColor([255, 255, 255])
    .addSectionComponents((sec) =>
      sec
        .addTextDisplayComponents((txt) => txt.setContent(CHAT_TERMINATED_TEXT))
        .setButtonAccessory((btn) =>
          btn.setStyle(ButtonStyle.Link).setLabel('Open').setURL(proceed_url),
        ),
    );

  return container;
}
