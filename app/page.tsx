"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, createEssay, createBook, deleteBook } from "@/lib/db";
import AppSidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import Collection from "@/components/Collection";
import { Library } from "@/components/library/Library";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  const books =
    useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray(), []) ??
    [];
  const essays =
    useLiveQuery(
      () => db.essays.orderBy("updatedAt").reverse().toArray(),
      [],
    ) ?? [];

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showShelf, setShowShelf] = useState(false);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null && essays.length > 0) {
      setSelectedId(essays[0].id);
    }
  }, [selectedId, essays]);

  const selected = essays.find((e) => e.id === selectedId) ?? null;

  // Essays can only be created into an existing book.
  const handleNew = async () => {
    const bookId = activeBookId ?? books[0]?.id;
    if (!bookId) return;
    const id = await createEssay(bookId);
    setSelectedId(id);
  };

  const readerBook = books.find((b) => b.id === readerBookId) ?? null;
  const readerEssays = readerBookId
    ? essays.filter((e) => e.bookId === readerBookId)
    : [];

  return (
    <SidebarProvider>
      <AppSidebar
        essays={essays}
        canCreateEssay={books.length > 0}
        onNew={handleNew}
        onOpenBook={() => setShowShelf(true)}
      />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-6">
          <span className="font-[family-name:var(--font-book)] text-sm font-medium text-muted-foreground">
            {showShelf
              ? "Library"
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
              onNewBook={async (data) => {
                const id = await createBook(data);
                setActiveBookId(id);
              }}
              onDeleteBook={deleteBook}
              onEnterReader={(id) => {
                setReaderBookId(id);
                setShowShelf(false);
              }}
            />
          ) : selected ? (
            <Editor essay={selected} />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center">
              <p className="font-[family-name:var(--font-book)] text-lg text-muted-foreground italic">
                An empty desk. Start your first essay.
              </p>
            </div>
          )}
        </main>
      </SidebarInset>

      {readerBook && (
        <Collection
          book={readerBook}
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
