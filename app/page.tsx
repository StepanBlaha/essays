"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, createEssay, createBook, deleteBook, deleteEssay } from "@/lib/db";
import AppSidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import Collection from "@/components/Collection";
import { Library } from "@/components/library/Library";
import { AllEssays } from "@/components/essays/AllEssays";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Home() {
  const books =
    useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray(), []) ??
    [];
  const essays =
    useLiveQuery(
      () => db.essays.orderBy("updatedAt").reverse().toArray(),
      [],
    ) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showShelf, setShowShelf] = useState(false);
  const [showAllEssays, setShowAllEssays] = useState(false);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null && essays.length > 0) {
      setSelectedId(essays[0].id);
    }
  }, [selectedId, essays]);

  const selected = essays.find((e) => e.id === selectedId) ?? null;

  const openEditor = (id: string) => {
    setSelectedId(id);
    setShowShelf(false);
    setShowAllEssays(false);
  };

  // New essays start unfiled; you add them to book(s) from the editor.
  const handleNew = async () => {
    const id = await createEssay([]);
    openEditor(id);
  };

  const readerBook = books.find((b) => b.id === readerBookId) ?? null;
  const readerEssays = readerBookId
    ? essays.filter((e) => e.bookIds.includes(readerBookId))
    : [];

  return (
    <SidebarProvider>
      <AppSidebar
        essays={essays}
        showingLibrary={showShelf}
        showingAllEssays={showAllEssays}
        onNew={handleNew}
        onOpenBook={() => {
          setShowShelf(true);
          setShowAllEssays(false);
        }}
        onOpenAllEssays={() => {
          setShowAllEssays(true);
          setShowShelf(false);
        }}
      />

      <SidebarInset>
        <header className="flex h-14 min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-6">
          <SidebarTrigger className="md:hidden" aria-label="Open menu" />
          <span className="min-w-0 truncate font-[family-name:var(--font-book)] text-sm font-medium text-muted-foreground">
            {showShelf
              ? "Library"
              : showAllEssays
                ? "All essays"
                : selected
                  ? selected.title.trim() || "Untitled"
                  : "Essays"}
          </span>
        </header>

        <main className="relative min-h-0 flex-1">
          {showShelf ? (
            <Library
              books={books}
              essays={essays}
              onClose={() => setShowShelf(false)}
              onNewBook={(data) => createBook(data)}
              onDeleteBook={deleteBook}
              onEnterReader={(id) => {
                setReaderBookId(id);
                setShowShelf(false);
              }}
            />
          ) : showAllEssays ? (
            <AllEssays
              essays={essays}
              books={books}
              onOpen={openEditor}
              onDelete={deleteEssay}
              onNew={handleNew}
            />
          ) : selected ? (
            <Editor key={selected.id} essay={selected} books={books} />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <p className="font-[family-name:var(--font-book)] text-lg text-muted-foreground italic">
                  An empty desk. Start your first essay.
                </p>
                <Button onClick={handleNew}>
                  <Plus aria-hidden="true" />
                  New essay
                </Button>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>

      {readerBook && (
        <Collection
          book={readerBook}
          books={books}
          essays={readerEssays}
          onClose={() => {
            setReaderBookId(null);
            setShowShelf(true);
          }}
        />
      )}
    </SidebarProvider>
  );
}
