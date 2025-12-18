import { NextFunction, Request, Response } from 'express';
import { RequestWithUser, SecurityPolicy } from './policies';

export function enforce_policy(policy: SecurityPolicy) {
  return async function auth(req: Request, res: Response, next: NextFunction) {
    if (!req.user_id) {
      return res.status(401).json({
        code: 401,
        message: "this endpoint requires a 'X-User-Id'",
      });
    }

    const policy_result = await policy(req as RequestWithUser);

    if (policy_result.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'failed to run security policy',
      });
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
