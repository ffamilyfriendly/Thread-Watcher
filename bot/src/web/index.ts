import express from 'express';
import { load_module_as_and } from '#/utilities/load_files';
import { RouteFile } from '#/interfaces/Web';
import body_parser from 'body-parser';
import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { safe_route } from './neverthrow_wrapper';
import { Result, ResultAsync } from 'neverthrow';
import { LandingPageData } from '../../../packages/shared/schemas/api_routes';
import { ticket_service } from '@providers/services/ticket_service';
import { thread_service } from '@providers/services/thread_service';
import { sharding_manager } from '@providers/shardingmanager';
import { map_err } from '#/utilities/error';

export function create_web_server() {
  const server = express();

  server.use((req, res, next) => {
    const auth = req.header('X-Internal-Auth');
    if (!auth) {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized',
      });
    }

    req.user_id = req.header('X-User-Id');

    if (auth !== config.web.shared_secret) {
      return res.status(403).json({
        code: 403,
        message: 'Forbidden',
      });
    }

    res.locals['logger'] = logger.getSubLogger({ name: `[${req.method}] ${req.url}` });

    next();
  });

  server.use(body_parser.json());
  server.use(body_parser.urlencoded({ extended: true }));

  server.get(
    '/landing',
    safe_route<LandingPageData>(async (req, res) => {
      const panel_count = ticket_service.get_panel_count();
      const thread_count = thread_service.get_count_threads();
      const guild_count = ResultAsync.fromPromise(
        sharding_manager.fetchClientValues('guilds.cache.size'),
        map_err,
      );

      const [p_count, t_count, g_count] = await Promise.all([
        panel_count,
        thread_count,
        guild_count,
      ]);

      return Result.combine([p_count, t_count, g_count]).map(([panels, threads, guilds]) => ({
        guild_count: guilds.map((gc) => Number(gc)).reduce((acc, i) => acc + i, 0),
        watched_threads_count: threads,
        ticket_panels_count: panels,
      }));
    }),
  );

  load_module_as_and<RouteFile>('./src/web/routes', (modules) => {
    logger.info(`Found ${modules.length} modules!`);
    for (const module of modules) {
      server.use(module.path, module.router);
    }
  });

  server.listen(config.web.port, (err) => {
    if (err) {
      logger.fatal('could not start web server', err);
      process.exit(1);
    }

    logger.info(`web server listening on port ${config.web.port}`);
  });
}
