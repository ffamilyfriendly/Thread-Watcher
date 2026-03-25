import { NextFunction, Request, Response } from 'express';
import { RequestWithUser, SecurityPolicy } from './policies';
import { config } from '@providers/config';
import { logger } from '@providers/logger';

export function enforce_policy(policy: SecurityPolicy) {
  return async function auth(req: Request, res: Response, next: NextFunction) {
    if (!req.user_id) {
      return res.status(401).json({
        code: 401,
        message: "this endpoint requires a 'X-User-Id'",
      });
    }

    const policy_result = await policy(req as RequestWithUser, res);

    if (policy_result.isErr()) {
      logger.error(`Failed to run policy '${policy.name}'`, policy_result.error);
      return res.status(500).json({
        code: 500,
        message: policy_result.error.message, // Might leak privvy data. Watch out
      });
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
