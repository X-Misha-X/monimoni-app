import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT_DIR / "backups"


def load_env():
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def required_env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing {name} in .env")
    return value


def supabase_get(path):
    url = required_env("SUPABASE_URL").rstrip("/")
    key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    request = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        method="GET",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise SystemExit(f"Supabase {error.code}: {detail}") from error


def state_key():
    return os.environ.get("MONIMONI_STATE_KEY") or os.environ.get("MONIMON_STATE_KEY") or "default"


def collection_count(data, *names):
    for name in names:
        value = data.get(name)
        if isinstance(value, list):
            return len(value)
    return 0


def main():
    load_env()
    key = state_key()
    encoded_key = urllib.parse.quote(key, safe="")
    rows = supabase_get(f"monimon_state?key=eq.{encoded_key}&select=key,data,updated_at")
    if not rows:
        raise SystemExit(f"No monimon_state row found for key '{key}'.")

    snapshot = rows[0]
    data = snapshot.get("data") or {}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    BACKUP_DIR.mkdir(exist_ok=True)
    output_path = BACKUP_DIR / f"monimon_state_{key}_{timestamp}.json"
    output_path.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary = {
        "profiles": collection_count(data, "profiles"),
        "members": collection_count(data, "members"),
        "monimons": collection_count(data, "monimons", "groups"),
        "monimonMembers": collection_count(data, "monimonMembers"),
        "debts": collection_count(data, "debts"),
        "payments": collection_count(data, "payments"),
        "paymentRequests": collection_count(data, "paymentRequests"),
        "contacts": collection_count(data, "contacts"),
    }
    print(f"Backup created: {output_path}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as error:
        print(f"Network error: {error}", file=sys.stderr)
        raise SystemExit(2) from error
