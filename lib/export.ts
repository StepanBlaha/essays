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
 * PDF export via a print window - renders the essay on a clean warm-paper
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

/* ---------- HTML <-> Markdown (client-side, for book export/import) ---------- */

/** Convert TipTap HTML to Markdown. Best-effort; runs in the browser. */
export function htmlToMarkdown(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const inline = (el: Node): string => {
    let out = "";
    el.childNodes.forEach((n) => {
      out += node(n);
    });
    return out;
  };
  const node = (n: Node): string => {
    if (n.nodeType === 3) return (n.textContent || "").replace(/\s+/g, " ");
    if (n.nodeType !== 1) return "";
    const e = n as HTMLElement;
    const tag = e.tagName.toLowerCase();
    switch (tag) {
      case "h1":
        return `\n# ${inline(e).trim()}\n\n`;
      case "h2":
        return `\n## ${inline(e).trim()}\n\n`;
      case "h3":
        return `\n### ${inline(e).trim()}\n\n`;
      case "p":
        return `${inline(e).trim()}\n\n`;
      case "br":
        return `\n`;
      case "strong":
      case "b":
        return `**${inline(e)}**`;
      case "em":
      case "i":
        return `*${inline(e)}*`;
      case "s":
      case "del":
      case "strike":
        return `~~${inline(e)}~~`;
      case "code":
        return e.parentElement?.tagName.toLowerCase() === "pre"
          ? inline(e)
          : `\`${inline(e)}\``;
      case "pre":
        return `\n\`\`\`\n${e.textContent || ""}\n\`\`\`\n\n`;
      case "a":
        return `[${inline(e)}](${e.getAttribute("href") || ""})`;
      case "blockquote":
        return (
          inline(e)
            .trim()
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n") + "\n\n"
        );
      case "ul":
        return (
          Array.from(e.children)
            .map((li) => `- ${inline(li).trim()}`)
            .join("\n") + "\n\n"
        );
      case "ol":
        return (
          Array.from(e.children)
            .map((li, i) => `${i + 1}. ${inline(li).trim()}`)
            .join("\n") + "\n\n"
        );
      case "hr":
        return `\n---\n\n`;
      default:
        return inline(e);
    }
  };
  return inline(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert (a subset of) Markdown to HTML for import. Best-effort. */
export function markdownToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, "$1<em>$2</em>")
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      flush();
      i++;
      continue;
    }
    para.push(line);
    i++;
  }
  flush();
  return out.join("\n");
}

/** Rough plain-text from Markdown (for search + reading-time). */
export function markdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~]/g, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
