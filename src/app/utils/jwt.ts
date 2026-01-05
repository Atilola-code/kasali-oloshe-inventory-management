// src/app/utils/jwt.ts
export function decodeJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export function getUserRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = decodeJWT(token);
      return decoded?.role || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role from token:', error);
    return null;
  }
}

export function getUserFromToken(): any | null {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      return decodeJWT(token);
    }
    return null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}