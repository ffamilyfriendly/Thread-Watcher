import { NextFunction, Request, Response } from 'express';
import { RequestWithUser, AuthedSecurityPolicy, SecurityPolicy } from './policies';
import { config } from '@providers/config';
import { TWResponse } from '#/web/utils/logging';
import { global_error_handler } from '#/web/utils/error';

export function pretty_print_request_info(req: Request, res?: Response) {
  return {
    http: {
      method: req.method,
      path: req.path,
      status: res?.statusCode,
    },
    user: {
      id: req.user_id ?? 'anonymous',
      ip: req.ip,
      ips: req.ips.join(','),
      ua: req.headers['user-agent'],
    },
    context: {
      guild_id: req.params.guild_id ?? req.query.guild_id ?? req.body?.guild_id ?? 'N/A',
    },
  };
}

export function enforce_policy(policy: AuthedSecurityPolicy) {
  return async function auth(req: Request, res: TWResponse, next: NextFunction) {
    if (!req.user_id) {
      res.locals.logger.error(
        `Request did not include 'X-User-Id'!`,
        pretty_print_request_info(req),
      );
      return res.status(401).json({
        code: 401,
        message: "this endpoint requires a 'X-User-Id'",
      });
    }

    const policy_result = await policy(req as RequestWithUser, res);

    if (policy_result.isErr()) {
      res.locals.logger.error(`Failed to run policy '${policy.name}'`, policy_result.error);
      return global_error_handler(policy_result.error, req, res, next);
    }

    // We run this check after the policy as some policies have required side-effects
    // such as fetching ticket information.
    const is_owner = config.owners.includes(req.user_id);
    if (is_owner) {
      return next();
    }

    const policy_r = policy_result.value;

    if (!policy_r.passes) {
      return res.status(403).json({
        code: 403,
        message: policy_r.message,
      });
    }

    next();
  };
}

export function enforce_policy_proxied(policy: SecurityPolicy) {
  return async function auth(req: Request, res: TWResponse, next: NextFunction) {
    const policy_result = await policy(req, res);

    if (policy_result.isErr()) {
      res.locals.logger.error(`Failed to run policy '${policy.name}'`, policy_result.error);
      return global_error_handler(policy_result.error, req, res, next);
    }

    const policy_r = policy_result.value;

    if (!policy_r.passes) {
      return res.status(403).json({
        code: 403,
        message: policy_r.message,
      });
    }

    next();
  };
}
