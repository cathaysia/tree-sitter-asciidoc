const assert = require('node:assert/strict');
const Parser = require('tree-sitter');

for (const [grammar, source, root] of [
  [require('../tree-sitter-asciidoc'), '= Title', 'document'],
  [require('../tree-sitter-asciidoc_inline'), 'text', 'inline'],
]) {
  const parser = new Parser();
  parser.setLanguage(grammar);
  assert.equal(parser.parse(source).rootNode.type, root);
}
