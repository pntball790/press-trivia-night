#ifndef EX09_H
#define EX09_H

#include <stddef.h>

int write_numbers(const char *path, const int *nums, size_t len);
int sum_file(const char *path, long *total);
int count_lines(const char *path);

#endif
