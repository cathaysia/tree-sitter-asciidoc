//! This crate provides asciidocInline language support for the [tree-sitter][] parsing library.
//!
//! Typically, you will use the [language][language func] function to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! ```
//! let code = r#"
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! parser.set_language(&tree_sitter_asciidoc_inline::language()).expect("Error loading asciidocInline grammar");
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
    fn tree_sitter_asciidoc_inline() -> Language;
}

/// Get the tree-sitter [Language][] for this grammar.
///
/// [Language]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Language.html
pub fn language() -> Language {
    unsafe { tree_sitter_asciidoc_inline() }
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
            .expect("Error loading asciidocInline grammar");
    }

    #[test]
    fn test_highlights_query_compiles() {
        Query::new(&super::language(), super::HIGHLIGHTS_QUERY)
            .expect("highlights.scm should compile");
    }

    #[test]
    fn test_injections_query_compiles() {
        Query::new(&super::language(), super::INJECTIONS_QUERY)
            .expect("injections.scm should compile");
    }

    // Returns the (capture_name, node_kind) pairs produced by highlights.scm for `source`.
    fn captures(source: &str) -> Vec<(String, String)> {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading asciidocInline grammar");
        let tree = parser.parse(source, None).unwrap();

        let query = Query::new(&super::language(), super::HIGHLIGHTS_QUERY)
            .expect("highlights.scm should compile");
        let names = query.capture_names();

        let mut cursor = QueryCursor::new();
        let mut matches = cursor.matches(&query, tree.root_node(), source.as_bytes());
        let mut out = vec![];
        while let Some(m) = matches.next() {
            for capture in m.captures {
                out.push((
                    names[capture.index as usize].to_string(),
                    capture.node.kind().to_string(),
                ));
            }
        }
        out
    }

    #[test]
    fn test_intrinsic_attribute_is_highlighted_as_constant() {
        let found = captures("The gap is {blank}here.\n");
        assert!(
            found.contains(&("constant".to_string(), "intrinsic_attributes".to_string())),
            "expected intrinsic_attributes to be captured as @constant, got {found:?}"
        );
    }

    #[test]
    fn test_typographic_quote_is_highlighted_as_special_string() {
        let found = captures("A \"`typographic quote`\" example.\n");
        assert!(
            found.contains(&("string.special".to_string(), "typographic_quote".to_string())),
            "expected typographic_quote to be captured as @string.special, got {found:?}"
        );
    }

    #[test]
    fn test_macro_passthrough_content_is_highlighted_as_raw() {
        let found = captures("See pass:c[<u>underline</u>] for raw passthrough.\n");
        assert!(
            found.contains(&("markup.raw".to_string(), "attr".to_string())),
            "expected macro_passthrough's attr to be captured as @markup.raw, got {found:?}"
        );
    }

    #[test]
    fn test_counter_is_highlighted() {
        let found = captures("Chapter {counter:chapno}.\n");
        assert!(
            found.contains(&("keyword".to_string(), "counter_function".to_string())),
            "expected counter_function to be captured as @keyword, got {found:?}"
        );
        assert!(
            found.contains(&("constant".to_string(), "attribute_name".to_string())),
            "expected counter's attribute_name to be captured as @constant, got {found:?}"
        );
    }
}
