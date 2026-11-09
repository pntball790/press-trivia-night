"""
LESSON 10 - Mini Project: Trivia Night Scorekeeper
Puts lessons 1-9 together: classes, dicts, lists, loops, errors and f-strings.

You are building the scoring engine for a trivia night.
    quiz = Quiz()
    quiz.add_question("Capital of France?", "Paris", points=2)
    quiz.add_team("Owls")
    quiz.answer("Owls", 0, "paris")   # True - answers ignore case/extra spaces
    quiz.scores()                     # {"Owls": 2}
    quiz.leaderboard()                # ["1. Owls - 2 pts"]

After the tests pass, try running this file:  python3 exercises/ex10_project_trivia.py

Check your work:  python3 run.py 10
"""


class Question:
    """One question. (Already done for you - read it as an example.)"""

    def __init__(self, text, answer, points=1):
        self.text = text
        self.answer = answer
        self.points = points

    def is_correct(self, guess):
        return guess.strip().lower() == self.answer.strip().lower()


class Quiz:
    def __init__(self):
        self.questions = []
        self._scores = {}          # team name -> points
        self._answered = set()     # (team, question_index) pairs already answered

    def add_question(self, text, answer, points=1):
        """Append a Question. Raise ValueError if points < 1."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def add_team(self, name):
        """Add a team with 0 points. Raise ValueError if it already exists."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def answer(self, team, question_index, guess):
        """Record an answer and return True/False for correct.
        - Raise KeyError if the team is unknown.
        - Raise IndexError if the question doesn't exist.
        - Raise ValueError if this team already answered this question.
        - Correct answers add the question's points to the team.
        """
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def scores(self):
        """Return a COPY of the scores dict (so callers can't change ours)."""
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)

    def leaderboard(self):
        """Return lines like "1. Owls - 5 pts", highest first.
        Ties: sort by name A-Z.  Hint: sorted(..., key=lambda item: (-item[1], item[0]))
        """
        raise NotImplementedError("Not done yet")
        # TODO: write your code here (replace the line above)


def main():
    """Play a tiny game in the terminal."""
    quiz = Quiz()
    quiz.add_question("What language uses indentation for blocks?", "Python")
    quiz.add_question("What does C use to end a statement?", ";", points=2)
    quiz.add_team("You")
    for index, question in enumerate(quiz.questions):
        guess = input(f"Q{index + 1}: {question.text} ")
        print("Correct!" if quiz.answer("You", index, guess) else f"Answer: {question.answer}")
    print("\n".join(quiz.leaderboard()))


if __name__ == "__main__":
    main()
