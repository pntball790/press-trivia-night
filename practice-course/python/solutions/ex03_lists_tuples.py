"""
LESSON 3 - Lists and Tuples
Read more: https://www.w3schools.com/python/python_lists.asp
           https://www.w3schools.com/python/python_tuples.asp

A list is an ordered, changeable collection:
    fruits = ["apple", "banana"]
    fruits.append("cherry")     # add to the end
    fruits.insert(0, "kiwi")    # add at a position
    fruits.remove("banana")     # remove by value
    fruits.pop()                # remove and return the last item
    fruits.sort()               # sort in place
    sorted(fruits)              # return a NEW sorted list
    len(fruits), sum([1, 2]), min(...), max(...)

A tuple is like a list but cannot be changed. Use it for fixed groups:
    point = (3, 4)
    x, y = point                # "unpacking"

BEST PRACTICES
- Use built-ins (sum, min, max, sorted, len) instead of writing loops for them.
- Don't change a list while looping over it - build a new list instead.
- Return a tuple when a function gives back a fixed pair of values.
- Never use a list as a default argument: def f(items=[]) is a classic bug.

Check your work:  python3 run.py 3
"""


def total(numbers):
    """Return the sum of the numbers.  total([1, 2, 3]) -> 6"""
    return sum(numbers)


def min_max(numbers):
    """Return (smallest, largest) as a tuple.  min_max([3, 9, 1]) -> (1, 9)"""
    return min(numbers), max(numbers)


def remove_duplicates(items):
    """Return a new list without duplicates, keeping the first-seen order.
    remove_duplicates([3, 1, 3, 2, 1]) -> [3, 1, 2]
    """
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def second_largest(numbers):
    """Return the second-largest DIFFERENT value.
    second_largest([4, 9, 9, 2]) -> 4
    """
    return sorted(set(numbers))[-2]


def chunk(items, size):
    """Split items into lists of length size (the last may be shorter).
    chunk([1, 2, 3, 4, 5], 2) -> [[1, 2], [3, 4], [5]]
    Hint: slicing items[i:i + size] inside range(0, len(items), size)
    """
    return [items[i:i + size] for i in range(0, len(items), size)]


def rotate(items, steps):
    """Move the first `steps` items to the end. Don't change the original list.
    rotate([1, 2, 3, 4], 1) -> [2, 3, 4, 1]
    """
    if not items:
        return []
    steps %= len(items)
    return items[steps:] + items[:steps]
