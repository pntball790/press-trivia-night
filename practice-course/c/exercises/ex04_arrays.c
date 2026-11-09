/*
 * LESSON 4 - Arrays
 * Read more: https://www.w3schools.com/c/c_arrays.php
 *            https://www.w3schools.com/c/c_arrays_multi.php
 *
 *     int scores[5] = {90, 72, 85, 60, 99};
 *     scores[0]       // 90 (first)      scores[4]  // 99 (last)
 *     size_t len = sizeof(scores) / sizeof(scores[0]);   // 5
 *
 *     for (size_t i = 0; i < len; i++) {
 *         printf("%d\n", scores[i]);
 *     }
 *
 * IMPORTANT: when you pass an array to a function, C only passes the address
 * of the first element - the function can't know the length. So always pass
 * the length too:  int array_sum(const int arr[], size_t len)
 *
 * C does NOT check bounds. scores[5] reads memory that isn't yours (a bug!).
 *
 * BEST PRACTICES
 * - Always pass the length with the array. Use size_t for sizes/indexes.
 * - Mark arrays you only read as const.
 * - Never read or write past the end (index must be < len).
 *
 * Run:  ./run.sh 4
 */
#include "ex04.h"

int array_sum(const int arr[], size_t len)
{
    /* Add all elements. */
    (void)arr; (void)len; return 0;
    // TODO: write your code here (replace the line above)
}

int array_max(const int arr[], size_t len)
{
    /* Return the largest element (len is at least 1). Start with arr[0]. */
    (void)arr; (void)len; return 0;
    // TODO: write your code here (replace the line above)
}

size_t count_value(const int arr[], size_t len, int value)
{
    /* How many times does value appear? */
    (void)arr; (void)len; (void)value; return 0;
    // TODO: write your code here (replace the line above)
}

void reverse_array(int arr[], size_t len)
{
    /* Reverse the array IN PLACE: swap first/last, then move inwards. */
    (void)arr; (void)len;
    // TODO: write your code here (replace the line above)
}

double array_average(const int arr[], size_t len)
{
    /* Average as a double. Return 0.0 if len is 0 (never divide by zero!). */
    (void)arr; (void)len; return -1.0;
    // TODO: write your code here (replace the line above)
}
