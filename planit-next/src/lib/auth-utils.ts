import { getServerSession } from 'next-auth';
import { authConfig } from './auth/config';
import { cookies } from 'next/headers';
import { verifyToken } from './auth';

export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const authToken = cookies().get('auth_token')?.value;
    if (authToken) {
      const verified = await verifyToken(authToken);
      if (!('error' in verified) && verified.id) {
        return verified.id;
      }
    }

    const session = await getServerSession(authConfig);
    if (session?.user?.id) {
      return session.user.id as string;
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user ID:', error);
    return null;
  }
}
