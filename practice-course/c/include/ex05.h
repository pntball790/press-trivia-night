#ifndef EX05_H
#define EX05_H

#include <stddef.h>

size_t my_strlen(const char *s);
void to_upper(char *s);
int count_char(const char *s, char c);
int is_palindrome(const char *s);
void safe_copy(char *dest, size_t dest_size, const char *src);

#endif
