#include <check.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#include "tree-sitter-asciidoc/src/include/quick_buffer.h"

START_TEST(test_quick_buffer_no_oob_write)
{
    /* Invariant: writing to a QuickBuffer must never exceed its allocated
       capacity regardless of the length or position supplied. */
    struct {
        const char *data;
        size_t      len;
    } payloads[] = {
        /* exact exploit: length that would overflow a typical small buffer */
        { "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 64 },
        /* boundary: write exactly at capacity limit */
        { "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", 32 },
        /* valid: small well-formed write */
        { "hello", 5 },
    };
    int num_payloads = (int)(sizeof(payloads) / sizeof(payloads[0]));

    for (int i = 0; i < num_payloads; i++) {
        QuickBuffer buf;
        quick_buffer_init(&buf);

        size_t before_pos = buf.pos;
        size_t capacity   = buf.capacity;

        /* Attempt the write; the implementation must not advance pos past capacity */
        quick_buffer_write(&buf, (const uint8_t *)payloads[i].data, payloads[i].len);

        /* Security invariant: pos must never exceed allocated capacity */
        ck_assert_msg(buf.pos <= buf.capacity,
            "pos (%zu) exceeded capacity (%zu) after write of len %zu",
            buf.pos, buf.capacity, payloads[i].len);

        /* Secondary invariant: capacity must not shrink */
        ck_assert_msg(buf.capacity >= capacity,
            "capacity shrank from %zu to %zu", capacity, buf.capacity);

        (void)before_pos;
        quick_buffer_free(&buf);
    }
}
END_TEST

Suite *security_suite(void)
{
    Suite *s;
    TCase *tc_core;

    s       = suite_create("Security");
    tc_core = tcase_create("Core");

    tcase_add_test(tc_core, test_quick_buffer_no_oob_write);
    suite_add_tcase(s, tc_core);

    return s;
}

int main(void)
{
    int      number_failed;
    Suite   *s;
    SRunner *sr;

    s  = security_suite();
    sr = srunner_create(s);

    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);
    srunner_free(sr);

    return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}