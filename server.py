import json
import os
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
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
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
STATE_KEY = os.environ.get("MONIMONI_STATE_KEY") or os.environ.get("MONIMON_STATE_KEY", "default")
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("MONIMONI_ADMIN_EMAILS", "").split(",")
    if email.strip()
}


EMPTY_STATE = {
    "profiles": [],
    "members": [],
    "monimons": [],
    "monimonMembers": [],
    "debts": [],
    "payments": [],
    "paymentRequests": [],
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


def supabase_request(method, path, payload=None, headers=None):
    require_supabase()
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        data=data,
        method=method,
        headers=supabase_headers(headers),
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase {error.code}: {detail}") from error


def auth_request(method, path, payload=None, access_token=None):
    require_supabase()
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    request = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/{path}",
        data=data,
        method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase Auth {error.code}: {detail}") from error


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
    rows = supabase_request("GET", f"monimon_state?key=eq.{STATE_KEY}&select=data")
    if not rows:
        return EMPTY_STATE
    data = rows[0].get("data") or {}
    if "groups" in data and "monimons" not in data:
        data["monimons"] = data["groups"]
    return {**EMPTY_STATE, **data}


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
        validate_member_in_monimon(state, request.get("fromMemberId") or request.get("from"), monimon_id)
        validate_member_in_monimon(state, request.get("toMemberId") or request.get("to"), monimon_id)
        for member_id in request.get("requiredApproverMemberIds") or []:
            validate_member_in_monimon(state, member_id, monimon_id)
        for member_id in request.get("approvedByMemberIds") or []:
            validate_member_in_monimon(state, member_id, monimon_id)
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
    clean_state = {
        "profiles": profiles,
        "members": members,
        "monimons": monimons,
        "monimonMembers": monimon_members,
        "debts": state.get("debts") if isinstance(state.get("debts"), list) else [],
        "payments": state.get("payments") if isinstance(state.get("payments"), list) else [],
        "paymentRequests": state.get("paymentRequests") if isinstance(state.get("paymentRequests"), list) else [],
    }
    validate_state(clean_state)
    payload = {"key": STATE_KEY, "data": clean_state}
    supabase_request(
        "POST",
        "monimon_state",
        [payload],
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    return clean_state


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
                data = auth_request("POST", "signup", {
                    "email": payload.get("email", ""),
                    "password": payload.get("password", ""),
                    "data": {"display_name": payload.get("name", "")},
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
            json_response(self, 404, {"error": "Not found"})
        except Exception as error:
            error_response(self, error)

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"MONI MON! backend listening on http://0.0.0.0:{PORT}")
    server.serve_forever()
