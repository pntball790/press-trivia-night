#include "check.h"
#include "ex03.h"

int main(void)
{
    CHECK(sum_to(4) == 10);
    CHECK(sum_to(100) == 5050);
    CHECK(factorial(0) == 1);
    CHECK(factorial(5) == 120);
    CHECK(factorial(10) == 3628800);
    CHECK(count_digits(0) == 1);
    CHECK(count_digits(7) == 1);
    CHECK(count_digits(-512) == 3);
    CHECK(count_digits(1000000) == 7);
    CHECK(is_prime(1) == 0);
    CHECK(is_prime(2) == 1);
    CHECK(is_prime(97) == 1);
    CHECK(is_prime(91) == 0);
    CHECK(gcd(48, 18) == 6);
    CHECK(gcd(7, 13) == 1);
    return check_summary();
}
