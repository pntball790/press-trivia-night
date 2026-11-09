"""Point the app at a throwaway SQLite file before anything imports it."""
import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Keep generated test documents out of the real generated/ folder.
import app.disciplinary  # noqa: E402

app.disciplinary.OUTPUT_DIR = Path(_tmp) / "generated"
