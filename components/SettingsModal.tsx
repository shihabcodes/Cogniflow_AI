"use client";

import { useEffect, useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
    setTestResult(null);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  async function handleTestKey() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: inputKey.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: `Key is valid! Connected to ${data.model || "Gemini"}.`,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Failed to validate API key.",
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error testing key.",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    onSaveKey(inputKey.trim());
    onClose();
  }

  function handleClear() {
    setInputKey("");
    onSaveKey("");
    setTestResult(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Settings & API Key</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-400 leading-relaxed">
          Provide your own Google Gemini API key (BYOK). Your key is stored{" "}
          <strong className="text-slate-300">locally in your browser</strong> and used for video
          transcription fallback, embeddings, and chat.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Gemini API Key
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-16 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 text-xs text-slate-400 hover:text-slate-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] text-indigo-400 hover:underline"
            >
              Get a free API key at Google AI Studio →
            </a>
          </div>

          {testResult && (
            <div
              className={`rounded-lg p-2.5 text-xs ${
                testResult.ok
                  ? "border border-emerald-800/60 bg-emerald-950/40 text-emerald-300"
                  : "border border-rose-800/60 bg-rose-950/40 text-rose-300"
              }`}
            >
              {testResult.ok ? "✓ " : "✗ "}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestKey}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Key"}
            </button>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
