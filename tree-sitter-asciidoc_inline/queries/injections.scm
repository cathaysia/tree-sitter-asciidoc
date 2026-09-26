((stem_macro
  (macro_name) @_latex
  (attr) @injection.content)
  (#eq? @_latex "latexmath")
  (#set! injection.language "latex"))

((stem_macro
  (macro_name) @_asciimath
  (attr) @injection.content)
  (#any-of? @_asciimath "stem" "asciimath")
  (#set! injection.language "asciimath"))
