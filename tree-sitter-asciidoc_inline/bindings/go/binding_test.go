package tree_sitter_asciidoc_inline_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-asciidoc_inline"
)

func TestCanParse(t *testing.T) {
	parser := tree_sitter.NewParser()
	defer parser.Close()

	if err := parser.SetLanguage(tree_sitter.NewLanguage(tree_sitter_asciidoc_inline.Language())); err != nil {
		t.Fatal(err)
	}

	tree := parser.Parse([]byte("text"), nil)
	defer tree.Close()
	if tree.RootNode().HasError() {
		t.Fatal(tree.RootNode().ToSexp())
	}
}
