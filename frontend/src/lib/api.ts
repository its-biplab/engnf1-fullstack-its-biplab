const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface RegisterPayload {
  name: string;
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

export async function registerUser(payload: RegisterPayload): Promise<{ user?: UserResponse; error?: ApiError }> {
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
