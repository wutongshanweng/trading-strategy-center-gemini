import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const authRouter = Router();

// Endpoint to verify token and initialize/return user from DB
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const firebaseUser = req.user!;
    
    // Check if user exists in our DB
    let [dbUser] = await db.select().from(users).where(eq(users.uid, firebaseUser.uid));
    
    // If first time login, create the user in the database
    if (!dbUser) {
      const email = firebaseUser.email || '';
      [dbUser] = await db.insert(users).values({
        uid: firebaseUser.uid,
        email: email,
      }).returning();
    }
    
    res.json({
      uid: dbUser.uid,
      email: dbUser.email,
      created_at: dbUser.createdAt,
      message: 'Authenticated successfully'
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
