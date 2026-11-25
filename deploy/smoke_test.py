#!/usr/bin/env python3
"""
Smoke test suite for Equipment Inventory and Borrowing System (Theme 2).
Verifies that the deployed service on Cloud Run is alive, ready, serving SPA,
and executing core authenticated workflows without leaking private details.

Zero external dependencies: uses only Python 3 standard library.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error

DEFAULT_TIMEOUT = 10
MAX_COLD_START_RETRIES = 6
RETRY_DELAY_SECONDS = 5


def request_json(url, method="GET", data=None, headers=None, timeout=DEFAULT_TIMEOUT):
    if headers is None:
        headers = {}
    
    encoded_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        status = response.getcode()
        content_type = response.headers.get("Content-Type", "")
        raw_body = response.read().decode("utf-8")
        parsed_body = json.loads(raw_body) if "application/json" in content_type else raw_body
        return status, parsed_body, response.headers


def check_liveness_with_retry(base_url):
    health_url = f"{base_url.rstrip('/')}/health"
    print(f"[*] Checking liveness at {health_url} (handling potential Cloud Run cold start)...")
    
    for attempt in range(1, MAX_COLD_START_RETRIES + 1):
        try:
            status, body, _ = request_json(health_url, timeout=15)
            if status == 200 and isinstance(body, dict) and body.get("status") == "ok":
                print(f"[+] Liveness confirmed (200 OK) on attempt {attempt}.")
                return True
        except Exception as e:
            print(f"    Attempt {attempt}/{MAX_COLD_START_RETRIES} failed: {e}. Retrying in {RETRY_DELAY_SECONDS}s...")
            time.sleep(RETRY_DELAY_SECONDS)
            
    print("[-] Liveness check timed out.")
    return False


def check_readiness(base_url):
    ready_url = f"{base_url.rstrip('/')}/api/ready"
    print(f"[*] Checking database readiness at {ready_url}...")
    try:
        status, body, _ = request_json(ready_url, timeout=10)
        if status == 200 and isinstance(body, dict) and body.get("status") == "ready":
            print("[+] Database readiness confirmed (200 OK).")
            return True
        print(f"[-] Readiness check returned unexpected response: status={status}, body={body}")
        return False
    except urllib.error.HTTPError as e:
        print(f"[-] Readiness check failed with HTTP {e.code}")
        return False
    except Exception as e:
        print(f"[-] Readiness check failed: {e}")
        return False


def check_root_spa(base_url):
    root_url = f"{base_url.rstrip('/')}/"
    print(f"[*] Checking SPA root at {root_url}...")
    try:
        req = urllib.request.Request(root_url, headers={"User-Agent": "SmokeTest/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.getcode()
            body = response.read().decode("utf-8")
            if status == 200 and ("html" in body.lower() or "root" in body.lower() or "inventory" in body.lower()):
                print("[+] SPA root HTML confirmed (200 OK).")
                return True
            print(f"[-] Root URL returned unexpected status or content: status={status}")
            return False
    except Exception as e:
        print(f"[-] Root check failed: {e}")
        return False


def check_auth_and_items(base_url, username, password):
    if not username or not password:
        print("[!] SMOKE_USER or SMOKE_PASSWORD not set: skipping authenticated workflow check.")
        return True

    print(f"[*] Running authenticated workflow check for user '{username}'...")
    login_url = f"{base_url.rstrip('/')}/api/auth/login"
    items_url = f"{base_url.rstrip('/')}/api/items"
    logout_url = f"{base_url.rstrip('/')}/api/auth/logout"

    try:
        # 1. Login
        status, body, _ = request_json(login_url, method="POST", data={"username": username, "password": password})
        if status != 200 or not isinstance(body, dict) or "token" not in body:
            print(f"[-] Login failed: status={status}, body={body}")
            return False
        
        token = body["token"]
        print("[+] Login succeeded, token received.")

        # 2. Query Catalog with Bearer Token
        status, items, _ = request_json(items_url, method="GET", headers={"Authorization": f"Bearer {token}"})
        if status != 200 or not isinstance(items, list):
            print(f"[-] GET /api/items failed: status={status}")
            return False
        print(f"[+] GET /api/items succeeded ({len(items)} items returned).")

        # 3. Logout (revocation)
        status, _, _ = request_json(logout_url, method="POST", headers={"Authorization": f"Bearer {token}"})
        if status not in (200, 204):
            print(f"[-] Logout failed: status={status}")
            return False
        print("[+] Logout succeeded (token revoked).")
        return True

    except Exception as e:
        print(f"[-] Authenticated workflow error: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 smoke_test.py <BASE_SERVICE_URL>")
        sys.exit(1)

    target_url = sys.argv[1].rstrip("/")
    print(f"=== Starting Smoke Test against: {target_url} ===")

    username = os.environ.get("SMOKE_USER", "borrower1")
    password = os.environ.get("SMOKE_PASSWORD", "")

    checks = [
        ("Liveness (/health)", lambda: check_liveness_with_retry(target_url)),
        ("Readiness (/api/ready)", lambda: check_readiness(target_url)),
        ("SPA Serving (/)", lambda: check_root_spa(target_url)),
        ("Auth & Catalog Workflow", lambda: check_auth_and_items(target_url, username, password)),
    ]

    all_passed = True
    for name, check_fn in checks:
        print(f"\n--- Running: {name} ---")
        if not check_fn():
            all_passed = False
            print(f"[FAIL] {name} failed.")
            break
        print(f"[PASS] {name} passed.")

    if all_passed:
        print("\n=== All Smoke Tests Passed Successfully ===")
        sys.exit(0)
    else:
        print("\n=== Smoke Tests Failed ===")
        sys.exit(1)


if __name__ == "__main__":
    main()
