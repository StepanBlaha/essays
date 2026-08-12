"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  Share2,
  FileUp,
  FileText,
  Printer,
  FileJson,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { Book, Essay } from "@/lib/db";
import { readingTime } from "@/lib/export";
import {
  bundleFromBooks,
  bundleFromMarkdown,
  encodeBundle,
  decodeBundle,
  downloadBundle,
  downloadBookMarkdown,
  exportBookPdf,
  importBundle,
  parseBundle,
  type Bundle,
} from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type NewBookData = { title: string; author: string; color: string };

const PALETTE = [
  "#e6e1d7",
  "#d8c9a3",
  "#c8c2b6",
  "#c9a27a",
  "#d98c6a",
  "#b7796a",
  "#a24b3c",
  "#8a5a44",
  "#9a8f6b",
  "#7f8a80",
  "#6b7f5e",
  "#4a5d4a",
  "#5f7480",
  "#4a6b82",
  "#3f4247",
  "#2f3b3a",
  "#7a5c8a",
  "#2b2b2b",
];

/** Pick whichever of black/white gives higher WCAG contrast against a cover color. */
function textOn(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const contrastWithWhite = 1.05 / (L + 0.05);
  const contrastWithBlack = (L + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#1a1a1a";
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

  // share (export) + import
  const [share, setShare] = useState<{
    bundle: Bundle;
    name: string;
    book: Book | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCode, setImportCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Two-click delete confirm auto-reverts so it never lingers in a
  // destructive state - important for keyboard users who tab away instead
  // of moving the mouse off the card (which was the only reset before).
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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

  const runImport = async (bundle: Bundle) => {
    const { books: bc, essays: ec } = await importBundle(bundle);
    toast.success(
      `Imported ${bc} ${bc === 1 ? "book" : "books"} · ${ec} ${
        ec === 1 ? "essay" : "essays"
      }`,
    );
    setImporting(false);
    setImportCode("");
  };

  const importFromFile = async (file: File) => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".pdf")) {
        toast.error("PDFs can't be imported - they're a read-only format.");
        return;
      }
      const text = await file.text();
      const bundle = name.endsWith(".md")
        ? bundleFromMarkdown(text, file.name.replace(/\.md$/i, ""))
        : parseBundle(JSON.parse(text));
      await runImport(bundle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't import file.");
    }
  };

  const importFromCode = async () => {
    try {
      await runImport(decodeBundle(importCode));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't import code.");
    }
  };

  const copyShareCode = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(encodeBundle(share.bundle));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border px-6">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Share2 data-icon="inline-start" />
                Share
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setImporting(true)}>
              <Upload data-icon="inline-start" />
              Import a collection…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={books.length === 0}
              onClick={() =>
                setShare({
                  bundle: bundleFromBooks(books, essays),
                  name: "essays-library",
                  book: null,
                })
              }
            >
              <Download data-icon="inline-start" />
              Export whole library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus data-icon="inline-start" />
          New book
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X data-icon="inline-start" />
          Close
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10">
        {books.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-24 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BookOpen className="size-6" />
            </div>
            <h3 className="font-[family-name:var(--font-book)] text-2xl font-semibold">
              Your library is empty
            </h3>
            <p className="text-sm text-muted-foreground">
              Create your first book, or import a collection someone sent you.
            </p>
            <div className="flex items-center gap-2">
              <Button size="lg" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                New book
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setImporting(true)}
              >
                <Upload data-icon="inline-start" />
                Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => {
              const bookEssays = essays.filter((e) => e.bookIds.includes(book.id));
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
                    <div className="flex shrink-0 items-center gap-1">
                      {confirmDelete === book.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => {
                              onDeleteBook(book.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Delete “{book.title.trim() || "Untitled"}”?
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel delete"
                            className="rounded-md p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setConfirmDelete(null)}
                          >
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label="Export book"
                            title="Export / share book"
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 outline-none transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() =>
                              setShare({
                                bundle: bundleFromBooks([book], essays),
                                name: book.title.trim() || "book",
                                book,
                              })
                            }
                          >
                            <Download className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete book"
                            title="Delete book"
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 outline-none transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setConfirmDelete(book.id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New book */}
      <Dialog
        open={creating}
        onOpenChange={(o) => {
          setCreating(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
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
                Author <span className="text-muted-foreground">(optional)</span>
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
                      "size-7 rounded-full ring-1 ring-black/10 outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      color.toLowerCase() === c.toLowerCase() &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <label
                  className={cn(
                    "relative size-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10 transition",
                    !PALETTE.some(
                      (c) => c.toLowerCase() === color.toLowerCase(),
                    ) && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  )}
                  style={{
                    background:
                      "conic-gradient(#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)",
                  }}
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Custom color"
                  />
                </label>
              </div>
            </div>

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

      {/* Share (export) */}
      <Dialog open={!!share} onOpenChange={(o) => !o && setShare(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {share?.book
                ? `Share “${share.book.title.trim() || "Untitled"}”`
                : "Share library"}
            </DialogTitle>
            <DialogDescription>
              {share
                ? `${share.bundle.books.length} ${
                    share.bundle.books.length === 1 ? "book" : "books"
                  } · ${share.bundle.books.reduce(
                    (n, b) => n + b.essays.length,
                    0,
                  )} essays`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="col-span-2"
                onClick={() => share && downloadBundle(share.bundle, share.name)}
              >
                <FileJson data-icon="inline-start" />
                JSON file
              </Button>
              {share?.book ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      share.book &&
                      downloadBookMarkdown(share.book, essays)
                    }
                  >
                    <FileText data-icon="inline-start" />
                    Markdown
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => share.book && exportBookPdf(share.book, essays)}
                  >
                    <Printer data-icon="inline-start" />
                    PDF
                  </Button>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or copy a share code
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Textarea
              readOnly
              rows={3}
              className="max-h-40 resize-none font-mono text-xs break-all"
              value={share ? encodeBundle(share.bundle) : ""}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button onClick={copyShareCode}>
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy code"}
            </Button>
            <p className="text-xs text-muted-foreground">
              The code and JSON import fully; Markdown &amp; PDF are for reading.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog
        open={importing}
        onOpenChange={(o) => {
          setImporting(o);
          if (!o) setImportCode("");
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import a collection</DialogTitle>
            <DialogDescription>
              From a share code, a <code>.json</code> file, or a{" "}
              <code>.md</code> file. Imported books are added alongside yours -
              nothing is overwritten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.md,application/json,text/markdown"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFromFile(file);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <FileUp data-icon="inline-start" />
              Choose a file (.json or .md)…
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or paste a code
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Textarea
              rows={3}
              placeholder="Paste a share code here…"
              className="max-h-40 resize-none font-mono text-xs break-all"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImporting(false)}>
              Cancel
            </Button>
            <Button onClick={importFromCode} disabled={!importCode.trim()}>
              Import code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
