"""Check your answers.

    python3 run.py 3              # test exercise 3
    python3 run.py all            # test every exercise
    python3 run.py 3 --solution   # run the tests against the answer key
"""

import importlib.util
import sys
import tempfile
from pathlib import Path

from tests import TESTS

HERE = Path(__file__).parent
GREEN, RED, DIM, RESET = "\033[32m", "\033[31m", "\033[2m", "\033[0m"


class Checker:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def _record(self, label, ok, detail=""):
        if ok:
            self.passed += 1
            print(f"  {GREEN}PASS{RESET}  {label}")
        else:
            self.failed += 1
            print(f"  {RED}FAIL{RESET}  {label}")
            if detail:
                print(f"        {DIM}{detail}{RESET}")

    def eq(self, label, func, expected):
        """Run func() and compare the result to expected."""
        try:
            actual = func()
        except NotImplementedError:
            self._record(label, False, "not done yet")
            return
        except Exception as err:  # show the learner what went wrong
            self._record(label, False, f"raised {type(err).__name__}: {err}")
            return
        if isinstance(expected, float) and isinstance(actual, (int, float)):
            ok = abs(actual - expected) < 1e-9
        else:
            ok = actual == expected
        self._record(label, ok, "" if ok else f"expected {expected!r}, got {actual!r}")

    def raises(self, label, func, error_type):
        """Pass if func() raises error_type."""
        try:
            func()
        except NotImplementedError:
            self._record(label, False, "not done yet")
        except error_type:
            self._record(label, True)
        except Exception as err:
            self._record(label, False, f"expected {error_type.__name__}, got {type(err).__name__}")
        else:
            self._record(label, False, f"expected {error_type.__name__}, nothing was raised")


def load(number, folder):
    path = next((HERE / folder).glob(f"ex{number:02d}_*.py"))
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return path, module


def run(number, folder):
    path, module = load(number, folder)
    print(f"\n== {folder}/{path.name} ==")
    check = Checker()
    with tempfile.TemporaryDirectory() as tmp:
        TESTS[number](module, check, Path(tmp))
    total = check.passed + check.failed
    color = GREEN if check.failed == 0 else RED
    print(f"{color}{check.passed}/{total} passed{RESET}")
    if check.failed == 0:
        print("Great job! On to the next lesson.")
    return check.failed == 0


def main(argv):
    if not argv:
        print(__doc__)
        return 1
    folder = "solutions" if "--solution" in argv else "exercises"
    target = argv[0]
    numbers = sorted(TESTS) if target == "all" else [int(target)]
    results = [run(n, folder) for n in numbers]
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
