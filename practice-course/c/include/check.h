/* Tiny test helper used by the files in tests/. */
#ifndef CHECK_H
#define CHECK_H

#include <stdio.h>

static int checks_passed = 0;
static int checks_failed = 0;

#define CHECK(cond)                                                       \
    do {                                                                  \
        if (cond) {                                                       \
            checks_passed++;                                              \
            printf("  \033[32mPASS\033[0m  %s\n", #cond);                \
        } else {                                                          \
            checks_failed++;                                              \
            printf("  \033[31mFAIL\033[0m  %s  (line %d)\n", #cond, __LINE__); \
        }                                                                 \
    } while (0)

#define CLOSE(a, b) (((a) - (b)) < 1e-9 && ((b) - (a)) < 1e-9)

static int check_summary(void)
{
    int total = checks_passed + checks_failed;
    printf("%s%d/%d passed\033[0m\n", checks_failed ? "\033[31m" : "\033[32m",
           checks_passed, total);
    if (checks_failed == 0) {
        printf("Great job! On to the next lesson.\n");
    }
    return checks_failed == 0 ? 0 : 1;
}

#endif
