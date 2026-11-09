"""Tests for each exercise. Each function gets (module, check, tmp_dir)."""


def test_01(m, check, tmp):
    check.eq("describe_type(5)", lambda: m.describe_type(5), "int")
    check.eq("describe_type('hi')", lambda: m.describe_type("hi"), "str")
    check.eq("describe_type(2.5)", lambda: m.describe_type(2.5), "float")
    check.eq("describe_type(True)", lambda: m.describe_type(True), "bool")
    check.eq("celsius_to_fahrenheit(100)", lambda: m.celsius_to_fahrenheit(100), 212.0)
    check.eq("celsius_to_fahrenheit(-40)", lambda: m.celsius_to_fahrenheit(-40), -40.0)
    check.eq("is_even(4)", lambda: m.is_even(4), True)
    check.eq("is_even(7)", lambda: m.is_even(7), False)
    check.eq("swap(1, 2)", lambda: m.swap(1, 2), (2, 1))
    check.eq("to_int('42')", lambda: m.to_int("42"), 42)
    check.eq("minutes_to_hours(135)", lambda: m.minutes_to_hours(135), (2, 15))


def test_02(m, check, tmp):
    check.eq("shout('hi')", lambda: m.shout("hi"), "HI!")
    check.eq("initials('grace brewster hopper')", lambda: m.initials("grace brewster hopper"), "GBH")
    check.eq("count_vowels('Banana')", lambda: m.count_vowels("Banana"), 3)
    check.eq("count_vowels('AEIOU xyz')", lambda: m.count_vowels("AEIOU xyz"), 5)
    check.eq("is_palindrome('Never odd or even')", lambda: m.is_palindrome("Never odd or even"), True)
    check.eq("is_palindrome('python')", lambda: m.is_palindrome("python"), False)
    check.eq("format_price('Coffee', 3.5)", lambda: m.format_price("Coffee", 3.5), "Coffee: $3.50")
    check.eq("censor('bad dog, bad!', 'bad')", lambda: m.censor("bad dog, bad!", "bad"), "*** dog, ***!")


def test_03(m, check, tmp):
    check.eq("total([1, 2, 3])", lambda: m.total([1, 2, 3]), 6)
    check.eq("total([])", lambda: m.total([]), 0)
    check.eq("min_max([3, 9, 1])", lambda: m.min_max([3, 9, 1]), (1, 9))
    check.eq("remove_duplicates([3, 1, 3, 2, 1])", lambda: m.remove_duplicates([3, 1, 3, 2, 1]), [3, 1, 2])
    check.eq("second_largest([4, 9, 9, 2])", lambda: m.second_largest([4, 9, 9, 2]), 4)
    check.eq("chunk([1, 2, 3, 4, 5], 2)", lambda: m.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
    original = [1, 2, 3, 4]
    check.eq("rotate([1, 2, 3, 4], 1)", lambda: m.rotate(original, 1), [2, 3, 4, 1])
    check.eq("rotate does not change the original", lambda: original, [1, 2, 3, 4])
    check.eq("rotate([1, 2, 3], 4)", lambda: m.rotate([1, 2, 3], 4), [2, 3, 1])


def test_04(m, check, tmp):
    check.eq("word_count('the cat the')", lambda: m.word_count("the cat the"), {"the": 2, "cat": 1})
    check.eq("word_count('A a')", lambda: m.word_count("A a"), {"a": 2})
    check.eq("invert({'a': 1, 'b': 2})", lambda: m.invert({"a": 1, "b": 2}), {1: "a", 2: "b"})
    check.eq("common_items([3, 1, 2, 2], [2, 3, 5])", lambda: m.common_items([3, 1, 2, 2], [2, 3, 5]), [2, 3])
    check.eq("top_scorer({'ann': 7, 'bob': 9})", lambda: m.top_scorer({"ann": 7, "bob": 9}), "bob")
    check.eq("merge_scores(...)", lambda: m.merge_scores({"a": 1, "b": 2}, {"b": 3, "c": 4}),
             {"a": 1, "b": 5, "c": 4})


def test_05(m, check, tmp):
    for score, letter in [(95, "A"), (90, "A"), (85, "B"), (72, "C"), (60, "D"), (12, "F")]:
        check.eq(f"grade({score})", lambda s=score: m.grade(s), letter)
    check.eq("fizzbuzz(5)", lambda: m.fizzbuzz(5), ["1", "2", "Fizz", "4", "Buzz"])
    check.eq("fizzbuzz(15)[-1]", lambda: m.fizzbuzz(15)[-1], "FizzBuzz")
    check.eq("sum_digits(1234)", lambda: m.sum_digits(1234), 10)
    check.eq("first_negative_index([4, 2, -1, -5])", lambda: m.first_negative_index([4, 2, -1, -5]), 2)
    check.eq("first_negative_index([1, 2])", lambda: m.first_negative_index([1, 2]), -1)
    check.eq("count_down(3)", lambda: m.count_down(3), [3, 2, 1, "Liftoff!"])


def test_06(m, check, tmp):
    check.eq("greet('Ann')", lambda: m.greet("Ann"), "Hello, Ann!")
    check.eq("greet('Ann', 'Hi')", lambda: m.greet("Ann", "Hi"), "Hi, Ann!")
    check.eq("average(2, 4, 6)", lambda: m.average(2, 4, 6), 4.0)
    check.eq("average()", lambda: m.average(), 0)
    check.eq("build_profile('Ann', city='Oslo')", lambda: m.build_profile("Ann", city="Oslo"),
             {"name": "Ann", "city": "Oslo"})
    check.eq("sort_by_length(['ccc', 'a', 'bb'])", lambda: m.sort_by_length(["ccc", "a", "bb"]), ["a", "bb", "ccc"])
    check.eq("make_multiplier(3)(5)", lambda: m.make_multiplier(3)(5), 15)
    check.eq("factorial(0)", lambda: m.factorial(0), 1)
    check.eq("factorial(5)", lambda: m.factorial(5), 120)


def test_07(m, check, tmp):
    check.eq("BankAccount('Ann', 50).balance", lambda: m.BankAccount("Ann", 50).balance, 50)
    check.eq("deposit(25) returns 75", lambda: m.BankAccount("Ann", 50).deposit(25), 75)
    check.eq("withdraw(20) returns 30", lambda: m.BankAccount("Ann", 50).withdraw(20), 30)
    check.raises("deposit(-5) raises ValueError", lambda: m.BankAccount("Ann").deposit(-5), ValueError)
    check.raises("withdraw too much raises ValueError", lambda: m.BankAccount("Ann", 10).withdraw(11), ValueError)
    check.eq("str(account)", lambda: str(m.BankAccount("Ann", 50)), "Ann: $50.00")
    check.eq("SavingsAccount is a BankAccount",
             lambda: isinstance(m.SavingsAccount("Bo", 100), m.BankAccount), True)
    check.eq("SavingsAccount(rate=0.1).add_interest()",
             lambda: m.SavingsAccount("Bo", 100, rate=0.1).add_interest(), 110.0)


def test_08(m, check, tmp):
    check.eq("safe_divide(10, 4)", lambda: m.safe_divide(10, 4), 2.5)
    check.eq("safe_divide(1, 0)", lambda: m.safe_divide(1, 0), None)
    check.eq("parse_int('12')", lambda: m.parse_int("12"), 12)
    check.eq("parse_int('abc')", lambda: m.parse_int("abc"), 0)
    check.eq("parse_int('abc', -1)", lambda: m.parse_int("abc", -1), -1)
    check.eq("check_age(30)", lambda: m.check_age(30), 30)
    check.raises("check_age(-1) raises ValueError", lambda: m.check_age(-1), ValueError)
    path = tmp / "notes.txt"
    check.eq("write_lines then read_lines",
             lambda: (m.write_lines(path, ["one", "two"]), m.read_lines(path))[1], ["one", "two"])
    check.eq("read_lines(missing file)", lambda: m.read_lines(tmp / "nope.txt"), [])


def test_09(m, check, tmp):
    check.eq("squares(5)", lambda: m.squares(5), [0, 1, 4, 9, 16])
    check.eq("only_evens([1, 2, 3, 4])", lambda: m.only_evens([1, 2, 3, 4]), [2, 4])
    check.eq("word_lengths(['hi', 'hey'])", lambda: m.word_lengths(["hi", "hey"]), {"hi": 2, "hey": 3})
    check.eq("flatten([[1, 2], [3], []])", lambda: m.flatten([[1, 2], [3], []]), [1, 2, 3])
    check.eq("list(fibonacci(20))", lambda: list(m.fibonacci(20)), [0, 1, 1, 2, 3, 5, 8, 13])
    check.eq("hypotenuse(3, 4)", lambda: m.hypotenuse(3, 4), 5.0)


def test_10(m, check, tmp):
    def setup():
        quiz = m.Quiz()
        quiz.add_question("Capital of France?", "Paris", points=2)
        quiz.add_question("2 + 2?", "4")
        quiz.add_team("Owls")
        quiz.add_team("Bees")
        return quiz

    check.eq("add 2 questions", lambda: len(setup().questions), 2)
    check.raises("points=0 raises ValueError", lambda: m.Quiz().add_question("q", "a", points=0), ValueError)
    check.eq("new teams start at 0", lambda: setup().scores(), {"Owls": 0, "Bees": 0})

    def duplicate_team():
        quiz = setup()
        quiz.add_team("Owls")
    check.raises("duplicate team raises ValueError", duplicate_team, ValueError)

    check.eq("answer ignores case/spaces", lambda: setup().answer("Owls", 0, "  paris "), True)
    check.eq("wrong answer returns False", lambda: setup().answer("Owls", 1, "5"), False)

    def scored():
        quiz = setup()
        quiz.answer("Owls", 0, "Paris")
        quiz.answer("Bees", 1, "4")
        quiz.answer("Bees", 0, "Rome")
        return quiz
    check.eq("scores after answers", lambda: scored().scores(), {"Owls": 2, "Bees": 1})
    check.raises("unknown team raises KeyError", lambda: setup().answer("Cats", 0, "x"), KeyError)
    check.raises("bad question raises IndexError", lambda: setup().answer("Owls", 9, "x"), IndexError)

    def twice():
        quiz = setup()
        quiz.answer("Owls", 0, "Paris")
        quiz.answer("Owls", 0, "Paris")
    check.raises("answering twice raises ValueError", twice, ValueError)

    def copy_is_safe():
        quiz = setup()
        quiz.scores()["Owls"] = 99
        return quiz.scores()["Owls"]
    check.eq("scores() returns a copy", copy_is_safe, 0)
    check.eq("leaderboard()", lambda: scored().leaderboard(), ["1. Owls - 2 pts", "2. Bees - 1 pts"])

    def tie():
        quiz = setup()
        quiz.answer("Owls", 1, "4")
        quiz.answer("Bees", 1, "4")
        return quiz.leaderboard()
    check.eq("ties sorted by name", tie, ["1. Bees - 1 pts", "2. Owls - 1 pts"])


TESTS = {int(name[5:]): func for name, func in dict(globals()).items() if name.startswith("test_")}
