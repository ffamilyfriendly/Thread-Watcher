import { Channel, Entitlement, GuildChannel, Role } from 'discord.js';
import { Router } from 'express';
import {
  audit_service,
  channel_service,
  config,
  ipc_client,
  settings_service,
  thread_service,
} from 'index';
import { RawSetting } from 'interfaces/Database';
import { RouteFile } from 'interfaces/Web';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { enforce_policy } from 'web/auth/auth';
import { Policies, RequestWithUser } from 'web/auth/policies';
import { z } from 'zod';

const router = Router();

router.get(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
    const monitors = await channel_service.get_channels(guild_id);

    if (monitors.isErr()) {
      console.log(monitors.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: monitors.error,
      });
    }

    console.log(monitors.value);

    res.json(monitors.value);
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
