import json
import os
import re
import sys
import traceback
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse


def load_env_file(path=".env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            clean = line.strip()
            if not clean or clean.startswith("#") or "=" not in clean:
                continue
            key, value = clean.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
STATE_KEY = os.environ.get("MONIMONI_STATE_KEY") or os.environ.get("MONIMON_STATE_KEY", "default")
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("MONIMONI_ADMIN_EMAILS", "").split(",")
    if email.strip()
}
UUID_NAMESPACE = uuid.UUID("7f99e2a7-8d3f-45ed-a410-85d6b6e01f82")


def normalize_username(value=""):
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-z0-9._]", "", text.lower())
    text = re.sub(r"\.{2,}", ".", text).strip("._")
    return text[:24]


def as_uuid(value, kind):
    raw = str(value or "").strip()
    if raw:
        try:
            return str(uuid.UUID(raw))
        except ValueError:
            pass
    return str(uuid.uuid5(UUID_NAMESPACE, f"{kind}:{raw or 'missing'}"))


EMPTY_STATE = {
    "profiles": [],
    "members": [],
    "monimons": [],
    "monimonMembers": [],
    "debts": [],
    "payments": [],
    "paymentRequests": [],
    "contacts": [],
    "personalSpaceName": "PERSONAL",
}


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.end_headers()
    handler.wfile.write(body)


def error_response(handler, error):
    traceback.print_exc()
    message = str(error) or error.__class__.__name__
    json_response(handler, 500, {"error": message})


def supabase_headers(extra=None):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def require_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_ANON_KEY:
        raise RuntimeError("Missing SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY")


def json_http_request(method, url, payload=None, headers=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


def supabase_request(method, path, payload=None, headers=None):
    require_supabase()
    try:
        return json_http_request(
            method,
            f"{SUPABASE_URL}/rest/v1/{path}",
            payload=payload,
            headers=supabase_headers(headers),
        )
    except RuntimeError as error:
        message = str(error)
        if message.startswith("HTTP "):
            raise RuntimeError(f"Supabase {message[5:]}") from error
        raise


def optional_supabase_rows(path):
    try:
        rows = supabase_request("GET", path)
    except RuntimeError as error:
        message = str(error)
        if "42P01" in message or "does not exist" in message or "Could not find" in message:
            return None
        raise
    return rows if isinstance(rows, list) else []


def auth_request(method, path, payload=None, access_token=None):
    require_supabase()
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    try:
        return json_http_request(
            method,
            f"{SUPABASE_URL}/auth/v1/{path}",
            payload=payload,
            headers=headers,
        ) or {}
    except RuntimeError as error:
        message = str(error)
        if message.startswith("HTTP "):
            raise RuntimeError(f"Supabase Auth {message[5:]}") from error
        raise


def decorate_auth_user(user):
    if not isinstance(user, dict):
        return user
    email = (user.get("email") or "").lower()
    app_metadata = user.get("app_metadata") if isinstance(user.get("app_metadata"), dict) else {}
    if email in ADMIN_EMAILS:
        app_metadata = {**app_metadata, "role": "admin"}
    return {**user, "app_metadata": app_metadata}


def decorate_auth_payload(payload):
    if isinstance(payload, dict) and isinstance(payload.get("user"), dict):
        return {**payload, "user": decorate_auth_user(payload["user"])}
    if isinstance(payload, dict) and payload.get("id") and payload.get("email"):
        return decorate_auth_user(payload)
    return payload


def delete_auth_user(user_id):
    request = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        method="DELETE",
        headers=supabase_headers(),
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase Auth {error.code}: {detail}") from error


def bearer_token(handler):
    auth_header = handler.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return ""
    return auth_header.split(" ", 1)[1].strip()


def get_state():
    rows = supabase_request("GET", f"group_state?key=eq.{STATE_KEY}&select=data")
    if not rows:
        legacy_state = EMPTY_STATE
    else:
        data = rows[0].get("data") or {}
        if "groups" in data and "monimons" not in data:
            data["monimons"] = data["groups"]
        legacy_state = {**EMPTY_STATE, **data}

    try:
        normalized_state = get_normalized_state()
    except RuntimeError as error:
        print(f"Normalized state read warning: {error}", flush=True)
        normalized_state = None
    if not normalized_state:
        return legacy_state
    normalized_state = merge_legacy_group_metadata(legacy_state, normalized_state)
    legacy_group_ids = {
        item.get("id")
        for item in legacy_state.get("monimons", [])
        if isinstance(item, dict) and item.get("id") and item.get("id") != "personal"
    }

    return {
        **legacy_state,
        **normalized_state,
        "debts": merge_authoritative_records(
            legacy_state.get("debts", []),
            normalized_state.get("debts", []),
            legacy_group_ids,
        ),
        "payments": merge_authoritative_records(
            legacy_state.get("payments", []),
            normalized_state.get("payments", []),
            legacy_group_ids,
        ),
        "paymentRequests": legacy_state.get("paymentRequests", []),
        "contacts": legacy_state.get("contacts", []),
        "personalSpaceName": legacy_state.get("personalSpaceName") or "PERSONAL",
    }


def merge_legacy_group_metadata(legacy_state, normalized_state):
    legacy_groups = legacy_state.get("monimons", [])
    if not isinstance(legacy_groups, list):
        legacy_groups = []
    metadata_by_id = {
        item.get("id"): {
            "icon": item.get("icon"),
        }
        for item in legacy_groups
        if item.get("id")
    }
    normalized_groups = []
    for group in normalized_state.get("monimons", []):
        metadata = metadata_by_id.get(group.get("id"), {})
        normalized_groups.append({
            **group,
            **{key: value for key, value in metadata.items() if value},
        })
    return {
        **normalized_state,
        "monimons": normalized_groups,
        "debts": merge_legacy_debt_metadata(legacy_state, normalized_state),
    }


def merge_legacy_debt_metadata(legacy_state, normalized_state):
    legacy_debts = legacy_state.get("debts", [])
    if not isinstance(legacy_debts, list):
        legacy_debts = []
    metadata_by_id = {
        item.get("id"): {
            "category": item.get("category"),
            "splitParticipantIds": item.get("splitParticipantIds"),
            "splitMode": item.get("splitMode"),
            "splitAmounts": item.get("splitAmounts"),
            "splitPercentages": item.get("splitPercentages"),
        }
        for item in legacy_debts
        if item.get("id")
    }
    normalized_debts = []
    for debt in normalized_state.get("debts", []):
        metadata = metadata_by_id.get(debt.get("id"), {})
        normalized_debts.append({
            **debt,
            **{key: value for key, value in metadata.items() if value},
        })
    return normalized_debts


def merge_personal_legacy_records(legacy_records, normalized_records):
    if not isinstance(legacy_records, list):
        legacy_records = []
    personal_records = [
        item for item in legacy_records
        if item.get("monimonId", "personal") == "personal"
    ]
    return [*normalized_records, *personal_records]


def merge_authoritative_records(legacy_records, normalized_records, legacy_group_ids):
    if not isinstance(legacy_records, list):
        legacy_records = []
    if not isinstance(normalized_records, list):
        normalized_records = []
    legacy_group_ids = set(legacy_group_ids or [])
    normalized_fallback = [
        item for item in normalized_records
        if isinstance(item, dict)
        and item.get("monimonId") not in legacy_group_ids
        and item.get("monimonId") != "personal"
    ]
    return [*normalized_fallback, *legacy_records]


def merge_payment_records(legacy_records, normalized_records):
    if not isinstance(legacy_records, list):
        legacy_records = []
    if not isinstance(normalized_records, list):
        normalized_records = []
    merged = []
    seen_ids = set()
    seen_signatures = set()
    for payment in [*normalized_records, *legacy_records]:
        if not isinstance(payment, dict):
            continue
        payment_id = payment.get("id")
        signature = payment_signature(payment)
        if payment_id and payment_id in seen_ids:
            continue
        if signature and signature in seen_signatures:
            continue
        merged.append(payment)
        if payment_id:
            seen_ids.add(payment_id)
        if signature:
            seen_signatures.add(signature)
    return merged


def payment_signature(payment):
    try:
        amount = round(float(payment.get("amount") or 0), 2)
    except (TypeError, ValueError):
        amount = 0
    return (
        payment.get("monimonId"),
        payment.get("fromMemberId") or payment.get("from"),
        payment.get("toMemberId") or payment.get("to"),
        amount,
        payment.get("currency") or "ARS",
        iso_date(payment.get("date")),
    )


def get_normalized_state():
    profiles = optional_supabase_rows(
        "profiles?select=id,email,username,display_name,avatar_url,role"
    )
    if profiles is None:
        return None
    members = optional_supabase_rows(
        "members?select=id,profile_id,kind,display_name"
    )
    monimons = optional_supabase_rows(
        "groups?deleted_at=is.null&select=id,name,type,settlement_mode,default_currency,archived_at"
    )
    memberships = optional_supabase_rows(
        "group_members?select=group_id,member_id,role,status"
    )
    expenses = optional_supabase_rows(
        "expenses?status=neq.deleted&select=id,group_id,paid_by_member_id,title,amount,currency,expense_date,status"
    )
    payments = optional_supabase_rows(
        "payments?status=neq.deleted&select=id,group_id,from_member_id,to_member_id,amount,currency,payment_date,detail,status"
    )
    if any(value is None for value in (members, monimons, memberships, expenses, payments)):
        return None
    if not any((profiles, members, monimons, memberships, expenses, payments)):
        return None

    return {
        "profiles": [profile_to_state(row) for row in profiles],
        "members": [member_to_state(row) for row in members],
        "monimons": [monimon_to_state(row) for row in monimons],
        "monimonMembers": [membership_to_state(row) for row in memberships],
        "debts": [expense_to_state(row) for row in expenses if row.get("status") == "verified"],
        "payments": [payment_to_state(row) for row in payments if row.get("status") == "verified"],
    }


def profile_to_state(row):
    display_name = row.get("display_name") or row.get("email") or "Usuario"
    return {
        "id": row.get("id"),
        "name": display_name,
        "displayName": display_name,
        "username": row.get("username") or normalize_username(display_name),
        "email": row.get("email") or "",
        "role": row.get("role") or "user",
        "avatarSrc": row.get("avatar_url") or "",
    }


def member_to_state(row):
    return {
        "id": row.get("id"),
        "profileId": row.get("profile_id"),
        "displayName": row.get("display_name") or "Usuario",
        "status": "active",
        "kind": row.get("kind") or "registered",
    }


def monimon_to_state(row):
    return {
        "id": row.get("id"),
        "name": row.get("name") or "Mon!",
        "type": row.get("type") or "group",
        "settlementMode": row.get("settlement_mode") or "global",
        "defaultCurrency": row.get("default_currency") or "ARS",
        "archivedAt": row.get("archived_at"),
    }


def membership_to_state(row):
    return {
        "monimonId": row.get("group_id"),
        "memberId": row.get("member_id"),
        "role": row.get("role") or "member",
        "status": row.get("status") or "active",
    }


def expense_to_state(row):
    return {
        "id": row.get("id"),
        "monimonId": row.get("group_id"),
        "fromMemberId": row.get("paid_by_member_id"),
        "toMemberId": "group",
        "title": row.get("title") or "Gasto",
        "amount": float(row.get("amount") or 0),
        "currency": row.get("currency") or "ARS",
        "date": row.get("expense_date"),
        "kind": "expense",
        "status": "open",
    }


def payment_to_state(row):
    return {
        "id": row.get("id"),
        "monimonId": row.get("group_id"),
        "fromMemberId": row.get("from_member_id"),
        "toMemberId": row.get("to_member_id"),
        "detail": row.get("detail") or "Pago",
        "amount": float(row.get("amount") or 0),
        "currency": row.get("currency") or "ARS",
        "date": row.get("payment_date"),
    }


def member_ids_for_monimon(state, monimon_id):
    return {
        item.get("memberId")
        for item in state.get("monimonMembers", [])
        if item.get("monimonId") == monimon_id
    }


def validate_member_in_monimon(state, member_id, monimon_id):
    if monimon_id == "personal":
        return
    if member_id == "group":
        return
    if member_id not in member_ids_for_monimon(state, monimon_id):
        raise RuntimeError(f"Member {member_id} is not part of monimon {monimon_id}")


def validate_state(state):
    seen_usernames = {}
    for profile in state.get("profiles", []):
        profile_id = profile.get("id")
        username = normalize_username(profile.get("username"))
        if not username:
            continue
        existing_profile_id = seen_usernames.get(username)
        if existing_profile_id and existing_profile_id != profile_id:
            raise RuntimeError("Ese nombre de usuario ya esta en uso.")
        seen_usernames[username] = profile_id

    for debt in state.get("debts", []):
        monimon_id = debt.get("monimonId")
        if not monimon_id:
            continue
        validate_member_in_monimon(state, debt.get("fromMemberId") or debt.get("from"), monimon_id)
        validate_member_in_monimon(state, debt.get("toMemberId") or debt.get("to"), monimon_id)
    for request in state.get("paymentRequests", []):
        monimon_id = request.get("monimonId")
        if not monimon_id:
            continue
        requested_by = request.get("requestedByMemberId")
        if request.get("status") == "approved" and requested_by and request.get("requiredApproverMemberIds"):
            confirmed_by_others = [
                member_id for member_id in request.get("approvedByMemberIds") or []
                if member_id != requested_by
            ]
            if not confirmed_by_others:
                raise RuntimeError("Una liquidacion no puede confirmarse por quien la inicio.")
        if requested_by and requested_by in (request.get("requiredApproverMemberIds") or []):
            raise RuntimeError("Quien inicia una liquidacion no puede ser su propio confirmador.")
        validate_member_in_monimon(state, request.get("fromMemberId") or request.get("from"), monimon_id)
        validate_member_in_monimon(state, request.get("toMemberId") or request.get("to"), monimon_id)
        for member_id in request.get("requiredApproverMemberIds") or []:
            validate_member_in_monimon(state, member_id, monimon_id)
        for member_id in request.get("approvedByMemberIds") or []:
            validate_member_in_monimon(state, member_id, monimon_id)
    seen_pending_settlements = set()
    for request in state.get("paymentRequests", []):
        if request.get("status") != "pending":
            continue
        key = (
            request.get("monimonId"),
            request.get("fromMemberId") or request.get("from"),
            request.get("toMemberId") or request.get("to"),
            tuple(sorted(request.get("debtIds") or [])),
            request.get("currency") or "ARS",
            str(request.get("amount") or 0),
        )
        if key in seen_pending_settlements:
            raise RuntimeError("Ya existe una liquidacion pendiente igual.")
        seen_pending_settlements.add(key)
    for payment in state.get("payments", []):
        monimon_id = payment.get("monimonId")
        if not monimon_id:
            continue
        validate_member_in_monimon(state, payment.get("fromMemberId") or payment.get("from"), monimon_id)
        validate_member_in_monimon(state, payment.get("toMemberId") or payment.get("to"), monimon_id)


def migrate_legacy_state(state):
    profiles = state.get("profiles") if isinstance(state.get("profiles"), list) else []
    monimons = state.get("monimons") if isinstance(state.get("monimons"), list) else state.get("groups") if isinstance(state.get("groups"), list) else []
    members = state.get("members") if isinstance(state.get("members"), list) else []
    monimon_members = state.get("monimonMembers") if isinstance(state.get("monimonMembers"), list) else []

    member_ids = {member.get("id") for member in members}
    for profile in profiles:
        profile_id = profile.get("id")
        if profile_id and profile_id not in member_ids:
            members.append({
                "id": profile_id,
                "profileId": profile_id,
                "displayName": profile.get("name") or profile.get("displayName") or profile.get("email") or "User",
                "username": profile.get("username") or normalize_username(profile.get("email") or profile.get("name")),
                "email": profile.get("email") or "",
                "status": "active",
            })
            member_ids.add(profile_id)

    membership_keys = {(item.get("monimonId"), item.get("memberId")) for item in monimon_members}
    for monimon in monimons:
        monimon_id = monimon.get("id")
        for member_id in monimon.get("members") or []:
            if not monimon_id or not member_id or (monimon_id, member_id) in membership_keys:
                continue
            monimon_members.append({
                "monimonId": monimon_id,
                "memberId": member_id,
                "status": "active",
            })
            membership_keys.add((monimon_id, member_id))

    return profiles, members, monimons, monimon_members


def put_state(state):
    profiles, members, monimons, monimon_members = migrate_legacy_state(state)
    personal_space_name = state.get("personalSpaceName")
    if not isinstance(personal_space_name, str) or not personal_space_name.strip():
        personal_space_name = "PERSONAL"
    clean_state = {
        "profiles": profiles,
        "members": members,
        "monimons": monimons,
        "monimonMembers": monimon_members,
        "debts": state.get("debts") if isinstance(state.get("debts"), list) else [],
        "payments": state.get("payments") if isinstance(state.get("payments"), list) else [],
        "paymentRequests": state.get("paymentRequests") if isinstance(state.get("paymentRequests"), list) else [],
        "contacts": state.get("contacts") if isinstance(state.get("contacts"), list) else [],
        "personalSpaceName": personal_space_name.strip()[:32],
    }
    validate_state(clean_state)
    payload = {"key": STATE_KEY, "data": clean_state}
    supabase_request(
        "POST",
        "group_state",
        [payload],
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    try:
        sync_normalized_state(clean_state)
        sync_normalized_monimon_deletions(clean_state)
    except RuntimeError as error:
        print(f"Normalized sync warning: {error}", flush=True)
    return clean_state


def sync_normalized_state(state):
    if optional_supabase_rows("groups?select=id&limit=1") is None:
        return

    members = state.get("members", []) if isinstance(state.get("members"), list) else []
    profiles = state.get("profiles", []) if isinstance(state.get("profiles"), list) else []
    monimons = state.get("monimons", []) if isinstance(state.get("monimons"), list) else []
    memberships = state.get("monimonMembers", []) if isinstance(state.get("monimonMembers"), list) else []
    debts = state.get("debts", []) if isinstance(state.get("debts"), list) else []
    payments = state.get("payments", []) if isinstance(state.get("payments"), list) else []

    profile_rows = []
    profile_ids = set()
    for profile in profiles:
        profile_id = profile.get("id")
        if not is_uuid(profile_id):
            continue
        profile_ids.add(profile_id)
        profile_rows.append({
            "id": profile_id,
            "email": profile.get("email") or None,
            "username": normalize_username(profile.get("username") or profile.get("email") or profile.get("name")) or None,
            "display_name": profile.get("displayName") or profile.get("name") or profile.get("email") or "Usuario",
            "avatar_url": profile.get("avatarSrc") or None,
            "role": "admin" if profile.get("role") == "admin" else "user",
        })

    member_rows = []
    member_id_map = {}
    for member in members:
        raw_id = member.get("id")
        if not raw_id:
            continue
        member_id = as_uuid(raw_id, "member")
        member_id_map[str(raw_id)] = member_id
        profile_id = member.get("profileId") if member.get("profileId") in profile_ids else None
        if not profile_id and is_uuid(raw_id) and raw_id in profile_ids:
            profile_id = raw_id
        member_rows.append({
            "id": member_id,
            "profile_id": profile_id,
            "kind": "registered" if profile_id else "guest",
            "display_name": member.get("displayName") or member.get("name") or "Usuario",
        })

    monimon_rows = []
    monimon_id_map = {}
    first_member_by_monimon = {}
    for item in memberships:
        if item.get("monimonId") and item.get("memberId") and item.get("monimonId") != "personal":
            first_member_by_monimon.setdefault(str(item.get("monimonId")), str(item.get("memberId")))

    for monimon in monimons:
        raw_id = monimon.get("id")
        if not raw_id or raw_id == "personal":
            continue
        monimon_id = as_uuid(raw_id, "monimon")
        monimon_id_map[str(raw_id)] = monimon_id
        created_by_member_id = member_id_map.get(first_member_by_monimon.get(str(raw_id)))
        if not created_by_member_id and member_rows:
            created_by_member_id = member_rows[0]["id"]
        monimon_rows.append({
            "id": monimon_id,
            "name": monimon.get("name") or "Mon!",
            "type": "group",
            "settlement_mode": monimon.get("settlementMode") or "global",
            "default_currency": monimon.get("defaultCurrency") or "ARS",
            "created_by_member_id": created_by_member_id,
        })

    membership_rows = []
    for item in memberships:
        monimon_id = monimon_id_map.get(str(item.get("monimonId"))) or as_uuid(item.get("monimonId"), "monimon")
        member_id = member_id_map.get(str(item.get("memberId"))) or as_uuid(item.get("memberId"), "member")
        if not item.get("monimonId") or not item.get("memberId") or item.get("monimonId") == "personal":
            continue
        membership_rows.append({
            "group_id": monimon_id,
            "member_id": member_id,
            "role": item.get("role") if item.get("role") in {"owner", "admin", "member"} else "member",
            "status": item.get("status") if item.get("status") in {"active", "invited", "removed"} else "active",
        })

    membership_keys = {
        (item["group_id"], item["member_id"])
        for item in membership_rows
    }
    for monimon in monimon_rows:
        created_by_member_id = monimon.get("created_by_member_id")
        if not created_by_member_id or (monimon["id"], created_by_member_id) in membership_keys:
            continue
        membership_rows.append({
            "group_id": monimon["id"],
            "member_id": created_by_member_id,
            "role": "owner",
            "status": "active",
        })
        membership_keys.add((monimon["id"], created_by_member_id))

    expense_rows = []
    participant_rows = []
    payment_rows = []
    active_members_by_monimon = {}
    for item in membership_rows:
        if item["status"] == "active":
            active_members_by_monimon.setdefault(item["group_id"], set()).add(item["member_id"])

    for debt in debts:
        if debt.get("kind") == "loan" or debt.get("monimonId") == "personal":
            continue
        monimon_id = monimon_id_map.get(str(debt.get("monimonId"))) or as_uuid(debt.get("monimonId"), "monimon")
        paid_by_member_id = member_id_map.get(str(debt.get("fromMemberId"))) or as_uuid(debt.get("fromMemberId"), "member")
        expense_id = as_uuid(debt.get("id"), "expense")
        expense_rows.append({
            "id": expense_id,
            "group_id": monimon_id,
            "paid_by_member_id": paid_by_member_id,
            "title": debt.get("title") or "Gasto",
            "amount": float(debt.get("amount") or 0),
            "currency": debt.get("currency") or "ARS",
            "expense_date": iso_date(debt.get("date")),
            "status": "verified" if debt.get("status") != "deleted" else "deleted",
        })
        participants = set(active_members_by_monimon.get(monimon_id) or [])
        if not participants and debt.get("toMemberId") and debt.get("toMemberId") != "group":
            participants.add(member_id_map.get(str(debt.get("toMemberId"))) or as_uuid(debt.get("toMemberId"), "member"))
        participants.add(paid_by_member_id)
        for member_id in sorted(participants):
            participant_rows.append({
                "expense_id": expense_id,
                "group_id": monimon_id,
                "member_id": member_id,
                "share_amount": None,
            })

    for payment in payments:
        if payment.get("monimonId") == "personal":
            continue
        monimon_id = monimon_id_map.get(str(payment.get("monimonId"))) or as_uuid(payment.get("monimonId"), "monimon")
        from_member_id = member_id_map.get(str(payment.get("fromMemberId") or payment.get("from"))) or as_uuid(payment.get("fromMemberId") or payment.get("from"), "member")
        to_member_id = member_id_map.get(str(payment.get("toMemberId") or payment.get("to"))) or as_uuid(payment.get("toMemberId") or payment.get("to"), "member")
        payment_rows.append({
            "id": as_uuid(payment.get("id"), "payment"),
            "group_id": monimon_id,
            "from_member_id": from_member_id,
            "to_member_id": to_member_id,
            "amount": float(payment.get("amount") or 0),
            "currency": payment.get("currency") or "ARS",
            "payment_date": iso_date(payment.get("date")),
            "detail": payment.get("detail") or "Pago",
            "status": "verified" if payment.get("status") != "deleted" else "deleted",
        })

    upsert_rows("profiles", unique_rows(profile_rows, ("id",)), "id")
    upsert_rows("members", unique_rows(member_rows, ("id",)), "id")
    upsert_rows("groups", unique_rows(monimon_rows, ("id",)), "id")
    upsert_rows("group_members", unique_rows(membership_rows, ("group_id", "member_id")), "group_id,member_id")
    upsert_rows("expenses", unique_rows(expense_rows, ("id",)), "id")
    upsert_rows("expense_participants", unique_rows(participant_rows, ("expense_id", "member_id")), "expense_id,member_id")
    upsert_rows("payments", unique_rows(payment_rows, ("id",)), "id")
    active_group_ids = {row["id"] for row in monimon_rows}
    mark_stale_normalized_rows_deleted("expenses", active_group_ids, {row["id"] for row in expense_rows})
    mark_stale_normalized_rows_deleted("payments", active_group_ids, {row["id"] for row in payment_rows})


def is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def iso_date(value):
    raw = str(value or "").strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    if re.match(r"^\d{2}/\d{2}/\d{4}$", raw):
        day, month, year = raw.split("/")
        return f"{year}-{month}-{day}"
    return raw[:10] if raw else None


def unique_rows(rows, keys):
    result = {}
    for row in rows:
        result[tuple(row.get(key) for key in keys)] = row
    return list(result.values())


def upsert_rows(table, rows, conflict_target):
    if not rows:
        return
    supabase_request(
        "POST",
        f"{table}?on_conflict={conflict_target}",
        rows,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )


def mark_stale_normalized_rows_deleted(table, group_ids, active_ids):
    if optional_supabase_rows(f"{table}?select=id&limit=1") is None:
        return
    active_ids = set(active_ids or [])
    for group_id in group_ids or []:
        if not group_id:
            continue
        encoded_group_id = urllib.parse.quote(str(group_id), safe="")
        rows = optional_supabase_rows(f"{table}?group_id=eq.{encoded_group_id}&status=neq.deleted&select=id") or []
        stale_ids = [
            row.get("id")
            for row in rows
            if row.get("id") and row.get("id") not in active_ids
        ]
        for row_id in stale_ids:
            encoded_row_id = urllib.parse.quote(str(row_id), safe="")
            supabase_request(
                "PATCH",
                f"{table}?id=eq.{encoded_row_id}",
                {"status": "deleted"},
                headers={"Prefer": "return=minimal"},
            )


def delete_monimon(monimon_id):
    if not monimon_id or monimon_id == "personal":
        raise RuntimeError("No se puede eliminar el espacio personal.")

    encoded_id = urllib.parse.quote(str(monimon_id), safe="")
    deleted_names = set()
    if optional_supabase_rows("groups?select=id") is not None:
        rows = optional_supabase_rows(f"groups?id=eq.{encoded_id}&select=name")
        deleted_names = {
            row.get("name")
            for row in rows or []
            if row.get("name")
        }
        delete_normalized_monimon_children(encoded_id)
        supabase_request(
            "PATCH",
            f"groups?id=eq.{encoded_id}",
            {"deleted_at": datetime.now(timezone.utc).isoformat()},
            headers={"Prefer": "return=minimal"},
        )

    rows = supabase_request("GET", f"group_state?key=eq.{STATE_KEY}&select=data")
    data = (rows[0].get("data") if rows else {}) or {}
    if "groups" in data and "monimons" not in data:
        data["monimons"] = data["groups"]

    removed_legacy_ids = {
        item.get("id")
        for item in data.get("monimons", [])
        if item.get("id") == monimon_id or item.get("name") in deleted_names
    }
    removed_ids = {monimon_id, *removed_legacy_ids}
    data["monimons"] = [
        item for item in data.get("monimons", [])
        if item.get("id") not in removed_ids
    ]
    data["monimonMembers"] = [
        item for item in data.get("monimonMembers", [])
        if item.get("monimonId") not in removed_ids
    ]
    data["debts"] = [
        item for item in data.get("debts", [])
        if item.get("monimonId") not in removed_ids
    ]
    data["payments"] = [
        item for item in data.get("payments", [])
        if item.get("monimonId") not in removed_ids
    ]
    data["paymentRequests"] = [
        item for item in data.get("paymentRequests", [])
        if item.get("monimonId") not in removed_ids
    ]
    payload = {"key": STATE_KEY, "data": {**EMPTY_STATE, **data}}
    supabase_request(
        "POST",
        "group_state",
        [payload],
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    return {"ok": True}


def delete_normalized_monimon_children(encoded_monimon_id):
    child_tables = [
        "attachments",
        "approval_requests",
        "expense_participants",
        "payments",
        "loans",
        "expenses",
        "invitations",
        "group_members",
    ]
    for table in child_tables:
        if optional_supabase_rows(f"{table}?select=*&limit=1") is None:
            continue
        supabase_request(
            "DELETE",
            f"{table}?group_id=eq.{encoded_monimon_id}",
            headers={"Prefer": "return=minimal"},
        )


def sync_normalized_monimon_deletions(state):
    current_monimons = optional_supabase_rows("groups?deleted_at=is.null&select=id")
    if current_monimons is None:
        return

    incoming_ids = {
        as_uuid(monimon.get("id"), "monimon")
        for monimon in state.get("monimons", [])
        if monimon.get("id") and monimon.get("id") != "personal"
    }
    deleted_ids = [
        row.get("id")
        for row in current_monimons
        if row.get("id") and row.get("id") not in incoming_ids
    ]

    for monimon_id in deleted_ids:
        encoded_id = urllib.parse.quote(str(monimon_id), safe="")
        supabase_request(
            "PATCH",
            f"groups?id=eq.{encoded_id}",
            {"deleted_at": datetime.now(timezone.utc).isoformat()},
            headers={"Prefer": "return=minimal"},
        )


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        json_response(self, 204, {})

    def do_GET(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/health":
                json_response(self, 200, {"ok": True, "supabaseConfigured": bool(SUPABASE_URL and SUPABASE_KEY and SUPABASE_ANON_KEY)})
                return
            if path == "/api/state":
                token = bearer_token(self)
                if SUPABASE_URL and SUPABASE_ANON_KEY and token:
                    auth_request("GET", "user", access_token=token)
                json_response(self, 200, get_state())
                return
            json_response(self, 404, {"error": "Not found"})
        except Exception as error:
            error_response(self, error)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/state":
            json_response(self, 404, {"error": "Not found"})
            return
        try:
            token = bearer_token(self)
            if not token:
                json_response(self, 401, {"error": "Missing session token"})
                return
            auth_request("GET", "user", access_token=token)
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            json_response(self, 200, put_state(payload))
        except Exception as error:
            error_response(self, error)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            if path == "/api/auth/signup":
                email = payload.get("email", "")
                username = normalize_username(payload.get("username") or payload.get("name") or email.split("@")[0])
                if len(username) < 3:
                    json_response(self, 400, {"error": "El nombre de usuario debe tener al menos 3 caracteres."})
                    return
                state = get_state()
                for profile in state.get("profiles", []):
                    if normalize_username(profile.get("username") or profile.get("email") or profile.get("name")) == username:
                        json_response(self, 409, {"error": "Ese nombre de usuario ya está en uso."})
                        return
                user_metadata = {
                    "display_name": payload.get("name", "") or username.upper(),
                    "username": username,
                    "country": payload.get("country", ""),
                }
                data = auth_request("POST", "signup", {
                    "email": email,
                    "password": payload.get("password", ""),
                    "data": user_metadata,
                })
                json_response(self, 200, decorate_auth_payload(data))
                return
            if path == "/api/auth/login":
                data = auth_request("POST", "token?grant_type=password", {
                    "email": payload.get("email", ""),
                    "password": payload.get("password", ""),
                })
                json_response(self, 200, decorate_auth_payload(data))
                return
            if path == "/api/auth/refresh":
                data = auth_request("POST", "token?grant_type=refresh_token", {
                    "refresh_token": payload.get("refresh_token", ""),
                })
                json_response(self, 200, decorate_auth_payload(data))
                return
            if path == "/api/auth/user":
                token = payload.get("access_token") or bearer_token(self)
                if not token:
                    json_response(self, 401, {"error": "Missing session token"})
                    return
                json_response(self, 200, decorate_auth_payload(auth_request("GET", "user", access_token=token)))
                return
            if path == "/api/auth/logout":
                token = payload.get("access_token") or bearer_token(self)
                if token:
                    auth_request("POST", "logout", access_token=token)
                json_response(self, 200, {"ok": True})
                return
            if path == "/api/auth/delete-account":
                token = payload.get("access_token") or bearer_token(self)
                if not token:
                    json_response(self, 401, {"error": "Missing session token"})
                    return
                user = auth_request("GET", "user", access_token=token)
                delete_auth_user(user.get("id"))
                json_response(self, 200, {"ok": True})
                return
            if path == "/api/auth/google-url":
                require_supabase()
                redirect_to = payload.get("redirectTo") or "http://127.0.0.1:5173"
                url = (
                    f"{SUPABASE_URL}/auth/v1/authorize"
                    f"?provider=google"
                    f"&redirect_to={urllib.parse.quote(redirect_to, safe='')}"
                    f"&prompt=select_account"
                )
                json_response(self, 200, {"url": url})
                return
            if path == "/api/monimons/delete":
                token = bearer_token(self)
                if not token:
                    json_response(self, 401, {"error": "Missing session token"})
                    return
                auth_request("GET", "user", access_token=token)
                json_response(self, 200, delete_monimon(payload.get("id")))
                return
            json_response(self, 404, {"error": "Not found"})
        except Exception as error:
            error_response(self, error)

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"MONI MON! backend listening on http://{HOST}:{PORT}")
    server.serve_forever()
