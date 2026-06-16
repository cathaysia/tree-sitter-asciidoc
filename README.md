# tree-sitter-asciidoc

[![tree-sitter-asciidoc on crates.io](https://img.shields.io/crates/v/tree-sitter-asciidoc?label=tree-sitter-asciidoc)](https://crates.io/crates/tree-sitter-asciidoc)
[![tree-sitter-asciidoc-inline on crates.io](https://img.shields.io/crates/v/tree-sitter-asciidoc-inline?label=tree-sitter-asciidoc-inline)](https://crates.io/crates/tree-sitter-asciidoc-inline)

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for
[AsciiDoc](https://docs.asciidoctor.org/asciidoc/latest/), the markup language.

It targets the AsciiDoc language as documented by Asciidoctor (the de-facto
reference while the [Eclipse AsciiDoc Language
specification](https://gitlab.eclipse.org/eclipse/asciidoc-lang/asciidoc-lang)
is still in progress).

## Two grammars

AsciiDoc is parsed by two cooperating grammars, a common pattern for markup
languages in tree-sitter (Markdown does the same):

| Package | Scope | Responsibility |
| --- | --- | --- |
| `tree-sitter-asciidoc` | block | Document structure: sections, lists, tables, delimited blocks, admonitions, block macros, comments. |
| `tree-sitter-asciidoc_inline` | inline | Span-level markup inside a line: bold/italic/monospace, macros, attribute references, autolinks, replacements. |

The block grammar parses a document into blocks, then **injects** the inline
grammar into the text-bearing parts (paragraph lines, table cells, macro
targets) via `queries/injections.scm`. Splitting the two keeps each grammar and
its external scanner tractable. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for how the pieces fit together.

## What it parses

- **Document header**: title, author line, revision line, attribute entries (with `\` line continuation)
- **Sections**: `==`..`======` headings, nested into a `section` tree, plus Markdown-style `#` ATX headings
- **Blocks**: listing (`----`), literal (`....`), example (`====`), sidebar (`****`), quote (`____`), open (`--`), passthrough (`++++`), Markdown fenced code (` ``` `)
- **Lists**: unordered, ordered, checklists, callouts, description lists
- **Tables**: `|===`, CSV (`,===`), DSV (`:===`), nested cells
- **Block attribute lists** parsed into structure: `[source#id.role%opt,ruby,cols="1,2"]` becomes a style, id, roles, options, positional and named attributes
- **Block macros**: `image::`, `include::`, `video::`, `toc::`, conditionals, and more
- **Inline**: constrained and unconstrained formatting, super/subscript, typographic quotes, role spans, a large macro set (link, image, xref, footnote, kbd, btn, menu, stem, pass, indexterm, diagrams), structured macro attributes, attribute references including counters, autolinks, replacements, escapes
- **Comments**, thematic and page breaks

The known gaps are tracked in [docs/LIMITATIONS.md](docs/LIMITATIONS.md), and the
things we want to tackle next live in [docs/ROADMAP.md](docs/ROADMAP.md).

## Installation

The grammars are published for several language bindings. Pick the one for your
host language.

JavaScript / Node:

```sh
npm install tree-sitter-asciidoc tree-sitter-asciidoc_inline
```

Rust:

```toml
[dependencies]
tree-sitter-asciidoc = "*"
tree-sitter-asciidoc_inline = "*"
```

Python:

```sh
pip install tree-sitter-asciidoc
```

C, Go, and Swift bindings are generated as well; see each grammar's `bindings/`
directory.

## Editor integration

Any tree-sitter host can load the grammar. For an editor that supports language
injection (for example Neovim via `nvim-treesitter`), register **both** grammars
and the injection query so inline markup is highlighted inside blocks. The
queries under `queries/` (`highlights.scm`, `injections.scm`) are the starting
point.

## Development

Prerequisites: [pnpm](https://pnpm.io/) and the
[tree-sitter CLI](https://github.com/tree-sitter/tree-sitter) (pinned in
`package.json`, currently `0.25.10`). Use the pinned CLI; a different version
reshuffles the generated tables and the committed `src/tree_sitter/array.h`.

```sh
pnpm install          # install dev dependencies
pnpm generate         # regenerate both parsers from grammar.js
pnpm test             # run the corpus tests for both grammars
```

To work on a single grammar, `cd` into `tree-sitter-asciidoc` or
`tree-sitter-asciidoc_inline` and run `tree-sitter generate` / `tree-sitter
test` there. Corpus tests live in each grammar's `test/corpus/`.

CI regenerates the parsers and fails if the committed output drifts, so run
`pnpm generate` and commit the regenerated `src/` before pushing. Formatting is
enforced by pre-commit (Biome for JavaScript, clang-format for the C scanner).

A few things worth knowing before you hack on the grammar:

- Most block- and span-level boundaries are decided by a hand-written **external
  scanner** in C (`src/scanner.c`), not by the grammar rules alone.
- `tree-sitter test --update` rewrites expected trees, but it strips the `|||`
  delimiter suffix that some corpus files use to embed literal `====` / `---` in
  test input. Update those files by hand.
- The queries are loaded by `tree-sitter test`, so a stale node name in a `.scm`
  file fails the whole run.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) before making structural
changes.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the block and inline grammars and their scanners work
- [Design decisions](docs/DESIGN_DECISIONS.md): the choices behind the current shape, and why
- [Limitations](docs/LIMITATIONS.md): what is not handled (yet) and how it currently parses
- [Roadmap](docs/ROADMAP.md): what we want to improve next

## License

Apache-2.0. See [LICENSE](LICENSE).
