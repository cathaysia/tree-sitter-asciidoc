((block_macro
  (block_macro_name)
  (target) @injection.content)
  (#set! injection.language "asciidoc_inline"))

((table_cell
  (table_cell_content) @injection.content)
  (#set! injection.language "asciidoc_inline"))

; Lines outside paragraphs contain inline AsciiDoc too (titles, list items, etc.).
([
  (admonition (line) @injection.content)
  (block_title (line) @injection.content)
  (callout_list_item (line) @injection.content)
  (checked_list_item (line) @injection.content)
  (description_list_item (line) @injection.content)
  (document_attr (line) @injection.content)
  (document_title (line) @injection.content)
  (ordered_list_item (line) @injection.content)
  (quoted_block (line) @injection.content)
  (quoted_line (line) @injection.content)
  (quoted_md_block (line) @injection.content)
  (title1 (line) @injection.content)
  (title2 (line) @injection.content)
  (title3 (line) @injection.content)
  (title4 (line) @injection.content)
  (title5 (line) @injection.content)
  (unordered_list_item (line) @injection.content)
]
  (#set! injection.include-children)
  (#set! injection.language "asciidoc_inline"))

; Plain paragraphs use the inline grammar. Source-styled paragraphs are
; excluded because they are injected in their declared language below.
((section_block
  (paragraph) @injection.content) @_block
  (#not-match? @_block "(^|\\n)\\[\\s*source\\s*(?:[,#.%\\]])")
  (#set! injection.include-children)
  (#set! injection.language "asciidoc_inline"))

; Source listing: `[source,ruby]` - the language is the second positional.
((section_block
  (element_attr
    (positional_attr
      (block_style))
    (positional_attr) @injection.language)
  (listing_block
    (listing_block_start_marker)
    (listing_block_body) @injection.content
    (listing_block_end_marker))))

; Diagram listing: `[mermaid]` - the language is the style itself.
((section_block
  (element_attr
    (positional_attr
      (block_style) @injection.language))
  (listing_block
    (listing_block_start_marker)
    (listing_block_body) @injection.content
    (listing_block_end_marker)))
  (#any-of? @injection.language
    "a2s" "barcode" "blockdiag" "bpmn" "bytefield" "d2" "dbml" "diagrams" "ditaa" "dpic" "erd"
    "gnuplot" "graphviz" "lilypond" "meme" "mermaid" "msc" "nomnoml" "pikchr" "plantuml" "shaape"
    "smcat" "structurizr" "svgbob" "symbolator" "syntrax" "tikz" "umlet" "vega" "wavedrom"))

; Source paragraph: `[source,ruby]` over an undelimited source block.
((section_block
  (element_attr
    (positional_attr
      (block_style))
    (positional_attr) @injection.language)
  (paragraph) @injection.content)
  (#set! injection.include-children))

; latexmath passthrough block, mapped onto the latex grammar.
(section_block
  (element_attr
    (positional_attr
      (block_style) @_style))
  (passthrough_block
    (passthrough_block_marker)
    (listing_block_body) @injection.content
    (passthrough_block_marker))
  (#any-of? @_style "latexmath")
  (#set! injection.language "latex"))
