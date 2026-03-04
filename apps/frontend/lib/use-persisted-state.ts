import { useState, useCallback } from 'react';

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  validate?: (value: unknown) => T | undefined,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      const parsed = JSON.parse(saved) as unknown;
      if (validate) {
        return validate(parsed) ?? defaultValue;
      }
      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  const setPersisted = useCallback(
    (value: T) => {
      setState(value);
      try {
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch {
        // localStorage unavailable — ignore
      }
    },
    [key],
  );

  return [state, setPersisted];
}
