import {
  BaseCommand,
  Command,
  RegistrationScope,
  SubCommand,
} from '#/interfaces/BaseCommandInterface';
import { Logger } from 'tslog';
import { read_config } from '#/utilities/config';
import { get_file_paths, load_paths_as_modules } from '#/utilities/load_files';

const logger = new Logger();

const config_result = read_config();
if (config_result.isErr()) {
  logger.fatal(config_result.error);
  process.exit(1);
}

logger.info('registering commands!');

function is_subcommand(cmd: BaseCommand): cmd is SubCommand<unknown> {
  return 'parent_command' in cmd;
}

async function main() {
  process.env.BYPASS_ORPHAN_CHECK = 'true';
  const command_files = get_file_paths('./src/commands', { file_extention: 'ts' });
  const command_modules = await load_paths_as_modules<Command<unknown>>(command_files, false);

  if (command_modules.isErr()) {
    logger.fatal('could not load commands!', command_modules.error);
    process.exit(1);
  }

  const commands_data = command_modules.value;

  let global_commands = commands_data.filter(
    (cmd) => cmd.command_scope === RegistrationScope.GLOBAL,
  );

  const sigma = global_commands
    .filter((cmd) => !is_subcommand(cmd))
    .map((cmd) => cmd.command_data.toJSON());

  console.log(JSON.stringify(sigma));

  process.exit(0);
}

main();
