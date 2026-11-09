#include "check.h"
#include "ex06.h"

int main(void)
{
    int x = 1, y = 2;
    swap(&x, &y);
    CHECK(x == 2 && y == 1);

    int q = 0, r = 0;
    divide(17, 5, &q, &r);
    CHECK(q == 3 && r == 2);

    int nums[] = {7, -3, 12, 0, 5};
    int lo = 0, hi = 0;
    min_max(nums, 5, &lo, &hi);
    CHECK(lo == -3);
    CHECK(hi == 12);

    int *found = find_value(nums, 5, 12);
    CHECK(found == &nums[2]);
    CHECK(find_value(nums, 5, 99) == NULL);

    double_all(nums, 5);
    CHECK(nums[0] == 14 && nums[1] == -6 && nums[2] == 24 && nums[4] == 10);
    return check_summary();
}
