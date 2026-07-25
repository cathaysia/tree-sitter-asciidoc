//! This crate provides asciidoc language support for the [tree-sitter][] parsing library.
//!
//! Typically, you will use the [language][language func] function to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! ```
//! let code = r#"
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! parser.set_language(&tree_sitter_asciidoc::language()).expect("Error loading asciidoc grammar");
//! let tree = parser.parse(code, None).unwrap();
//! assert!(!tree.root_node().has_error());
//! ```
//!
//! [Language]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Language.html
//! [language func]: fn.language.html
//! [Parser]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter::Language;

extern "C" {
    fn tree_sitter_asciidoc() -> Language;
}

/// Get the tree-sitter [Language][] for this grammar.
///
/// [Language]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Language.html
pub fn language() -> Language {
    unsafe { tree_sitter_asciidoc() }
}

/// The content of the [`node-types.json`][] file for this grammar.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers#static-node-types
pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");

// Uncomment these to include any queries that this grammar contains

pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");
pub const INJECTIONS_QUERY: &str = include_str!("../../queries/injections.scm");
// pub const LOCALS_QUERY: &str = include_str!("../../queries/locals.scm");
// pub const TAGS_QUERY: &str = include_str!("../../queries/tags.scm");

#[cfg(test)]
mod tests {
    use tree_sitter::{Query, QueryCursor, StreamingIterator};

    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading asciidoc grammar");
    }

    #[test]
    fn test_highlights_query_compiles() {
        Query::new(&super::language(), super::HIGHLIGHTS_QUERY)
            .expect("highlights.scm should compile");
    }

    #[test]
    fn test_literal_block_body_is_highlighted_as_raw_block() {
        let source = "....\nliteral text\n....\n";
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading asciidoc grammar");
        let tree = parser.parse(source, None).unwrap();

        let query = Query::new(&super::language(), super::HIGHLIGHTS_QUERY)
            .expect("highlights.scm should compile");
        let raw_block_index = query
            .capture_index_for_name("markup.raw.block")
            .expect("markup.raw.block capture should exist");

        let mut cursor = QueryCursor::new();
        let mut matches = cursor.matches(&query, tree.root_node(), source.as_bytes());
        let mut found_literal_body = false;
        while let Some(m) = matches.next() {
            for capture in m.captures {
                if capture.index == raw_block_index && capture.node.kind() == "literal_block_body" {
                    found_literal_body = true;
                }
            }
        }
        assert!(
            found_literal_body,
            "literal_block_body should be captured as markup.raw.block"
        );
    }

    // `queries/injections.scm` must resolve the injected language using only
    // predicates and properties that vanilla `tree_sitter::Query`/`QueryCursor`
    // evaluate (`#eq?`, `#match?`, `#any-of?`, `#set!`, ...). Neovim-only
    // predicates like `#gsub!`/`#lua-match?` are silently ignored by every
    // other consumer (Rust, WASM, Zed, Helix, ...), leaving `@injection.language`
    // holding the raw, untransformed attribute text instead of just the
    // language name. This pins the fix down so it can't regress.
    //
    // Patterns resolve the language two different ways: some capture it as
    // `@injection.language` (source/diagram/source-paragraph), others set it
    // as a static `(#set! injection.language ...)` property (asciidoc_inline,
    // latexmath). A capture match always wins when present; the property is
    // only used as a fallback so the generic `asciidoc_inline` patterns
    // (which match almost every line/paragraph) don't shadow it.
    fn injection_language(source: &str) -> Option<String> {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading asciidoc grammar");
        let tree = parser.parse(source, None).unwrap();

        let query = Query::new(&super::language(), super::INJECTIONS_QUERY)
            .expect("injections.scm should compile");
        let language_capture = query.capture_index_for_name("injection.language");

        let mut cursor = QueryCursor::new();
        let mut matches = cursor.matches(&query, tree.root_node(), source.as_bytes());
        let mut language_property = None;
        while let Some(m) = matches.next() {
            if let Some(idx) = language_capture {
                if let Some(capture) = m.captures.iter().find(|c| c.index == idx) {
                    return Some(capture.node.utf8_text(source.as_bytes()).unwrap().to_string());
                }
            }
            if language_property.is_none() {
                language_property = query
                    .property_settings(m.pattern_index)
                    .iter()
                    .find(|p| p.key.as_ref() == "injection.language")
                    .and_then(|p| p.value.as_deref())
                    .map(str::to_string);
            }
        }
        language_property
    }

    #[test]
    fn test_source_listing_injection_language_is_bare_language_name() {
        let source = "[source,rust]\n----\nfn main() {}\n----\n";
        assert_eq!(injection_language(source), Some("rust".to_string()));
    }

    #[test]
    fn test_diagram_listing_injection_language_matches_style() {
        let source = "[mermaid]\n----\ngraph TD;\n----\n";
        assert_eq!(injection_language(source), Some("mermaid".to_string()));
    }

    #[test]
    fn test_source_paragraph_injection_language_is_bare_language_name() {
        let source = "[source,rust]\nfn main() {}\n";
        assert_eq!(injection_language(source), Some("rust".to_string()));
    }

    #[test]
    fn test_latexmath_passthrough_injection_language_is_latex() {
        let source = "[latexmath]\n++++\n\\sqrt{2}\n++++\n";
        assert_eq!(injection_language(source), Some("latex".to_string()));
    }

    #[test]
    fn test_paragraph_injection_language_is_asciidoc_inline() {
        let source = "hello world\n";
        assert_eq!(injection_language(source), Some("asciidoc_inline".to_string()));
    }

    #[test]
    fn test_table_cell_injection_language_is_asciidoc_inline() {
        let source = "|===\n|hello\n|===\n";
        assert_eq!(injection_language(source), Some("asciidoc_inline".to_string()));
    }

    #[test]
    fn test_block_macro_target_injection_language_is_asciidoc_inline() {
        let source = "include::partial.adoc[]\n";
        assert_eq!(injection_language(source), Some("asciidoc_inline".to_string()));
    }
}
