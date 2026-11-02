import type { NextFunction, Request, Response } from 'express';
import { adminAuth, isFirebaseAdminReady } from './firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    moderator: boolean;
    learnerStage?: string;
  };
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isFirebaseAdminReady || !adminAuth) {
    return res.status(503).json({
      error: 'Secure authentication is temporarily unavailable.',
    });
  }

  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication is required.',
    });
  }

  const idToken = authorization.slice(7).trim();

  if (!idToken) {
    return res.status(401).json({
      error: 'A valid authentication token is required.',
    });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      moderator: decodedToken.moderator === true,
      learnerStage: typeof decodedToken.learnerStage === 'string' ? decodedToken.learnerStage : undefined,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: 'Your session is invalid or expired. Please sign in again.',
    });
  }
}
