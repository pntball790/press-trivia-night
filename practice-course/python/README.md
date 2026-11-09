# Python Track

```
python3 run.py 1          # test lesson 1
python3 run.py all        # test every lesson
python3 run.py 1 --solution
```

Each `exercises/exNN_*.py` has a lesson at the top and functions that
`raise NotImplementedError`. Replace that line with your code. You can also
try your functions by hand:

```
python3 -i exercises/ex02_strings.py
>>> shout("hello")
```

## Cheat sheet

```python
name = "Ada"; age = 36; price = 9.99; ok = True      # str, int, float, bool
f"{name} is {age}, pays ${price:.2f}"                 # f-string
items = [3, 1, 2]; items.append(4); sorted(items)     # list
point = (3, 4); x, y = point                          # tuple + unpacking
ages = {"ann": 31}; ages.get("bob", 0)                # dict
seen = {1, 2}; 2 in seen                              # set

for i, item in enumerate(items): ...
while n > 0: n -= 1

def area(width, height=1):
    """Return width * height."""
    return width * height

squares = [n * n for n in range(5)]

try:
    value = int(text)
except ValueError:
    value = 0

with open("file.txt", encoding="utf-8") as f:
    lines = f.read().splitlines()

class Dog:
    def __init__(self, name):
        self.name = name
```

## Style rules (PEP 8, as W3Schools teaches)
- 4 spaces per indent level, no tabs.
- `snake_case` for variables and functions, `CapWords` for classes, `UPPER_CASE` for constants.
- A docstring on every function and class.
- Imports at the top of the file.
- `if __name__ == "__main__":` around code that should only run when the file is run directly.
