import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

export interface DecodedIdToken {
  uid: string;
  email?: string;
  sub?: string;
  aud?: string;
  iss?: string;
  [key: string]: any;
}

export const adminAuth = {
  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadStr);

        const apiKey = firebaseConfig.apiKey || process.env.FIREBASE_API_KEY;
        if (apiKey) {
          try {
            const resp = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token }),
              }
            );
            if (resp.ok) {
              const data = (await resp.json()) as any;
              if (data.users && data.users.length > 0) {
                const u = data.users[0];
                return {
                  uid: u.localId || payload.sub || payload.user_id,
                  email: u.email || payload.email,
                  ...payload,
                };
              }
            }
          } catch (fetchErr) {
            console.warn('[Auth] Remote verification fallback:', (fetchErr as Error).message);
          }
        }

        if (payload.exp && payload.exp * 1000 < Date.now()) {
          throw new Error('Firebase ID token has expired');
        }

        return {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email,
          ...payload,
        };
      }
    } catch (e: any) {
      throw new Error(`Invalid Firebase ID token: ${e.message}`);
    }
    throw new Error('Invalid Firebase ID token structure');
  },
};

