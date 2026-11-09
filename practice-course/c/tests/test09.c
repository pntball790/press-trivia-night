#include <stdio.h>
#include "check.h"
#include "ex09.h"

int main(void)
{
    const char *path = "build/test09_numbers.txt";
    const int nums[] = {10, -3, 25, 8};

    CHECK(write_numbers(path, nums, 4) == 0);
    CHECK(count_lines(path) == 4);

    long total = 0;
    CHECK(sum_file(path, &total) == 0);
    CHECK(total == 40);

    CHECK(sum_file("build/does_not_exist.txt", &total) == -1);
    CHECK(count_lines("build/does_not_exist.txt") == -1);
    CHECK(write_numbers("no_such_folder/x.txt", nums, 4) == -1);
    remove(path);
    return check_summary();
}
