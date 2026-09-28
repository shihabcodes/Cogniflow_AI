"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { BUTTON } from "./ui";

// Only list providers that are enabled in the Supabase dashboard.
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || "github").split(",").map((p) => p.trim()) as Provider[];
const LABEL: Partial<Record<Provider, string>> = { github: "GitHub", google: "Google" };

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
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (email)
    return (
      <button onClick={onSignOut} className={BUTTON} title={`Signed in as ${email}`} aria-label={`Sign out (${email})`}>
        <LogOut className="size-4" aria-hidden />
        <span className="hidden max-w-40 truncate md:inline">{email}</span>
      </button>
    );

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Sign in" className={BUTTON}>
        <LogIn className="size-4" aria-hidden />
        <span className="hidden sm:inline">Sign in</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-[min(16rem,calc(100vw-1.5rem))] border border-border bg-card p-2 shadow-xl">
          {PROVIDERS.map((p) => (
            <button key={p} role="menuitem" onClick={() => onSignIn(p)} className={`${BUTTON} w-full justify-start`}>
              Continue with {LABEL[p] ?? p}
            </button>
          ))}
          <p className="px-1 pt-2 text-xs leading-relaxed text-muted-foreground">
            Optional. Signing in syncs your notebooks across devices; without it, everything stays in this browser.
          </p>
        </div>
      )}
    </div>
  );
}
