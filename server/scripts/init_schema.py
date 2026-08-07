"""Apply neo4j/init/01_schema.cypher's constraints/indexes to a running Neo4j instance."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.neo4j_client import get_driver  # noqa: E402

SCHEMA_FILE = Path(__file__).resolve().parent.parent / "neo4j" / "init" / "01_schema.cypher"


def statements(cypher_text: str) -> list[str]:
    # Strip the block-comment property/relationship reference before splitting.
    without_block_comments = re.sub(r"/\*.*?\*/", "", cypher_text, flags=re.DOTALL)
    lines = [
        line for line in without_block_comments.splitlines() if not line.strip().startswith("//")
    ]
    text = "\n".join(lines)
    return [s.strip() for s in text.split(";") if s.strip()]


def main() -> None:
    cypher_text = SCHEMA_FILE.read_text(encoding="utf-8")
    driver = get_driver()
    with driver.session() as session:
        for statement in statements(cypher_text):
            print(f"-> {statement.splitlines()[0][:80]}")
            session.run(statement)
    print(f"Applied {SCHEMA_FILE.name}.")


if __name__ == "__main__":
    main()
