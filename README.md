# tree-sitter-asciidoc

[asciidoc](https://docs.asciidoctor.org/asciidoc/latest/) grammar for tree-sitter.


## how to install this grammar in nvim:


Add the following line in your lazy.nvim config (assuming you're using Lazy, amend as appropriate for other package managers)

```lua
{
      'cathaysia/tree-sitter-asciidoc'
},
```

And then, perhaps in the `config` section for `nvim-treesitter`, add:

```lua
local parser_config = require('nvim-treesitter.parsers').get_parser_configs()
parser_config.asciidoc = {
    install_info = {
        url = 'https://github.com/cathaysia/tree-sitter-asciidoc.git',
        files = { 'tree-sitter-asciidoc/src/parser.c', 'tree-sitter-asciidoc/src/scanner.c' },
        branch = 'master',
        generate_requires_npm = false,
        requires_generate_from_grammar = false,
    },
}
parser_config.asciidoc_inline = {
    install_info = {
        url = 'https://github.com/cathaysia/tree-sitter-asciidoc.git',
        files = { 'tree-sitter-asciidoc_inline/src/parser.c', 'tree-sitter-asciidoc_inline/src/scanner.c' },
        branch = 'master',
        generate_requires_npm = false,
        requires_generate_from_grammar = false,
    },
}
```

To check it's working, open any asciidoc file with embedded code listings,
and you should find they are now syntax-highlighted inline, eg:

![image](https://github.com/user-attachments/assets/bdda155d-5e7f-44ca-a5c5-c50abee5a1c2)
