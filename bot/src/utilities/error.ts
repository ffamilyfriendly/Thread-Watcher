import { DiscordAPIError, HTTPError } from 'discord.js';
import { err, Err } from 'neverthrow';

export function map_err(error: unknown) {
  if (error instanceof DiscordAPIError) {
    return new Error(`Discord API Error [${error.code}]: ${error.message}`);
  }
  if (error instanceof HTTPError) {
    return new Error(`HTTP Error [${error.status}]: ${error.message}`);
  }
  if (error instanceof Error) return error;

  return new Error(`Unknown error: ${String(error)}`);
}

// Should have added this function ages ago
export function mapped_err(error: unknown): Err<never, Error> {
  return err(map_err(error));
}
