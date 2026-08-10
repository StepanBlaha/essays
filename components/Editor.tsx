"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Markdown } from "tiptap-markdown";
import { Download, Check } from "lucide-react";

declare module "@tiptap/core" {
  interface Storage {
    markdown: {
      getMarkdown(): string;
    };
  }
}
import type { Essay } from "@/lib/db";
import { saveEssay } from "@/lib/db";
import {
  downloadMarkdown,
  copyToClipboard,
  emailEssay,
  exportPdf,
  readingTime,
} from "@/lib/export";
import Toolbar from "./Toolbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "./Editor.module.css";

const AUTOSAVE_DELAY = 600;

export default function EssayEditor({ essay }: { essay: Essay }) {
  const [title, setTitle] = useState(essay.title);
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-3">
        <Toolbar editor={editor} />
        <div className="ml-auto">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-6 pt-16 pb-40 sm:px-8">
          <Input
            className="mb-3 h-auto border-none bg-transparent px-0 py-0 text-3xl font-semibold tracking-tight text-foreground shadow-none focus-visible:ring-0 sm:text-4xl"
            placeholder="Untitled"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />

          <div className="mt-3 mb-10 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={status === "saving" ? "secondary" : "outline"}>
              {status === "saving" ? "Saving…" : "Saved"}
            </Badge>
            <span>{words} words</span>
            <span className="text-border">·</span>
            <span>{chars} chars</span>
            <span className="text-border">·</span>
            <span>{minutes} min read</span>
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
