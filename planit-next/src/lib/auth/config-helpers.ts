export function getCookieName(baseName: string, prefix: 'secure' | 'host' = 'secure'): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return baseName;
  
  const prefixString = prefix === 'host' ? '__Host-' : '__Secure-';
  return `${prefixString}${baseName}`;
}

export function generateUsername(email: string): string {
  const baseUsername = email.split('@')[0];
  const timestamp = Date.now();
  return `${baseUsername}_${timestamp}`;
}

export function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    return urlObj.origin === baseUrlObj.origin;
  } catch {
    return false;
  }
}

export function getRedirectUrl(url: string, baseUrl: string): string {
  try {
    if (url === baseUrl || 
        url === `${baseUrl}/` || 
        url.includes('/login') || 
        url.includes('/register')) {
      return `${baseUrl}/dashboard`;
    }
    
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    
    if (isSameOrigin(url, baseUrl)) {
      return url;
    }
    
    return `${baseUrl}/dashboard`;
  } catch (error) {
    console.error('Redirect error:', error);
    return `${baseUrl}/dashboard`;
  }
}

export function hasValidCredentials(credentials: any): boolean {
  return Boolean(credentials?.email && credentials?.password);
}

export function getCookieOptions(maxAge?: number) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const baseOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: isProduction,
  };
  
  if (maxAge !== undefined) {
    return { ...baseOptions, maxAge };
  }
  
  return baseOptions;
}

export function shouldLinkAccount(
  existingProvider: string | undefined,
  newProvider: string
): boolean {
  return !existingProvider || 
         existingProvider === newProvider || 
         existingProvider === 'credentials';
}

export function buildOAuthUserData(
  email: string,
  name: string | null | undefined,
  image: string | null | undefined,
  provider: string,
  providerId: string
) {
  return {
    email,
    name,
    image,
    provider,
    providerId,
    username: generateUsername(email),
  };
}
