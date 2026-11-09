"""
LESSON 7 - Classes, Objects and Inheritance
Read more: https://www.w3schools.com/python/python_classes.asp
           https://www.w3schools.com/python/python_inheritance.asp

A class is a blueprint. An object is one thing built from it.

    class Dog:
        species = "canine"              # class attribute (shared)

        def __init__(self, name):       # runs when you create a Dog
            self.name = name            # instance attribute (per dog)

        def speak(self):                # method: always takes self first
            return f"{self.name} says woof"

        def __str__(self):              # what print(dog) shows
            return f"Dog({self.name})"

    rex = Dog("Rex"); rex.speak()

Inheritance: a child class reuses a parent class and adds to it.
    class Puppy(Dog):
        def __init__(self, name, age):
            super().__init__(name)      # let the parent set itself up
            self.age = age

BEST PRACTICES
- Class names use CapWords (BankAccount); methods use snake_case.
- Keep data checks inside the class: raise ValueError for bad input.
- Use super() instead of naming the parent class directly.
- A leading underscore (self._balance) means "internal - don't touch from outside".

Check your work:  python3 run.py 7
"""


class BankAccount:
    """A simple bank account."""

    def __init__(self, owner, balance=0):
        """Store owner and balance (in self.owner and self._balance)."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    @property
    def balance(self):
        """Read-only access: account.balance"""
        return self._balance

    def deposit(self, amount):
        """Add amount. Raise ValueError if amount <= 0. Return the new balance."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def withdraw(self, amount):
        """Subtract amount. Raise ValueError if amount <= 0 or more than the
        balance. Return the new balance."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def __str__(self):
        """str(BankAccount("Ann", 50)) -> "Ann: $50.00" """
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)


class SavingsAccount(BankAccount):
    """A BankAccount that also earns interest."""

    def __init__(self, owner, balance=0, rate=0.02):
        """Call the parent __init__ with super(), then store self.rate."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def add_interest(self):
        """Add balance * rate to the balance (use deposit). Return new balance."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)
