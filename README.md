# Essays

A quiet, book-like place to write. Essays is a local-first writing app where your
work lives in your browser: no account, no server, no sync. You write essays,
shelve them into books, and read them back on a warm, distraction-free surface.

## Features

- **Rich text editor** built on TipTap, with Markdown input, a character/word
  count, and reading-time estimates.
- **Books and essays** with a many-to-many relationship: an essay can live in
  zero, one, or many books, and deleting a book never deletes its essays (they
  simply become unfiled).
- **A library shelf** with a 3D bookshelf view for browsing your collections.
- **Reader mode** for reading a whole book as a collection.
- **Local-first storage** via IndexedDB (Dexie). Everything stays on your device.
- **Portable collections**: export or import books as a downloadable `.json`
  file, or as a copy/paste share code, so you can hand a collection to someone
  else. Individual essays export to Markdown and PDF.
- **Light and dark** themes with a calm, paper-like design.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) and React 19
- [TipTap](https://tiptap.dev) for the editor
- [Dexie](https://dexie.org) over IndexedDB for storage
- [Tailwind CSS 4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com)
- [React Three Fiber](https://r3f.docs.pmnd.rs) and Three.js for the bookshelf
- TypeScript throughout

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run start` serves the production build
- `npm run lint` runs ESLint

## Data and privacy

All content is stored locally in your browser's IndexedDB (database name
`candlelight-3`). Nothing is sent anywhere. Clearing your browser data or using
a different browser or device will not carry your essays over unless you export
them first. Use the collection export to back up or move your work.

## Project structure

- `app/` Next.js routes, layout, and global styles
- `components/` editor, sidebar, library, reader, and UI primitives
- `lib/db.ts` Dexie schema, migrations, and data helpers
- `lib/export.ts`, `lib/share.ts` export, import, and share helpers
- `hooks/` small React hooks
