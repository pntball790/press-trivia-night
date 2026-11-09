"""
LESSON 4 - Dictionaries and Sets
Read more: https://www.w3schools.com/python/python_dictionaries.asp
           https://www.w3schools.com/python/python_sets.asp

A dict maps keys to values:
    ages = {"ann": 31, "bob": 27}
    ages["cara"] = 40               # add / update
    ages.get("dan", 0)              # 0 if "dan" is missing (no error)
    for name, age in ages.items():  # loop over pairs
        ...
    "ann" in ages                   # True (checks keys)

A set holds unique values with no order:
    a = {1, 2, 3}; b = {2, 3, 4}
    a & b  # {2, 3}  intersection
    a | b  # {1, 2, 3, 4} union
    a - b  # {1}     difference

BEST PRACTICES
- Use .get(key, default) when a key might be missing.
- Loop with .items() when you need both key and value.
- Use a set to test "have I seen this?" - it's much faster than a list.

Check your work:  python3 run.py 4
"""


def word_count(text):
    """Count how many times each word appears (lower-case words).
    word_count("the cat the") -> {"the": 2, "cat": 1}
    """
    counts = {}
    for word in text.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts


def invert(mapping):
    """Swap keys and values.  invert({"a": 1, "b": 2}) -> {1: "a", 2: "b"}"""
    return {value: key for key, value in mapping.items()}


def common_items(list_a, list_b):
    """Return items in both lists, sorted, no duplicates.
    common_items([3, 1, 2, 2], [2, 3, 5]) -> [2, 3]
    """
    return sorted(set(list_a) & set(list_b))


def top_scorer(scores):
    """Return the name with the highest score.
    top_scorer({"ann": 7, "bob": 9}) -> "bob"
    Hint: max(scores, key=scores.get)
    """
    return max(scores, key=scores.get)


def merge_scores(round1, round2):
    """Add scores from two rounds. Players may appear in only one round.
    merge_scores({"a": 1, "b": 2}, {"b": 3, "c": 4}) -> {"a": 1, "b": 5, "c": 4}
    """
    merged = dict(round1)
    for name, points in round2.items():
        merged[name] = merged.get(name, 0) + points
    return merged
