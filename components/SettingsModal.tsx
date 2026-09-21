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
          message: `Key is active & verified! Connected to ${data.model || "Gemini"}.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-500 text-[11px] font-black text-white">
              Y
            </span>
            <h2 className="text-base font-bold text-zinc-100">API Configuration (BYOK)</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-400 leading-relaxed">
          Provide your personal Google Gemini API key. Stored{" "}
          <strong className="text-zinc-200">strictly in your browser memory</strong> and used for
          multimodal video ingestion, embeddings, and real-time generation.
        </p>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
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
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pr-16 text-sm text-zinc-200 placeholder-zinc-600 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-orange-400 hover:text-orange-300 hover:underline"
              >
                Get free API key at Google AI Studio →
              </a>
              {apiKey && (
                <span className="text-[10px] font-mono text-emerald-400">● Custom key active</span>
              )}
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-xl p-3 text-xs ${
                testResult.ok
                  ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
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
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Key"}
            </button>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-950/40 transition-all"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] transition-all"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
