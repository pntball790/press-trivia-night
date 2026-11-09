/*
 * LESSON 6 - Pointers
 * Read more: https://www.w3schools.com/c/c_memory_address.php
 *            https://www.w3schools.com/c/c_pointers.php
 *            https://www.w3schools.com/c/c_pointers_arrays.php
 *
 * A pointer is a variable that holds a memory ADDRESS.
 *
 *     int age = 36;
 *     int *ptr = &age;      // & = "address of"
 *     printf("%d\n", *ptr); // * = "value at" (dereference) -> 36
 *     *ptr = 40;            // changes age to 40!
 *
 * C passes arguments by value (copies). To let a function change YOUR
 * variable, pass its address:   swap(&x, &y);
 * This is also how a C function "returns" more than one value.
 *
 * An array name works like a pointer to its first element: arr[i] == *(arr + i)
 * NULL means "points to nothing". Never dereference NULL.
 *
 * BEST PRACTICES
 * - Initialise pointers: to a real address or to NULL.
 * - Check for NULL before using a pointer that might be NULL.
 * - Use const for pointers you only read from: const int *arr
 * - Return NULL to mean "not found".
 *
 * Run:  ./run.sh 6
 */
#include <stddef.h>
#include "ex06.h"

void swap(int *a, int *b)
{
    /* Swap the values a and b point to. */
    int temp = *a;
    *a = *b;
    *b = temp;
}

void divide(int a, int b, int *quotient, int *remainder)
{
    /* Write a / b into *quotient and a % b into *remainder. */
    *quotient = a / b;
    *remainder = a % b;
}

void min_max(const int *arr, size_t len, int *min, int *max)
{
    /* Find the smallest and largest (len >= 1) and write them through min/max. */
    *min = arr[0];
    *max = arr[0];
    for (size_t i = 1; i < len; i++) {
        if (arr[i] < *min) {
            *min = arr[i];
        }
        if (arr[i] > *max) {
            *max = arr[i];
        }
    }
}

int *find_value(int *arr, size_t len, int value)
{
    /* Return a pointer to the first element equal to value, or NULL. */
    for (size_t i = 0; i < len; i++) {
        if (arr[i] == value) {
            return &arr[i];
        }
    }
    return NULL;
}

void double_all(int *arr, size_t len)
{
    /* Double every element. Try pointer style: for (int *p = arr; p < arr + len; p++) */
    for (int *p = arr; p < arr + len; p++) {
        *p *= 2;
    }
}
