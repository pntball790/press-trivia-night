/*
 * LESSON 1 - Syntax, Variables, Data Types and printf
 * Read more: https://www.w3schools.com/c/c_syntax.php
 *            https://www.w3schools.com/c/c_variables.php
 *            https://www.w3schools.com/c/c_data_types.php
 *
 * Every C program starts in main(). Every statement ends with a semicolon.
 *
 *     #include <stdio.h>
 *     int main(void) {
 *         int age = 36;            // whole number         printf: %d
 *         double price = 9.99;     // decimal number       printf: %f  (%.2f = 2 decimals)
 *         char grade = 'A';        // one character (single quotes!)  printf: %c
 *         printf("Age %d, price %.2f, grade %c\n", age, price, grade);
 *         return 0;
 *     }
 *
 * C does NOT guess types like Python: you declare the type of each variable.
 * Watch out: 5 / 2 is 2 (integer division). Use 5 / 2.0 or (double)5 / 2 for 2.5.
 *
 * BEST PRACTICES
 * - Always initialise variables (int count = 0;) - C leaves them holding garbage otherwise.
 * - Use const for values that never change:  const int DAYS_IN_WEEK = 7;
 * - Compile with warnings on (-Wall -Wextra) and fix every warning.
 * - Use descriptive names: total_price, not tp.
 *
 * In this course each exercise is a function. Fill in the body, then run:
 *     ./run.sh 1
 */
#include "ex01.h"

int add(int a, int b)
{
    /* Return a + b. */
    return a + b;
}

double average3(double a, double b, double c)
{
    /* Return the average of the three numbers. */
    return (a + b + c) / 3.0;
}

int is_even(int n)
{
    /* Return 1 if n is even, 0 if not. (C uses 1/0 for true/false.) */
    return n % 2 == 0;
}

double c_to_f(double celsius)
{
    /* F = C * 9 / 5 + 32. Careful: 9 / 5 in ints is 1! Use 9.0 / 5.0. */
    return celsius * 9.0 / 5.0 + 32.0;
}

int seconds_in_days(int days)
{
    /* How many seconds are in `days` days? Use named constants. */
    const int HOURS_PER_DAY = 24;
    const int SECONDS_PER_HOUR = 60 * 60;
    return days * HOURS_PER_DAY * SECONDS_PER_HOUR;
}
