"""
LESSON 5 - If / Else, While and For Loops
Read more: https://www.w3schools.com/python/python_conditions.asp
           https://www.w3schools.com/python/python_for_loops.asp
           https://www.w3schools.com/python/python_while_loops.asp

    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    else:
        grade = "F"

    for i in range(1, 4):         # 1, 2, 3
        print(i)

    for index, name in enumerate(["a", "b"]):   # index AND value
        print(index, name)

    while n > 0:
        n -= 1                    # always change the condition, or it loops forever!

    break     -> leave the loop now
    continue  -> skip to the next round of the loop

BEST PRACTICES
- Python uses indentation (4 spaces) for blocks - be consistent.
- Use enumerate() instead of range(len(...)) when you need the index.
- Return early from a function instead of deep nesting.
- Check the order of elif conditions: the first True one wins.

Check your work:  python3 run.py 5
"""


def grade(score):
    """90+ -> "A", 80+ -> "B", 70+ -> "C", 60+ -> "D", else "F" """
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def fizzbuzz(n):
    """Return a list for 1..n: "Fizz" for multiples of 3, "Buzz" for 5,
    "FizzBuzz" for both, otherwise the number as a string.
    fizzbuzz(5) -> ["1", "2", "Fizz", "4", "Buzz"]
    """
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result


def sum_digits(number):
    """Add up the digits using a while loop with % and //.
    sum_digits(1234) -> 10
    """
    number = abs(number)
    total = 0
    while number > 0:
        total += number % 10
        number //= 10
    return total


def first_negative_index(numbers):
    """Return the index of the first negative number, or -1 if there is none.
    first_negative_index([4, 2, -1, -5]) -> 2
    Hint: enumerate()
    """
    for index, value in enumerate(numbers):
        if value < 0:
            return index
    return -1


def count_down(start):
    """Return a list counting down from start to 1, then "Liftoff!".
    count_down(3) -> [3, 2, 1, "Liftoff!"]
    """
    result = []
    while start > 0:
        result.append(start)
        start -= 1
    result.append("Liftoff!")
    return result
