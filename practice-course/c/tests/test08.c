#include <stdlib.h>
#include <string.h>
#include "check.h"
#include "ex08.h"

int main(void)
{
    int *range = make_range(5);
    CHECK(range != NULL && range[0] == 0 && range[4] == 4);
    free(range);
    CHECK(make_range(0) == NULL);

    const char *original = "trivia";
    char *copy = my_strdup(original);
    CHECK(copy != NULL && strcmp(copy, "trivia") == 0);
    CHECK(copy != original);
    free(copy);

    int *list = NULL;
    size_t len = 0;
    int *grown = append_value(list, &len, 10);
    if (grown != NULL) {
        list = grown;
    }
    grown = append_value(list, &len, 20);
    if (grown != NULL) {
        list = grown;
    }
    CHECK(len == 2);
    CHECK(list != NULL && len == 2 && list[0] == 10 && list[1] == 20);
    free(list);

    char *stars = repeat_char('*', 3);
    CHECK(stars != NULL && strcmp(stars, "***") == 0);
    free(stars);
    char *empty = repeat_char('x', 0);
    CHECK(empty != NULL && empty[0] == '\0');
    free(empty);
    return check_summary();
}
