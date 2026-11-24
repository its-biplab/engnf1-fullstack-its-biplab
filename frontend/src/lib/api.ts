const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'triagesync_token';
const USER_KEY = 'triagesync_user';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface AuthSuccessResponse {
  token: string;
  user: UserResponse;
}

// Token and session utilities
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setStoredUser(user: UserResponse): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getStoredUser(): UserResponse | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(USER_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export async function registerUser(
  payload: RegisterPayload
): Promise<{ user?: UserResponse; error?: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || {
          code: `HTTP_${res.status}`,
          message: 'Registration failed. Please check your information and try again.',
        },
      };
    }

    return { user: data.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to connect to the server';
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error: ${message}`,
      },
    };
  }
}

export async function loginUser(
  payload: LoginPayload
): Promise<{ token?: string; user?: UserResponse; error?: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || {
          code: `HTTP_${res.status}`,
          message: 'Login failed. Please check your credentials.',
        },
      };
    }

    if (data.token && data.user) {
      setAuthToken(data.token);
      setStoredUser(data.user);
    }

    return { token: data.token, user: data.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to connect to the server';
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error: ${message}`,
      },
    };
  }
}

export async function fetchCurrentUser(): Promise<{ user?: UserResponse; error?: ApiError }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No active session token found',
        },
      };
    }

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || {
          code: `HTTP_${res.status}`,
          message: 'Failed to retrieve user profile',
        },
      };
    }

    return { user: data.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to connect to the server';
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error: ${message}`,
      },
    };
  }
}

export interface TicketItem {
  id: string;
  externalId: string;
  subject: string;
  body: string;
  autoCategory: string;
  category: string;
  priority: string;
  status: string;
  isHumanOverride: boolean;
  isReviewed: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ImportPayload {
  tickets: Array<{
    externalId?: string;
    externalld?: string;
    subject: string;
    body: string;
  }>;
}

export interface ImportResult {
  importedCount: number;
  updatedCount: number;
  skippedOverrideCount: number;
  total: number;
}

export async function importTickets(
  payload: ImportPayload
): Promise<{ result?: ImportResult; error?: ApiError }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No active session token found. Please sign in.',
        },
      };
    }

    const res = await fetch(`${API_BASE}/api/tickets/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || {
          code: `HTTP_${res.status}`,
          message: 'Failed to import tickets feed',
        },
      };
    }

    return { result: data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to connect to the server';
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error: ${message}`,
      },
    };
  }
}

export async function fetchTickets(params?: {
  status?: string;
  category?: string;
  priority?: string;
}): Promise<{ tickets?: TicketItem[]; total?: number; error?: ApiError }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No active session token found. Please sign in.',
        },
      };
    }

    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.priority) query.append('priority', params.priority);

    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${API_BASE}/api/tickets${queryString}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || {
          code: `HTTP_${res.status}`,
          message: 'Failed to retrieve tickets',
        },
      };
    }

    return { tickets: data.tickets || [], total: data.total || 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to connect to the server';
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error: ${message}`,
      },
    };
  }
}
