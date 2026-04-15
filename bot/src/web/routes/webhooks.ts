import { RouteFile } from '#/interfaces/Web';
import { Router } from 'express';
import { safe_route } from '../neverthrow_wrapper';
import { ZTopggWebhookSchema } from '@watcher/shared';
import { err, ok, ResultAsync } from 'neverthrow';
import { redis } from '@providers/redis';
import { async_from } from '#/utilities/error';
import { guild_service } from '@providers/services/guild_service';
import { Policies } from '../auth/policies';
import { config } from '@providers/config';
import { enforce_policy_proxied } from '../auth/auth';
const router = Router();

router.post(
  `/top-gg`,
  enforce_policy_proxied(Policies.header_auth_matches(config.web.topgg_webhook_secret)),
  safe_route(async (req, res) => {
    const { query, user, type } = req.body;

    if (type === 'test') {
      res.locals.logger.warn(`TEST webhook recieved from '${user}'.`);
    }

    if (!query) return ok({ ok: 'ok' });
    const guild_id = new URLSearchParams(query).get('guild_id');
    if (!guild_id) return ok({ ok: 'ok' });

    const guild_obj = await guild_service.get_guild_info(guild_id);
    if (guild_obj.isErr()) return err(guild_obj.error);

    // The `guild_id` comes from the query which can be arbitrarily selected on top.gg. We therefore only update "real" guilds that we have in the DB
    if (!guild_obj.value) {
      res.locals.logger.warn(
        `Recieved vote webhook indicating guild '${guild_id}'. However, this guild does not exist in the database.`,
        req.body,
      );
      return ok({ ok: 'missing guild.' });
    }

    const TTL = 12 * 60 * 60;
    async_from(
      redis.set(`entitlement:${guild_id}:topgg`, JSON.stringify(req.body), 'EX', TTL),
    ).then((redis_res) => {
      if (redis_res.isErr())
        res.locals.logger.warn(
          `could not update redis entitlement for '${guild_id}'`,
          redis_res.error,
        );
    });

    const existing_persistent_tokens = guild_obj.value.persistent_budget_eurocents ?? 0;
    const updated_persistent_tokens = existing_persistent_tokens + config.ai.vote_reward_tokens;

    const could_update_guild = await guild_service.update_guild(guild_id, {
      persistent_budget_eurocents: updated_persistent_tokens,
    });

    if (could_update_guild.isErr()) {
      res.locals.logger.error(
        `Could not reward '${guild_id}' for '${user}' voting!`,
        could_update_guild.error,
      );
      return err(could_update_guild.error);
    }

    res.locals.logger.info(
      `Rewarded guild '${guild_id}' with ${config.ai.vote_reward_tokens} ai tokens for a vote from '${user}'!`,
    );

    return ok({ ok: 'ok' });
  }, ZTopggWebhookSchema),
);

const route: RouteFile = {
  path: '/webhook',
  router,
};

export default route;
