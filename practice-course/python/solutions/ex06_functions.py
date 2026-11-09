"""
LESSON 6 - Functions, Arguments, Lambda and Recursion
Read more: https://www.w3schools.com/python/python_functions.asp
           https://www.w3schools.com/python/python_lambda.asp

    def greet(name, greeting="Hello"):     # greeting has a default value
        \"\"\"Docstring: say what the function does.\"\"\"
        return f"{greeting}, {name}!"

    greet("Ann")                 # 'Hello, Ann!'
    greet("Ann", greeting="Hi")  # keyword argument

    def total(*numbers):          # any number of positional args -> tuple
    def profile(**details):       # any number of keyword args   -> dict

    square = lambda x: x * x     # small one-line function
    sorted(words, key=len)        # pass a function as an argument

A function can return another function (a "closure"), and a function
can call itself (recursion) - always include a stopping case!

BEST PRACTICES
- One function = one job. Name it with a verb: calculate_total, send_email.
- Write a docstring for every function.
- Return values instead of printing inside the function, so it can be reused & tested.
- Prefer keyword arguments for optional settings.

Check your work:  python3 run.py 6
"""


def greet(name, greeting="Hello"):
    """greet("Ann") -> "Hello, Ann!";  greet("Ann", "Hi") -> "Hi, Ann!" """
    return f"{greeting}, {name}!"


def average(*numbers):
    """Average any number of arguments. Return 0 if none are given.
    average(2, 4, 6) -> 4.0
    """
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)


def build_profile(name, **details):
    """Return a dict with "name" plus every keyword argument.
    build_profile("Ann", city="Oslo") -> {"name": "Ann", "city": "Oslo"}
    """
    return {"name": name, **details}


def sort_by_length(words):
    """Sort words shortest first using sorted(..., key=...).
    sort_by_length(["ccc", "a", "bb"]) -> ["a", "bb", "ccc"]
    """
    return sorted(words, key=len)


def make_multiplier(factor):
    """Return a NEW function that multiplies its input by factor.
    triple = make_multiplier(3);  triple(5) -> 15
    """
    def multiply(value):
        return value * factor
    return multiply


def factorial(n):
    """Recursive factorial: factorial(0) -> 1, factorial(5) -> 120"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)
