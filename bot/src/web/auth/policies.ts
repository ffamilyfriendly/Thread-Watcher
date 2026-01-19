import { err, Ok, ok, Result } from 'neverthrow';
import { Request } from 'express';
import { PermissionResolvable } from 'discord.js';
import { redis } from '@providers/redis';
import { config } from '@providers/config';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';

export type RequestWithUser = Request & { user_id: string };

export type PolicyResultError = { passes: false; message: string };
export type PolicyResultValid = { passes: true; message?: string };
export type PolicyResult = PolicyResultError | PolicyResultValid;

export type PolicyFunctionReturnType =
  | Promise<Result<PolicyResult, Error>>
  | Result<PolicyResult, Error>;
export type SecurityPolicy = (req: RequestWithUser) => PolicyFunctionReturnType;

function assert_all_ok<T, E>(results: Result<T, E>[]): asserts results is Ok<T, E>[] {
  if (results.some((r) => r.isErr())) {
    throw new Error('One or more results were errors');
  }
}

export namespace Policies {
  /**
   * Helper policy that takes two policies and passes the request if either one of the policies are true
   * @param policy1
   * @param policy2
   * @returns
   */
  export function or(policy1: SecurityPolicy, policy2: SecurityPolicy) {
    return async function (req: RequestWithUser): Promise<Result<PolicyResult, Error>> {
      const [res1, res2] = await Promise.all([policy1(req), policy2(req)]);

      if (res1.isErr()) return err(res1.error);
      if (res2.isErr()) return err(res2.error);

      if (res1.value.passes || res2.value.passes) {
        return ok({ passes: true });
      }

      return ok({
        passes: false,
        message: [res1.value.message, res2.value.message].filter(Boolean).join(' OR '),
      });
    };
  }

  /**
   * Helper policy that takes multiple policies and passes the request if ALL policies return true
   * @param policies
   * @returns
   */
  export function and(...policies: SecurityPolicy[]) {
    return async function (req: RequestWithUser): Promise<Result<PolicyResult, Error>> {
      const results = await Promise.all(policies.map((p) => p(req)));

      if (results.some((r) => r.isErr())) return err(results.find((r) => r.isErr())!.error);

      if (results.every((r) => r.isOk() && r.value.passes)) return ok({ passes: true });

      // This function CAN throw but as we check for errors above we should be gucci :)
      assert_all_ok(results);

      return ok({
        passes: false,
        message: results
          .map((r) => r.value.message)
          .filter(Boolean)
          .join(' AND '),
      });
    };
  }

  export function cached(policy: SecurityPolicy, cache_duration_seconds: 60, policy_name?: string) {
    return async function (req: RequestWithUser): Promise<Result<PolicyResult, Error>> {
      const guild_id = req.params.guild_id || req.body.guild_id;
      if (!guild_id) {
        return err(new Error(`route does not have a 'guild_id' parameter!`));
      }
      const p_name = policy_name ?? policy.name;
      const cache_key = `policy:${p_name}:${guild_id}:${req.user_id}`;
      const cached = await redis.get(cache_key);
      if (cached !== null) {
        return ok({
          passes: cached === 'true',
          message: cached === 'true' ? undefined : `'${req.user_id}' does not fullfill '${p_name}'`,
        } as PolicyResult);
      }

      const policy_result = await policy(req);
      if (policy_result.isErr()) return err(policy_result.error);

      await redis.set(cache_key, String(policy_result.value.passes), 'EX', cache_duration_seconds);

      return ok(policy_result.value);
    };
  }

  export function is_bot_owner(req: RequestWithUser): PolicyFunctionReturnType {
    const is_owner = config.owners.includes(req.user_id);

    return ok({
      passes: is_owner,
      message: `'${req.user_id}' is not an owner`,
    });
  }

  export function has_discord_perm(permissions: PermissionResolvable | PermissionResolvable[]) {
    const perm_arr = Array.isArray(permissions) ? permissions : [permissions];
    return async function (req: RequestWithUser): Promise<Result<PolicyResult, Error>> {
      const guild_id = req.params.guild_id || req.body.guild_id;
      if (!guild_id) {
        return err(new Error(`route does not have a 'guild_id' parameter!`));
      }

      const r = await ipc_client.send_to_shard_having_guild<boolean>(guild_id, 'check_user_perm', {
        guild_id,
        user_id: req.user_id,
        permission: perm_arr,
      });

      if (r.isErr()) {
        console.log('ISSUE', r.error);
        return err(r.error as Error);
      }

      return ok({
        passes: r.value,
        message: `'${req.user_id}' missing ${perm_arr.join(', ')}`,
      });
    };
  }

  /**
   * @description This policy checks if the user:
   * - is Guild Owner
   * - has the Administrator perm
   * - has the Manage Server perm
   */
  export async function has_universal_guild_access(
    req: RequestWithUser,
  ): Promise<Result<PolicyResult, Error>> {
    const guild_id = req.params.guild_id || req.body.guild_id;
    if (!guild_id) {
      return err(new Error(`route does not have a 'guild_id' parameter!`));
    }

    const r = await ipc_client.send_to_shard_having_guild<boolean>(
      guild_id,
      'check_user_guild_master',
      {
        guild_id,
        user_id: req.user_id,
      },
    );

    if (r.isErr()) {
      return err(r.error as Error);
    }

    return ok({
      passes: r.value,
      message: `'${req.user_id}' is not a guild master`,
    });
  }

  export async function is_bot_master(req: RequestWithUser): Promise<Result<PolicyResult, Error>> {
    const guild_id = req.params.guild_id || req.body.guild_id;
    if (!guild_id) {
      return err(new Error(`route does not have a 'guild_id' parameter!`));
    }

    const r = await ipc_client.send_to_shard_having_guild<boolean>(
      guild_id,
      'check_user_bot_master',
      {
        guild_id,
        user_id: req.user_id,
      },
    );

    if (r.isErr()) {
      return err(r.error as Error);
    }

    return ok({
      passes: r.value,
      message: `'${req.user_id}' is not a bot master`,
    });
  }

  /**
   * Here we can define common Policy combinations / configs so we dont have to rewrite them every time
   */
  export namespace Common {
    export const admin_and_owner = and(has_discord_perm('Administrator'), is_bot_owner);
    export const bot_master_or_guild_master = cached(
      or(is_bot_master, has_universal_guild_access),
      60,
      'bot_dash_access',
    );
  }
}
