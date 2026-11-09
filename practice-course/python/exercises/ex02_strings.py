"""
LESSON 2 - Strings
Read more: https://www.w3schools.com/python/python_strings.asp
           https://www.w3schools.com/python/python_strings_methods.asp

    s = "Hello, World"
    s[0]          # 'H'         (indexing starts at 0)
    s[-1]         # 'd'         (negative = count from the end)
    s[0:5]        # 'Hello'     (slicing: start up to, not including, end)
    s[::-1]       # 'dlroW ,olleH'  (reversed)
    len(s)        # 12
    s.upper(), s.lower(), s.strip(), s.split(","), s.replace("l", "L")
    "World" in s  # True
    ", ".join(["a", "b"])  # 'a, b'

f-strings are the modern way to build text:
    price = 3.5
    f"Total: ${price:.2f}"   # 'Total: $3.50'

BEST PRACTICES
- Prefer f-strings over + for building strings.
- Strings are immutable: methods return a NEW string, they don't change the old one.
- Use str methods (.startswith, .isdigit, .split) before writing loops by hand.

Check your work:  python3 run.py 2
"""

VOWELS = "aeiou"


def shout(text):
    """Return text in upper case with "!" added.  shout("hi") -> "HI!" """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def initials(full_name):
    """Return the capital first letter of each word.
    initials("grace brewster hopper") -> "GBH"
    Hint: .split() then take word[0] of each
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def count_vowels(text):
    """Count a, e, i, o, u (either case).  count_vowels("Banana") -> 3"""
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def is_palindrome(text):
    """True if text reads the same backwards, ignoring case and spaces.
    is_palindrome("Never odd or even") -> True
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def format_price(item, price):
    """Use an f-string with 2 decimals.
    format_price("Coffee", 3.5) -> "Coffee: $3.50"
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)


def censor(text, word):
    """Replace every copy of word with stars of the same length.
    censor("bad dog, bad!", "bad") -> "*** dog, ***!"
    """
    raise NotImplementedError("Not done yet")
    # TODO: write your code here (replace the line above)
