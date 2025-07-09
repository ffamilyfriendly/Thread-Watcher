import { REST, Routes } from 'discord.js';
import { Command, RegistrationScope } from 'interfaces/Command';
import { ResultAsync } from 'neverthrow';
import { Logger } from 'tslog';
import { read_config } from 'utilities/config';
import { get_file_paths, load_paths_as_modules } from 'utilities/load_files';

const register_locally = process.argv.includes('-local');

const logger = new Logger();

const config_result = read_config();
if (config_result.isErr()) {
  logger.fatal(config_result.error);
  process.exit(1);
}

const config = config_result.value;
const rest = new REST().setToken(config.tokens.discord);

logger.info('registering commands!');

async function reg_commands(commands: Command[], route: `/${string}`) {
  const reg_cmds_promise = rest.put(route, {
    body: commands.map((cmd) => cmd.command_data.toJSON()),
  });

  return ResultAsync.fromPromise(reg_cmds_promise, (err) => err);
}

async function main() {
  const command_files = get_file_paths('./src/commands', { file_extention: 'ts' });
  const command_modules = await load_paths_as_modules<Command>(command_files);

  if (command_modules.isErr()) {
    logger.fatal('could not load commands!', command_modules.error);
    process.exit(1);
  }

  const commands_data = command_modules.value;

  let global_commands = commands_data.filter(
    (cmd) => cmd.command_scope === RegistrationScope.GLOBAL,
  );
  const private_commands = commands_data.filter(
    (cmd) => cmd.command_scope === RegistrationScope.DEVELOPMENT_SERVER,
  );

  if (register_locally) {
    logger.info(`(-local) forcing global commands -> private commands`);
    private_commands.push(...global_commands);
    global_commands = [];
  }

  logger.info(`registering ${global_commands.length} global commands!`);
  const res_global = await reg_commands(
    global_commands,
    Routes.applicationCommands(config.clientID),
  );
  if (res_global.isErr()) {
    logger.error('could not register global commands!', res_global.error);
  }

  logger.info(`registering ${private_commands.length} private commands!`);
  const res_private = await reg_commands(
    private_commands,
    Routes.applicationGuildCommands(config.clientID, config.devServer),
  );
  if (res_private.isErr()) {
    logger.error('could not register private commands!', res_private.error);
  }
}

main();
