import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT_DIR / "backups"
UUID_NAMESPACE = uuid.UUID("7f99e2a7-8d3f-45ed-a410-85d6b6e01f82")


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


def state_key():
    return os.environ.get("MONIMONI_STATE_KEY") or os.environ.get("MONIMON_STATE_KEY") or "default"


def rest_headers(extra=None):
    key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def supabase_request(method, path, payload=None, extra_headers=None):
    url = required_env("SUPABASE_URL").rstrip("/")
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        data=data,
        method=method,
        headers=rest_headers(extra_headers),
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase {error.code}: {detail}") from error


def read_state_from_supabase():
    encoded_key = urllib.parse.quote(state_key(), safe="")
    rows = supabase_request("GET", f"monimon_state?key=eq.{encoded_key}&select=data")
    if not rows:
        raise SystemExit(f"No monimon_state row found for key '{state_key()}'.")
    data = rows[0].get("data") or {}
    if "groups" in data and "monimons" not in data:
        data["monimons"] = data["groups"]
    return data


def read_state_from_file(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        payload = payload["data"]
    if isinstance(payload, dict) and "groups" in payload and "monimons" not in payload:
        payload["monimons"] = payload["groups"]
    return payload


def as_uuid(value, kind):
    raw = str(value or "").strip()
    if raw:
        try:
            return str(uuid.UUID(raw))
        except ValueError:
            pass
    return str(uuid.uuid5(UUID_NAMESPACE, f"{kind}:{raw or 'missing'}"))


def stable_uuid(kind, *parts):
    raw = ":".join(str(part or "").strip() for part in parts)
    return str(uuid.uuid5(UUID_NAMESPACE, f"{kind}:{raw or 'missing'}"))


def text_value(item, *keys, default=""):
    if not isinstance(item, dict):
        return default
    for key in keys:
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None and not isinstance(value, (dict, list)):
            return str(value).strip()
    return default


def number_value(item, *keys, default=0):
    for key in keys:
        value = item.get(key) if isinstance(item, dict) else None
        if value in (None, ""):
            continue
        try:
            return float(str(value).replace(",", "."))
        except ValueError:
            continue
    return default


def normalize_username(value):
    username = str(value or "").strip().lower()
    if username.startswith("@"):
        username = username[1:]
    return "".join(ch for ch in username if ch.isalnum() or ch in "._-")[:40]


def normalize_date(value):
    raw = str(value or "").strip()
    if not raw:
        return datetime.now(timezone.utc).date().isoformat()
    if "/" in raw:
        day, month, year = raw.split("/")[:3]
        return f"{year.zfill(4)}-{month.zfill(2)}-{day.zfill(2)}"
    return raw[:10]


def unique_by_id(rows):
    result = {}
    for row in rows:
        result[row["id"]] = row
    return list(result.values())


def unique_by_keys(rows, keys):
    result = {}
    for row in rows:
        result[tuple(row[key] for key in keys)] = row
    return list(result.values())


def unique_memberships(rows):
    result = {}
    for row in rows:
        result[(row["monimon_id"], row["member_id"])] = row
    return list(result.values())


def migrate_state(state):
    warnings = []
    profiles = []
    members = []
    monimons = []
    memberships = []
    expenses = []
    expense_participants = []
    payments = []
    contacts = []

    profile_map = {}
    member_map = {}
    monimon_map = {}

    legacy_profiles = state.get("profiles") if isinstance(state.get("profiles"), list) else []
    legacy_members = state.get("members") if isinstance(state.get("members"), list) else []
    legacy_monimons = state.get("monimons") if isinstance(state.get("monimons"), list) else []
    legacy_memberships = state.get("monimonMembers") if isinstance(state.get("monimonMembers"), list) else []
    legacy_debts = state.get("debts") if isinstance(state.get("debts"), list) else []
    legacy_payments = state.get("payments") if isinstance(state.get("payments"), list) else []
    legacy_contacts = state.get("contacts") if isinstance(state.get("contacts"), list) else []

    primary_profile_id = None
    primary_member_id = None

    for profile in legacy_profiles:
        raw_id = text_value(profile, "id", "profileId", "userId", "authId", default=text_value(profile, "email"))
        profile_id = as_uuid(raw_id, "profile")
        email = text_value(profile, "email").lower()
        username = normalize_username(text_value(profile, "username", default=email.split("@")[0] if email else raw_id))
        display_name = text_value(profile, "displayName", "name", "fullName", default=username or email or "User")
        profile_map[raw_id] = profile_id
        if email:
            profile_map[email] = profile_id
        profiles.append({
            "id": profile_id,
            "email": email or None,
            "username": username or None,
            "display_name": display_name,
            "avatar_url": text_value(profile, "avatarUrl", "avatar_url", "picture") or None,
            "role": "admin" if text_value(profile, "role").lower() == "admin" else "user",
        })
        if primary_profile_id is None:
            primary_profile_id = profile_id

    for profile in profiles:
        member_id = profile["id"]
        member_map[member_id] = member_id
        members.append({
            "id": member_id,
            "profile_id": profile["id"],
            "kind": "registered",
            "display_name": profile["display_name"],
            "created_by_profile_id": profile["id"],
        })
        if primary_member_id is None:
            primary_member_id = member_id

    for member in legacy_members:
        raw_id = text_value(member, "id", "memberId", default=text_value(member, "profileId", "profile_id", "email"))
        profile_raw = text_value(member, "profileId", "profile_id", "userId", "authId", "email")
        profile_id = profile_map.get(profile_raw) or profile_map.get(text_value(member, "email").lower())
        member_id = profile_id or as_uuid(raw_id, "member")
        member_map[raw_id] = member_id
        display_name = text_value(member, "displayName", "name", "username", default="Guest")
        members.append({
            "id": member_id,
            "profile_id": profile_id,
            "kind": "registered" if profile_id else "guest",
            "display_name": display_name,
            "created_by_profile_id": primary_profile_id,
        })
        if primary_member_id is None and profile_id:
            primary_member_id = member_id

    for monimon in legacy_monimons:
        raw_id = text_value(monimon, "id", "monimonId", default=text_value(monimon, "name", "title"))
        monimon_id = as_uuid(raw_id, "monimon")
        monimon_map[raw_id] = monimon_id
        name = text_value(monimon, "name", "title", default=state.get("personalSpaceName") or "PERSONAL")
        is_personal = raw_id == "personal" or text_value(monimon, "type").lower() == "personal"
        monimons.append({
            "id": monimon_id,
            "name": name,
            "type": "personal" if is_personal else "group",
            "settlement_mode": "global",
            "default_currency": text_value(monimon, "defaultCurrency", "currency", default="ARS").upper()[:8],
            "owner_profile_id": primary_profile_id,
            "created_by_member_id": primary_member_id,
            "archived_at": None,
        })
        for member_raw in monimon.get("members") or []:
            member_id = member_map.get(str(member_raw)) or as_uuid(member_raw, "member")
            memberships.append({
                "monimon_id": monimon_id,
                "member_id": member_id,
                "role": "owner" if member_id == primary_member_id else "member",
                "status": "active",
                "invited_by_profile_id": primary_profile_id,
            })

    if not monimons and primary_member_id:
        personal_id = stable_uuid("monimon", "personal", primary_member_id)
        monimons.append({
            "id": personal_id,
            "name": text_value(state, "personalSpaceName", default="PERSONAL"),
            "type": "personal",
            "settlement_mode": "global",
            "default_currency": "ARS",
            "owner_profile_id": primary_profile_id,
            "created_by_member_id": primary_member_id,
            "archived_at": None,
        })
        monimon_map["personal"] = personal_id
        memberships.append({
            "monimon_id": personal_id,
            "member_id": primary_member_id,
            "role": "owner",
            "status": "active",
            "invited_by_profile_id": primary_profile_id,
        })

    for item in legacy_memberships:
        monimon_raw = text_value(item, "monimonId", "monimon_id")
        member_raw = text_value(item, "memberId", "member_id")
        monimon_id = monimon_map.get(monimon_raw) or as_uuid(monimon_raw, "monimon")
        member_id = member_map.get(member_raw) or as_uuid(member_raw, "member")
        memberships.append({
            "monimon_id": monimon_id,
            "member_id": member_id,
            "role": text_value(item, "role", default="member") if text_value(item, "role") in {"owner", "admin", "member"} else "member",
            "status": text_value(item, "status", default="active") if text_value(item, "status") in {"active", "invited", "removed"} else "active",
            "invited_by_profile_id": primary_profile_id,
        })

    memberships = unique_memberships(memberships)
    active_members_by_monimon = {}
    for item in memberships:
        if item["status"] == "active":
            active_members_by_monimon.setdefault(item["monimon_id"], set()).add(item["member_id"])

    for debt in legacy_debts:
        raw_id = text_value(debt, "id", "debtId", default=f"{text_value(debt, 'reason', 'title', 'description')}:{number_value(debt, 'amount')}")
        monimon_raw = text_value(debt, "monimonId", "monimon_id", default="personal")
        monimon_id = monimon_map.get(monimon_raw) or as_uuid(monimon_raw, "monimon")
        paid_by_raw = text_value(debt, "fromMemberId", "from", "paidByMemberId", "paid_by_member_id")
        paid_by_member_id = member_map.get(paid_by_raw) or as_uuid(paid_by_raw, "member")
        expense_id = as_uuid(raw_id, "expense")
        expenses.append({
            "id": expense_id,
            "monimon_id": monimon_id,
            "paid_by_member_id": paid_by_member_id,
            "title": text_value(debt, "reason", "title", "description", "concept", default="Gasto"),
            "amount": number_value(debt, "amount", "total", "value"),
            "currency": text_value(debt, "currency", default="ARS").upper()[:8],
            "expense_date": normalize_date(text_value(debt, "date", "createdAt", "expenseDate")),
            "status": "verified" if text_value(debt, "status", default="verified") not in {"pending", "rejected", "deleted"} else text_value(debt, "status"),
            "created_by_profile_id": primary_profile_id,
        })
        participant_ids = active_members_by_monimon.get(monimon_id) or {paid_by_member_id}
        for member_id in sorted(participant_ids):
            expense_participants.append({
                "expense_id": expense_id,
                "monimon_id": monimon_id,
                "member_id": member_id,
                "share_amount": None,
            })

    for payment in legacy_payments:
        raw_id = text_value(payment, "id", "paymentId", default=f"{text_value(payment, 'reason', 'title', 'description')}:{number_value(payment, 'amount')}")
        monimon_raw = text_value(payment, "monimonId", "monimon_id", default="personal")
        monimon_id = monimon_map.get(monimon_raw) or as_uuid(monimon_raw, "monimon")
        from_raw = text_value(payment, "fromMemberId", "from", "payerMemberId")
        to_raw = text_value(payment, "toMemberId", "to", "receiverMemberId")
        payments.append({
            "id": as_uuid(raw_id, "payment"),
            "monimon_id": monimon_id,
            "from_member_id": member_map.get(from_raw) or as_uuid(from_raw, "member"),
            "to_member_id": member_map.get(to_raw) or as_uuid(to_raw, "member"),
            "amount": number_value(payment, "amount", "total", "value"),
            "currency": text_value(payment, "currency", default="ARS").upper()[:8],
            "payment_date": normalize_date(text_value(payment, "date", "createdAt", "paymentDate")),
            "detail": text_value(payment, "reason", "title", "description", default="Pago"),
            "status": "verified" if text_value(payment, "status", default="verified") not in {"pending", "rejected", "deleted"} else text_value(payment, "status"),
            "created_by_profile_id": primary_profile_id,
        })

    for contact in legacy_contacts:
        owner_raw = text_value(contact, "ownerProfileId", "profileId", "fromProfileId", "from")
        contact_raw = text_value(contact, "contactProfileId", "toProfileId", "to")
        owner_profile_id = profile_map.get(owner_raw)
        contact_profile_id = profile_map.get(contact_raw)
        if not owner_profile_id or not contact_profile_id:
            warnings.append(f"Skipped contact without two registered profiles: {contact}")
            continue
        contacts.append({
            "id": stable_uuid("contact", owner_profile_id, contact_profile_id),
            "requester_profile_id": owner_profile_id,
            "recipient_profile_id": contact_profile_id,
            "status": text_value(contact, "status", default="accepted") if text_value(contact, "status") in {"pending", "accepted", "blocked", "removed"} else "accepted",
        })

    if state.get("paymentRequests"):
        warnings.append("Pending paymentRequests were not migrated yet; keep legacy state until approval flow is moved.")

    return {
        "profiles": unique_by_id(profiles),
        "members": unique_by_id(members),
        "monimons": unique_by_id(monimons),
        "monimon_members": memberships,
        "expenses": unique_by_id(expenses),
        "expense_participants": unique_by_keys(expense_participants, ("expense_id", "member_id")),
        "payments": unique_by_id(payments),
        "contact_relationships": unique_by_id(contacts),
        "warnings": warnings,
    }


UPSERT_ORDER = [
    "profiles",
    "members",
    "monimons",
    "monimon_members",
    "expenses",
    "expense_participants",
    "payments",
    "contact_relationships",
]


def upsert_table(table, rows):
    if not rows:
        return
    path = f"{table}?on_conflict=id"
    if table == "monimon_members":
        path = f"{table}?on_conflict=monimon_id,member_id"
    if table == "expense_participants":
        path = f"{table}?on_conflict=expense_id,member_id"
    supabase_request(
        "POST",
        path,
        rows,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )


def write_preview(result):
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = BACKUP_DIR / f"normalized_preview_{state_key()}_{timestamp}.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Migrate legacy monimon_state JSON to normalized Supabase tables.")
    parser.add_argument("--input", help="Backup JSON file to migrate instead of reading Supabase.")
    parser.add_argument("--dry-run", action="store_true", help="Generate the preview without writing rows. This is the default.")
    parser.add_argument("--apply", action="store_true", help="Write generated rows to Supabase.")
    args = parser.parse_args()

    if args.dry_run and args.apply:
        raise SystemExit("Use either --dry-run or --apply, not both.")

    load_env()
    state = read_state_from_file(args.input) if args.input else read_state_from_supabase()
    result = migrate_state(state)
    preview_path = write_preview(result)
    counts = {table: len(result.get(table, [])) for table in UPSERT_ORDER}
    counts["warnings"] = len(result["warnings"])

    print(f"Preview created: {preview_path}")
    print(json.dumps(counts, ensure_ascii=False, indent=2))
    for warning in result["warnings"]:
        print(f"WARNING: {warning}")

    if not args.apply:
        print("Dry run only. Re-run with --apply to write normalized rows.")
        return

    for table in UPSERT_ORDER:
        upsert_table(table, result[table])
    print("Migration applied.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as error:
        print(f"Network error: {error}", file=sys.stderr)
        raise SystemExit(2) from error
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error
