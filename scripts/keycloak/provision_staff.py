#!/usr/bin/env python3
"""Create POS-realm staff users with narrowly scoped realm roles."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


POS_ROLES = {
    "ADMIN",
    "MANAGER",
    "CASHIER",
    "KITCHEN",
    "STOCK_CLERK",
    "PROCUREMENT_OFFICER",
}
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class KeycloakError(Exception):
    pass


class KeycloakAdmin:
    def __init__(self, base_url: str, token: str, timeout: int = 20):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def request(self, method: str, path: str, payload=None, expected=(200,)):
        data = None
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            self.base_url + path, data=data, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                status = response.status
                body = response.read().decode("utf-8")
                response_headers = response.headers
        except urllib.error.HTTPError as error:
            status = error.code
            body = error.read().decode("utf-8", errors="replace")
            response_headers = error.headers
        except (urllib.error.URLError, TimeoutError) as error:
            raise KeycloakError(f"Could not reach Keycloak at {self.base_url}: {error}") from error

        if status not in expected:
            detail = body[:600].replace("\n", " ")
            raise KeycloakError(f"{method} {path} returned HTTP {status}: {detail}")
        parsed = json.loads(body) if body.strip() else None
        return parsed, response_headers


def get_admin_token(base_url: str, admin_realm: str, username: str, password: str) -> str:
    token_url = (
        f"{base_url.rstrip('/')}/realms/{urllib.parse.quote(admin_realm, safe='')}/"
        "protocol/openid-connect/token"
    )
    form = urllib.parse.urlencode(
        {"grant_type": "password", "client_id": "admin-cli", "username": username, "password": password}
    ).encode("ascii")
    request = urllib.request.Request(
        token_url,
        data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # Avoid echoing request data: it contains the administrator password.
        detail = error.read().decode("utf-8", errors="replace")[:500].replace("\n", " ")
        raise KeycloakError(
            f"Keycloak admin login failed (HTTP {error.code}). Check the admin realm, "
            f"username, password, and whether admin-cli is enabled. {detail}"
        ) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise KeycloakError(f"Could not reach Keycloak at {base_url}: {error}") from error
    token = result.get("access_token")
    if not token:
        raise KeycloakError("Keycloak did not return an admin access token.")
    return token


def read_users(path: Path):
    users = []
    seen = set()
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        columns = raw_line.split("\t")
        if len(columns) == 5 and columns[0].strip().lower() == "username" and columns[4].strip().lower() == "roles":
            continue
        if len(columns) != 5 or any(not column.strip() for column in columns):
            raise KeycloakError(
                f"{path}:{line_number}: expected five non-empty tab-separated fields: "
                "username, email, first name, last name, roles."
            )
        username, email, first_name, last_name, raw_roles = [column.strip() for column in columns]
        if not USERNAME_RE.fullmatch(username):
            raise KeycloakError(f"{path}:{line_number}: invalid username {username!r}.")
        if any("\n" in value or "\r" in value for value in (email, first_name, last_name)):
            raise KeycloakError(f"{path}:{line_number}: fields cannot contain newlines.")
        roles = [role.strip().upper() for role in raw_roles.split(",")]
        if not roles or any(not role for role in roles):
            raise KeycloakError(f"{path}:{line_number}: provide one or more comma-separated roles.")
        unsupported = sorted(set(roles) - POS_ROLES)
        if unsupported:
            raise KeycloakError(
                f"{path}:{line_number}: unsupported POS role(s): {', '.join(unsupported)}. "
                f"Allowed roles: {', '.join(sorted(POS_ROLES))}."
            )
        if len(roles) != len(set(roles)):
            raise KeycloakError(f"{path}:{line_number}: duplicate role assignment.")
        if username.casefold() in seen:
            raise KeycloakError(f"{path}:{line_number}: duplicate username {username!r} in input.")
        seen.add(username.casefold())
        users.append(
            {"username": username, "email": email, "firstName": first_name,
             "lastName": last_name, "roles": roles}
        )
    if not users:
        raise KeycloakError(f"{path}: no staff users found.")
    return users


def make_credentials_file(requested_path: str | None):
    if requested_path:
        path = Path(requested_path).expanduser().resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
    else:
        directory = Path.home() / ".local" / "share" / "nexus-pos"
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            directory.chmod(0o700)
        except OSError:
            pass
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = directory / f"keycloak-temporary-credentials-{stamp}.tsv"
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    return path, os.fdopen(descriptor, "w", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Provision POS staff users and assign only their requested POS realm roles."
    )
    parser.add_argument("users_file", type=Path, help="TSV file with username, email, first name, last name, roles")
    parser.add_argument("--url", default=os.getenv("KEYCLOAK_URL", "http://localhost:8081"),
                        help="Keycloak base URL (default: KEYCLOAK_URL or http://localhost:8081)")
    parser.add_argument("--realm", default=os.getenv("KEYCLOAK_REALM", "pos"),
                        help="Application realm (default: KEYCLOAK_REALM or pos)")
    parser.add_argument("--admin-realm", default=os.getenv("KEYCLOAK_ADMIN_REALM", "master"),
                        help="Realm used for admin-cli login (default: master)")
    parser.add_argument("--admin-user", default=os.getenv("KEYCLOAK_ADMIN_USERNAME"),
                        help="Admin username; otherwise prompted (or KEYCLOAK_ADMIN_USERNAME)")
    parser.add_argument("--apply", action="store_true", help="Apply changes; without this, only show a plan")
    parser.add_argument("--yes", action="store_true", help="Skip the typed confirmation (requires --apply)")
    parser.add_argument("--credentials-file", help="Secure destination for generated temporary passwords")
    args = parser.parse_args()

    if args.yes and not args.apply:
        parser.error("--yes requires --apply")
    if not args.users_file.is_file():
        raise KeycloakError(f"Input file not found: {args.users_file}")
    users = read_users(args.users_file)
    admin_user = args.admin_user or input("Keycloak administrator username [admin]: ").strip() or "admin"
    admin_password = getpass.getpass("Keycloak administrator password: ")
    if not admin_password:
        raise KeycloakError("Administrator password cannot be empty.")

    token = get_admin_token(args.url, args.admin_realm, admin_user, admin_password)
    del admin_password
    api = KeycloakAdmin(args.url, token)
    del token
    realm_path = "/admin/realms/" + urllib.parse.quote(args.realm, safe="")
    realm, _ = api.request("GET", realm_path)
    # Confirm the target realm exists before showing a plan or making changes.
    if not realm.get("id"):
        raise KeycloakError(f"Keycloak returned no ID for realm {args.realm!r}.")

    role_list, _ = api.request("GET", realm_path + "/roles")
    role_by_name = {role["name"]: role for role in role_list}
    missing_roles = sorted({role for user in users for role in user["roles"]} - role_by_name.keys())
    existing_users = set()
    for user in users:
        query = urllib.parse.urlencode({"username": user["username"], "exact": "true"})
        matches, _ = api.request("GET", realm_path + "/users?" + query)
        if any(item.get("username", "").casefold() == user["username"].casefold() for item in matches):
            existing_users.add(user["username"])

    to_create = [user for user in users if user["username"] not in existing_users]
    print(f"Keycloak: {args.url.rstrip('/')}")
    print(f"Application realm: {args.realm}")
    print(f"POS realm roles to create: {', '.join(missing_roles) if missing_roles else 'none'}")
    print(f"Staff accounts to create: {len(to_create)}")
    print(f"Existing accounts left unchanged: {len(existing_users)}")
    for user in users:
        state = "already exists; will leave unchanged" if user["username"] in existing_users else "will create"
        print(f"  {user['username']}: {', '.join(user['roles'])} ({state})")

    if not args.apply:
        print("Dry run only. Re-run with --apply to create missing roles and accounts.")
        return 0
    if not to_create and not missing_roles:
        print("Nothing to create.")
        return 0
    if not args.yes:
        confirmation = input(f"Type CREATE {args.realm} to continue: ")
        if confirmation != f"CREATE {args.realm}":
            print("Cancelled; no changes made.")
            return 0

    credentials_path = None
    credentials_stream = None
    if to_create:
        try:
            credentials_path, credentials_stream = make_credentials_file(args.credentials_file)
        except OSError as error:
            raise KeycloakError(f"Could not create a private temporary-credentials file: {error}") from error
        credentials_stream.write("username\troles\ttemporary_password\n")
        credentials_stream.flush()
        os.fsync(credentials_stream.fileno())

    failed = []
    try:
        # Create the requested canonical POS roles only. No realm-management roles are granted.
        for role_name in missing_roles:
            api.request("POST", realm_path + "/roles", {"name": role_name}, expected=(201,))
        if missing_roles:
            role_list, _ = api.request("GET", realm_path + "/roles")
            role_by_name = {role["name"]: role for role in role_list}

        for user in to_create:
            try:
                api.request(
                    "POST",
                    realm_path + "/users",
                    {"username": user["username"], "email": user["email"],
                     "firstName": user["firstName"], "lastName": user["lastName"],
                     "enabled": True, "emailVerified": False,
                     "requiredActions": ["UPDATE_PASSWORD"]},
                    expected=(201,),
                )
                query = urllib.parse.urlencode({"username": user["username"], "exact": "true"})
                matches, _ = api.request("GET", realm_path + "/users?" + query)
                match = next((item for item in matches
                              if item.get("username", "").casefold() == user["username"].casefold()), None)
                if not match:
                    raise KeycloakError("Account was created, but Keycloak did not return its user record.")
                user_id = urllib.parse.quote(match["id"], safe="")
                temporary_password = secrets.token_urlsafe(24)
                api.request(
                    "PUT",
                    realm_path + "/users/" + user_id + "/reset-password",
                    {"type": "password", "value": temporary_password, "temporary": True},
                    expected=(204,),
                )
                credentials_stream.write(
                    f"{user['username']}\t{','.join(user['roles'])}\t{temporary_password}\n"
                )
                credentials_stream.flush()
                os.fsync(credentials_stream.fileno())
                role_representations = [role_by_name[name] for name in user["roles"]]
                api.request(
                    "POST",
                    realm_path + "/users/" + user_id + "/role-mappings/realm",
                    role_representations,
                    expected=(204,),
                )
                print(f"Created {user['username']} with {', '.join(user['roles'])}.")
            except (KeycloakError, KeyError, OSError) as error:
                failed.append((user["username"], str(error)))
                print(f"FAILED {user['username']}: {error}", file=sys.stderr)
    finally:
        if credentials_stream:
            credentials_stream.close()

    if credentials_path:
        print(f"Temporary passwords saved with file permissions 600: {credentials_path}")
        print("Deliver them securely. Each user must choose a new password at first sign-in, then delete the file.")
    if failed:
        print("Some accounts may have been partially created. Review Keycloak before rerunning.", file=sys.stderr)
        return 1
    print("Provisioning finished. Existing users were not modified.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeycloakError as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
