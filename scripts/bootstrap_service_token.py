#!/usr/bin/env python3
"""
Helper script to automate issuing a TIMETABLE_SESSION_TOKEN for the frontend.

It can optionally create (or ensure) a service account, log in to obtain a
session token, and write the token into one or more .env files.

Usage examples:

    python scripts/bootstrap_service_token.py \\
        --email service@example.com \\
        --password "SuperSecret!" \\
        --university "Demo University" \\
        --department "Computer Science"

    SERVICE_ACCOUNT_EMAIL=service@example.com \\
    SERVICE_ACCOUNT_PASSWORD=Secret \\
    python scripts/bootstrap_service_token.py --api-base http://localhost:8000
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional


def _post_json(url: str, payload: Dict[str, Any]) -> tuple[int, Dict[str, Any]]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return resp.getcode(), parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"detail": raw or exc.reason}
        return exc.code, parsed


def ensure_account(
    api_base: str,
    *,
    email: str,
    password: str,
    role: str,
    university: str,
    department: Optional[str],
    auto: bool,
) -> None:
    if not auto:
        return

    payload: Dict[str, Any] = {
        "email": email,
        "password": password,
        "role": role,
        "university_name": university,
    }
    if department:
        payload["department_name"] = department

    url = f"{api_base}/v1/auth/signup"
    status, response = _post_json(url, payload)

    if status == 201 or status == 200:
        print(f"[ok] created service account for {email}")
        return
    if status == 409:
        print(f"[skip] service account already exists for {email}")
        return

    detail = response.get("detail") if isinstance(response, dict) else response
    raise RuntimeError(f"Signup failed ({status}): {detail}")


def obtain_token(api_base: str, *, email: str, password: str) -> str:
    url = f"{api_base}/v1/auth/login"
    status, response = _post_json(url, {"email": email, "password": password})
    if status != 200:
        detail = response.get("detail") if isinstance(response, dict) else response
        raise RuntimeError(f"Login failed ({status}): {detail}")
    token = response.get("token")
    if not token or not isinstance(token, str):
        raise RuntimeError("Login succeeded but no token returned")
    return token


def _normalize_lines(text: str) -> list[str]:
    return text.replace("\r\n", "\n").replace("\r", "\n").split("\n")


def update_env_file(path: Path, token: str) -> bool:
    if not path.exists():
        return False

    original = path.read_text(encoding="utf-8")
    lines = _normalize_lines(original)
    updated: list[str] = []
    found = False

    for line in lines:
        if line.startswith("TIMETABLE_SESSION_TOKEN="):
            updated.append(f"TIMETABLE_SESSION_TOKEN={token}")
            found = True
        else:
            updated.append(line)

    if not found:
        updated.append(f"TIMETABLE_SESSION_TOKEN={token}")

    # Remove trailing empty lines
    while updated and updated[-1] == "":
        updated.pop()

    updated_text = "\n".join(updated) + "\n"
    if updated_text == original:
        return True

    path.write_text(updated_text, encoding="utf-8")
    return True


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Issue TIMETABLE_SESSION_TOKEN automatically.")
    parser.add_argument("--api-base", default=os.getenv("API_BASE", "http://localhost:8000"), help="Backend base URL")
    parser.add_argument("--email", default=os.getenv("SERVICE_ACCOUNT_EMAIL"), required=False, help="Service account email")
    parser.add_argument("--password", default=os.getenv("SERVICE_ACCOUNT_PASSWORD"), required=False, help="Service account password")
    parser.add_argument("--role", default=os.getenv("SERVICE_ACCOUNT_ROLE", "Admin"), choices=["Student", "Faculty", "Admin"], help="Role to create/login with")
    parser.add_argument("--university", default=os.getenv("SERVICE_ACCOUNT_UNIVERSITY", "Demo University"), help="University name for signup")
    parser.add_argument("--department", default=os.getenv("SERVICE_ACCOUNT_DEPARTMENT"), help="Department name for signup (required for Student/Faculty)")
    parser.add_argument("--env-file", default=os.getenv("SERVICE_ENV_FILE", ".env"), help="Backend .env file to update")
    parser.add_argument("--web-env-file", default=os.getenv("SERVICE_WEB_ENV_FILE", "web/.env.local"), help="Frontend .env file to update")
    parser.add_argument("--skip-env-write", action="store_true", help="Do not write the token into env files")
    parser.add_argument("--no-signup", action="store_true", help="Skip automatic signup (login only)")
    parser.add_argument("--print-token", action="store_true", help="Print the token to stdout")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    if not args.email or not args.password:
        print("Error: email/password must be provided via --email/--password or SERVICE_ACCOUNT_EMAIL/PASSWORD env vars.", file=sys.stderr)
        return 1

    if args.role in {"Student", "Faculty"} and not args.department and not args.no_signup:
        print("Error: department is required for Student or Faculty roles.", file=sys.stderr)
        return 1

    try:
        ensure_account(
            args.api_base,
            email=args.email,
            password=args.password,
            role=args.role,
            university=args.university,
            department=args.department,
            auto=not args.no_signup,
        )
        token = obtain_token(args.api_base, email=args.email, password=args.password)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to obtain token: {exc}", file=sys.stderr)
        return 1

    wrote_any = False
    if not args.skip_env_write:
        for target in [args.env_file, args.web_env_file]:
            if not target:
                continue
            path = Path(target)
            result = update_env_file(path, token)
            if result:
                wrote_any = True
                print(f"[ok] updated {path}")
            else:
                print(f"[warn] {path} not found; skipped")

    if args.print_token or not wrote_any:
        print(token)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
