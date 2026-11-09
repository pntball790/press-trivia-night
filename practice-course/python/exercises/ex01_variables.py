"""
LESSON 1 - Variables and Data Types
Read more: https://www.w3schools.com/python/python_variables.asp
           https://www.w3schools.com/python/python_datatypes.asp

A variable is a name that points to a value. Python figures out the type for you.

    name = "Ada"        # str   (text)
    age = 36            # int   (whole number)
    height = 1.65       # float (decimal number)
    is_admin = True     # bool  (True / False)
    nothing = None      # NoneType ("no value")

    type(age)           # <class 'int'>
    type(age).__name__  # 'int'

Casting changes a value's type:  int("42") -> 42,  str(3.5) -> "3.5",  float(2) -> 2.0
Operators: + - * /  // (floor divide)  % (remainder)  ** (power)

BEST PRACTICES
- Use snake_case names that say what the value is: total_price, not tp or x.
- Constants (values that never change) go in UPPER_CASE: FREEZING_F = 32
- Don't reuse built-in names like list, str, sum, id as variable names.
- Use % to test even/odd:  n % 2 == 0

EXERCISES - replace each `raise NotImplementedError` with your code.
Check your work:  python3 run.py 1
"""

FREEZING_F = 32


def describe_type(value):
    """Return the name of the value's type as a string.
    describe_type(5) -> "int",  describe_type("hi") -> "str"
    Hint: type(value).__name__
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit:  F = C * 9 / 5 + 32
    celsius_to_fahrenheit(100) -> 212.0
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def is_even(number):
    """Return True if number is even, otherwise False.
    Tip: an expression like `a == b` is already True/False - return it directly.
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def swap(a, b):
    """Return the two values in the opposite order, as a tuple.
    swap(1, 2) -> (2, 1)
    Hint: Python can do `return b, a`
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def to_int(text):
    """Cast a string of digits to an int.  to_int("42") -> 42"""
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def minutes_to_hours(minutes):
    """Split minutes into whole hours and leftover minutes, as a tuple.
    minutes_to_hours(135) -> (2, 15)
    Hint: use // and %
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)
