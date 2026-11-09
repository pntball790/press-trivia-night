#include "check.h"
#include "ex01.h"

int main(void)
{
    CHECK(add(2, 3) == 5);
    CHECK(add(-4, 4) == 0);
    CHECK(CLOSE(average3(1.0, 2.0, 4.0), 7.0 / 3.0));
    CHECK(is_even(4) == 1);
    CHECK(is_even(7) == 0);
    CHECK(CLOSE(c_to_f(100.0), 212.0));
    CHECK(CLOSE(c_to_f(37.0), 98.6));
    CHECK(seconds_in_days(1) == 86400);
    CHECK(seconds_in_days(7) == 604800);
    return check_summary();
}
