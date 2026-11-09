# Python & C Practice Course

Hands-on practice for **Python** and **C**, following the order and best practices of
[W3Schools](https://www.w3schools.com/). Each lesson is one file: a short lesson at the top,
then small functions for you to finish. A test script tells you right away what works.

## How it works

1. Open a lesson in `exercises/` and read the notes at the top.
2. Replace each `TODO` line with your own code.
3. Run the tests. Red **FAIL** lines tell you what's still wrong.
4. Stuck? Compare with the answer key in `solutions/` (try first!).

| | Python | C |
|---|---|---|
| Folder | `python/` | `c/` |
| Test lesson 3 | `python3 run.py 3` | `./run.sh 3` |
| Test everything | `python3 run.py all` | `./run.sh all` |
| Check the answer key | `python3 run.py 3 --solution` | `./run.sh 3 --solution` |
| You need | Python 3.8+ | `gcc` (or `CC=clang ./run.sh 3`) |

Run the commands from inside the `python/` or `c/` folder.
No install? Paste a function into [W3Schools Try it Yourself](https://www.w3schools.com/python/trypython.asp?filename=demo_default)
or any online compiler to experiment.

## Roadmap

Do them in order. The two tracks cover the same ideas, so doing lesson N in Python and
then in C shows you how the two languages differ.

| # | Python | C |
|---|---|---|
| 1 | Variables & data types | Syntax, variables, types, `printf` |
| 2 | Strings & f-strings | Operators, if/else, switch |
| 3 | Lists & tuples | Loops |
| 4 | Dictionaries & sets | Arrays |
| 5 | If/else & loops | Strings (`char[]`, `'\0'`) |
| 6 | Functions, `*args`, lambda, recursion | Pointers |
| 7 | Classes & inheritance | Structs & `typedef` |
| 8 | Errors (`try/except`) & files | Dynamic memory (`malloc` / `free`) |
| 9 | Comprehensions, generators, modules | Files (`fopen`, `fgets`) |
| 10 | **Project:** trivia scorekeeper | **Project:** trivia scoreboard with `qsort` |

Suggested pace: one lesson a day, alternating languages.

## Best practices you'll practise

**Both languages**
- Clear `snake_case` names that say what a value is (`total_price`, not `tp`).
- One function, one job. Return results instead of printing them.
- Handle bad input on purpose (errors in Python, return codes / `NULL` in C).
- Read the error message — it usually tells you the line and the problem.

**Python** (see `python/README.md`)
- 4-space indentation, docstrings, f-strings, `with open(...)`.
- Catch specific exceptions, never a bare `except:`.
- Use built-ins (`sum`, `sorted`, `enumerate`) before writing loops by hand.

**C** (see `c/README.md`)
- Compile with `-Wall -Wextra` and fix every warning.
- Initialise every variable; always pass an array's length with it.
- Check every `malloc` and `fopen` for `NULL`; every `malloc` gets one `free`.
- Leave room for `'\0'` in strings; use bounded copies.

## Going further

- Write your own extra tests in `python/tests.py` or `c/tests/`.
- Lesson 10: add a "lightning round" with double points, or save the scoreboard to a file.
- Take the W3Schools quizzes: [Python](https://www.w3schools.com/python/python_quiz.asp) · [C](https://www.w3schools.com/c/c_quiz.php)
