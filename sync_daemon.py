#!/usr/bin/env python3
"""
Antigravity Quota Auto-Sync Daemon (Multi-OS)
Runs in background and provides an on-demand HTTP endpoint (127.0.0.1:39281)
for instant token consumption & click-to-view sync without constant 20s polling.
"""

import os
import sys
import time
import json
import socket
import urllib.request
import platform
import subprocess
import shutil
import threading
import asyncio
import websockets
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure stdout/stderr exist and use UTF-8
LOG_FILE = Path.home() / ".gemini" / "antigravity" / "quota_monitor.log"
try:
    if sys.stdout is None or not hasattr(sys.stdout, "write"):
        sys.stdout = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    elif hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if sys.stderr is None or not hasattr(sys.stderr, "write"):
        sys.stderr = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    elif hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
    except Exception:
        pass

EXTRA_PATHS = [
    str(Path.home() / ".local" / "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin"
]
current_path = os.environ.get("PATH", "")
os.environ["PATH"] = ":".join(EXTRA_PATHS) + ":" + current_path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import quota_engine

def find_node_binary():
    w = shutil.which("node")
    if w:
        return w
    candidates = [
        Path.home() / ".local" / "bin" / "node",
        Path("/usr/local/bin/node"),
        Path("/opt/homebrew/bin/node"),
        Path("/usr/bin/node"),
        Path("C:/Program Files/nodejs/node.exe"),
        Path("C:/Program Files (x86)/nodejs/node.exe")
    ]
    for c in candidates:
        if c.is_file() and os.access(c, os.X_OK):
            return str(c)
    return "node"

def get_platform_paths():
    home = Path.home()
    sys_name = platform.system().lower()
    if "darwin" in sys_name:
        storage = home / "Library" / "Application Support" / "Antigravity" / "app_storage.json"
        devtools = home / "Library" / "Application Support" / "Antigravity" / "DevToolsActivePort"
    elif "windows" in sys_name:
        appdata = Path(os.getenv("APPDATA", str(home / "AppData" / "Roaming")))
        storage = appdata / "Antigravity" / "app_storage.json"
        devtools = appdata / "Antigravity" / "DevToolsActivePort"
    else:
        config = home / ".config"
        storage = config / "Antigravity" / "app_storage.json"
        devtools = config / "Antigravity" / "DevToolsActivePort"

    global_quota = home / ".gemini" / "antigravity" / "active_quota.json"
    history = home / ".gemini" / "antigravity" / "quota_history.json"

    injector = CURRENT_DIR / "antigravity_quota_injector.js"
    if not injector.exists():
        candidates = [
            home / ".gemini" / "antigravity" / "bin" / "antigravity_quota_injector.js",
            home / ".gemini" / "antigravity" / "antigravity_quota_injector.js"
        ]
        for c in candidates:
            if c.exists():
                injector = c
                break

    return storage, devtools, global_quota, history, injector

STORAGE_PATH, DEVTOOLS_PORT_PATH, GLOBAL_QUOTA_PATH, HISTORY_PATH, INJECTOR_PATH = get_platform_paths()
USER_SETTINGS_PATH = Path.home() / ".gemini" / "antigravity" / "user_settings.json"

DEFAULT_USER_SETTINGS = {
    "theme": "cyber",
    "mode": "remaining",
    "fullTheming": True,
    "privacyMode": False,
    "fontEn": "default",
    "fontFa": "Vazirmatn",
    "customImportedFonts": [],
    "rtl": {
        "enabled": True,
        "align": "right",
        "direction": "rtl",
        "font": "Vazirmatn"
    },
    "lang": "fa"
}

def load_user_settings(instance_id=None, account_email=None):
    base = dict(DEFAULT_USER_SETTINGS)
    if USER_SETTINGS_PATH.exists():
        try:
            with open(USER_SETTINGS_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    # Top-level defaults
                    for k, v in saved.items():
                        if k not in ("instances", "accounts"):
                            base[k] = v
                    # Check account-specific override
                    if account_email and "accounts" in saved and isinstance(saved["accounts"], dict):
                        acc_settings = saved["accounts"].get(account_email) or saved["accounts"].get(account_email.lower())
                        if isinstance(acc_settings, dict):
                            base.update(acc_settings)
                    # Check instance-specific override (highest precedence for an active window)
                    if instance_id and "instances" in saved and isinstance(saved["instances"], dict):
                        inst_settings = saved["instances"].get(instance_id)
                        if isinstance(inst_settings, dict):
                            base.update(inst_settings)
                    return base
        except Exception:
            pass
    return base

def save_user_settings(patch, instance_id=None, account_email=None):
    try:
        raw = {}
        if USER_SETTINGS_PATH.exists():
            try:
                with open(USER_SETTINGS_PATH, "r", encoding="utf-8") as f:
                    raw = json.load(f)
            except Exception:
                raw = {}
        if not isinstance(raw, dict):
            raw = {}
            
        if "instances" not in raw or not isinstance(raw["instances"], dict):
            raw["instances"] = {}
        if "accounts" not in raw or not isinstance(raw["accounts"], dict):
            raw["accounts"] = {}

        # Extract instance_id and account from patch if passed inside patch
        if isinstance(patch, dict):
            if not instance_id and patch.get("instance_id"):
                instance_id = patch.get("instance_id")
            if not account_email and patch.get("account"):
                account_email = patch.get("account")

        clean_patch = {k: v for k, v in patch.items() if k not in ("instance_id", "account")} if isinstance(patch, dict) else {}

        # Update instance-specific settings
        if instance_id:
            inst_cur = raw["instances"].get(instance_id, {})
            if not isinstance(inst_cur, dict):
                inst_cur = {}
            inst_cur.update(clean_patch)
            raw["instances"][instance_id] = inst_cur

        # Update account-specific settings
        if account_email:
            acc_cur = raw["accounts"].get(account_email, {})
            if not isinstance(acc_cur, dict):
                acc_cur = {}
            acc_cur.update(clean_patch)
            raw["accounts"][account_email] = acc_cur

        # Also update top-level defaults for backward compatibility
        for k, v in clean_patch.items():
            raw[k] = v

        USER_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(USER_SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2, ensure_ascii=False)
            
        resolved = load_user_settings(instance_id=instance_id, account_email=account_email)
        return True, resolved
    except Exception as e:
        return False, str(e)


def get_primary_account():
    try:
        tok = quota_engine.get_keychain_token()
        if tok:
            em = quota_engine.extract_token_email(tok)
            if em:
                return em
    except Exception:
        pass
    try:
        man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
        if man_path.exists():
            with open(man_path, "r", encoding="utf-8") as f:
                m = json.load(f)
                if m:
                    return list(m.keys())[0]
    except Exception:
        pass
    return "primary_account"

def get_secondary_account():
    try:
        man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
        if man_path.exists():
            with open(man_path, "r", encoding="utf-8") as f:
                m = json.load(f)
                if len(m) > 1:
                    return list(m.keys())[1]
    except Exception:
        pass
    return "secondary_account"

PRIMARY_ACCOUNT = get_primary_account()
SECONDARY_ACCOUNT = get_secondary_account()

def is_account2(email):
    if not email:
        return False
    norm = str(email).lower().strip()
    if norm in ('instance_2', 'secondary_account') or 'account2' in norm:
        return True
    return norm != str(get_primary_account()).lower().strip()

def get_instance_active_account(instance_id="instance_1"):
    home = Path.home()
    appdata = Path(os.getenv("APPDATA", str(home / "AppData" / "Roaming")))
    saved_manifest = {}
    man_path = home / ".gemini" / "accounts" / "manifest.json"
    if man_path.exists():
        try:
            with open(man_path, "r", encoding="utf-8") as f:
                saved_manifest = json.load(f)
        except Exception:
            pass

    # Check manifest for explicit instance_id assignment first
    for email, data in saved_manifest.items():
        if isinstance(data, dict) and data.get("instance_id") == instance_id:
            return email

    if instance_id != "instance_1":
        # Check active_<instance_id>.txt
        f_inst = home / ".gemini" / "accounts" / f"active_{instance_id}.txt"
        if f_inst.exists():
            try:
                acc = f_inst.read_text(encoding="utf-8").strip()
                if acc and (not saved_manifest or acc in saved_manifest):
                    return acc
            except Exception:
                pass

        # Check instance app_storage.json
        num = "".join(filter(str.isdigit, instance_id))
        dir_name = f"Antigravity-Instance{num}" if num else f"Antigravity-{instance_id}"
        st_file = appdata / dir_name / "app_storage.json"
        if st_file.exists():
            try:
                with open(st_file, "r", encoding="utf-8") as f:
                    acc = json.load(f).get("antigravity:account_email")
                    if acc and (not saved_manifest or acc in saved_manifest):
                        return acc
            except Exception:
                pass

        # Match by order from manifest keys if not assigned
        if num and num.isdigit():
            idx = int(num) - 1  # instance_2 -> index 1, instance_3 -> index 2
            m_keys = list(saved_manifest.keys())
            if idx < len(m_keys):
                return m_keys[idx]

        return get_secondary_account()

    # For instance_1:
    # 1. Primary Source of Truth: Check live token in Windows Credential Manager / Keychain
    try:
        import server as srv_mod
        if not getattr(srv_mod, 'is_dual_launching', lambda: False)():
            tok = quota_engine.get_keychain_token()
            if tok:
                token_em = quota_engine.extract_token_email(tok)
                if not token_em:
                    q = quota_engine.fetch_quota_and_tier(tok)
                    token_em = q.get("email") if q else None
                if token_em:
                    # Keep active_instance_1.txt and app_storage synchronized with live token
                    try:
                        f1 = home / ".gemini" / "accounts" / "active_instance_1.txt"
                        f1.parent.mkdir(parents=True, exist_ok=True)
                        f1.write_text(token_em, encoding="utf-8")
                    except Exception:
                        pass
                    try:
                        st1 = appdata / "Antigravity" / "app_storage.json"
                        s_data = {}
                        if st1.exists():
                            with open(st1, "r", encoding="utf-8") as sf:
                                s_data = json.load(sf)
                        if s_data.get("antigravity:account_email") != token_em:
                            s_data["antigravity:account_email"] = token_em
                            with open(st1, "w", encoding="utf-8") as sf:
                                json.dump(s_data, sf, indent=2)
                    except Exception:
                        pass
                    return token_em
    except Exception:
        pass

    # 2. Fallback to active_instance_1.txt
    f1 = home / ".gemini" / "accounts" / "active_instance_1.txt"
    if f1.exists():
        try:
            acc = f1.read_text(encoding="utf-8").strip()
            if acc and (not saved_manifest or acc in saved_manifest):
                return acc
        except Exception:
            pass

    # 3. Fallback to app_storage.json
    st1 = appdata / "Antigravity" / "app_storage.json"
    if st1.exists():
        try:
            with open(st1, "r", encoding="utf-8") as f:
                acc = json.load(f).get("antigravity:account_email")
                if acc and (not saved_manifest or acc in saved_manifest):
                    return acc
        except Exception:
            pass

    return get_primary_account()

def is_port_open(port, host="127.0.0.1", timeout=0.5):
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True
    except Exception:
        return False

def get_devtools_targets():
    home = Path.home()
    appdata = Path(os.getenv("APPDATA", str(home / "AppData" / "Roaming")))
    targets = []
    seen_ports = set()

    # 1. Primary instance (Instance 1)
    if DEVTOOLS_PORT_PATH.exists():
        try:
            with open(DEVTOOLS_PORT_PATH, "r", encoding="utf-8") as f:
                lines = f.read().strip().split("\n")
                if lines:
                    val = int(lines[0])
                    if is_port_open(val) and val not in seen_ports:
                        seen_ports.add(val)
                        targets.append({
                            "instance_id": "instance_1",
                            "port": val,
                            "default_account": get_instance_active_account("instance_1")
                        })
        except Exception:
            pass

    # 2. Dynamic discovery for all secondary instances (Antigravity-Instance2, Instance3, etc.)
    try:
        for p in sorted(appdata.glob("Antigravity-Instance*")):
            if not p.is_dir():
                continue
            dir_name = p.name
            num = "".join(filter(str.isdigit, dir_name))
            inst_id = f"instance_{num}" if num else dir_name.lower().replace("-", "_")
            port_file = p / "DevToolsActivePort"
            if port_file.exists():
                try:
                    with open(port_file, "r", encoding="utf-8") as f:
                        lines = f.read().strip().split("\n")
                        if lines:
                            val = int(lines[0])
                            if is_port_open(val) and val not in seen_ports:
                                seen_ports.add(val)
                                targets.append({
                                    "instance_id": inst_id,
                                    "port": val,
                                    "default_account": get_instance_active_account(inst_id)
                                })
                except Exception:
                    pass
    except Exception:
        pass

    return targets

def get_all_devtools_ports():
    return [t["port"] for t in get_devtools_targets()]

def get_devtools_port():
    targets = get_devtools_targets()
    return targets[0]["port"] if targets else None

_active_cdp_connections = {}  # {instance_id: {'ws': ws, 'port': port, 'account': account, 'loop': loop, 'instance_id': instance_id}}
_cdp_conns_lock = threading.Lock()
_active_cdp_ws = None
_active_cdp_loop = None

def get_injector_script(usage=None, instance_id="instance_1", account_email=None):
    if not INJECTOR_PATH.exists():
        return ""
    try:
        with open(INJECTOR_PATH, "r", encoding="utf-8") as f:
            code = f.read()

        import migration_engine as m_eng
        actual_account = account_email or get_instance_active_account(instance_id)

        # Load manifest
        man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
        saved_accounts = {}
        if man_path.exists():
            try:
                with open(man_path, "r", encoding="utf-8") as mf:
                    saved_accounts = json.load(mf)
            except Exception:
                pass

        instance_usage = None
        if usage and usage.get("email") and str(usage.get("email")).lower().strip() == str(actual_account).lower().strip():
            instance_usage = usage
        else:
            instance_usage = get_account_profile_data(actual_account, manifest=saved_accounts)

        if not instance_usage or not instance_usage.get("email"):
            if actual_account in saved_accounts:
                acc_entry = saved_accounts[actual_account]
                clean_name = acc_entry.get("name") or (actual_account.split('@')[0].split('.')[0].capitalize() if '@' in str(actual_account) else "User")
                rem_pct = acc_entry.get("remaining_pct", 100.0)
                instance_usage = {
                    "email": actual_account,
                    "name": clean_name,
                    "tier": acc_entry.get("tier", "Google AI Pro"),
                    "tier_code": acc_entry.get("tier_code", "pro"),
                    "session": {"name": "Gemini Models", "used_pct": round(100.0 - float(rem_pct), 1), "remaining_pct": round(float(rem_pct), 1), "resets_in": "Ready"},
                    "weekly": {"name": "Weekly Limit", "used_pct": round(100.0 - float(rem_pct), 1), "remaining_pct": round(float(rem_pct), 1), "resets_in": "Ready"}
                }
            elif usage:
                instance_usage = usage

        usage_json = json.dumps(instance_usage or {}, ensure_ascii=False)
        allowed_convs = m_eng.get_allowed_conversations(actual_account) if hasattr(m_eng, 'get_allowed_conversations') else []

        accounts_payload = json.dumps({
            "activeAccount": instance_usage,
            "savedAccounts": saved_accounts,
            "allowedConversations": allowed_convs,
            "instanceId": instance_id
        }, ensure_ascii=False)
        saved_manifest_json = json.dumps(saved_accounts, ensure_ascii=False)
        allowed_convs_json = json.dumps(allowed_convs, ensure_ascii=False)
        user_settings_json = json.dumps(load_user_settings(instance_id=instance_id, account_email=actual_account), ensure_ascii=False)

        return (
            "(() => {\n"
            f"  window.__antigravity_instance = {json.dumps(instance_id)};\n"
            f"  window.__antigravity_account = {json.dumps(actual_account)};\n"
            f"  window.__antigravity_quota = {usage_json};\n"
            f"  window.__antigravity_accounts = {accounts_payload};\n"
            f"  window.__antigravity_user_settings = {user_settings_json};\n"
            "  try {\n"
            "    const __s = window.__antigravity_user_settings || {};\n"
            "    if (__s.theme) localStorage.setItem('antigravity:quota_theme', __s.theme);\n"
            "    if (__s.mode) localStorage.setItem('antigravity:quota_mode', __s.mode);\n"
            "    if (__s.fullTheming !== undefined) localStorage.setItem('antigravity:full_app_theming', String(__s.fullTheming));\n"
            "    if (__s.privacyMode !== undefined) localStorage.setItem('antigravity:privacy_mode', String(__s.privacyMode));\n"
            "    if (__s.fontEn) localStorage.setItem('antigravity:custom_font_en', __s.fontEn);\n"
            "    if (__s.fontFa) localStorage.setItem('antigravity:custom_font_fa', __s.fontFa);\n"
            "    if (__s.lang) localStorage.setItem('antigravity:switcher_lang', __s.lang);\n"
            "    if (__s.rtl) localStorage.setItem('antigravity:rtl_config', typeof __s.rtl === 'string' ? __s.rtl : JSON.stringify(__s.rtl));\n"
            "    if (__s.customImportedFonts) localStorage.setItem('antigravity:custom_imported_fonts', JSON.stringify(__s.customImportedFonts));\n"
            "    if (__s.popoverPos) localStorage.setItem('antigravity:popover_pos', JSON.stringify(__s.popoverPos));\n"
            "  } catch(e) {}\n"
            f"  try {{ localStorage.setItem('antigravity:instance_id', {json.dumps(instance_id)}); }} catch(e) {{}}\n"
            f"  try {{ localStorage.setItem('antigravity:account_email', {json.dumps(actual_account)}); }} catch(e) {{}}\n"
            f"  try {{ localStorage.setItem('antigravity:allowed_conversations', {allowed_convs_json}); }} catch(e) {{}}\n"
            "  try { localStorage.setItem('antigravity:active_quota', JSON.stringify(window.__antigravity_quota)); } catch(e) {}\n"
            f"  try {{ localStorage.setItem('antigravity:accounts_manifest', JSON.stringify({saved_manifest_json})); }} catch(e) {{}}\n"
            + code + "\n"
            "  if (typeof window.__renderAntigravityBadge === 'function') window.__renderAntigravityBadge();\n"
            "})();\n"
        )
    except Exception:
        return ""

def inject_badge_via_devtools(port, usage=None, instance_id="instance_1", account_email=None):
    with _cdp_conns_lock:
        conn = _active_cdp_connections.get(instance_id)
    if conn and conn.get("ws") and conn.get("loop"):
        try:
            script = get_injector_script(usage, instance_id=instance_id, account_email=account_email or conn.get("account"))
            if script:
                asyncio.run_coroutine_threadsafe(
                    conn["ws"].send(json.dumps({
                        "id": int(time.time() * 1000) % 1000000,
                        "method": "Runtime.evaluate",
                        "params": {"expression": script}
                    })),
                    conn["loop"]
                )
        except Exception:
            pass

_cached_usage = None
_last_sync_time = 0
_sync_lock = threading.Lock()

def sync_quota_once(force=False, inject=False):
    global _cached_usage, _last_sync_time
    now = time.time()
    with _sync_lock:
        if not force and _cached_usage and (now - _last_sync_time < 3.0):
            return _cached_usage

        # If a dual instance launch is currently swapping credentials temporarily, do not read from keychain!
        import server as srv_mod
        if getattr(srv_mod, 'is_dual_launching', lambda: False)():
            return _cached_usage or {}

        usage = quota_engine.fetch_quota()
        if not usage or not usage.get("session"):
            return _cached_usage or {}

        _cached_usage = usage
        _last_sync_time = now

        try:
            storage_data = {}
            if STORAGE_PATH.exists():
                with open(STORAGE_PATH, "r", encoding="utf-8") as f:
                    storage_data = json.load(f)
            if usage.get("email"):
                storage_data["antigravity:account_email"] = usage["email"]
            storage_data["antigravity:active_quota"] = json.dumps(usage)
            STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(STORAGE_PATH, "w", encoding="utf-8") as f:
                json.dump(storage_data, f, indent=2)
        except Exception:
            pass

        try:
            GLOBAL_QUOTA_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(GLOBAL_QUOTA_PATH, "w", encoding="utf-8") as f:
                json.dump(usage, f, indent=2)
        except Exception:
            pass

        if inject:
            port = get_devtools_port()
            if port:
                inject_badge_via_devtools(port, usage)

        return usage

_oauth_lock = threading.Lock()
_active_oauth = {'running': False, 'auth_url': '', 'start_time': 0, 'target': None}

def start_shared_oauth_flow(target_account=None):
    global _active_oauth
    with _oauth_lock:
        now = time.time()
        if _active_oauth['running'] and (now - _active_oauth['start_time'] < 120) and _active_oauth['auth_url'] and (_active_oauth.get('target') == target_account):
            log(f"[OAUTH] Reusing currently active OAuth session for target '{target_account}'...")
            try:
                import server as srv_mod
                srv_mod.open_browser_url(_active_oauth['auth_url'])
            except Exception:
                pass
            return _active_oauth['auth_url']

        _active_oauth['running'] = True
        _active_oauth['auth_url'] = ''
        _active_oauth['start_time'] = now
        _active_oauth['target'] = target_account

    try:
        import server as srv_mod
        srv_mod.save_current_account()
    except Exception:
        pass

    log(f"[OAUTH] Starting Google In-Browser OAuth flow for target: {target_account or 'any'}...")
    auth_url_holder = []

    def _on_url(u):
        with _oauth_lock:
            _active_oauth['auth_url'] = u
        auth_url_holder.append(u)
        log(f"[OAUTH] OAuth URL generated: {u[:60]}...")
        if _active_cdp_ws and _active_cdp_loop:
            safe_url = json.dumps(u)
            toast_msg = json.dumps(f'مرورگر باز شد. اگر باز نشد، <a href="{u}" target="_blank" style="color:#93c5fd;text-decoration:underline;font-weight:700;">اینجا کلیک کنید</a>', ensure_ascii=False)
            js_code = f"""(() => {{
                try {{ window.open({safe_url}, '_blank'); }} catch(e) {{}}
                if (typeof window.__showSwitcherToast === 'function') {{
                    window.__showSwitcherToast({toast_msg});
                }}
                if (typeof window.__onOAuthUrlReady === 'function') {{
                    window.__onOAuthUrlReady({safe_url});
                }}
            }})()"""
            asyncio.run_coroutine_threadsafe(
                _active_cdp_ws.send(json.dumps({
                    "id": int(time.time() * 1000) % 1000000,
                    "method": "Runtime.evaluate",
                    "params": {"expression": js_code}
                })),
                _active_cdp_loop
            )

    def _done(res):
        log(f"[OAUTH] Flow completed: {res}")
        with _oauth_lock:
            _active_oauth['running'] = False
        if _active_cdp_ws and _active_cdp_loop:
            success = res.get('success', False)
            email = res.get('email', '')
            msg = f"حساب {email} با موفقیت افزوده شد!" if success else (res.get('error') or "انصراف یا خطا در ورود گوگل")
            asyncio.run_coroutine_threadsafe(
                cdp_broadcast_state(_active_cdp_ws, {
                    "msg": msg,
                    "isErr": not success
                }),
                _active_cdp_loop
            )

    def _run():
        import server as srv_mod
        srv_mod.run_google_oauth_flow(target_account=target_account, on_url=_on_url, on_complete=_done)

    t = threading.Thread(target=_run, daemon=True)
    t.start()

    for _ in range(25):
        if auth_url_holder:
            break
        time.sleep(0.08)

    return auth_url_holder[0] if auth_url_holder else ""

def get_account_profile_data(account_email, manifest=None, force_refresh=False):
    if manifest is None:
        try:
            import server as srv
            manifest = srv.load_manifest()
        except Exception:
            manifest = {}

    target = account_email or PRIMARY_ACCOUNT
    entry = manifest.get(target, {})
    name = entry.get("name") or entry.get("label") or (target.split('@')[0].split('.')[0].capitalize() if target else "User")
    avatar = entry.get("avatar", "")
    tier = entry.get("tier", "Google AI Pro")
    tier_code = entry.get("tier_code", "pro")
    remaining_pct = entry.get("remaining_pct", 100)

    acc_data = {
        "email": target,
        "name": name,
        "avatar": avatar,
        "tier": tier,
        "tier_code": tier_code,
        "session": {
            "name": "Gemini 3.8 Flash High",
            "used_pct": round(100 - remaining_pct, 1),
            "remaining_pct": remaining_pct,
            "resets_in": "4 hr"
        }
    }

    if not force_refresh and entry.get("quota") and isinstance(entry["quota"], dict):
        acc_data.update(entry["quota"])
        if avatar and not acc_data.get("avatar"):
            acc_data["avatar"] = avatar
        return acc_data

    tf = entry.get("token_file")
    if tf and os.path.exists(tf):
        try:
            with open(tf, 'r', encoding='utf-8') as f_tok:
                tok_str = f_tok.read().strip()
            q = quota_engine.fetch_quota_and_tier(tok_str, force_refresh=force_refresh)
            if q and isinstance(q, dict) and q.get("email") == target:
                acc_data.update(q)
                if avatar and not acc_data.get("avatar"):
                    acc_data["avatar"] = avatar
        except Exception:
            pass

    return acc_data

class QuotaHttpHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Connection', 'close')
        self.end_headers()

    def do_GET(self):
        try:
            import server as srv_mod
            if self.path.startswith('/sync') or self.path.startswith('/quota') or self.path.startswith('/api/quota'):
                import urllib.parse
                parsed = urllib.parse.urlparse(self.path)
                q_params = urllib.parse.parse_qs(parsed.query)
                req_inst = q_params.get('instance', [None])[0]
                force = 'force' in self.path
                if req_inst and req_inst != 'instance_1':
                    target_acc = get_instance_active_account(req_inst)
                    sec_path = Path.home() / ".gemini" / "antigravity" / f"active_quota_{req_inst}.json"
                    usage = None
                    if force:
                        usage = get_account_profile_data(target_acc, force_refresh=True)
                        if usage:
                            try:
                                with open(sec_path, "w", encoding="utf-8") as f:
                                    json.dump(usage, f, indent=2)
                            except Exception:
                                pass
                    if not usage and sec_path.exists():
                        try:
                            with open(sec_path, "r", encoding="utf-8") as f:
                                usage = json.load(f)
                        except Exception:
                            pass
                    if not usage or usage.get("email") != target_acc:
                        usage = get_account_profile_data(target_acc, force_refresh=True)
                else:
                    target_acc = get_instance_active_account("instance_1")
                    usage = sync_quota_once(force=force, inject=False)
                    if not usage or usage.get("email") != target_acc:
                        usage = get_account_profile_data(target_acc, force_refresh=force)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(usage or {}).encode('utf-8'))
            elif self.path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            elif self.path == '/open_switcher':
                try:
                    custom_path = os.environ.get("ANTIGRAVITY_SWITCHER_PATH")
                    candidates = [
                        Path(custom_path) if custom_path else None,
                        Path(__file__).resolve().parent.parent / "gravity suitch accont" / "AntigravitySwitcher.vbs",
                        Path(__file__).resolve().parent / "AntigravitySwitcher.vbs",
                        Path.home() / "Desktop" / "agent-helper" / "gravity suitch accont" / "AntigravitySwitcher.vbs",
                    ]
                    for candidate in candidates:
                        if candidate and candidate.exists():
                            subprocess.Popen(['wscript', str(candidate)])
                            break
                except Exception:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(b'{"status":"opened"}')
            elif self.path.startswith('/api/state') or self.path.startswith('/api/accounts'):
                # Return active account, saved accounts manifest, and conversations
                import urllib.parse
                parsed_url = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                req_inst = query_params.get('instance', [None])[0]
                req_acc = query_params.get('account', [None])[0]

                resp_data = {'activeAccount': None, 'savedAccounts': {}, 'conversations': []}
                try:
                    import server as srv
                    import migration_engine as m_eng
                    manifest = srv.load_manifest()
                    resp_data['savedAccounts'] = manifest

                    if req_inst:
                        target_acc = req_acc or get_instance_active_account(req_inst)
                    else:
                        target_acc = req_acc or get_instance_active_account("instance_1")

                    resp_data['activeAccount'] = get_account_profile_data(target_acc, manifest)
                    resp_data['instanceId'] = req_inst or 'instance_1'
                    resp_data['conversations'] = m_eng.list_conversations() if hasattr(m_eng, 'list_conversations') else []
                    resp_data['projects'] = m_eng.list_projects() if hasattr(m_eng, 'list_projects') else []
                    resp_data['tasks'] = m_eng.list_scheduled_tasks(account=target_acc) if hasattr(m_eng, 'list_scheduled_tasks') else []
                    resp_data['allowedConversations'] = {
                        'instance_1': m_eng.get_allowed_conversations('instance_1') if hasattr(m_eng, 'get_allowed_conversations') else [],
                        'instance_2': m_eng.get_allowed_conversations('instance_2') if hasattr(m_eng, 'get_allowed_conversations') else []
                    }
                    targets = get_devtools_targets()
                    resp_data['runningInstances'] = [t["instance_id"] for t in targets]
                    resp_data['runningAccounts'] = {t["instance_id"]: get_instance_active_account(t["instance_id"]) for t in targets}
                except Exception as e:
                    pass

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(resp_data, ensure_ascii=False).encode('utf-8'))
            elif self.path == '/api/conversations':
                convs = []
                try:
                    import migration_engine as m_eng
                    convs = m_eng.list_conversations()
                except Exception:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(convs, ensure_ascii=False).encode('utf-8'))
            elif self.path == '/api/projects':
                projects = []
                try:
                    import migration_engine as m_eng
                    projects = m_eng.list_projects()
                except Exception:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(projects, ensure_ascii=False).encode('utf-8'))
            elif self.path == '/api/tasks':
                tasks = []
                try:
                    import migration_engine as m_eng
                    tasks = m_eng.list_scheduled_tasks()
                except Exception:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(tasks, ensure_ascii=False).encode('utf-8'))
            elif self.path.startswith('/api/settings'):
                parsed_url = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                inst = query_params.get('instance_id', [None])[0]
                acc = query_params.get('account', [None])[0]
                s = load_user_settings(instance_id=inst, account_email=acc)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(s, ensure_ascii=False).encode('utf-8'))
            elif self.path == '/api/dual_status' or self.path == '/api/instances_status':
                targets = get_devtools_targets()
                running_instances = [t["instance_id"] for t in targets]
                running_accounts = {t["instance_id"]: get_instance_active_account(t["instance_id"]) for t in targets}
                payload = {
                    'instance2_running': len(running_instances) > 1 or (hasattr(srv_mod, 'is_instance2_running') and srv_mod.is_instance2_running()),
                    'running_instances': running_instances,
                    'running_accounts': running_accounts,
                    'targets': targets
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Connection', 'close')
                self.end_headers()
        except Exception as e:
            log(f"[HTTP GET ERROR] {e}")
            try:
                self.send_response(500)
                self.send_header('Connection', 'close')
                self.end_headers()
            except Exception:
                pass

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        resp = {'success': False}

        try:
            import server as srv_mod
            global _cached_account_info
            if self.path == '/api/switch':
                acc_key = data.get('accountKey')
                no_restart = data.get('noRestart', False)
                resp = srv_mod.switch_account(acc_key, no_restart=True)
                if resp.get('success'):
                    _cached_account_info = resp.get('quota')
                    _cached_account_time = time.time()
                    if _active_cdp_ws and _active_cdp_loop:
                        try:
                            asyncio.run_coroutine_threadsafe(
                                cdp_broadcast_state(_active_cdp_ws, {
                                    "msg": f"حساب به {acc_key} تغییر یافت. در حال راه‌اندازی مجدد...",
                                    "isErr": False
                                }),
                                _active_cdp_loop
                            )
                        except Exception:
                            pass
                    if not no_restart:
                        def do_restart():
                            time.sleep(0.8)
                            srv_mod.restart_antigravity()
                        threading.Thread(target=do_restart, daemon=True).start()
                else:
                    _cached_account_info = None
            elif self.path == '/api/save':
                resp = srv_mod.save_current_account()
                _cached_account_info = None
            elif self.path == '/api/launch_dual':
                ak = data.get('accountKey')
                p_path = data.get('projectPath')
                log(f"[HTTP LAUNCH DUAL] Request received for account: {ak}, project: {p_path}")
                resp = srv_mod.launch_dual_instance(ak, project_path=p_path)
                log(f"[HTTP LAUNCH DUAL RESULT] {resp}")
            elif self.path == '/api/import':
                resp = srv_mod.import_token(data.get('token', ''))
                _cached_account_info = None
            elif self.path == '/api/logout':
                resp = srv_mod.logout_account(no_restart=data.get('noRestart', False))
                _cached_account_info = None
            elif self.path == '/api/delete':
                m = srv_mod.load_manifest()
                ak = data.get('accountKey')
                if ak in m:
                    del m[ak]
                    srv_mod.save_manifest(m)
                    resp = {'success': True}
                _cached_account_info = None
            elif self.path.startswith('/api/settings'):
                inst = data.get('instance_id')
                acc = data.get('account')
                ok, res = save_user_settings(data, instance_id=inst, account_email=acc)
                resp = {'success': ok, 'settings': res}
            elif self.path == '/api/oauth_signin':
                tgt_acc = data.get('accountKey') or data.get('email')
                auth_url = start_shared_oauth_flow(target_account=tgt_acc)
                resp = {'success': True, 'auth_url': auth_url}
            elif self.path == '/api/migrate':
                import migration_engine as m_eng
                resp = m_eng.migrate_conversations(
                    data.get('conversationIds', []),
                    data.get('sourceAccount'),
                    data.get('targetAccount'),
                    mode=data.get('mode', 'copy'),
                    structure=data.get('structure', 'separate'),
                    dual_sync=data.get('dualSync', False),
                    project_id=data.get('projectId')
                )
            elif self.path == '/api/project_assign':
                import migration_engine as m_eng
                resp = m_eng.set_project_assignment(
                    data.get('projectId'),
                    data.get('accounts') or data.get('account', []),
                    sync_mode=data.get('syncMode', 'shared'),
                    enabled=data.get('enabled')
                )
            elif self.path == '/api/project_toggle_all':
                import migration_engine as m_eng
                resp = m_eng.toggle_project_all(
                    data.get('projectId'),
                    state=data.get('state', 'all')
                )
            elif self.path == '/api/project_sync':
                import migration_engine as m_eng
                resp = m_eng.sync_project_to_account(
                    data.get('projectId'),
                    data.get('targetAccount'),
                    include_conversations=data.get('includeConversations', False)
                )
            elif self.path == '/api/project_unlink':
                import migration_engine as m_eng
                resp = m_eng.unlink_project_from_account(
                    data.get('projectId'),
                    data.get('account')
                )
            elif self.path == '/api/task_assign':
                import migration_engine as m_eng
                resp = m_eng.set_task_account_assignment(
                    data.get('taskName') or data.get('name'),
                    data.get('accounts') or data.get('account', []),
                    enabled=data.get('enabled')
                )
            elif self.path == '/api/task_toggle_all':
                import migration_engine as m_eng
                resp = m_eng.toggle_task_all(
                    data.get('taskName') or data.get('name'),
                    state=data.get('state', 'all')
                )
            elif self.path == '/api/task_isolate':
                import migration_engine as m_eng
                resp = m_eng.set_task_isolation(
                    data.get('taskName') or data.get('name'),
                    data.get('ownerAccount') or PRIMARY_ACCOUNT,
                    isolate_from_account2=data.get('isolateFromAccount2', data.get('isolate', True)),
                    allowed_instances=data.get('allowedInstances'),
                    requesting_account=data.get('account') or data.get('callerAccount')
                )
            elif self.path == '/api/task_toggle':
                import migration_engine as m_eng
                resp = m_eng.toggle_task_state(
                    data.get('taskName') or data.get('name'),
                    enable=data.get('enable', data.get('enabled', True)),
                    requesting_account=data.get('account') or data.get('callerAccount')
                )
            elif self.path == '/api/conversation_assign':
                import migration_engine as m_eng
                resp = m_eng.assign_conversation_account(
                    data.get('conversationId'),
                    data.get('account'),
                    action=data.get('action', 'add')
                )
            
            if isinstance(resp, dict) and resp.get('success'):
                broadcast_all_instances()
        except Exception as e:
            resp = {'success': False, 'error': str(e)}

        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
        except Exception:
            pass

    def log_message(self, format, *args):
        pass

def start_http_server(port=39281):
    ThreadingHTTPServer.allow_reuse_address = True
    for attempt in range(40):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), QuotaHttpHandler)
            server.daemon_threads = True
            log(f"[INFO] HTTP server successfully listening on port {port}")
            server.serve_forever()
            break
        except Exception as e:
            log(f"[WARN] HTTP server bind attempt {attempt+1}/40 failed: {e}")
            time.sleep(1.5)


async def cdp_broadcast_state(ws, extra_toast=None, instance_id="instance_1", account_email=None):
    try:
        import server as srv
        import migration_engine as m_eng
        manifest = srv.load_manifest()

        target_account = account_email or get_instance_active_account(instance_id)
        if target_account not in manifest:
            target_account = PRIMARY_ACCOUNT

        actual_account = target_account
        active_acc = get_account_profile_data(target_account, manifest)

        conversations = m_eng.list_conversations() if hasattr(m_eng, 'list_conversations') else []
        projects = m_eng.list_projects() if hasattr(m_eng, 'list_projects') else []
        tasks = m_eng.list_scheduled_tasks(account=actual_account) if hasattr(m_eng, 'list_scheduled_tasks') else []
        allowed_convs = m_eng.get_allowed_conversations(actual_account) if hasattr(m_eng, 'get_allowed_conversations') else []

        running_accounts = {}
        try:
            for t in get_devtools_targets():
                acc = t.get("default_account")
                if acc:
                    running_accounts[t["instance_id"]] = acc
        except Exception:
            pass

        payload = json.dumps({
            "activeAccount": active_acc,
            "savedAccounts": manifest,
            "runningAccounts": running_accounts,
            "conversations": conversations,
            "projects": projects,
            "tasks": tasks,
            "allowedConversations": allowed_convs,
            "instanceId": instance_id
        }, ensure_ascii=False)

        toast_js = ""
        if extra_toast:
            msg = json.dumps(extra_toast.get("msg", ""), ensure_ascii=False)
            is_err = "true" if extra_toast.get("isErr") else "false"
            toast_js = f"if (typeof window.__showSwitcherToast === 'function') window.__showSwitcherToast({msg}, {is_err});"

        eval_script = f"""(() => {{
            window.__antigravity_instance = {json.dumps(instance_id)};
            window.__antigravity_account = {json.dumps(actual_account)};
            window.__antigravity_accounts = {payload};
            try {{ localStorage.setItem('antigravity:instance_id', {json.dumps(instance_id)}); }} catch(e) {{}}
            try {{ localStorage.setItem('antigravity:account_email', {json.dumps(actual_account)}); }} catch(e) {{}}
            try {{ localStorage.setItem('antigravity:allowed_conversations', JSON.stringify({json.dumps(allowed_convs)})); }} catch(e) {{}}
            try {{ localStorage.setItem('antigravity:accounts_manifest', JSON.stringify({json.dumps(manifest, ensure_ascii=False)})); }} catch(e) {{}}
            if (typeof window.__onSwitcherStateUpdate === 'function') {{
                window.__onSwitcherStateUpdate(window.__antigravity_accounts);
            }}
            {toast_js}
        }})()"""

        await ws.send(json.dumps({
            "id": int(time.time() * 1000) % 1000000,
            "method": "Runtime.evaluate",
            "params": {"expression": eval_script}
        }))
    except Exception as e:
        print(f"[CDP STATE ERROR] [{instance_id}] {e}", flush=True)

def broadcast_all_instances(extra_toast=None):
    with _cdp_conns_lock:
        conns = list(_active_cdp_connections.values())
    for c in conns:
        try:
            if c.get("ws") and c.get("loop"):
                asyncio.run_coroutine_threadsafe(
                    cdp_broadcast_state(c["ws"], extra_toast=extra_toast, instance_id=c.get("instance_id", "instance_1"), account_email=c.get("account")),
                    c["loop"]
                )
        except Exception:
            pass

async def cdp_handle_action(ws, action, data, instance_id="instance_1", default_account=None):
    try:
        import server as srv
        import migration_engine as m_eng
        log(f"[CDP IPC ACTION] [{instance_id}] {action}")
        if action == "getState":
            await cdp_broadcast_state(ws, instance_id=instance_id, account_email=default_account)
        elif action == "save":
            res = srv.save_current_account()
            broadcast_all_instances({
                "msg": "اکانت فعلی با موفقیت ذخیره شد" if res.get("success") else (res.get("error") or "خطا در ذخیره اکانت"),
                "isErr": not res.get("success")
            })
        elif action == "switch":
            acc_key = data.get("accountKey")
            no_restart = data.get("noRestart", False)
            log(f"[CDP SWITCH] Target: {acc_key}")
            res = srv.switch_account(acc_key, no_restart=True)
            if res.get("success"):
                quota_d = res.get("quota")
                global _cached_account_info, _cached_account_time
                _cached_account_info = quota_d
                _cached_account_time = time.time()
                broadcast_all_instances({
                    "msg": f"حساب به {acc_key} تغییر یافت. در حال راه‌اندازی مجدد...",
                    "isErr": False
                })
                if not no_restart:
                    def do_restart():
                        time.sleep(0.8)
                        srv.restart_antigravity()
                    threading.Thread(target=do_restart, daemon=True).start()
            if not res.get("success"):
                if res.get("needs_reauth"):
                    start_shared_oauth_flow(target_account=target_key)
                await cdp_broadcast_state(ws, {"msg": res.get("error") or "خطا در جابجایی حساب", "isErr": True}, instance_id=instance_id, account_email=default_account)
        elif action == "import":
            tok = (data.get("token") or "").replace("\r", "").replace("\n", "").strip()
            res = srv.import_token(tok)
            broadcast_all_instances({
                "msg": f"اکانت {res.get('email', '')} با موفقیت افزوده شد" if res.get("success") else (res.get("error") or "خطا در ثبت توکن"),
                "isErr": not res.get("success")
            })
        elif action == "delete":
            ak = data.get("accountKey")
            res = srv.delete_account(ak)
            broadcast_all_instances({
                "msg": "اکانت از لیست حذف شد" if res.get("success") else (res.get("error") or "خطا در حذف"),
                "isErr": not res.get("success")
            })
        elif action == "launch_dual":
            ak = data.get("accountKey")
            p_path = data.get("projectPath")
            log(f"[CDP LAUNCH DUAL] Request received for account: {ak}, project: {p_path}")
            res = srv.launch_dual_instance(ak, project_path=p_path)
            log(f"[CDP LAUNCH DUAL RESULT] {res}")
            display_name = ak or "اکانت دوم"
            success = res.get("success", False)
            if res.get("needs_reauth"):
                start_shared_oauth_flow(target_account=ak)
            msg = res.get("msg") or (f"پنجره دوم با اکانت {display_name} اجرا شد" if success else (res.get("error") or "خطا در اجرای پنجره دوم"))
            broadcast_all_instances({
                "msg": msg,
                "isErr": not success
            })
        elif action == "oauth_signin":
            tgt = data.get("accountKey") or data.get("email")
            start_shared_oauth_flow(target_account=tgt)
        elif action == "migrate":
            conv_ids = data.get("conversationIds", [])
            src = data.get("sourceAccount", "")
            tgt = data.get("targetAccount", "")
            mode = data.get("mode", "copy")
            struct = data.get("structure", "separate")
            dual = data.get("dualSync", False)
            p_id = data.get("projectId")
            res = m_eng.migrate_conversations(conv_ids, src, tgt, mode=mode, structure=struct, dual_sync=dual, project_id=p_id)
            broadcast_all_instances({
                "msg": f"انتقال {res.get('migrated_count', 0)} گفتگو با موفقیت انجام شد" if res.get("success") else (res.get("error") or "خطا در انتقال"),
                "isErr": not res.get("success")
            })
        elif action in ["assignProject", "setProjectAssignment"]:
            p_id = data.get("projectId")
            accs = data.get("accounts") or data.get("account", [])
            enb = data.get("enabled")
            sm = data.get("syncMode", "shared")
            res = m_eng.set_project_assignment(p_id, accs, sync_mode=sm, enabled=enb)
            broadcast_all_instances({
                "msg": "تنظیمات دسترسی پروژه بروزرسانی شد" if res.get("success") else (res.get("error") or "خطا در تخصیص پروژه"),
                "isErr": not res.get("success")
            })
        elif action == "toggleProjectAll":
            p_id = data.get("projectId")
            st = data.get("state", "all")
            res = m_eng.toggle_project_all(p_id, state=st)
            broadcast_all_instances({
                "msg": f"پروژه برای {'همه اکانت‌ها فعال' if st == 'all' else 'همه اکانت‌ها غیرفعال'} شد" if res.get("success") else "خطا در تغییر وضعیت پروژه",
                "isErr": not res.get("success")
            })
        elif action == "syncProject":
            p_id = data.get("projectId")
            tgt = data.get("targetAccount") or SECONDARY_ACCOUNT
            inc_c = data.get("includeConversations", False)
            res = m_eng.sync_project_to_account(p_id, tgt, include_conversations=inc_c)
            broadcast_all_instances({
                "msg": f"پروژه با موفقیت به {tgt} سینک شد" if res.get("success") else (res.get("error") or "خطا در سینک پروژه"),
                "isErr": not res.get("success")
            })
        elif action == "unlinkProject":
            p_id = data.get("projectId")
            acc = data.get("account") or SECONDARY_ACCOUNT
            res = m_eng.unlink_project_from_account(p_id, acc)
            broadcast_all_instances({
                "msg": f"پروژه با موفقیت از {acc} جدا شد" if res.get("success") else (res.get("error") or "خطا در جداسازی پروژه"),
                "isErr": not res.get("success")
            })
        elif action in ["assignTask", "setTaskAssignment"]:
            t_name = data.get("taskName") or data.get("name")
            accs = data.get("accounts") or data.get("account", [])
            enb = data.get("enabled")
            res = m_eng.set_task_account_assignment(t_name, accs, enabled=enb)
            broadcast_all_instances({
                "msg": "تنظیمات دسترسی تسک بروزرسانی شد" if res.get("success") else (res.get("error") or "خطا در تخصیص تسک"),
                "isErr": not res.get("success")
            })
        elif action == "toggleTaskAll":
            t_name = data.get("taskName") or data.get("name")
            st = data.get("state", "all")
            res = m_eng.toggle_task_all(t_name, state=st)
            broadcast_all_instances({
                "msg": f"تسک برای {'همه اکانت‌ها فعال' if st == 'all' else 'همه اکانت‌ها غیرفعال'} شد" if res.get("success") else "خطا در تغییر وضعیت تسک",
                "isErr": not res.get("success")
            })
        elif action == "isolateTask":
            t_name = data.get("taskName") or data.get("name")
            owner = data.get("ownerAccount") or PRIMARY_ACCOUNT
            iso = data.get("isolateFromAccount2", data.get("isolate", True))
            insts = data.get("allowedInstances")
            req_acc = SECONDARY_ACCOUNT if instance_id == "instance_2" else (data.get("account") or data.get("callerAccount") or default_account)
            res = m_eng.set_task_isolation(t_name, owner, isolate_from_account2=iso, allowed_instances=insts, requesting_account=req_acc)
            broadcast_all_instances({
                "msg": f"ایزولاسیون تسک {t_name} اعمال شد" if res.get("success") else (res.get("error") or "خطا در ایزولاسیون تسک"),
                "isErr": not res.get("success")
            })
        elif action == "toggleTask":
            t_name = data.get("taskName") or data.get("name")
            enb = data.get("enable", data.get("enabled", True))
            acc = SECONDARY_ACCOUNT if instance_id == "instance_2" else (data.get("account") or data.get("callerAccount") or default_account)
            res = m_eng.toggle_task_state(t_name, enable=enb, requesting_account=acc)
            broadcast_all_instances({
                "msg": res.get("msg") or res.get("error") or "وضعیت تسک تغییر کرد",
                "isErr": not res.get("success")
            })
        elif action == "assignConversation":
            c_id = data.get("conversationId")
            acc = data.get("account")
            act = data.get("action", "add")
            res = m_eng.assign_conversation_account(c_id, acc, action=act)
            broadcast_all_instances({
                "msg": "تخصیص گفتگو بروزرسانی شد" if res.get("success") else "خطا در تخصیص گفتگو",
                "isErr": not res.get("success")
            })
        elif action in ["save_user_settings", "saveSettings"]:
            inst = data.get("instance_id") or instance_id
            acc = data.get("account") or default_account
            ok, res = save_user_settings(data, instance_id=inst, account_email=acc)
            log(f"[SETTINGS] Saved user settings via CDP for {inst} / {acc}: {ok}")
    except Exception as e:
        log(f"[CDP ACTION ERROR] [{instance_id}] {e}")

async def cdp_instance_worker(instance_id, port, default_account):
    loop = asyncio.get_running_loop()
    import server as srv
    log(f"[CDP] Starting worker for {instance_id} on port {port}")
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/json/list")
        with urllib.request.urlopen(req, timeout=2) as resp:
            targets = json.loads(resp.read().decode())

        page = next((t for t in targets if t.get("type") == "page" and "about:blank" not in t.get("url", "")), None)
        if not page:
            page = next((t for t in targets if t.get("type") == "page"), None)
        if not page or not page.get("webSocketDebuggerUrl"):
            return

        ws_url = page["webSocketDebuggerUrl"]
        log(f"[CDP] [{instance_id}] Connecting to {ws_url}")

        async with websockets.connect(ws_url, ping_interval=None, ping_timeout=None) as ws:
            with _cdp_conns_lock:
                _active_cdp_connections[instance_id] = {
                    "ws": ws,
                    "port": port,
                    "account": default_account,
                    "loop": loop,
                    "instance_id": instance_id
                }

            await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Page.enable"}))
            await ws.send(json.dumps({"id": 3, "method": "DOMStorage.enable"}))
            await ws.send(json.dumps({"id": 4, "method": "Runtime.addBinding", "params": {"name": "__aqm_daemon_ipc"}}))

            init_script = get_injector_script(_cached_usage, instance_id=instance_id, account_email=default_account)
            if init_script:
                await ws.send(json.dumps({
                    "id": 5,
                    "method": "Page.addScriptToEvaluateOnNewDocument",
                    "params": {"source": init_script}
                }))
                await ws.send(json.dumps({
                    "id": 6,
                    "method": "Runtime.evaluate",
                    "params": {"expression": init_script}
                }))

            log(f"[CDP] [{instance_id}] __aqm_daemon_ipc bound and scripts injected.")

            await cdp_broadcast_state(ws, instance_id=instance_id, account_email=default_account)

            if instance_id == "instance_1" and not getattr(srv, 'is_dual_launching', lambda: False)():
                token = quota_engine.get_keychain_token()
                if token:
                    m = srv.load_manifest()
                    acc_info = quota_engine.fetch_quota_and_tier(token)
                    email = acc_info.get("email") if acc_info else None
                    if email and email not in m:
                        log(f"[AUTO-SAVE] Saving newly active account {email}")
                        srv.save_current_account()
                        await cdp_broadcast_state(ws, instance_id=instance_id, account_email=default_account)

            async for msg in ws:
                try:
                    d = json.loads(msg)
                    method = d.get("method")
                    if method == "Runtime.bindingCalled" and d.get("params", {}).get("name") == "__aqm_daemon_ipc":
                        payload_raw = d.get("params", {}).get("payload", "{}")
                        payload = json.loads(payload_raw)
                        action = payload.get("action")
                        if action:
                            await cdp_handle_action(ws, action, payload, instance_id=instance_id, default_account=default_account)

                    elif method in ("DOMStorage.domStorageItemAdded", "DOMStorage.domStorageItemUpdated"):
                        params = d.get("params", {})
                        if params.get("key") == "antigravity:switcher_command":
                            try:
                                val = json.loads(params.get("newValue", "{}"))
                                action = val.get("action")
                                if action:
                                    await cdp_handle_action(ws, action, val, instance_id=instance_id, default_account=default_account)
                            except Exception:
                                pass

                    elif method in ("Page.loadEventFired", "Page.frameNavigated"):
                        await ws.send(json.dumps({"id": 100, "method": "Runtime.addBinding", "params": {"name": "__aqm_daemon_ipc"}}))
                        nav_script = get_injector_script(_cached_usage, instance_id=instance_id, account_email=default_account)
                        if nav_script:
                            await ws.send(json.dumps({
                                "id": 101,
                                "method": "Runtime.evaluate",
                                "params": {"expression": nav_script}
                            }))
                        await cdp_broadcast_state(ws, instance_id=instance_id, account_email=default_account)
                except Exception as e:
                    log(f"[CDP MSG ERROR] [{instance_id}] {e}")

    except Exception as e:
        log(f"[CDP WORKER ERROR] [{instance_id}] {e}")
    finally:
        with _cdp_conns_lock:
            _active_cdp_connections.pop(instance_id, None)
        log(f"[CDP WORKER CLOSED] [{instance_id}]")

async def cdp_supervisor_loop():
    running_tasks = {}
    while True:
        try:
            targets = get_devtools_targets()
            for inst_id, task in list(running_tasks.items()):
                if task.done():
                    running_tasks.pop(inst_id, None)

            for tgt in targets:
                inst_id = tgt["instance_id"]
                if inst_id not in running_tasks or running_tasks[inst_id].done():
                    task = asyncio.create_task(
                        cdp_instance_worker(inst_id, tgt["port"], tgt["default_account"])
                    )
                    running_tasks[inst_id] = task
        except Exception as e:
            log(f"[CDP SUPERVISOR ERROR] {e}")

        await asyncio.sleep(2)

def start_cdp_supervisor():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(cdp_supervisor_loop())

def kill_other_daemon_instances():
    try:
        import psutil
        my_pid = os.getpid()
        for p in psutil.process_iter(['pid', 'name', 'cmdline']):
            if p.info['pid'] == my_pid:
                continue
            cmd = p.info.get('cmdline') or []
            cmd_str = " ".join(cmd).lower()
            if 'sync_daemon.py' in cmd_str and ('python' in (p.info.get('name') or '').lower()):
                try:
                    p.terminate()
                    p.wait(timeout=2)
                except Exception:
                    try:
                        p.kill()
                    except Exception:
                        pass
    except Exception:
        pass

def refresh_all_accounts_tokens():
    try:
        accounts_dir = Path.home() / ".gemini" / "accounts"
        if not accounts_dir.exists():
            return
        manifest_p = accounts_dir / "manifest.json"
        manifest = {}
        if manifest_p.exists():
            try:
                with open(manifest_p, 'r', encoding='utf-8') as mf:
                    manifest = json.load(mf)
            except Exception:
                pass

        updated_manifest = False
        for tf in accounts_dir.glob("*.token"):
            try:
                with open(tf, 'r', encoding='utf-8') as f:
                    t_str = f.read().strip()
                if not t_str:
                    continue
                acc_name = tf.stem
                
                # Verify token email matches account name
                tok_email = quota_engine.extract_token_email(t_str)
                if tok_email and tok_email.lower().strip() != acc_name.lower().strip():
                    log(f"[SYNC WARNING] Token in {tf.name} belongs to '{tok_email}', NOT '{acc_name}'. Skipping and flagging reauth.")
                    if acc_name in manifest:
                        manifest[acc_name]['needs_reauth'] = True
                        manifest[acc_name]['token_file'] = ''
                        updated_manifest = True
                    continue

                fresh_str = quota_engine.ensure_fresh_token(t_str, account_email=acc_name)
                # Fetch updated quota
                q = quota_engine.fetch_quota_and_tier(fresh_str, force_refresh=True)
                if q and acc_name in manifest:
                    sess = q.get('session') or {}
                    rem = sess.get('remaining_pct')
                    week = q.get('weekly') or {}
                    week_rem = week.get('remaining_pct')
                    if rem is not None:
                        manifest[acc_name]['remaining_pct'] = float(rem)
                    if week_rem is not None:
                        manifest[acc_name]['weekly_remaining_pct'] = float(week_rem)
                    if week.get('resets_in'):
                        manifest[acc_name]['weekly_resets_in'] = week.get('resets_in')
                    manifest[acc_name]['saved_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    updated_manifest = True
            except Exception:
                pass

        if updated_manifest and manifest_p.exists():
            try:
                with open(manifest_p, 'w', encoding='utf-8') as mf:
                    json.dump(manifest, mf, indent=2, ensure_ascii=False)
            except Exception:
                pass
    except Exception:
        pass

def daemon_loop():
    kill_other_daemon_instances()
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Antigravity Quota Monitor on-demand daemon active.", flush=True)
    # Start on-demand local HTTP server
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()

    # Start native CDP IPC supervisor thread
    t_cdp = threading.Thread(target=start_cdp_supervisor, daemon=True)
    t_cdp.start()
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [CDP] Native CDP supervisor thread started.", flush=True)

    # Refresh tokens for all saved accounts on startup
    try:
        refresh_all_accounts_tokens()
    except Exception:
        pass

    # Initial sync & injection
    try:
        sync_quota_once(force=True, inject=True)
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [SYNC] Initial quota sync & injection completed.", flush=True)
    except Exception as e:
        print(f"[ERROR] Initial sync error: {e}", flush=True)

    last_heartbeat_time = time.time()
    last_injected_port = None
    last_verify_time = 0

    while True:
        time.sleep(3)
        now = time.time()

        # 1. Detect if Antigravity instances are open, changed port, or restarted
        try:
            targets = get_devtools_targets()
            if targets:
                if (targets != last_injected_port) or (now - last_verify_time > 30):
                    last_verify_time = now
                    last_injected_port = targets
                    if _cached_usage:
                        for tgt in targets:
                            inject_badge_via_devtools(tgt["port"], _cached_usage, instance_id=tgt["instance_id"], account_email=tgt["default_account"])
                    else:
                        sync_quota_once(force=True, inject=True)
            else:
                last_injected_port = None
        except Exception:
            pass

        # 2. Passive keepalive heartbeat and token refresh every 15 minutes (900 seconds)
        if now - last_heartbeat_time >= 900:
            last_heartbeat_time = now
            try:
                refresh_all_accounts_tokens()
                sync_quota_once(force=False)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [HEARTBEAT] Passive quota heartbeat and account tokens refreshed.", flush=True)
            except Exception:
                pass

if __name__ == "__main__":
    try:
        if "--once" in sys.argv:
            sync_quota_once(force=True)
            print("Synced successfully.")
        else:
            daemon_loop()
    except Exception:
        import traceback
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[FATAL] {time.strftime('%Y-%m-%d %H:%M:%S')} {traceback.format_exc()}\n")
