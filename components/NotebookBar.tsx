"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { Notebook } from "@/lib/types";
import { BUTTON, ICON_BUTTON, INPUT } from "./ui";


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
    <div className="flex items-center gap-1">
      {renaming ? (
        <form
          className="flex min-w-0 flex-1 gap-1"
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
            className={`${INPUT} min-w-0 flex-1 py-2`}
          />
          <button className={ICON_BUTTON} aria-label="Save name">
            <Check className="size-4" aria-hidden />
          </button>
        </form>
      ) : (
        <>
          <select
            aria-label="Notebook"
            value={activeId}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
            className={`${INPUT} min-w-0 flex-1 cursor-pointer truncate py-2 font-semibold`}
          >
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <button className={ICON_BUTTON} disabled={disabled} onClick={() => void onCreate()} aria-label="New notebook" title="New notebook">
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            className={ICON_BUTTON}
            disabled={disabled}
            aria-label="Rename notebook"
            title="Rename notebook"
            onClick={() => {
              setName(active?.name ?? "");
              setRenaming(true);
            }}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          {notebooks.length > 1 &&
            (confirmDelete ? (
              <button className={`${BUTTON} border-destructive text-destructive`} disabled={disabled} onClick={() => void onDelete()}>
                Delete{sourceCount ? ` + ${sourceCount} source${sourceCount > 1 ? "s" : ""}` : ""}?
              </button>
            ) : (
              <button className={ICON_BUTTON} disabled={disabled} onClick={() => setConfirmDelete(true)} aria-label="Delete notebook" title="Delete notebook">
                <Trash2 className="size-4" aria-hidden />
              </button>
            ))}
        </>
      )}
    </div>
  );
}
