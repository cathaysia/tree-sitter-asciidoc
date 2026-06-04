const { anySep1, escaped_ch, anySep } = require('../../common/common');

// One or more `cell`s separated by `sep`, where any cell may be empty but the
// whole record may not (so a blank line is never mistaken for a row).
function dsvSep(sep, cell) {
  return choice(
    seq(cell, repeat(seq(sep, optional(cell)))),
    seq(sep, optional(cell), repeat(seq(sep, optional(cell)))),
  );
}

exports.rules = {
  // CSV (`,===`) and DSV (`:===`) tables share the `<delim>===` fence with
  // `|===` tables but separate their cells with a comma or colon instead of
  // a leading `|`.  Each record is one line of delimiter-separated cells.
  csv_table_block: $ =>
    prec.left(
      seq(
        $.csv_table_block_marker,
        repeat($.csv_record),
        $.csv_table_block_marker,
      ),
    ),
  // A record is non-empty (the bare newline after the opening fence is not a
  // row) but individual fields may be empty, as in `a,,c` or `,b`.
  csv_record: $ => seq(dsvSep(',', alias(repeat1(/[^,\r\n]/), $.table_cell_content)), $._block_end),

  dsv_table_block: $ =>
    prec.left(
      seq(
        $.dsv_table_block_marker,
        repeat($.dsv_record),
        $.dsv_table_block_marker,
      ),
    ),
  dsv_record: $ => seq(dsvSep(':', alias(repeat1(/[^:\r\n]/), $.table_cell_content)), $._block_end),

  table_block: $ =>
    prec.left(
      seq(
        $.table_block_marker,
        repeat(choice($.table_cell, $.ntable_block)),
        $.table_block_marker,
      ),
    ),
  table_cell: $ =>
    prec.right(
      seq(
        optional($.table_cell_attr),
        choice(
          seq(
            '|',
            token.immediate(/\r?\n/),
            anySep(
              alias($._section_block, $.section_block),
              $.list_continuation,
            ),
          ),
          seq('|', $.table_cell_content),
        ),
      ),
    ),
  table_cell_content: $ => repeat1(choice(/[^|]/, '\\|')),

  ntable_block: $ =>
    prec.left(
      seq(
        optional($.element_attr),
        $.ntable_block_marker,
        repeat($.ntable_cell),
        $.ntable_block_marker,
      ),
    ),
  ntable_cell: $ =>
    seq(
      optional($.table_cell_attr),
      choice(
        seq(
          '!',
          token.immediate(/\r?\n/),
          alias($._section_block, $.section_block),
        ),
        seq('!', repeat1(escaped_ch('!'))),
      ),
    ),
};
