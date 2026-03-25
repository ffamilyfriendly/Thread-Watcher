import { Err, err, Ok, ok, Result } from 'neverthrow';
import { Request, Response } from 'express';
import { PermissionResolvable } from 'discord.js';
import { redis } from '@providers/redis';
import { config } from '@providers/config';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { entitlement_service } from '@providers/services/entitlement_service';
import z from 'zod';
import { map_err, mapped_err } from 'utilities/error';
import { ticket_service } from '@providers/services/ticket_service';
import { TicketLocals } from 'web/routes/tickets';

export type RequestWithUser = Request & { user_id: string };

export type PolicyResultError = { passes: false; message: string };
export type PolicyResultValid = { passes: true; message?: string };
export type PolicyResult = PolicyResultError | PolicyResultValid;

export type PolicyFunctionReturnType =
  | Promise<Result<PolicyResult, Error>>
  | Result<PolicyResult, Error>;
export type SecurityPolicy = (req: RequestWithUser, res?: Response) => PolicyFunctionReturnType;

function assert_all_ok<T, E>(results: Result<T, E>[]): asserts results is Ok<T, E>[] {
  if (results.some((r) => r.isErr())) {
    throw new Error('One or more results were errors');
  }
}

/**
 * @description checks the formatting of a guild_id. Does not verify guild actually exists nor any user identity data related to it
 * @param req
 * @returns Result with guild_id or an error
 */
function get_valid_guild_id(req: RequestWithUser) {
  const guild_id = req.params.guild_id || req.body.guild_id;

  if (!guild_id) return err(new Error("no 'guild_id' was passed"));
  if (typeof guild_id !== 'string')
    return err(new Error('guild_id was passed but was not a string'));
  if (!guild_id.match(/^\d{17,19}$/))
    return err(new Error('guild_id was passed but was not a valid snowflake'));
  return ok(guild_id);
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
      const guild_id = get_valid_guild_id(req);
      if (guild_id.isErr()) return err(guild_id.error);

      const p_name = policy_name ?? policy.name;
      const cache_key = `policy:${p_name}:${guild_id.value}:${req.user_id}`;
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
      const guild_id = get_valid_guild_id(req);
      if (guild_id.isErr()) return err(guild_id.error);

      const r = await ipc_client.send_to_shard_having_guild<boolean>(
        guild_id.value,
        'check_user_perm',
        {
          guild_id: guild_id.value,
          user_id: req.user_id,
          permission: perm_arr,
        },
      );

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
    const guild_id = get_valid_guild_id(req);
    if (guild_id.isErr()) return err(guild_id.error);

    const r = await ipc_client.send_to_shard_having_guild<boolean>(
      guild_id.value,
      'check_user_guild_master',
      {
        guild_id: guild_id.value,
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
    const guild_id = get_valid_guild_id(req);
    if (guild_id.isErr()) return err(guild_id.error);

    const r = await ipc_client.send_to_shard_having_guild<boolean>(
      guild_id.value,
      'check_user_bot_master',
      {
        guild_id: guild_id.value,
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

  export async function is_premium_subscriber(
    req: RequestWithUser,
  ): Promise<Result<PolicyResult, Error>> {
    const guild_id = get_valid_guild_id(req);
    if (guild_id.isErr()) return err(guild_id.error);

    const result = await entitlement_service.has_premium(guild_id.value);
    if (result.isErr()) return err(result.error);

    return ok({
      passes: result.value,
      message: `'${req.user_id}' is not subscribed to premium!`,
    });
  }

  export async function user_is_in_guild(
    req: RequestWithUser,
  ): Promise<Result<PolicyResult, Error>> {
    const guild_id = get_valid_guild_id(req);
    if (guild_id.isErr()) return err(guild_id.error);

    const r = await ipc_client.send_to_shard_having_guild(
      guild_id.value,
      'check_user_in_guild',
      {
        guild_id: guild_id.value,
        user_id: req.user_id,
      },
      z.boolean(),
    );

    if (r.isErr()) return err(map_err(r.error));

    return ok({
      passes: r.value,
      message: `'${req.user_id}' is not in that guild!`,
    });
  }

  export async function user_can_view_ticket(
    req: RequestWithUser,
    res?: Response,
  ): Promise<Result<PolicyResult, Error>> {
    if (!res) return err(new Error("'res' was null.")); // should never ever exist
    const ticket_id = req.params.ticket_id;
    if (!ticket_id || typeof ticket_id !== 'string')
      return err(new Error("'ticket_id' parameter did not exist!"));

    const ticket = await ticket_service.get_ticket(ticket_id);
    if (ticket.isErr()) return err(ticket.error);

    const user_has_role = await ipc_client.send_shard(ticket.value.guild_id, 'user_has_role', {
      role_ids: ticket.value.assigned_to_roles,
      guild_id: ticket.value.guild_id,
      user_id: req.user_id,
    });
    if (user_has_role.isErr()) return mapped_err(user_has_role.error);

    const user_created_ticket = ticket.value.owner === req.user_id;
    const user_has_assigned_role = user_has_role.value;
    const user_can_view = user_created_ticket || user_has_assigned_role;

    // Attach locals for ezier useage later
    res.locals.ticket = ticket.value;
    res.locals.ticket_context = {
      is_owner: user_created_ticket,
      is_elevated: user_has_assigned_role,
    };

    return ok({
      passes: user_can_view,
      message:
        'you can only access this ticket if you created it or have one of the assigned roles!',
    });
  }

  export async function user_has_elevated_ticket_perms(
    req: RequestWithUser,
    res?: Response,
  ): Promise<Result<PolicyResult, Error>> {
    const can_view = await user_can_view_ticket(req, res);
    if (can_view.isErr()) return err(can_view.error);
    if (!can_view.value.passes) return ok(can_view.value);

    const modified_res = res as Response<unknown, TicketLocals>;
    return ok({
      passes: modified_res.locals.ticket_context.is_elevated,
      message: 'You do not have elevated privledges in this ticket',
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
    export const user_in_guild = cached(user_is_in_guild, 60, 'user_in_guild');
  }
}
