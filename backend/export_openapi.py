"""Generate YAML from the same route definitions used by Swagger /docs."""

from pathlib import Path
import yaml
from main import create_app

if __name__ == "__main__":
    output = Path(__file__).parent / "openapi.yaml"
    output.write_text(
        yaml.safe_dump(create_app().openapi(), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"Created {output.name}")
