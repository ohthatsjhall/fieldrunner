'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Typed error thrown by apiFetch when the API returns a non-ok response.
 * Matches the NestJS error response shape: { statusCode, message, error?, code? }
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Attempt to parse a JSON error body from the response.
 * Falls back to the status text if parsing fails.
 */
async function parseErrorBody(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const body = await response.json();
    // NestJS default shape: { statusCode, message, error? }
    // Custom filters may add: { code }
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join('; ')
          : response.statusText;
    return { message, code: body.code };
  } catch {
    return { message: response.statusText || `HTTP ${response.status}` };
  }
}

export function useApiClient() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken({ skipCache: true });

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch {
        // Network failure (offline, DNS, CORS, etc.)
        throw new ApiError(
          0,
          'Unable to reach the server. Check your internet connection and try again.',
        );
      }

      if (!response.ok) {
        const { message, code } = await parseErrorBody(response);

        if (response.status === 401) {
          throw new ApiError(
            401,
            'Your session has expired. Please sign in again.',
            code,
          );
        }

        throw new ApiError(response.status, message, code);
      }

      return response.json() as Promise<T>;
    },
    [getToken],
  );

  return { apiFetch };
}
