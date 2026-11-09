/*
 * LESSON 3 - While and For Loops
 * Read more: https://www.w3schools.com/c/c_while_loop.php
 *            https://www.w3schools.com/c/c_for_loop.php
 *            https://www.w3schools.com/c/c_break_continue.php
 *
 *     for (int i = 1; i <= 5; i++) {     // start; keep going while; step
 *         printf("%d\n", i);
 *     }
 *
 *     int n = 10;
 *     while (n > 0) {
 *         n /= 2;                         // make progress or it never ends!
 *     }
 *
 *     do { ... } while (cond);            // runs at least once
 *
 *     break;     -> leave the loop
 *     continue;  -> skip to the next round
 *
 * BEST PRACTICES
 * - Declare the loop counter inside the for:  for (int i = 0; ...)
 * - Use `for` when you know how many times; `while` when you don't.
 * - Watch for "off by one": is it < or <= ?
 * - Use a bigger type (long) when results can grow large, like factorials.
 *
 * Run:  ./run.sh 3
 */
#include "ex03.h"

int sum_to(int n)
{
    /* 1 + 2 + ... + n using a for loop.  sum_to(4) -> 10 */
    int total = 0;
    for (int i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}

long factorial(int n)
{
    /* n! = 1 * 2 * ... * n.  factorial(0) -> 1, factorial(10) -> 3628800 */
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

int count_digits(int n)
{
    /* How many digits? count_digits(0) -> 1, count_digits(-512) -> 3. Use a while loop. */
    int digits = 1;
    if (n < 0) {
        n = -n;
    }
    while (n >= 10) {
        n /= 10;
        digits++;
    }
    return digits;
}

int is_prime(int n)
{
    /* 1 if n is prime, else 0. Numbers below 2 are not prime.
       Tip: you only need to test divisors while i * i <= n. */
    if (n < 2) {
        return 0;
    }
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            return 0;
        }
    }
    return 1;
}

int gcd(int a, int b)
{
    /* Greatest common divisor (Euclid): while b != 0, set (a, b) = (b, a % b). */
    while (b != 0) {
        int remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}
