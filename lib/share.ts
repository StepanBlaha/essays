// Portable collection export/import. Local-only: collections travel as a
// downloadable .json file OR a copy/paste share code (base64 of the JSON),
// so people can send books to each other and import them.

import { db, uuid, type Book, type Essay } from "@/lib/db";
import {
  downloadText,
  safeFileName,
  htmlToMarkdown,
  markdownToHtml,
  markdownToText,
  exportPdf,
} from "@/lib/export";

const FORMAT = "candlelight-collection";
const VERSION = 1;

export type PortableEssay = {
  title: string;
  html: string;
  text: string;
  createdAt: number;
};
export type PortableBook = {
  title: string;
  author: string;
  description: string;
  color: string;
  essays: PortableEssay[];
};
export type Bundle = {
  format: typeof FORMAT;
  version: number;
  exportedAt: number;
  books: PortableBook[];
};

/** Wrap a single essay as a bundle (imports as a new one-essay book). */
export function bundleFromEssay(
  essay: PortableEssay,
  book?: { title?: string; author?: string; color?: string },
): Bundle {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    books: [
      {
        title: book?.title || essay.title || "Untitled",
        author: book?.author || "",
        description: "",
        color: book?.color || "#7f8a80",
        essays: [essay],
      },
    ],
  };
}

/** Build a portable bundle from books + their essays. */
export function bundleFromBooks(books: Book[], essays: Essay[]): Bundle {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    books: books.map((book) => ({
      title: book.title,
      author: book.author,
      description: book.description,
      color: book.color,
      essays: essays
        .filter((e) => e.bookIds.includes(book.id))
        .map((e) => ({
          title: e.title,
          html: e.html,
          text: e.text,
          createdAt: e.createdAt,
        })),
    })),
  };
}

/** Validate + coerce an unknown object into a Bundle (throws on bad input). */
export function parseBundle(input: unknown): Bundle {
  if (!input || typeof input !== "object") {
    throw new Error("Not a valid collection file.");
  }
  const obj = input as Record<string, unknown>;
  if (obj.format !== FORMAT || !Array.isArray(obj.books)) {
    throw new Error("This doesn't look like an Essays collection.");
  }
  const books: PortableBook[] = obj.books.map((b) => {
    const book = (b ?? {}) as Record<string, unknown>;
    const essaysRaw = Array.isArray(book.essays) ? book.essays : [];
    return {
      title: String(book.title ?? ""),
      author: String(book.author ?? ""),
      description: String(book.description ?? ""),
      color: String(book.color ?? "#7f8a80"),
      essays: essaysRaw.map((e) => {
        const essay = (e ?? {}) as Record<string, unknown>;
        return {
          title: String(essay.title ?? ""),
          html: String(essay.html ?? ""),
          text: String(essay.text ?? ""),
          createdAt: Number(essay.createdAt) || Date.now(),
        };
      }),
    };
  });
  return { format: FORMAT, version: VERSION, exportedAt: Date.now(), books };
}

/* ---- share code (base64 of the JSON, UTF-8 safe + chunked) ---- */

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeBundle(bundle: Bundle): string {
  return toBase64(new TextEncoder().encode(JSON.stringify(bundle)));
}
export function decodeBundle(code: string): Bundle {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(fromBase64(code)));
  } catch {
    throw new Error("That share code is invalid or incomplete.");
  }
  return parseBundle(json);
}

/** Download a bundle as a .json file. */
export function downloadBundle(bundle: Bundle, name: string): void {
  downloadText(
    `${safeFileName(name)}.essays.json`,
    JSON.stringify(bundle, null, 2),
    "application/json",
  );
}

/* ---- Markdown + PDF (human-readable formats) ---- */

/** A whole book as Markdown - one `#` heading per essay (round-trips on import). */
export function bookToMarkdown(book: Book, essays: Essay[]): string {
  const es = essays.filter((e) => e.bookIds.includes(book.id));
  const body = es
    .map(
      (e) =>
        `# ${e.title.trim() || "Untitled"}\n\n${
          htmlToMarkdown(e.html) || e.text.trim()
        }`,
    )
    .join("\n\n");
  return `${body}\n`;
}

export function downloadBookMarkdown(book: Book, essays: Essay[]): void {
  downloadText(
    `${safeFileName(book.title || "book")}.md`,
    bookToMarkdown(book, essays),
    "text/markdown",
  );
}

/** Open the print dialog with the whole book (choose "Save as PDF"). */
export function exportBookPdf(book: Book, essays: Essay[]): void {
  const es = essays.filter((e) => e.bookIds.includes(book.id));
  const content = es
    .map(
      (e) =>
        `<h2>${(e.title.trim() || "Untitled").replace(/</g, "&lt;")}</h2>${
          e.html.trim() || `<p>${e.text.replace(/</g, "&lt;")}</p>`
        }`,
    )
    .join("<hr/>");
  exportPdf(book.title || "Book", content);
}

/** Parse a Markdown document into a bundle (one book, `#` headings = essays). */
export function bundleFromMarkdown(md: string, name: string): Bundle {
  const sections = md
    .split(/^#\s+/m)
    .map((s) => s.trim())
    .filter(Boolean);
  let essays: PortableEssay[];
  if (sections.length <= 1) {
    essays = [
      {
        title: name,
        html: markdownToHtml(md),
        text: markdownToText(md),
        createdAt: Date.now(),
      },
    ];
  } else {
    essays = sections.map((sec) => {
      const nl = sec.indexOf("\n");
      const title = (nl >= 0 ? sec.slice(0, nl) : sec).trim();
      const rest = nl >= 0 ? sec.slice(nl + 1).trim() : "";
      return {
        title,
        html: markdownToHtml(rest),
        text: markdownToText(rest),
        createdAt: Date.now(),
      };
    });
  }
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    books: [
      {
        title: name,
        author: "",
        description: "",
        color: "#7f8a80",
        essays,
      },
    ],
  };
}

/** Write a bundle into the local DB under fresh ids. Returns what was added. */
export async function importBundle(
  bundle: Bundle,
): Promise<{ books: number; essays: number }> {
  const now = Date.now();
  let books = 0;
  let essays = 0;
  await db.transaction("rw", db.books, db.essays, async () => {
    for (const pb of bundle.books) {
      const bookId = uuid();
      await db.books.add({
        id: bookId,
        title: pb.title || "Untitled Book",
        author: pb.author || "",
        description: pb.description || "",
        color: pb.color || "#7f8a80",
        createdAt: now,
        updatedAt: now,
      });
      books += 1;
      for (const pe of pb.essays) {
        await db.essays.add({
          id: uuid(),
          bookIds: [bookId],
          title: pe.title || "",
          html: pe.html || "",
          text: pe.text || "",
          createdAt: pe.createdAt || now,
          updatedAt: now,
        });
        essays += 1;
      }
    }
  });
  return { books, essays };
}
