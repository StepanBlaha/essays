"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Files } from "lucide-react";
import type { Book, Essay } from "@/lib/db";
import { readingTime } from "@/lib/export";
import { Button } from "@/components/ui/button";

export function AllEssays({
  essays,
  books,
  onOpen,
  onDelete,
  onNew,
}: {
  essays: Essay[];
  books: Book[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onNew: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const bookById = new Map(books.map((b) => [b.id, b]));

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-6">
        <span className="text-sm text-muted-foreground">
          {essays.length} {essays.length === 1 ? "essay" : "essays"}
        </span>
        <Button size="sm" onClick={onNew}>
          <Plus data-icon="inline-start" />
          New essay
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10">
        {essays.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-24 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Files className="size-6" />
            </div>
            <h3 className="font-[family-name:var(--font-book)] text-2xl font-semibold">
              No essays yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Start a new essay - you can file it into books afterward, or leave
              it unfiled.
            </p>
            <Button size="lg" onClick={onNew}>
              <Plus data-icon="inline-start" />
              New essay
            </Button>
          </div>
        ) : (
          <ul className="mx-auto max-w-3xl divide-y divide-border">
            {essays.map((essay) => {
              const inBooks = essay.bookIds
                .map((id) => bookById.get(id))
                .filter((b): b is Book => Boolean(b));
              const min = readingTime(essay.text);
              return (
                <li key={essay.id} className="group flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpen(essay.id)}
                    className="min-w-0 flex-1 rounded-md py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="truncate font-[family-name:var(--font-book)] font-medium">
                      {essay.title.trim() || "Untitled"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {inBooks.length > 0 ? (
                        inBooks.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ background: b.color }}
                              aria-hidden="true"
                            />
                            {b.title.trim() || "Untitled"}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 italic">
                          Unfiled
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{min} min</span>
                    </div>
                  </button>

                  {confirmDelete === essay.id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive"
                        onClick={() => {
                          onDelete(essay.id);
                          setConfirmDelete(null);
                        }}
                      >
                        Delete?
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel delete"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setConfirmDelete(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label="Delete essay"
                      title="Delete essay"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-muted hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setConfirmDelete(essay.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
