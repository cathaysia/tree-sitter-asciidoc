# Architecture

This document explains how `tree-sitter-asciidoc` is put together, so you can
find your way around before changing it.

## The two-grammar split

AsciiDoc, like Markdown, has a clean separation between **block** structure
(what blocks a document is made of) and **inline** structure (the markup inside
a line of text). tree-sitter handles this best with two grammars:

- `tree-sitter-asciidoc` (scope `source.asciidoc`) parses block structure.
- `tree-sitter-asciidoc_inline` (scope `source.asciidoc_inline`) parses span-level
  markup.

The block grammar never tries to understand `*bold*` or `link:...[]`. It parses
a document into blocks and treats the text of each block as opaque `line`s. The
inline grammar is then run on that text through tree-sitter's **injection**
mechanism.

Why split at all? Inline AsciiDoc is context-sensitive (constrained vs
unconstrained formatting, attribute references, macros) and the block level has
its own context sensitivity (delimited block nesting, list/section levels). One
combined grammar plus one combined external scanner would be far harder to
reason about and to keep unambiguous. Two smaller grammars, each with a focused
scanner, are easier to maintain and to test.

```
document (block grammar)
|- section
|   |- title1
|   `- section_block
|       `- paragraph
|           `- line   <-- injected: parsed by the inline grammar
|- listing_block
|   `- listing_block_body
`- table_block
    `- table_cell
        `- table_cell_content   <-- injected
```

## Injection

`tree-sitter-asciidoc/queries/injections.scm` tells the host to parse certain
block-grammar nodes with the inline grammar:

- `paragraph` and `line` content become `asciidoc_inline`
- `table_cell` content becomes `asciidoc_inline`
- a block macro `target` becomes `asciidoc_inline`
- source/diagram code blocks inject the detected language (see below)

Source-language injection is a nice payoff of parsing block attribute lists into
structure. For `[source,ruby]`, the language is a real node (the second
positional attribute), and for a diagram like `[mermaid]` it is the block style
itself. The injection query reads those nodes directly instead of running a
regex over an opaque attribute string.

## External scanners

Most of the interesting decisions happen in a hand-written external scanner in C
(`src/scanner.c` in each grammar), not in the `grammar.js` rules. tree-sitter's
generated LR parser cannot, on its own, decide things like "is this `----` the
start or the end of a listing block" or "is this `*` a bullet or emphasis." The
scanner provides those tokens (declared in each grammar's `externals`).

### Block scanner

The block scanner keeps a serialized **stack of open blocks**
(`Scanner.buffer`, an array of `{kind, counter}`), where `kind` is the block
type (delimited, listing, literal, sidebar, quoted, fenced, table, ...) and
`counter` is the delimiter length. When it sees a delimiter line it compares
against the stack top to decide start vs end, and pushes or pops accordingly.
The stack is serialized and deserialized so incremental re-parsing works.

It also emits, at the start of a line:

- section title markers (`title_h0_marker`..`title_h5_marker`), where the level
  is the run length of `=` (or `#` for Markdown ATX headings)
- list markers (`*`, `-`, `.`, ordered digit/alpha/roman, callouts)
- the indented-literal marker, document-attribute markers, table markers,
  description-list terms, and comment markers

`scanner_is_matching_raw_block()` reports whether we are inside a raw block
(listing/literal/fenced), where most markup is suppressed.

### Inline scanner

The inline scanner's main job is **constrained formatting**. AsciiDoc
distinguishes `*bold*` (constrained: needs word boundaries) from `**bold**`
(unconstrained). The scanner emits an opening delimiter token (for example
`_emphasis_begin`) only when a valid matching close exists later on the line, so
a stray `*` or the `#` in "issue #2" stays punctuation instead of starting a
formatting node that never closes. The same approach drives the two-character
openers for typographic quotes (`"` + `` ` `` and `'` + `` ` ``) and the hard
line break.

## Grammar structure highlights

A few rules are worth knowing because they shape large parts of the tree:

- **Sections** nest by heading level. A level-1 section (`==`) contains its
  content plus any deeper section, and each level closes when a same-or-higher
  heading appears. The heading nodes stay `title1`..`title5`, wrapped in a
  `section`. Container blocks (open/sidebar/quote/delimited/table cells) keep a
  flat `section_block` instead.
- **`section_block`** is the generic content-block wrapper (an optional
  attribute list / block title, followed by one block). Keeping it as the
  content wrapper is what let section nesting be added without rewriting the
  highlight and injection queries.
- **Attribute lists** (`[...]`) are parsed into `positional_attr` (carrying
  `block_style` plus `#id` / `.role` / `%option` shorthand on the first entry)
  and `named_attr` (`attribute_name` = `attribute_value`). The inline grammar
  parses macro attribute lists the same way.

## Build and test flow

`grammar.js` is the source of truth. `tree-sitter generate` compiles it to
`src/parser.c` (plus `grammar.json`, `node-types.json`), which are committed.
The external scanner `src/scanner.c` is hand-written and compiled alongside.
Corpus tests in `test/corpus/*.txt` assert the parse tree for sample input;
`tree-sitter test` runs them and also loads the queries, so a broken query
fails the test run.
