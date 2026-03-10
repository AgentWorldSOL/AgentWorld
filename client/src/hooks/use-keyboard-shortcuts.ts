import { useEffect, useCallback, useRef } from "react";

type KeyCombo = string;
type ShortcutHandler = (e: KeyboardEvent) => void;

interface ShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  ignoreInputs?: boolean;
}

interface RegisteredShortcut {
  combo: KeyCombo;
  handler: ShortcutHandler;
  options: ShortcutOptions;
  description?: string;
}

const DEFAULT_OPTIONS: ShortcutOptions = {
  enabled: true,
  preventDefault: true,
  stopPropagation: false,
  ignoreInputs: true,
};

function parseCombo(combo: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());

  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
    meta: parts.includes("meta") || parts.includes("cmd") || parts.includes("command"),
    key: parts.filter((p) => !["ctrl", "control", "shift", "alt", "option", "meta", "cmd", "command"].includes(p))[0] || "",
  };
}

function matchesCombo(
  e: KeyboardEvent,
  parsed: ReturnType<typeof parseCombo>
): boolean {
  const key = e.key.toLowerCase();
  const keyMatch =
    key === parsed.key ||
    e.code.toLowerCase() === parsed.key ||
    e.code.toLowerCase() === `key${parsed.key}`;

  return (
    keyMatch &&
    e.ctrlKey === parsed.ctrl &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt &&
    e.metaKey === parsed.meta
  );
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: ShortcutHandler,
  options: ShortcutOptions = {}
): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const parsed = parseCombo(combo);

  useEffect(() => {
    if (!config.enabled) return;

    const listener = (e: KeyboardEvent) => {
      if (config.ignoreInputs && isInputElement(e.target)) return;
      if (!matchesCombo(e, parsed)) return;

      if (config.preventDefault) e.preventDefault();
      if (config.stopPropagation) e.stopPropagation();

      handlerRef.current(e);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [config.enabled, parsed.key, parsed.ctrl, parsed.shift, parsed.alt, parsed.meta]);
}

export function useKeyboardShortcuts(
  shortcuts: Array<{
    combo: KeyCombo;
    handler: ShortcutHandler;
    description?: string;
    options?: ShortcutOptions;
  }>
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const parsedShortcuts = shortcutsRef.current.map((s) => ({
      ...s,
      parsed: parseCombo(s.combo),
      config: { ...DEFAULT_OPTIONS, ...s.options },
    }));

    const listener = (e: KeyboardEvent) => {
      for (const shortcut of parsedShortcuts) {
        if (!shortcut.config.enabled) continue;
        if (shortcut.config.ignoreInputs && isInputElement(e.target)) continue;
        if (!matchesCombo(e, shortcut.parsed)) continue;

        if (shortcut.config.preventDefault) e.preventDefault();
        if (shortcut.config.stopPropagation) e.stopPropagation();

        shortcut.handler(e);
        break;
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}

export const APP_SHORTCUTS = {
  SEARCH: "ctrl+k",
  NEW_AGENT: "ctrl+shift+a",
  NEW_TASK: "ctrl+shift+t",
  TOGGLE_SIDEBAR: "ctrl+b",
  TOGGLE_THEME: "ctrl+shift+d",
  NAVIGATE_DASHBOARD: "ctrl+1",
  NAVIGATE_AGENTS: "ctrl+2",
  NAVIGATE_TASKS: "ctrl+3",
  NAVIGATE_HIERARCHY: "ctrl+4",
  NAVIGATE_WALLET: "ctrl+5",
  HELP: "shift+?",
} as const;
