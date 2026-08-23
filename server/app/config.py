import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
EXTRACTION_MODEL = os.environ.get("FORGE_EXTRACTION_MODEL", "claude-sonnet-5")

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7688")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "forge-dev-password")

STORAGE_DIR = Path(os.environ.get("FORGE_STORAGE_DIR", "./storage")).resolve()
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

DOCUMENTS_DIR = STORAGE_DIR / "documents"
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
