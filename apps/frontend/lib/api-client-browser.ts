'use client';

import { useAuth } from '@clerk/nextjs';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useApiClient() {
  const { getToken } = useAuth();

  async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  return { apiFetch };
}
