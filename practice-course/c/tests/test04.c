#include "check.h"
#include "ex04.h"

int main(void)
{
    const int nums[] = {4, 8, 15, 16, 23, 42};
    const size_t len = sizeof nums / sizeof nums[0];
    const int repeats[] = {1, 2, 1, 3, 1};

    CHECK(array_sum(nums, len) == 108);
    CHECK(array_sum(nums, 0) == 0);
    CHECK(array_max(nums, len) == 42);
    CHECK(array_max(repeats, 5) == 3);
    CHECK(count_value(repeats, 5, 1) == 3);
    CHECK(count_value(repeats, 5, 9) == 0);
    CHECK(CLOSE(array_average(nums, len), 18.0));
    CHECK(CLOSE(array_average(nums, 0), 0.0));

    int odd[] = {1, 2, 3, 4, 5};
    reverse_array(odd, 5);
    CHECK(odd[0] == 5 && odd[1] == 4 && odd[2] == 3 && odd[3] == 2 && odd[4] == 1);
    int even[] = {1, 2};
    reverse_array(even, 2);
    CHECK(even[0] == 2 && even[1] == 1);
    return check_summary();
}
