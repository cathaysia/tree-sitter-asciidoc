const { anySep1, commaSep, escaped_ch } = require('../common/common.js');
const autolink = require('./common/autolink.js');

// prettier-ignore
const PUNCTUATION_CHARACTERS_ARRAY = [
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  '{',
  '|',
  '}',
  '~',
];

module.exports = grammar({
  name: 'asciidoc_inline',
  externals: $ => [
    $._eof,
    $._hard_wrap_plus,
    // Opening delimiters for constrained formatting.  The external
    // scanner emits one of these only when a valid matching close exists
    // on the line, so an unpaired delimiter (e.g. the `#' in "issue #2",
    // a lone `*', or the `_' in "do_something_useful") stays punctuation
    // instead of error-recovering into a formatting node.
    $._emphasis_begin,
    $._italic_begin,
    $._monospace_begin,
    $._highlight_begin,
    // Two-char openers for typographic quotes ("` and '`); emitted only
    // when a matching close (`" or `') exists on the line.
    $._typographic_double_begin,
    $._typographic_single_begin,
  ],
  precedences: $ => [[$.autolink, $._punctuation]],
  conflicts: $ => [[$.roled_text, $._punctuation]],

  rules: {
    inline: $ => repeat($.inline_element),
    inline_element: $ =>
      choice(
        $.replacement,
        $.word,
        $.autolink,
        $.passthrough,
        $.macro_passthrough,
        $._punctuation,
        $.xref,
        $.roled_text,
        $.typographic_quote,
        $.emphasis,
        $.italic,
        $.monospace,
        $.highlight,
        $.superscript,
        $.subscript,
        $.inline_macro,
        $.stem_macro,
        $.footnote,
        $.index_term,
        $.index_term2,
        $.id_assignment,
        $.intrinsic_attributes_pair,
        $.counter,
        $.attribute_reference,
        $.hard_wrap,
      ),
    ...autolink.rules,
    id_assignment: $ => choice(
      seq('[#', $.id, ']'),
      seq('[[', $.id, optional(seq(',', $.reftext)), ']]'),
    ),
    id: $ => repeat1(escaped_ch(',]')),
    reftext: $ => repeat1(escaped_ch(']')),
    macro_name: $ =>
      choice(
        'kbd',
        'btn',
        'image',
        'audio',
        'video',
        'icon',
        'link',
        'mailto',
        'menu',
        'anchor',
        'xref',
        'ifdef',
        'ifndef',
        'ifeval',
        'endif',
        'indexterm2',
        'indexterm',
        // diagram
        'a2s',
        'barcode',
        'blockdiag',
        'bpmn',
        'bytefield',
        'd2',
        'dbml',
        'diagrams',
        'ditaa',
        'dpic',
        'erd',
        'gnuplot',
        'graphviz',
        'lilypond',
        'meme',
        'mermaid',
        'msc',
        'nomnoml',
        'pikchr',
        'plantuml',
        'shaape',
        'smcat',
        'structurizr',
        'svgbob',
        'symbolator',
        'syntrax',
        'tikz',
        'umlet',
        'vega',
        'wavedrom',
      ),
    inline_macro: $ =>
      seq(
        $.macro_name,
        token.immediate(':'),
        optional(choice($.target)),
        '[',
        optional($.attr),
        ']',
      ),
    target: $ =>
      repeat1(
        escaped_ch(
          '[',
          false,
          $.replacement,
          $.attribute_reference,
          $.escaped_sequence,
          $.passthrough,
          $.macro_passthrough,
        ),
      ),
    // A macro attribute list, e.g. `[Alt Text,200,role=external]`.  Entries
    // are comma-separated positional values or `name=value` pairs; a quoted
    // value may contain commas.  Values may embed the usual inline constructs
    // (attribute references, replacements, autolinks, escapes).
    attr: $ =>
      choice(
        $._macro_attr,
        seq(optional($._macro_attr), repeat1(seq(',', optional($._macro_attr)))),
      ),
    _macro_attr: $ => choice($.named_attr, $.positional_attr),
    named_attr: $ =>
      seq(
        alias(repeat1($._pos_char), $.attribute_name),
        '=',
        optional(alias($._named_value, $.attribute_value)),
      ),
    positional_attr: $ => choice($._quoted_value, repeat1($._pos_char)),
    // A bare named value, unlike a positional, may contain `=` (e.g. a URL).
    _named_value: $ => choice($._quoted_value, repeat1($._val_char)),
    _quoted_value: $ =>
      seq(
        '"',
        repeat(
          escaped_ch(
            '"',
            false,
            $.replacement,
            $.attribute_reference,
            $.escaped_sequence,
          ),
        ),
        '"',
      ),
    // Value characters exclude whitespace (skipped as an extra, so interior
    // spaces survive in the node range) as well as the structural `,`/`]`/`"`.
    // A positional also stops at `=` so that `name=value` reads as a named
    // attribute; a named value may contain `=`.
    _pos_char: $ =>
      choice(
        /[^\s,=\]"]/,
        '\\,',
        '\\=',
        '\\]',
        '\\"',
        $.replacement,
        $.attribute_reference,
        $.autolink,
        $.escaped_sequence,
      ),
    _val_char: $ =>
      choice(
        /[^\s,\]"]/,
        '\\,',
        '\\]',
        '\\"',
        $.replacement,
        $.attribute_reference,
        $.autolink,
        $.escaped_sequence,
      ),

    _footnotename: $ => choice('footnote', 'footnoteref'),
    footnote: $ =>
      seq(
        alias($._footnotename, $.macro_name),
        token.immediate(':'),
        optional($.target),
        '[',
        optional($.attr),
        ']',
      ),

    _stem_attr: $ => repeat1(choice(/[^\]]/, '\\]')),
    _stem_name: $ => choice('latexmath', 'stem', 'asciimath'),
    stem_macro: $ =>
      seq(
        alias($._stem_name, $.macro_name),
        token.immediate(':'),
        optional($.target),
        '[',
        optional(alias($._stem_attr, $.attr)),
        ']',
      ),
    macro_passthrough: $ =>
      seq(
        alias('pass', $.macro_name),
        token.immediate(':'),
        optional($.target),
        '[',
        optional(alias($._stem_attr, $.attr)),
        ']',
      ),
    replacement: _ =>
      token(
        choice(
          '(C)',
          '(R)',
          '(TM)',
          '...',
          "`'",
          '->',
          '=>',
          '<-',
          '<=',
        ),
      ),
    intrinsic_attributes_pair: $ => seq('{', $.intrinsic_attributes, '}'),
    intrinsic_attributes: $ =>
      token(
        choice(
          'startsb',
          'endsb',
          'vbar',
          'caret',
          'asterisk',
          'tilde',
          'plus',
          'backslash',
          'backtick',
          'blank',
          'empty',
          'sp',
          'two-colons',
          'two-semicolons',
          'nbsp',
          'deg',
          'zwsp',
          'quot',
          'apos',
          'lsquo',
          'rsquo',
          'ldquo',
          'rdquo',
          'wj',
          'brvbar',
          'pp',
          'cpp',
          'amp',
          'lt',
          'gt',
        ),
      ),
    // Counter attribute references: `{counter:name}` and the silent
    // `{counter2:name}` variant, optionally seeded with an initial value as in
    // `{counter:name:5}` or `{counter:name:A}`.  The function name and its
    // trailing colon are a single token, so a plain `{counter}` reference still
    // falls through to `attribute_reference` below via longest match.
    counter: $ =>
      seq(
        '{',
        alias($._counter_function, $.counter_function),
        $.attribute_name,
        optional(seq(':', alias($._counter_initial, $.initial_value))),
        '}',
      ),
    _counter_function: _ => token(/counter2?:/),
    _counter_initial: _ => token(/[A-Za-z0-9]+/),
    // A user-defined attribute reference, e.g. `{productname}`.  The
    // intrinsic set above is defined first, so at an exact length tie a
    // reserved name like `{vbar}` keeps its dedicated node; a longer name
    // such as `{vbar2}` wins on match length and lands here instead.
    attribute_reference: $ => seq('{', $.attribute_name, '}'),
    attribute_name: _ => token(/[A-Za-z0-9_][A-Za-z0-9_-]*/),
    word: $ =>
      choice(
        $.super_escape,
        $._character,
        $._fallback_token,
        $.escaped_sequence,
        'f',
      ),
    _fallback_token: $ => choice($.macro_name, $._stem_name, $._footnotename),
    super_escape: $ => '\\\\',
    _character: $ =>
      token(
        prec(
          -1,
          new RegExp(
            `[^f\\s${PUNCTUATION_CHARACTERS_ARRAY.map(item => {
              if (item === ']') {
                return '\\]';
              }
              return item;
            }).join('')}]+`,
          ),
        ),
      ),
    escaped_sequence: $ => {
      const args = [
        '+++',
        '``',
        '**',
        '$$',
        '##',
        '__',
        '<<',
        '[[',
        '++',
        'kbd',
        'btn',
        'image',
        'audio',
        'video',
        'icon',
        'pass',
        'link',
        'mailto',
        'menu',
        'stem',
        'latexmath',
        'asciimath',
        'footnote',
        'footnoteref',
        'anchor',
        'xref',
        'ifdef',
        'ifndef',
        'ifeval',
        'endif',
      ].map(sequence => {
        return token(`\\${sequence}`);
      });

      return choice(...args, /\\./);
    },
    _punctuation: _ => choice(...PUNCTUATION_CHARACTERS_ARRAY),
    passthrough: $ =>
      choice(
        // constrained: word-boundary enforced (content starts+ends non-ws)
        token(
          seq(
            prec(1, '+'),
            choice(
              /[^+ \t\r\n]/,
              seq(
                /[^+ \t\r\n]/,
                repeat(choice(/[^+\r\n]/, '\\+')),
                /[^+ \t\r\n]/,
              ),
            ),
            '+',
          ),
        ),
        // triple-plus: raw, no substitution at all (e.g. inline HTML)
        seq(
          token(prec(2, '+++')),
          repeat(escaped_ch('+', true)),
          token(prec(2, '+++')),
        ),
        // unconstrained
        seq(
          token(prec(1, '++')),
          repeat(escaped_ch('+', true)),
          '++',
        ),
        seq('$$', repeat1(escaped_ch('$', true, '\\$$')), '$$'),
      ),
    xref: $ =>
      seq(
        '<<',
        alias(repeat1(escaped_ch(',>')), $.id),
        optional(seq(',', alias(repeat1(escaped_ch('>')), $.reftext))),
        '>>',
      ),

    // A custom inline style: a role shorthand on a text span, e.g.
    // `[.underline]#text#` or `[.line-through]#gone#` (and the unconstrained
    // `[.role]##text##`).  See
    // https://docs.asciidoctor.org/asciidoc/latest/text/custom-inline-styles/
    // and .../text/text-span-built-in-roles/.  The attribute list attaches
    // directly to the span (no intervening space) so the `#` opener stays a
    // valid constrained delimiter.
    roled_text: $ =>
      seq('[', repeat1(seq('.', $.role)), ']', $.highlight),
    role: _ => token(/[A-Za-z0-9_][A-Za-z0-9_-]*/),

    emphasis: $ =>
      create_text_formatting('*', $._emphasis_begin, [$.italic, $.monospace, $.highlight]),
    italic: $ =>
      create_text_formatting('_', $._italic_begin, [$.emphasis, $.monospace, $.highlight]),
    monospace: $ => create_text_formatting('`', $._monospace_begin, []),
    highlight: $ => create_text_formatting('#', $._highlight_begin, []),

    // Typographic (curved) quotes: "`double`" and '`single`'.  The inner
    // backticks belong to the quote, so this must outrank `monospace`,
    // which would otherwise claim "`...`" as a `"` plus a code span.  The
    // 2-char opener is supplied by the external scanner, which only emits it
    // when a matching close exists on the line -- so a stray "` stays
    // punctuation rather than error-recovering into an unterminated node.
    typographic_quote: $ =>
      choice(
        seq($._typographic_double_begin, repeat(escaped_ch('`', true)),
            token('`"')),
        seq($._typographic_single_begin, repeat(escaped_ch('`', true)),
            token("`'")),
      ),

    // Superscript (^x^) and subscript (~x~) are unconstrained but their
    // content is a single run with no unescaped spaces, so they can't reuse
    // `escaped_ch` (which permits whitespace) like the formatting above.
    superscript: $ => seq(
      token(prec(1, '^')),
      repeat1(choice(/[^\s^]/, '\\^')),
      '^',
    ),
    subscript: $ => seq(
      token(prec(1, '~')),
      repeat1(choice(/[^\s~]/, '\\~')),
      '~',
    ),

    index_term2: $ => seq('((', $.term, optional(seq(',', $.term)), '))'),
    index_term: $ =>
      seq(
        '(((',
        $.term,
        optional(seq(',', $.term)),
        optional(seq(',', $.term)),
        ')))',
      ),
    term: $ => repeat1(escaped_ch(',)')),
    hard_wrap: $ => $._hard_wrap_plus,
  },
});

function create_text_formatting(ch, begin, args) {
  return choice(
    // Constrained: the opening delimiter is supplied by the external
    // scanner (BEGIN), which only fires when the span actually closes.
    seq(begin, repeat(escaped_ch(ch, true, ...args)), ch),
    // Unconstrained: a literal double delimiter.
    seq(
      token(prec(1, ch + ch)),
      repeat(escaped_ch(ch, true, ...args)),
      ch + ch,
    ),
  );
}
