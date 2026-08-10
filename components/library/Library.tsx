"use client";

import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import type { Book, Essay } from "@/lib/db";
import { readingTime } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type NewBookData = { title: string; author: string; color: string };

const PALETTE = [
  "#c8c2b6",
  "#d8c9a3",
  "#b7796a",
  "#7f8a80",
  "#5f7480",
  "#8a5a44",
  "#3f4247",
  "#2f3b3a",
];

/** Pick a readable text color for a given cover color. */
function textOn(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

export function Library({
  books,
  essays,
  onEnterReader,
  onNewBook,
  onDeleteBook,
  onClose,
}: {
  books: Book[];
  essays: Essay[];
  onEnterReader: (id: string) => void;
  onNewBook: (data: NewBookData) => void;
  onDeleteBook: (id: string) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [color, setColor] = useState(PALETTE[3]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setAuthor("");
    setColor(PALETTE[3]);
  };

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onNewBook({ title: t, author: author.trim(), color });
    reset();
    setCreating(false);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-40 flex flex-col bg-background duration-200 motion-reduce:animate-none">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <h2 className="font-[family-name:var(--font-book)] text-lg font-semibold tracking-tight">
          Library
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            New book
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X data-icon="inline-start" />
            Close
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10">
        {books.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-24 text-center">
            <h3 className="font-[family-name:var(--font-book)] text-2xl font-semibold">
              Your library is empty
            </h3>
            <p className="text-sm text-muted-foreground">
              Create your first book, then start filling it with essays.
            </p>
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              New book
            </Button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => {
              const bookEssays = essays.filter((e) => e.bookId === book.id);
              const minutes = bookEssays.reduce(
                (sum, e) => sum + readingTime(e.text),
                0,
              );
              const fg = textOn(book.color);
              return (
                <div key={book.id} className="group flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onEnterReader(book.id)}
                    className="block w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div
                      className="flex aspect-[3/4] flex-col justify-end rounded-md p-4 shadow-sm ring-1 ring-black/5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md"
                      style={{ background: book.color, color: fg }}
                    >
                      <div className="font-[family-name:var(--font-book)] text-lg leading-tight font-semibold">
                        {book.title.trim() || "Untitled"}
                      </div>
                      {book.author && (
                        <div className="mt-0.5 text-sm opacity-75">
                          {book.author}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <span className="truncate text-xs text-muted-foreground">
                      {bookEssays.length}{" "}
                      {bookEssays.length === 1 ? "essay" : "essays"} · {minutes}{" "}
                      min
                    </span>
                    {confirmDelete === book.id ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-destructive"
                        onClick={() => {
                          onDeleteBook(book.id);
                          setConfirmDelete(null);
                        }}
                        onMouseLeave={() => setConfirmDelete(null)}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete book"
                        className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                        onClick={() => setConfirmDelete(book.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={creating}
        onOpenChange={(o) => {
          setCreating(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New book</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-title">Title</Label>
              <Input
                id="book-title"
                autoFocus
                placeholder="e.g. On Stillness"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="book-author">
                Author{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="book-author"
                placeholder="e.g. M. Halden"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Cover color</Label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      "size-8 rounded-full ring-1 ring-black/10 transition",
                      color === c &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* live preview */}
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <div
                className="flex h-16 w-12 shrink-0 flex-col justify-end rounded-sm p-1.5 shadow-sm"
                style={{ background: color, color: textOn(color) }}
              >
                <span className="truncate font-[family-name:var(--font-book)] text-[10px] leading-tight font-semibold">
                  {title.trim() || "Untitled"}
                </span>
              </div>
              <div className="min-w-0">
                <div className="truncate font-[family-name:var(--font-book)] font-semibold">
                  {title.trim() || "Untitled"}
                </div>
                {author.trim() && (
                  <div className="truncate text-sm text-muted-foreground">
                    {author.trim()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!title.trim()}>
              Create book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
