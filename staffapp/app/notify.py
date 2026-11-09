"""Email stub.

Prints to the console for now. Later, replace the body of send_email with a
Microsoft Graph call (POST /users/{sender}/sendMail); nothing else needs to change.
"""


def send_email(to: str, subject: str, body: str) -> None:
    print("=" * 60)
    print(f"EMAIL (stub) to: {to}")
    print(f"Subject: {subject}")
    print("-" * 60)
    print(body)
    print("=" * 60, flush=True)
