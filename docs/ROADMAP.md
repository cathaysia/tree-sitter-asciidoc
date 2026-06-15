# Roadmap

What we would like to improve, roughly in priority order. Each entry links back
to the limitation it addresses in [LIMITATIONS.md](LIMITATIONS.md). This is a
wish list and a record of analysis, not a commitment or a schedule.

## Reliable line-ending / blank-line tokenization

This is the keystone change that unblocks the next two items. Today blank lines
are consumed as `_NEWLINE` extras and are invisible to the grammar, and the
external scanner cannot reliably tell "start of a block" from "middle of a
block" because plain content lines never go through it (and tree-sitter discards
scanner-state mutations on a `false` return).

Routing every line ending through the scanner (so it always knows whether the
next line begins a new block) would give a dependable `at_block_start` signal.
It is an invasive change to a core mechanism, so it deserves its own focused
pass with heavy corpus testing.

## List nesting

Addresses [flat lists](LIMITATIONS.md#lists-do-not-nest). The plan is the
scanner-stack approach: track a stack of marker depths (a signature per nesting
level), emit nest/dedent tokens (like indentation-based INDENT/DEDENT), serialize
the stack, and wrap nested lists in the grammar. This is the deepest scanner
change of the set and shares the line-tracking machinery above. It handles mixed
marker styles and multi-level dedents the way Asciidoctor does.

## Hanging-indent continuations

Addresses upstream issue #41
([hanging indents](LIMITATIONS.md#hanging-indent-continuations-under-admonitions)).
Once block-start state is reliable (first item above), the indented-literal
marker can be gated so a continuation line under an admonition / paragraph / list
item stays text instead of becoming a literal block, while a genuine indented
literal block after a blank line still parses correctly.

## Smaller, self-contained improvements

These do not depend on the line-tracking work:

- **Em dash and in-word smart apostrophe**
  ([replacements](LIMITATIONS.md#a-few-inline-replacements-are-missing)). The em
  dash is contextual (between word characters) and must not collide with the
  open-block `--` marker, so it needs care.
- **Grammar scope metadata.** Both `tree-sitter.json` files declare
  `"scope": "source.j2"` (a copy-paste leftover). They should be
  `source.asciidoc` and `source.asciidoc_inline`, and the duplicate
  `file-types` entries cleaned up.
- **Discrete headings and block options.** Now that block attribute lists are
  parsed into structure, `[discrete]`, `[%collapsible]`, and similar could be
  recognized semantically rather than left as generic style/option nodes.

## Possible future work

- Inter-document xref targets (`xref:doc.adoc#id[]`) as structured nodes.
- Richer table column-spec parsing (`cols="1,2a"`) from the already-structured
  attribute list.
- A `CONTRIBUTING.md` and per-grammar query docs once the above settle.

If you want to pick something up, the limitations doc explains the current
behavior for each item, and the architecture and design-decision docs explain
the machinery you will be working against.
