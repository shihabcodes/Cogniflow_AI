"use client";

import { useEffect, useState } from "react";
import type { Notebook } from "@/lib/types";

const BUTTON =
  "rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:opacity-40";

export default function NotebookBar({
  notebooks,
  activeId,
  sourceCount,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  notebooks: Notebook[];
  activeId: string;
  sourceCount: number;
  disabled: boolean;
  onSelect: (id: string) => void;
  onCreate: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const active = notebooks.find((n) => n.id === activeId);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Leave rename/confirm modes when the notebook changes.
  useEffect(() => {
    setRenaming(false);
    setConfirmDelete(false);
  }, [activeId]);

  // Delete needs a second click within 4 seconds.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-2 shadow-xl backdrop-blur-xl">
      {renaming ? (
        <form
          className="flex min-w-0 flex-1 gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void onRename(name).then(() => setRenaming(false));
          }}
        >
          <input
            autoFocus
            aria-label="Notebook name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
            className="min-w-0 flex-1 rounded-lg border border-orange-500/40 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
          />
          <button className={BUTTON}>Save</button>
        </form>
      ) : (
        <>
          <select
            aria-label="Notebook"
            value={activeId}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
            className="min-w-0 flex-1 truncate rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 focus:border-orange-500/60 focus:outline-none disabled:opacity-60"
          >
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <button className={BUTTON} disabled={disabled} onClick={() => void onCreate()}>
            + New
          </button>
          <button
            className={BUTTON}
            disabled={disabled}
            onClick={() => {
              setName(active?.name ?? "");
              setRenaming(true);
            }}
          >
            Rename
          </button>
          {notebooks.length > 1 && (
            <button
              className={`${BUTTON} ${confirmDelete ? "border-red-500/50 text-red-400 hover:text-red-300" : ""}`}
              disabled={disabled}
              onClick={() => (confirmDelete ? void onDelete() : setConfirmDelete(true))}
            >
              {confirmDelete ? `Delete${sourceCount ? ` + ${sourceCount} source${sourceCount > 1 ? "s" : ""}` : ""}?` : "Delete"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
