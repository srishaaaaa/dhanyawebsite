// Tiny, safe Markdown subset for CMS pages: headings, paragraphs, lists, bold, italic, links, rules.
// All input is escaped first; only whitelisted link schemes are emitted.
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => {
      const ok = /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(href);
      return ok ? `<a href="${href}">${text}</a>` : text;
    });
}

export function renderMarkdown(md: string) {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); flushList();
      const lvl = Math.min(m[1].length + 1, 5);
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushPara(); flushList(); out.push("<hr/>"); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      const kind = /^\s*\d/.test(line) ? "ol" : "ul";
      if (list !== kind) { flushList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join("\n");
}
