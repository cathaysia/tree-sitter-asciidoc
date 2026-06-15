# Design decisions

This records the non-obvious choices behind the current grammar, so they are not
re-litigated or accidentally undone. For how the pieces fit together, see
[ARCHITECTURE.md](ARCHITECTURE.md).

## Split block and inline grammars

AsciiDoc is parsed by a block grammar that injects an inline grammar (see
[ARCHITECTURE.md](ARCHITECTURE.md)). The alternative, one grammar that handles
both, would need a single external scanner juggling block nesting and
constrained inline formatting at once. The split keeps each grammar and its
scanner small enough to reason about, mirrors how tree-sitter's Markdown grammar
is built, and lets the inline grammar be reused wherever inline content appears
(paragraphs, table cells, macro targets).

## Boundaries live in the external scanner

AsciiDoc has too much context sensitivity for a pure LR grammar: a delimiter
line can open or close a block depending on what is already open, `*` is a
bullet at the start of a line and emphasis mid-line, and constrained formatting
depends on word boundaries and on a matching delimiter existing later in the
line. These decisions are made in C in `src/scanner.c` and surfaced as external
tokens. The grammar rules then stay declarative.

Consequence: the scanner carries serialized state (the open-block stack), so it
behaves correctly under incremental re-parsing.

## Constrained formatting via lookahead-gated openers

The inline scanner emits an opening delimiter (for example `_emphasis_begin`)
only when a valid matching close exists later on the same line. This is the
mechanism that keeps a lone `*`, the `#` in "issue #2", or the `_` in
`do_something_useful` as plain punctuation rather than error-recovering into an
unterminated formatting node. Typographic-quote openers and the hard line break
use the same gate.

## Sections wrap content but keep `title1`..`title5`

When section nesting was added, two shapes were possible: rename headings to a
single `title` node, or keep the existing `title1`..`title5` and wrap them in a
new `section`. We kept the level-specific heading nodes and wrapped them. The
heading level is already encoded in the marker token, so a generic `title` would
not add information, and renaming would break every existing highlight query and
any downstream consumer. The additive choice landed cleanly with no query
changes.

Sections nest at the document level only. Inside container blocks
(open/sidebar/quote/delimited blocks, table cells) a heading stays a flat
`section_block`, because headings there are rare (usually discrete headings) and
nesting them would widen the blast radius for little gain.

An illegal level skip (for example `==` straight to `====`) still nests rather
than erroring: a section body accepts any deeper section, and the innermost open
section greedily claims a deeper heading.

## `section_block` is the content wrapper, and it stayed

`section_block` wraps a single content block (an optional attribute list / block
title plus one block). Keeping it as the wrapper, and routing only headings
through the new `section` nodes, is what allowed section nesting to be a purely
additive change: the existing highlight and injection queries match
`section_block` and kept working unchanged.

## Attribute lists are parsed into structure

Both block attribute lists (`[source#id.role%opt,ruby,cols="1,2"]`) and inline
macro attribute lists (`image:x[Alt Text,200,role=external]`) are parsed into
`positional_attr` and `named_attr` nodes, with the first positional carrying the
style and the `#id` / `.role` / `%option` shorthand. Earlier these were a single
opaque string.

Rules that fall out of matching Asciidoctor:

- A quoted value may contain commas (`["Arthur, King"]`); an unquoted value may
  not (the comma separates entries).
- An unquoted **named** value may contain `=` (a URL query string, say); a
  positional value may not, because the `=` is what makes an entry named.
- `stem` / `latexmath` / `pass` keep their attribute raw and unsplit, since math
  and passthrough content must not be comma-split.

The block and inline grammars use the same node names for these so consumers
learn one shape.

## Markdown compatibility, where Asciidoctor allows it

Asciidoctor accepts some Markdown syntax. We support what it does:

- ATX headings (`#`..`######`) map to the same section levels as `=`.
- Fenced code blocks (` ``` `) map onto the listing block, tracked with a
  dedicated stack kind so a backtick fence never closes a `----` listing of the
  same length. The opening fence's info string (the language) is pulled into the
  start marker.
- Markdown blockquotes (`>`) are supported.

## Text replacements use source forms

Inline replacements match what you type, not the rendered entity: `->`, `=>`,
`<-`, `<=`, `(C)`, `(R)`, `(TM)`, `...`. (An earlier version matched the HTML
entities like `-&gt;`, which never appear in source.)

## Counter attribute references

`{counter:name}` and the silent `{counter2:name}` (with an optional
`{counter:name:5}` seed) parse to a dedicated `counter` node. The function name
and its trailing colon are one token, so a plain `{counter}` reference still
resolves to an ordinary attribute reference by longest match.

## Generated parser is committed; use the pinned CLI

`src/parser.c` and friends are generated from `grammar.js` and committed, and CI
fails if they drift. Always regenerate with the tree-sitter CLI version pinned
in `package.json`. A different CLI version rewrites `src/tree_sitter/array.h` and
reshuffles tables, producing a noisy, version-specific diff.
