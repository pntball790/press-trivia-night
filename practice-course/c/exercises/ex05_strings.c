/*
 * LESSON 5 - Strings
 * Read more: https://www.w3schools.com/c/c_strings.php
 *            https://www.w3schools.com/c/c_strings_functions.php
 *
 * A C string is an array of char ending with the null character '\0'.
 *
 *     char name[] = "Ann";          // really {'A', 'n', 'n', '\0'} - 4 chars!
 *     printf("%s\n", name);
 *     for (size_t i = 0; name[i] != '\0'; i++) { ... }   // walk until '\0'
 *
 * <string.h>: strlen, strcpy, strncpy, strcat, strcmp (0 means equal)
 * <ctype.h>:  toupper, tolower, isalpha, isdigit, isspace
 *
 * BEST PRACTICES
 * - Always leave room for the '\0' (a 10-letter word needs char[11]).
 * - Compare strings with strcmp(a, b) == 0, never a == b.
 * - Prefer bounded functions (snprintf, strncpy) and always know your buffer size.
 * - Use const char * for strings you only read.
 * - Cast to unsigned char before calling ctype functions: toupper((unsigned char)c)
 *
 * Run:  ./run.sh 5
 */
#include <ctype.h>
#include "ex05.h"

size_t my_strlen(const char *s)
{
    /* Count chars before '\0' WITHOUT using strlen. */
    (void)s; return 0;
    // TODO: write your code here (replace the line above)
}

void to_upper(char *s)
{
    /* Change every letter in s to upper case, in place. Use toupper(). */
    (void)s;
    // TODO: write your code here (replace the line above)
}

int count_char(const char *s, char c)
{
    /* How many times does c appear in s? */
    (void)s; (void)c; return -1;
    // TODO: write your code here (replace the line above)
}

int is_palindrome(const char *s)
{
    /* 1 if s reads the same backwards (exact match, case matters), else 0.
       Use two indexes: one from the start, one from the end. "" counts as 1. */
    (void)s; return -1;
    // TODO: write your code here (replace the line above)
}

void safe_copy(char *dest, size_t dest_size, const char *src)
{
    /* Copy src into dest but never write more than dest_size bytes,
       and ALWAYS end dest with '\0' (cut src short if needed).
       safe_copy(buf, 4, "Hello") -> buf holds "Hel" */
    (void)dest; (void)dest_size; (void)src;
    // TODO: write your code here (replace the line above)
}
