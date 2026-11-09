#include <string.h>
#include "check.h"
#include "ex02.h"

int main(void)
{
    CHECK(max3(1, 9, 4) == 9);
    CHECK(max3(-1, -9, -4) == -1);
    CHECK(letter_grade(95) == 'A');
    CHECK(letter_grade(80) == 'B');
    CHECK(letter_grade(71) == 'C');
    CHECK(letter_grade(65) == 'D');
    CHECK(letter_grade(10) == 'F');
    CHECK(is_leap_year(2024) == 1);
    CHECK(is_leap_year(1900) == 0);
    CHECK(is_leap_year(2000) == 1);
    CHECK(is_leap_year(2023) == 0);
    CHECK(clamp(15, 0, 10) == 10);
    CHECK(clamp(-3, 0, 10) == 0);
    CHECK(clamp(5, 0, 10) == 5);
    CHECK(strcmp(day_name(1), "Monday") == 0);
    CHECK(strcmp(day_name(7), "Sunday") == 0);
    CHECK(strcmp(day_name(9), "Invalid") == 0);
    return check_summary();
}
