#!/usr/bin/env python3
# Build self-contained HTML versions of the project's Markdown docs so they
# render without a webserver (file:// works). Links between the converted
# .md files are rewritten to .html so navigation stays internal.
#
# One-shot tool: regenerates all five HTML files in-place. Re-run after any
# Markdown change. No external CSS — chess-board palette is embedded.

import re
import sys
from pathlib import Path

from markdown_it import MarkdownIt


def slugify(text: str) -> str:
    """GitHub-compatible heading slug: lowercase, drop punctuation, spaces -> hyphens.
    Unicode letters (umlauts etc.) are kept verbatim; the browser URL-encodes them
    in the href so anchors authored as #x-äöü-y work transparently."""
    s = text.lower()
    s = re.sub(r'[^\w\s-]', '', s, flags=re.UNICODE)
    s = s.strip().replace(' ', '-')
    return s


def add_heading_ids(md: MarkdownIt) -> None:
    """Walk each heading_open token and inject an id attribute derived from the
    following inline content. markdown-it-py's stable API: heading_open is
    followed by an inline token, then heading_close."""
    def render(self, tokens, idx, options, env):
        token = tokens[idx]
        if idx + 1 < len(tokens) and tokens[idx + 1].type == 'inline':
            content = tokens[idx + 1].content
            token.attrSet('id', slugify(content))
        return self.renderToken(tokens, idx, options, env)
    md.add_render_rule('heading_open', render)

DOCS = ['LEHRUNTERLAGE', 'knight', 'T_CONTRACT', 'knight_plan', 'PROTOKOLL']

CSS = """
:root {
  --color-light:  #f0d9b5;
  --color-dark:   #b58863;
  --color-ink:    #3a2410;
  --color-accent: #c0392b;
}
body {
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--color-ink);
  background: #fbf6ee;
  max-width: 48rem;
  margin: 2rem auto;
  padding: 0 1.5rem 4rem;
  line-height: 1.55;
}
h1, h2, h3, h4 { font-family: system-ui, -apple-system, sans-serif; }
h1 { font-size: 1.7rem; border-bottom: 2px solid var(--color-dark); padding-bottom: 0.3rem; }
h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid var(--color-dark); padding-bottom: 0.2rem; }
h3 { font-size: 1.1rem; margin-top: 1.6rem; }
h4 { font-size: 1rem; margin-top: 1.2rem; }
a { color: var(--color-accent); }
a:hover { text-decoration: none; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: var(--color-light);
  padding: 0.05em 0.3em;
  border-radius: 3px;
  font-size: 0.92em;
}
pre {
  background: var(--color-light);
  padding: 0.8rem 1rem;
  border-radius: 4px;
  overflow-x: auto;
  border-left: 3px solid var(--color-dark);
}
pre code { background: transparent; padding: 0; }
blockquote {
  border-left: 3px solid var(--color-accent);
  margin: 1rem 0;
  padding: 0.2rem 1rem;
  color: #5a3a1e;
  background: #fff9ee;
}
table { border-collapse: collapse; margin: 1rem 0; }
th, td { border: 1px solid var(--color-dark); padding: 0.3rem 0.7rem; text-align: left; }
th { background: var(--color-light); }
img { max-width: 100%; height: auto; border: 1px solid var(--color-dark); }
hr { border: none; border-top: 1px dashed var(--color-dark); margin: 2rem 0; }
.nav-back {
  display: inline-block;
  margin-bottom: 1rem;
  font-family: system-ui, sans-serif;
  font-size: 0.9rem;
}
"""

NAV_BACK = '<a class="nav-back" href="index.html">← back to app</a>'


def rewrite_md_links(text: str) -> str:
    """Rewrite [text](FILE.md) and [text](FILE.md#anchor) to .html for our docs."""
    pattern = r'(\]\()(' + '|'.join(re.escape(d) for d in DOCS) + r')\.md(#[^)]*)?\)'
    return re.sub(pattern, lambda m: f'{m.group(1)}{m.group(2)}.html{m.group(3) or ""})', text)


def build(md_path: Path, out_path: Path, md: MarkdownIt) -> None:
    raw = md_path.read_text(encoding='utf-8')
    raw = rewrite_md_links(raw)
    body = md.render(raw)
    title = md_path.stem
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
{NAV_BACK}
{body}
</body>
</html>
"""
    out_path.write_text(html, encoding='utf-8')
    print(f'  wrote {out_path.name} ({len(html):,} bytes)')


def main() -> int:
    md = MarkdownIt('default', {'html': True}).enable('table').enable('strikethrough')
    add_heading_ids(md)
    root = Path(__file__).parent
    print(f'building HTML in {root}/')
    for name in DOCS:
        src = root / f'{name}.md'
        dst = root / f'{name}.html'
        if not src.exists():
            print(f'  skip {name}.md (missing)')
            continue
        build(src, dst, md)
    return 0


if __name__ == '__main__':
    sys.exit(main())
