# C Track

```
./run.sh 1                # compile + test lesson 1
./run.sh all              # every lesson
./run.sh 1 --solution     # test the answer key
```

`run.sh` compiles like this, so you can do it yourself too:

```
gcc -std=c11 -Wall -Wextra -Wpedantic -g -Iinclude tests/test01.c exercises/ex01_basics.c -o build/ex01 -lm
./build/ex01
```

## How the files fit together

- `include/exNN.h` – **header**: the function declarations (and struct types). Read it first.
- `exercises/exNN_*.c` – the lesson + the functions you write.
- `tests/testNN.c` – has `main()` and checks your functions.
- `solutions/` – answer key.

Splitting code into `.h` and `.c` files is how real C projects are organised.

Windows: use WSL, MSYS2 or any IDE with gcc. Or compile the command above by hand.
Extra safety net while learning (Linux/macOS): add `-fsanitize=address,undefined` to
`CFLAGS` in `run.sh` to catch memory bugs.

## Cheat sheet

```c
#include <stdio.h>
int count = 0;  double price = 9.99;  char grade = 'A';  const int MAX = 10;
printf("%d %.2f %c %s\n", count, price, grade, "text");

if (a > b) { ... } else if (a == b) { ... } else { ... }
for (int i = 0; i < n; i++) { ... }
while (n > 0) { n--; }

int nums[5] = {1, 2, 3, 4, 5};
size_t len = sizeof nums / sizeof nums[0];

char name[32] = "Ann";            /* room for '\0' */
strcmp(a, b) == 0                 /* string equality (<string.h>) */

int *p = &count;  *p = 5;         /* pointer: & address, * value */

typedef struct { double x, y; } Point;
Point pt = {.x = 1, .y = 2};  Point *pp = &pt;  pp->x = 3;

int *arr = malloc(n * sizeof *arr);
if (arr == NULL) { /* handle error */ }
free(arr);

FILE *fp = fopen("data.txt", "r");
if (fp == NULL) { /* handle error */ }
fclose(fp);
```

## Common mistakes
- `=` (assign) vs `==` (compare) inside `if`.
- Forgetting `break` in a `switch`.
- Integer division: `5 / 2` is `2`. Use `5 / 2.0`.
- Reading past the end of an array – C won't stop you.
- Forgetting `'\0'` space, or comparing strings with `==`.
- Using memory after `free`, or never freeing it.
