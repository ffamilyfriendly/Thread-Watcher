import express from 'express';
import { load_module_as_and } from 'utilities/load_files';
import { RouteFile } from 'interfaces/Web';
import body_parser from 'body-parser';
import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { global_error_handler } from './utils/error';

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
