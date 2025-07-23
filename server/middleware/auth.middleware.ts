import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase-admin';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('No authorization header found');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid authorization header format');
      return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
    }
    
    const idToken = authHeader.split(' ')[1];
    if (!idToken) {
      console.error('No token found in authorization header');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.uid) {
      console.error('No UID in decoded token');
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Add user to request object with email
    req.user = { 
      uid: decodedToken.uid,
      email: decodedToken.email || '' // Fallback to empty string if email is not available
    };
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
      };
    }
  }
}
