import { config } from 'index';
import express, { Router } from 'express';
import { logger } from 'index';
import { load_module_as_and } from 'utilities/load_files';
import { RouteFile } from 'interfaces/Web';
import body_parser from 'body-parser';

export function create_web_server() {
  const server = express();

  server.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized',
      });
    }

    if (auth !== config.web.shared_secret) {
      return res.status(403).json({
        code: 403,
        message: 'Forbidden',
      });
    }
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
