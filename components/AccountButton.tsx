"use client";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";

// Only list providers that are enabled in the Supabase dashboard.
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || "github").split(",").map((p) => p.trim()) as Provider[];
const LABEL: Partial<Record<Provider, string>> = { github: "GitHub", google: "Google" };

const BUTTON =
  "flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-orange-500/40 hover:bg-zinc-800 hover:text-white";

export default function AccountButton({
  email,
  onSignIn,
  onSignOut,
}: {
  email?: string;
  onSignIn: (provider: Provider) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (email)
    return (
      <button onClick={onSignOut} className={BUTTON} title={`Signed in as ${email}`}>
        <span className="hidden max-w-[160px] truncate sm:inline">{email}</span>
        <span>Sign out</span>
      </button>
    );

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={BUTTON}>
        Sign in to sync
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => onSignIn(p)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-xs text-zinc-200 hover:border-orange-500/40"
            >
              Continue with {LABEL[p] ?? p}
            </button>
          ))}
          <p className="px-1 pt-1 text-[10px] leading-snug text-zinc-500">
            Syncs your notebooks across devices. Without an account, everything stays in this browser.
          </p>
        </div>
      )}
    </div>
  );
}
