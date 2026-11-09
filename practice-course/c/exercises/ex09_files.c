/*
 * LESSON 9 - Files
 * Read more: https://www.w3schools.com/c/c_files.php
 *            https://www.w3schools.com/c/c_files_write.php
 *            https://www.w3schools.com/c/c_files_read.php
 *
 *     FILE *fp = fopen("data.txt", "w");    // "w" write, "a" append, "r" read
 *     if (fp == NULL) { return -1; }        // ALWAYS check - the file may not open
 *     fprintf(fp, "%d\n", 42);
 *     fclose(fp);
 *
 *     fp = fopen("data.txt", "r");
 *     int value;
 *     while (fscanf(fp, "%d", &value) == 1) { ... }   // read numbers until none left
 *     char line[256];
 *     while (fgets(line, sizeof line, fp) != NULL) { ... }   // read line by line
 *     fclose(fp);
 *
 * BEST PRACTICES
 * - Check fopen's result for NULL every time.
 * - Close every file you open (fclose), on every path out of the function.
 * - Use fgets (with the buffer size), never gets.
 * - Return an error code (-1) so the caller knows something failed.
 *
 * Run:  ./run.sh 9
 */
#include <stdio.h>
#include "ex09.h"

int write_numbers(const char *path, const int *nums, size_t len)
{
    /* Write each number on its own line. Return 0 on success, -1 if fopen fails. */
    (void)path; (void)nums; (void)len; return -1;
    // TODO: write your code here (replace the line above)
}

int sum_file(const char *path, long *total)
{
    /* Read all ints in the file and store their sum in *total.
       Return 0 on success, -1 if the file can't be opened. */
    (void)path; (void)total; return -2;
    // TODO: write your code here (replace the line above)
}

int count_lines(const char *path)
{
    /* Return how many lines the file has (use fgets), or -1 if it can't be opened. */
    (void)path; return -2;
    // TODO: write your code here (replace the line above)
}
