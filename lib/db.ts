import Dexie, { type Table } from "dexie";
import { BOOKS } from "@/components/bookshelf/books-data";

export interface Essay {
  id: string;
  /** Books this essay belongs to. Empty = unfiled. Many-to-many. */
  bookIds: string[];
  title: string;
  /** TipTap-serialized HTML - source of truth for rendering */
  html: string;
  /** Plain text mirror - used for search + reading-time on the list */
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  /** matte spine / cover color */
  color: string;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_BOOK_COLOR = "#c8c2b6";
const NEW_BOOK_COLOR = "#7f8a80";

class CandlelightDB extends Dexie {
  essays!: Table<Essay, string>;
  books!: Table<Book, string>;

  constructor() {
    super("candlelight-3");
    this.version(1).stores({
      // primary key `id`; indexes for sort + title search
      essays: "id, updatedAt, title",
    });

    this.version(2)
      .stores({
        essays: "id, bookId, updatedAt, title",
        books: "id, updatedAt, title",
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        const defaultBookId = uuid();
        await tx.table<Book, string>("books").add({
          id: defaultBookId,
          title: "My Essays",
          author: "",
          description: "",
          color: DEFAULT_BOOK_COLOR,
          createdAt: now,
          updatedAt: now,
        });
        await tx
          .table("essays")
          .toCollection()
          .modify((essay: { bookId?: string }) => {
            (essay as { bookId?: string }).bookId = defaultBookId;
          });
      });

    // Many-to-many: an essay can belong to zero or many books.
    this.version(3)
      .stores({
        essays: "id, *bookIds, updatedAt, title",
        books: "id, updatedAt, title",
      })
      .upgrade(async (tx) => {
        await tx
          .table("essays")
          .toCollection()
          .modify((essay: { bookId?: string; bookIds?: string[] }) => {
            essay.bookIds = essay.bookId ? [essay.bookId] : [];
            delete essay.bookId;
          });
      });
  }
}

export const db = new CandlelightDB();

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Idempotently seeds the shelf with sample books from `BOOKS`.
 * Never overwrites existing books - safe to call on every app init.
 */
export async function seedBooks(): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.books, async () => {
    for (const seed of BOOKS) {
      const existing = await db.books.get(seed.id);
      if (existing) continue;
      await db.books.add({
        id: seed.id,
        title: seed.title,
        author: seed.author,
        description: seed.description,
        color: seed.color,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

export async function createBook(
  init?: Partial<Pick<Book, "title" | "author" | "description" | "color">>,
): Promise<string> {
  const now = Date.now();
  const id = uuid();
  await db.books.add({
    id,
    title: init?.title ?? "Untitled Book",
    author: init?.author ?? "",
    description: init?.description ?? "",
    color: init?.color ?? NEW_BOOK_COLOR,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateBook(
  id: string,
  patch: Partial<Pick<Book, "title" | "author" | "description" | "color">>,
): Promise<void> {
  await db.books.update(id, { ...patch, updatedAt: Date.now() });
}

/** Delete a book. Its essays are kept - the book is just removed from their
 *  `bookIds` (an essay in no books becomes "unfiled", not deleted). */
export async function deleteBook(id: string): Promise<void> {
  await db.transaction("rw", db.books, db.essays, async () => {
    await db.essays
      .where("bookIds")
      .equals(id)
      .modify((essay) => {
        essay.bookIds = essay.bookIds.filter((b) => b !== id);
        essay.updatedAt = Date.now();
      });
    await db.books.delete(id);
  });
}

/** Create an essay, optionally already filed into one or more books. */
export async function createEssay(bookIds: string[] = []): Promise<string> {
  const now = Date.now();
  const id = uuid();
  await db.essays.add({
    id,
    bookIds,
    title: "",
    html: "",
    text: "",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Set exactly which books an essay belongs to. */
export async function setEssayBooks(
  id: string,
  bookIds: string[],
): Promise<void> {
  await db.essays.update(id, { bookIds, updatedAt: Date.now() });
}

export async function saveEssay(
  id: string,
  patch: Partial<Pick<Essay, "title" | "html" | "text">>,
): Promise<void> {
  await db.essays.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteEssay(id: string): Promise<void> {
  await db.essays.delete(id);
}
