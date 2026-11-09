/*
 * LESSON 2 - Operators, If/Else and Switch
 * Read more: https://www.w3schools.com/c/c_operators.php
 *            https://www.w3schools.com/c/c_conditions.php
 *            https://www.w3schools.com/c/c_switch.php
 *
 *     if (score >= 90) {
 *         grade = 'A';
 *     } else if (score >= 80) {
 *         grade = 'B';
 *     } else {
 *         grade = 'F';
 *     }
 *
 *     int bigger = (a > b) ? a : b;   // ternary: short if/else
 *
 *     switch (day) {
 *     case 1: name = "Monday"; break;   // don't forget break!
 *     default: name = "Unknown";
 *     }
 *
 * Logical operators: && (and), || (or), ! (not).  Compare with ==, not =.
 *
 * BEST PRACTICES
 * - Always use braces { } even for one-line ifs - it prevents bugs later.
 * - Write `if (x == 5)`, never `if (x = 5)` (that ASSIGNS 5 and is always true).
 * - Always give a switch a default case and end each case with break.
 *
 * Run:  ./run.sh 2
 */
#include "ex02.h"

int max3(int a, int b, int c)
{
    /* Return the largest of the three. */
    (void)a; (void)b; (void)c; return 0;
    // TODO: write your code here (replace the line above)
}

char letter_grade(int score)
{
    /* 90+ 'A', 80+ 'B', 70+ 'C', 60+ 'D', otherwise 'F'. */
    (void)score; return '?';
    // TODO: write your code here (replace the line above)
}

int is_leap_year(int year)
{
    /* Leap year: divisible by 4, except centuries, unless divisible by 400.
       2024 -> 1, 1900 -> 0, 2000 -> 1 */
    (void)year; return -1;
    // TODO: write your code here (replace the line above)
}

int clamp(int value, int low, int high)
{
    /* Keep value between low and high.  clamp(15, 0, 10) -> 10 */
    (void)value; (void)low; (void)high; return 0;
    // TODO: write your code here (replace the line above)
}

const char *day_name(int day)
{
    /* Use a switch: 1 -> "Monday" ... 7 -> "Sunday", anything else -> "Invalid". */
    (void)day; return "";
    // TODO: write your code here (replace the line above)
}
