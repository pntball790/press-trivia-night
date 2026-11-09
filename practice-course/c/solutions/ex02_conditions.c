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
    int biggest = a;
    if (b > biggest) {
        biggest = b;
    }
    if (c > biggest) {
        biggest = c;
    }
    return biggest;
}

char letter_grade(int score)
{
    /* 90+ 'A', 80+ 'B', 70+ 'C', 60+ 'D', otherwise 'F'. */
    if (score >= 90) {
        return 'A';
    } else if (score >= 80) {
        return 'B';
    } else if (score >= 70) {
        return 'C';
    } else if (score >= 60) {
        return 'D';
    }
    return 'F';
}

int is_leap_year(int year)
{
    /* Leap year: divisible by 4, except centuries, unless divisible by 400.
       2024 -> 1, 1900 -> 0, 2000 -> 1 */
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

int clamp(int value, int low, int high)
{
    /* Keep value between low and high.  clamp(15, 0, 10) -> 10 */
    if (value < low) {
        return low;
    }
    return value > high ? high : value;
}

const char *day_name(int day)
{
    /* Use a switch: 1 -> "Monday" ... 7 -> "Sunday", anything else -> "Invalid". */
    switch (day) {
    case 1: return "Monday";
    case 2: return "Tuesday";
    case 3: return "Wednesday";
    case 4: return "Thursday";
    case 5: return "Friday";
    case 6: return "Saturday";
    case 7: return "Sunday";
    default: return "Invalid";
    }
}
