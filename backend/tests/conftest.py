import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent

for path in (str(REPO_DIR), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

