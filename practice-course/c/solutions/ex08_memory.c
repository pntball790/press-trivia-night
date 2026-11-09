/*
 * LESSON 8 - Dynamic Memory (malloc, realloc, free)
 * Read more: https://www.w3schools.com/c/c_memory_management.php
 *            https://www.w3schools.com/c/c_memory_allocate.php
 *            https://www.w3schools.com/c/c_memory_reallocate.php
 *            https://www.w3schools.com/c/c_memory_deallocate.php
 *
 * Use the heap when you don't know the size until the program runs.
 *
 *     int *nums = malloc(n * sizeof *nums);    // ask for memory
 *     if (nums == NULL) { ... }                // ALWAYS check: it can fail
 *     nums[0] = 42;
 *     int *bigger = realloc(nums, 2 * n * sizeof *nums);   // grow it
 *     if (bigger == NULL) { free(nums); ... }  // old block is still yours
 *     nums = bigger;
 *     free(nums);                              // give it back when done
 *     nums = NULL;                             // avoid using it by accident
 *
 * BEST PRACTICES
 * - Every malloc needs exactly one free. Missing it = memory leak.
 * - Check every malloc/realloc result for NULL.
 * - Write `sizeof *ptr` instead of sizeof(int) - it stays right if the type changes.
 * - Never use memory after free() ("use after free").
 * - Store realloc's result in a temporary first, so you don't lose the old block.
 *
 * Run:  ./run.sh 8
 */
#include <stdlib.h>
#include "ex08.h"

int *make_range(int n)
{
    /* Allocate an array of n ints holding 0, 1, ..., n-1 and return it.
       Return NULL if n <= 0 or malloc fails. (The caller will free it.) */
    if (n <= 0) {
        return NULL;
    }
    int *nums = malloc((size_t)n * sizeof *nums);
    if (nums == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        nums[i] = i;
    }
    return nums;
}

char *my_strdup(const char *s)
{
    /* Return a NEW heap copy of s (remember room for '\0'). NULL on failure. */
    size_t len = 0;
    while (s[len] != '\0') {
        len++;
    }
    char *copy = malloc(len + 1);
    if (copy == NULL) {
        return NULL;
    }
    for (size_t i = 0; i <= len; i++) {
        copy[i] = s[i];
    }
    return copy;
}

int *append_value(int *arr, size_t *len, int value)
{
    /* Grow arr by one with realloc, put value at the end, add 1 to *len.
       arr may be NULL (realloc(NULL, size) acts like malloc).
       Return the new pointer. If realloc fails, return NULL and leave *len alone. */
    int *grown = realloc(arr, (*len + 1) * sizeof *grown);
    if (grown == NULL) {
        return NULL;
    }
    grown[*len] = value;
    (*len)++;
    return grown;
}

char *repeat_char(char c, size_t count)
{
    /* Return a new string of c repeated count times.  repeat_char('a', 3) -> "aaa" */
    char *text = malloc(count + 1);
    if (text == NULL) {
        return NULL;
    }
    for (size_t i = 0; i < count; i++) {
        text[i] = c;
    }
    text[count] = '\0';
    return text;
}
