"use client";

import { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { BUTTON, BUTTON_PRIMARY, ICON_BUTTON, INPUT } from "./ui";

const SHARED_KEY = Boolean(process.env.NEXT_PUBLIC_SHARED_KEY);

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
    setResult(null);
  }, [apiKey, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function testKey() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: inputKey.trim() ? { "x-gemini-key": inputKey.trim() } : {},
      });
      const data = await res.json();
      setResult(
        res.ok && data.ok
          ? { ok: true, message: `Works — connected to ${data.model}.` }
          : { ok: false, message: data.error || "That key didn't work." }
      );
    } catch {
      setResult({ ok: false, message: "Network error while testing the key." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="settings-title" className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="size-5 text-accent" aria-hidden />
            Gemini API key
          </h2>
          <button onClick={onClose} aria-label="Close settings" className={ICON_BUTTON}>
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {SHARED_KEY
            ? "Optional. Cogniflow works out of the box on a shared free key with a daily limit per visitor. Add your own free key for unlimited use."
            : "Cogniflow needs a Google Gemini API key. It's free to create."}{" "}
          Your key stays in this tab&apos;s memory only — it&apos;s never saved.
        </p>

        <label htmlFor="gemini-key" className="mb-1.5 block text-sm font-medium">
          Your key {SHARED_KEY && <span className="font-normal text-muted-foreground">(optional)</span>}
        </label>
        <div className="flex gap-2">
          <input
            id="gemini-key"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            type={showKey ? "text" : "password"}
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setResult(null);
            }}
            placeholder="Paste your key"
            className={`${INPUT} font-mono text-sm`}
          />
          <button type="button" onClick={() => setShowKey(!showKey)} className={BUTTON} aria-pressed={showKey}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-accent underline-offset-2 hover:underline"
        >
          Get a free key at Google AI Studio →
        </a>

        {result && (
          <p
            role="status"
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-accent-soft text-foreground" : "bg-destructive-soft text-destructive"}`}
          >
            {result.message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={testing || !inputKey.trim()} onClick={testKey} className={`${BUTTON} flex-1`}>
            {testing ? "Testing…" : "Test key"}
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={() => {
                setInputKey("");
                onSaveKey("");
                setResult(null);
              }}
              className={`${BUTTON} text-destructive`}
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onSaveKey(inputKey.trim());
              onClose();
            }}
            className={`${BUTTON_PRIMARY} flex-1`}
          >
            {inputKey.trim() ? "Use this key" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
