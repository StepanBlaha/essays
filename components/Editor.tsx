"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Markdown } from "tiptap-markdown";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";

declare module "@tiptap/core" {
  interface Storage {
    markdown: {
      getMarkdown(): string;
    };
  }
}
import type { Book, Essay } from "@/lib/db";
import { saveEssay, setEssayBooks } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  downloadMarkdown,
  copyToClipboard,
  emailEssay,
  exportPdf,
  readingTime,
} from "@/lib/export";
import {
  bundleFromEssay,
  encodeBundle,
  downloadBundle,
} from "@/lib/share";
import Toolbar from "./Toolbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "./Editor.module.css";

const AUTOSAVE_DELAY = 600;

export default function EssayEditor({
  essay,
  books,
}: {
  essay: Essay;
  books: Book[];
}) {
  const [title, setTitle] = useState(essay.title);

  const toggleBook = (bookId: string) => {
    const next = essay.bookIds.includes(bookId)
      ? essay.bookIds.filter((b) => b !== bookId)
      : [...essay.bookIds, bookId];
    setEssayBooks(essay.id, next);
  };
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const [copied, setCopied] = useState(false);

  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentEssayId = useRef(essay.id);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
        },
      }),
      Placeholder.configure({ placeholder: "Begin writing…" }),
      CharacterCount,
      Markdown,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setStatus("saving");
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
      const id = currentEssayId.current;
      bodyTimer.current = setTimeout(() => {
        saveEssay(id, { html: editor.getHTML(), text: editor.getText() }).then(
          () => setStatus("saved"),
        );
      }, AUTOSAVE_DELAY);
    },
  });

  // Switch essays: reset content + title without retriggering autosave.
  useEffect(() => {
    if (!editor) return;
    currentEssayId.current = essay.id;
    editor.commands.setContent(essay.html || "", { emitUpdate: false });
    setTitle(essay.title);
    setStatus("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essay.id, editor]);

  useEffect(() => {
    return () => {
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    setStatus("saving");
    if (titleTimer.current) clearTimeout(titleTimer.current);
    const id = currentEssayId.current;
    titleTimer.current = setTimeout(() => {
      saveEssay(id, { title: value }).then(() => setStatus("saved"));
    }, AUTOSAVE_DELAY);
  }, []);

  // Enter/ArrowDown in the title field hands off focus to the body, so
  // typing a title and continuing to write never needs the mouse.
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        editor?.commands.focus("start");
      }
    },
    [editor],
  );

  if (!editor) return null;

  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();
  const minutes = readingTime(editor.getText());

  const handleCopy = async () => {
    const ok = await copyToClipboard(editor.getText());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  // Portable bundle for THIS essay (imports elsewhere as a one-essay book).
  const essayBundle = () =>
    bundleFromEssay({
      title,
      html: editor.getHTML(),
      text: editor.getText(),
      createdAt: essay.createdAt,
    });

  const copyShareCode = async () => {
    const ok = await copyToClipboard(encodeBundle(essayBundle()));
    toast[ok ? "success" : "error"](
      ok ? "Share code copied" : "Couldn't copy to clipboard.",
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Toolbar editor={editor} />
        <div className="ml-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  {copied ? (
                    <Check data-icon="inline-start" />
                  ) : (
                    <Download data-icon="inline-start" />
                  )}
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  downloadMarkdown(title, editor.storage.markdown.getMarkdown())
                }
              >
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdf(title, editor.getHTML())}>
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>Copy text</DropdownMenuItem>
              <DropdownMenuItem onClick={() => emailEssay(title, editor.getText())}>
                Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyShareCode}>
                Copy share code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => downloadBundle(essayBundle(), title || "essay")}
              >
                Collection file (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pt-10 pb-40 sm:px-8 sm:pt-16">
          <Input
            aria-label="Essay title"
            className="mb-3 h-auto border-none bg-transparent px-0 py-0 text-3xl font-semibold tracking-tight text-foreground shadow-none focus-visible:ring-0 sm:text-4xl"
            placeholder="Untitled"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
          />

          <div className="mt-3 mb-10 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span
              role="status"
              aria-live="polite"
              className="inline-flex min-w-16 items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full bg-muted-foreground ${
                  status === "saving" ? "motion-safe:animate-pulse" : "opacity-40"
                }`}
              />
              {status === "saving" ? "Saving…" : "Saved"}
            </span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span>{words} words</span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span>{chars} chars</span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span>{minutes} min read</span>
          </div>

          <div className="mb-10 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Filed in</span>
            {books.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                No books yet - create one in the Library
              </span>
            ) : (
              books.map((b) => {
                const active = essay.bookIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleBook(b.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: b.color }}
                      aria-hidden="true"
                    />
                    {b.title.trim() || "Untitled"}
                    {active && <Check className="size-3" />}
                  </button>
                );
              })
            )}
          </div>

          <EditorContent
            editor={editor}
            className={`font-[family-name:var(--font-book)] text-lg leading-8 text-foreground ${styles.body}`}
          />
        </div>
      </div>
    </div>
  );
}
