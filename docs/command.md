# Commands

All Thread-Watcher commands live in [/bot/src/commands](/bot/src/commands/) and implement the [Command](/bot/src/interfaces/BaseCommandInterface.ts) interface.

## Structure

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { RegistrationScope } from "#/interfaces/BaseCommandInterface";
import { CommandContext, type Command } from "#/interfaces/Command";
import { ok, Result } from "neverthrow";
import { CommandError } from "#/utilities/error/def";

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Learn about Thread-Watcher");

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
```

## Command gating

the command handler can ensure your command only gets ran by people with the correct permissions and also that the bot itself has any permission it might need. You configure this on the `access_control` property of the command which expects a **AccessControl** object

```ts
export interface AccessControl {
  developer_only?: boolean;
  bot_requires_permission?: PermissionResolvable[];
  invoker_requires_permission?: PermissionResolvable[];
  // The name of the option that might hold the channel / thread
  channel_option_name?: string;
  required_entitlement_sku?: string;
}
```

> [!NOTE]
> The `invoker_requires_permission` field is ignored if the guild has set the `USE_INTEGRATION_PERMISSIONS` setting to enabled. In these cases, the Discord [Slash Command Permissions](https://discord.com/blog/slash-commands-permissions-discord-apps-bots) system takes over.

## Return type

Thread-Watcher is built with [NeverThrow](https://github.com/supermacro/neverthrow) to allow for type safe errors, and the **Command** must return an Ok with `ok()` if everything went according to plan, or an Err with `err()` if something failed.

### Error Management

Any errors returned with `err()` are handled by the command handler itself!
You can customize your errors by writing a custom [Error Type](/bot/src/utilities/error/types/command_errs.ts)!

## Command Context

Each command `run` function is passed an [CommandInteraction](https://discord.js.org/docs/packages/discord.js/14.26.2/CommandInteraction:Class) and a **Command Context**:

```ts
export interface CommandContext {
  t: TypedI18Func;
  build_embed: (style?: keyof ConfigType["style"]) => EmbedBuilder;
  logger: Logger<unknown>;
}
```

the command context includes util functionality, such as [Internationalization](/docs/i18n.md), which you might find helpful!

## Command Loader

Thread-Watcher [recursevly](https://en.wikipedia.org/wiki/Recursion) loads commands from the commands folder. This means you are free to organize your commands however you please in the directory, as long as your typescript files export an object adhering to the **Command** interface as the default export.

### Shared command utils

If you notice you are redifining the same code across multiple commands, consider breaking it out! The Thread-Watcher command loader ignores files & directories starting with `_` so you could therefore create a directory such as `_shared` in your commands directory to keep shared code in a easy to reach location!
