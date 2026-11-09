#ifndef EX06_H
#define EX06_H

#include <stddef.h>

void swap(int *a, int *b);
void divide(int a, int b, int *quotient, int *remainder);
void min_max(const int *arr, size_t len, int *min, int *max);
int *find_value(int *arr, size_t len, int value);
void double_all(int *arr, size_t len);

#endif
