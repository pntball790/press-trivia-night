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
        if points < 1:
            raise ValueError("points must be at least 1")
        self.questions.append(Question(text, answer, points))

    def add_team(self, name):
        """Add a team with 0 points. Raise ValueError if it already exists."""
        if name in self._scores:
            raise ValueError(f"Team {name!r} already exists")
        self._scores[name] = 0

    def answer(self, team, question_index, guess):
        """Record an answer and return True/False for correct.
        - Raise KeyError if the team is unknown.
        - Raise IndexError if the question doesn't exist.
        - Raise ValueError if this team already answered this question.
        - Correct answers add the question's points to the team.
        """
        if team not in self._scores:
            raise KeyError(team)
        if not 0 <= question_index < len(self.questions):
            raise IndexError(question_index)
        key = (team, question_index)
        if key in self._answered:
            raise ValueError("Already answered")
        self._answered.add(key)
        question = self.questions[question_index]
        if question.is_correct(guess):
            self._scores[team] += question.points
            return True
        return False

    def scores(self):
        """Return a COPY of the scores dict (so callers can't change ours)."""
        return dict(self._scores)

    def leaderboard(self):
        """Return lines like "1. Owls - 5 pts", highest first.
        Ties: sort by name A-Z.  Hint: sorted(..., key=lambda item: (-item[1], item[0]))
        """
        ranked = sorted(self._scores.items(), key=lambda item: (-item[1], item[0]))
        return [f"{place}. {name} - {points} pts"
                for place, (name, points) in enumerate(ranked, start=1)]


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
