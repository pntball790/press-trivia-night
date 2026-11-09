"""
LESSON 9 - Comprehensions, Generators and Modules
Read more: https://www.w3schools.com/python/python_lists_comprehension.asp
           https://www.w3schools.com/python/python_iterators.asp
           https://www.w3schools.com/python/python_modules.asp

A list comprehension builds a list in one line:
    squares = [n * n for n in range(5)]              # [0, 1, 4, 9, 16]
    evens   = [n for n in nums if n % 2 == 0]        # with a filter
    lengths = {word: len(word) for word in words}    # dict comprehension
    unique  = {ch for ch in "hello"}                 # set comprehension

A generator gives values one at a time using `yield` (saves memory):
    def count_up(limit):
        n = 0
        while n < limit:
            yield n
            n += 1

Modules: reuse code from the standard library.
    import math;  math.sqrt(16)
    from collections import Counter

BEST PRACTICES
- Use a comprehension for simple transforms; use a normal loop if it gets hard to read.
- Use generators for big or endless sequences.
- Put imports at the top of the file.

Check your work:  python3 run.py 9
"""

import math


def squares(n):
    """[0, 1, 4, ...] for 0..n-1, using a list comprehension."""
    return [i * i for i in range(n)]


def only_evens(numbers):
    """Keep even numbers.  only_evens([1, 2, 3, 4]) -> [2, 4]"""
    return [n for n in numbers if n % 2 == 0]


def word_lengths(words):
    """Dict comprehension.  word_lengths(["hi", "hey"]) -> {"hi": 2, "hey": 3}"""
    return {word: len(word) for word in words}


def flatten(nested):
    """flatten([[1, 2], [3], []]) -> [1, 2, 3]
    Hint: [x for inner in nested for x in inner]
    """
    return [x for inner in nested for x in inner]


def fibonacci(limit):
    """GENERATOR: yield Fibonacci numbers below limit.
    list(fibonacci(20)) -> [0, 1, 1, 2, 3, 5, 8, 13]
    """
    a, b = 0, 1
    while a < limit:
        yield a
        a, b = b, a + b


def hypotenuse(a, b):
    """Use math.sqrt: hypotenuse(3, 4) -> 5.0"""
    return math.sqrt(a * a + b * b)
