/* Export + share helpers. All client-side, no backend. */

const WPM = 220;

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function charCount(text: string): number {
  return text.length;
}

export function readingTime(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / WPM));
}

export function safeFileName(title: string): string {
  const base = title.trim() || "untitled-essay";
  return base
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Trigger a browser download of a text blob. */
export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(title: string, markdown: string) {
  const heading = title.trim() ? `# ${title.trim()}\n\n` : "";
  downloadText(`${safeFileName(title)}.md`, heading + markdown, "text/markdown");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function emailEssay(title: string, text: string) {
  const subject = encodeURIComponent(title.trim() || "My essay");
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * PDF export via a print window — renders the essay on a clean warm-paper
 * sheet and opens the native print dialog (choose "Save as PDF").
 * Vector text, no rasterization, no heavy deps.
 */
export function exportPdf(title: string, contentHtml: string) {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return;
  const safeTitle = (title.trim() || "Untitled essay").replace(/</g, "&lt;");
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  @page { margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #2e2419;
    line-height: 1.7;
    font-size: 12pt;
    background: #fff;
  }
  .doc { max-width: 46rem; margin: 0 auto; padding: 24px; }
  h1.__title {
    font-size: 26pt; line-height: 1.15; margin: 0 0 4px;
    letter-spacing: -0.01em; font-weight: 600;
  }
  .__rule { border: none; border-top: 1px solid #d8c8a8; margin: 14px 0 24px; }
  h1, h2, h3 { line-height: 1.2; margin: 1.4em 0 0.5em; }
  p { margin: 0 0 1em; }
  blockquote {
    margin: 1em 0; padding-left: 1em;
    border-left: 3px solid #c0803a; color: #5b4c39; font-style: italic;
  }
  ul, ol { margin: 0 0 1em 1.4em; }
  code {
    font-family: "SFMono-Regular", Menlo, monospace; font-size: 0.9em;
    background: #f1e7d3; padding: 0.1em 0.35em; border-radius: 4px;
  }
  pre { background: #f1e7d3; padding: 12px 14px; border-radius: 8px; overflow: auto; }
  a { color: #9d6526; }
</style>
</head>
<body>
  <div class="doc">
    <h1 class="__title">${safeTitle}</h1>
    <hr class="__rule" />
    ${contentHtml}
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 300);
    };
  </script>
</body>
</html>`);
  win.document.close();
}
