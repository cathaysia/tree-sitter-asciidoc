# Block

Blocks are the basic elements of asciidoc documents. The entire asciidoc document can be viewed as a stacked block.
Blocks are either parallel or nested.

```js
document: $ => choice($.document_title, $.section_block)
```

## Section block

```js
section_block: $ =>
  seq(max_repeat(2, choice($.block_title, $.block_attr)), $.block_body)
block_body: $ =>
  choice(
    $.section_title,
    $.block_macro,
    $.line_comment,
    $.block_comment,
    $.list,
    $.paragraph,
    $.table,
    $.admonition,
  )
block_title: $ => seq(/^\./, token.immediate($.line))
block_attr: $ => seq(/^\[/, $.line, ']')
```

## Document Title

Document Title has the following structure:

```js
document_title: $ =>
  seq(
    seq('#', ' ', $.line),
    optional($.author),
    repeat(choice($.attr, $.block_macro)),
  )
attr: $ => seq(':', $.attr_name, ':', ' ', $.escaped_line)
```

An escaped_line can in this form:

```
one line \
continue line
```

## Section Title

```js
section_title: $ => seq(/^={1,6}/, ' ', $.line)
```

## Bock macro

block macro occupies one line:

```js
block_macro: $ => seq($.name, '::', $.target, '[', $.inline, ']')
```

## Paragraph

```js
paragraph: $ => repeat1($.line)
```

## List

```js
list: $ => repeat1($.list_marker, token.immediate(' '), $.paragraph)

list_marker: $ =>
  choice($.unordered_list_marker, $.ordered_marker, $.checked_list_marker)

unordered_list_marker: $ => repeat1(choice('-', ''))

ordered_marker: $ =>
  choice(
    '.',
    /\d+/,
    /\w/,
    /[\x{3b1} - \x{3c9}]/, // α - ω
  )

checked_list_marker: $ =>
  seq(
    $.unordered_list_marker,
    token.immediate(' '),
    '[',
    choice('x', '*', ' '),
    ']',
  )
```

## comment

```js
line_comment: $ => seq('//', $.line)
block_comment: $ => seq('////', repeat($.line), '////')
```

## Admonition

```js
admonition: $ => seq(
    $.admonition_type,
    $.paragraph
)
admonition_type: $ => choice(
    "NOTE",
    "TIP",
    "IMPORTANT",
    "CAUTION"
    "WARNING",
)
```

## Table

```js
table: $ => seq('|===', repeat($.table_row), '|===')
table_row: $ => repeat1($.table_cell)
table_cell: $ => seq($.cell_attr, '|', $.cell_content)
```

!!! note

    complete inside table