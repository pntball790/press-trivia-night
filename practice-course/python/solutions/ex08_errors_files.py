"""
LESSON 8 - Errors (try/except) and Files
Read more: https://www.w3schools.com/python/python_try_except.asp
           https://www.w3schools.com/python/python_file_handling.asp

    try:
        number = int(text)
    except ValueError:              # catch the SPECIFIC error you expect
        number = 0
    else:
        ...                         # runs only if no error happened
    finally:
        ...                         # always runs

    raise ValueError("message")     # signal a problem yourself

Files - always use `with`, which closes the file for you:
    with open("notes.txt", "w", encoding="utf-8") as f:   # "w" write, "a" append
        f.write("hello\\n")
    with open("notes.txt", encoding="utf-8") as f:        # default "r" read
        for line in f:
            print(line.strip())

BEST PRACTICES
- Never use a bare `except:` - it hides real bugs. Name the error type.
- Keep the try block small: only the line(s) that can fail.
- Always open files with `with` and give an encoding.

Check your work:  python3 run.py 8
"""


def safe_divide(a, b):
    """Return a / b, or None if b is zero (catch ZeroDivisionError)."""
    try:
        return a / b
    except ZeroDivisionError:
        return None


def parse_int(text, default=0):
    """Turn text into an int; return default if it isn't a valid number.
    parse_int("12") -> 12,  parse_int("abc") -> 0
    """
    try:
        return int(text)
    except ValueError:
        return default


def check_age(age):
    """Return age if 0 <= age <= 150, otherwise raise ValueError."""
    if not 0 <= age <= 150:
        raise ValueError(f"Invalid age: {age}")
    return age


def write_lines(path, lines):
    """Write each string in lines to the file, one per line."""
    with open(path, "w", encoding="utf-8") as f:
        for line in lines:
            f.write(f"{line}\n")


def read_lines(path):
    """Return the file's lines as a list, without the newline characters.
    If the file doesn't exist, return [] (catch FileNotFoundError)."""
    try:
        with open(path, encoding="utf-8") as f:
            return [line.rstrip("\n") for line in f]
    except FileNotFoundError:
        return []
