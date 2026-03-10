import { useState, useEffect, useCallback } from "react";

function serialize<T>(value: T): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deserialize<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? deserialize(item, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, serialize(nextValue));
        } catch (error) {
          console.warn(`Failed to save to localStorage key "${key}":`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Failed to remove localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;
      if (e.newValue === null) {
        setStoredValue(initialValue);
      } else {
        setStoredValue(deserialize(e.newValue, initialValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item !== null ? deserialize(item, initialValue) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.sessionStorage.setItem(key, serialize(nextValue));
        } catch (error) {
          console.warn(`Failed to save to sessionStorage key "${key}":`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

export function clearAppStorage(prefix: string = "agentworld_"): void {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}

export const StorageKeys = {
  THEME: "agentworld_theme",
  SIDEBAR_STATE: "agentworld_sidebar",
  ORG_ID: "agentworld_org_id",
  WALLET_ADDRESS: "agentworld_wallet",
  TASK_VIEW: "agentworld_task_view",
  DASHBOARD_LAYOUT: "agentworld_dashboard_layout",
  RECENT_AGENTS: "agentworld_recent_agents",
  NOTIFICATION_PREFS: "agentworld_notifications",
} as const;
