import { useState, useCallback, useRef } from "react";

interface ClipboardState {
  copied: boolean;
  error: string | null;
}

export function useClipboard(resetDelay: number = 2000): {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: string | null;
} {
  const [state, setState] = useState<ClipboardState>({ copied: false, error: null });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timerRef.current) clearTimeout(timerRef.current);

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!success) throw new Error("execCommand copy failed");
        }

        setState({ copied: true, error: null });
        timerRef.current = setTimeout(
          () => setState({ copied: false, error: null }),
          resetDelay
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Copy failed";
        setState({ copied: false, error: message });
        return false;
      }
    },
    [resetDelay]
  );

  return { copy, copied: state.copied, error: state.error };
}

export function useClipboardRead(): {
  read: () => Promise<string | null>;
  value: string | null;
  error: string | null;
} {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (): Promise<string | null> => {
    try {
      if (!navigator.clipboard?.readText) {
        setError("Clipboard read not supported");
        return null;
      }
      const text = await navigator.clipboard.readText();
      setValue(text);
      setError(null);
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Read failed";
      setError(message);
      return null;
    }
  }, []);

  return { read, value, error };
}
