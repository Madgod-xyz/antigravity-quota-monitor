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
    try:
        print(line, end="", flush=True)
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
    user_settings = home / ".gemini" / "antigravity" / "user_settings.json"

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

    return storage, devtools, global_quota, history, injector, user_settings

STORAGE_PATH, DEVTOOLS_PORT_PATH, GLOBAL_QUOTA_PATH, HISTORY_PATH, INJECTOR_PATH, SETTINGS_PATH = get_platform_paths()

def load_user_settings():
    if SETTINGS_PATH.exists():
        try:
            with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
                d = json.load(f)
                if isinstance(d, dict):
                    return d
        except Exception:
            pass
    return {}

def save_user_settings(new_settings):
    try:
        settings = load_user_settings()
        settings.update(new_settings)
        SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        log(f"[SETTINGS SAVE ERROR] {e}")
        return False

def get_devtools_port():
    if not DEVTOOLS_PORT_PATH.exists():
        return None
    try:
        with open(DEVTOOLS_PORT_PATH, "r", encoding="utf-8") as f:
            lines = f.read().strip().split("\n")
            if lines:
                return int(lines[0])
    except Exception:
        return None
    return None

_active_cdp_ws = None
_active_cdp_loop = None

def get_injector_script(usage=None):
    if not INJECTOR_PATH.exists():
        return ""
    try:
        with open(INJECTOR_PATH, "r", encoding="utf-8") as f:
            code = f.read()

        usage_json = json.dumps(usage) if usage else "{}"

        man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
        saved_accounts = {}
        if man_path.exists():
            try:
                with open(man_path, "r", encoding="utf-8") as mf:
                    saved_accounts = json.load(mf)
            except Exception:
                pass

        accounts_payload = json.dumps({
            "activeAccount": usage,
            "savedAccounts": saved_accounts
        }, ensure_ascii=False)
        saved_manifest_json = json.dumps(saved_accounts, ensure_ascii=False)

        user_settings = load_user_settings()
        user_settings_json = json.dumps(user_settings, ensure_ascii=False)

        return (
            "(() => {\n"
            f"  window.__antigravity_quota = {usage_json};\n"
            f"  window.__antigravity_accounts = {accounts_payload};\n"
            f"  window.__antigravity_settings = {user_settings_json};\n"
            "  try { localStorage.setItem('antigravity:active_quota', JSON.stringify(window.__antigravity_quota)); } catch(e) {}\n"
            f"  try {{ localStorage.setItem('antigravity:accounts_manifest', JSON.stringify({saved_manifest_json})); }} catch(e) {{}}\n"
            "  try {\n"
            "    if (window.__antigravity_settings && typeof window.__antigravity_settings === 'object') {\n"
            "      for (const [k, v] of Object.entries(window.__antigravity_settings)) {\n"
            "        if (v !== undefined && v !== null) {\n"
            "          localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));\n"
            "        }\n"
            "      }\n"
            "    }\n"
            "  } catch(e) {}\n"
            + code + "\n"
            "  if (typeof window.__renderAntigravityBadge === 'function') window.__renderAntigravityBadge();\n"
            "})();\n"
        )
    except Exception:
        return ""

def inject_badge_via_devtools(port, usage=None):
    global _active_cdp_ws, _active_cdp_loop
    if _active_cdp_ws and _active_cdp_loop:
        try:
            script = get_injector_script(usage)
            if script:
                asyncio.run_coroutine_threadsafe(
                    _active_cdp_ws.send(json.dumps({
                        "id": int(time.time() * 1000) % 1000000,
                        "method": "Runtime.evaluate",
                        "params": {"expression": script}
                    })),
                    _active_cdp_loop
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
_active_oauth = {'running': False, 'auth_url': '', 'start_time': 0}

def start_shared_oauth_flow():
    global _active_oauth
    with _oauth_lock:
        now = time.time()
        if _active_oauth['running'] and (now - _active_oauth['start_time'] < 120) and _active_oauth['auth_url']:
            log("[OAUTH] Reusing currently active OAuth session...")
            try:
                import server as srv_mod
                srv_mod.open_browser_url(_active_oauth['auth_url'])
            except Exception:
                pass
            return _active_oauth['auth_url']

        _active_oauth['running'] = True
        _active_oauth['auth_url'] = ''
        _active_oauth['start_time'] = now

    try:
        import server as srv_mod
        srv_mod.save_current_account()
    except Exception:
        pass

    log("[OAUTH] Starting Google In-Browser OAuth flow...")
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
        srv_mod.run_google_oauth_flow(on_url=_on_url, on_complete=_done)

    t = threading.Thread(target=_run, daemon=True)
    t.start()

    for _ in range(25):
        if auth_url_holder:
            break
        time.sleep(0.08)

    return auth_url_holder[0] if auth_url_holder else ""

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
            if self.path.startswith('/sync') or self.path.startswith('/quota'):
                force = 'force' in self.path
                usage = sync_quota_once(force=force, inject=False)
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
            elif self.path in ('/api/state', '/api/accounts'):
                # Return active account, saved accounts manifest, and conversations
                resp_data = {'activeAccount': None, 'savedAccounts': {}, 'conversations': []}
                try:
                    import quota_engine as q_eng
                    import migration_engine as m_eng
                    global _cached_account_info, _cached_account_time
                    now = time.time()
                    force = 'force=true' in self.path.lower()
                    if not force and '_cached_account_info' in globals() and _cached_account_info and (now - _cached_account_time < 30):
                        resp_data['activeAccount'] = _cached_account_info
                    elif GLOBAL_QUOTA_PATH.exists():
                        try:
                            with open(GLOBAL_QUOTA_PATH, 'r', encoding='utf-8') as f_q:
                                resp_data['activeAccount'] = json.load(f_q)
                                _cached_account_info = resp_data['activeAccount']
                                _cached_account_time = now
                        except Exception:
                            pass
                    elif hasattr(q_eng, 'fetch_quota_and_tier'):
                        _cached_account_info = q_eng.fetch_quota_and_tier()
                        _cached_account_time = now
                        resp_data['activeAccount'] = _cached_account_info
                    resp_data['conversations'] = m_eng.list_conversations() if hasattr(m_eng, 'list_conversations') else []
                except Exception as e:
                    pass
                
                man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
                if man_path.exists():
                    try:
                        with open(man_path, 'r', encoding='utf-8') as f:
                            resp_data['savedAccounts'] = json.load(f)
                    except Exception:
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
            elif self.path in ('/api/settings', '/api/user_settings'):
                settings = load_user_settings()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(settings, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Connection', 'close')
                self.end_headers()
        except Exception:
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
            elif self.path == '/api/oauth_signin':
                auth_url = start_shared_oauth_flow()
                resp = {'success': True, 'auth_url': auth_url}
            elif self.path == '/api/migrate':
                import migration_engine as m_eng
                resp = m_eng.migrate_conversations(
                    data.get('conversationIds', []),
                    data.get('sourceAccount'),
                    data.get('targetAccount'),
                    mode=data.get('mode', 'copy'),
                    structure=data.get('structure', 'separate'),
                    dual_sync=data.get('dualSync', False)
                )
            elif self.path in ('/api/save_setting', '/api/settings', '/save_settings'):
                if isinstance(data, dict):
                    if "key" in data and "value" in data:
                        save_user_settings({data["key"]: data["value"]})
                    else:
                        save_user_settings(data)
                resp = {'success': True}
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
    for attempt in range(6):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), QuotaHttpHandler)
            server.daemon_threads = True
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] HTTP server successfully listening on port {port}", flush=True)
            server.serve_forever()
            break
        except Exception as e:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [WARN] HTTP server bind attempt {attempt+1} failed: {e}", flush=True)
            time.sleep(1.5)


async def cdp_broadcast_state(ws, extra_toast=None):
    try:
        import server as srv
        import migration_engine as m_eng
        manifest = srv.load_manifest()
        token = quota_engine.get_keychain_token()
        active_acc = None
        if token:
            active_acc = quota_engine.fetch_quota_and_tier(token)
        conversations = m_eng.list_conversations() if hasattr(m_eng, 'list_conversations') else []

        payload = json.dumps({
            "activeAccount": active_acc,
            "savedAccounts": manifest,
            "conversations": conversations
        }, ensure_ascii=False)

        toast_js = ""
        if extra_toast:
            msg = json.dumps(extra_toast.get("msg", ""), ensure_ascii=False)
            is_err = "true" if extra_toast.get("isErr") else "false"
            toast_js = f"if (typeof window.__showSwitcherToast === 'function') window.__showSwitcherToast({msg}, {is_err});"

        eval_script = f"""(() => {{
            window.__antigravity_accounts = {payload};
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
        print(f"[CDP STATE ERROR] {e}", flush=True)

async def cdp_handle_action(ws, action, data):
    try:
        import server as srv
        import migration_engine as m_eng
        log(f"[CDP IPC ACTION] {action}")
        if action == "getState":
            await cdp_broadcast_state(ws)
        elif action == "save":
            res = srv.save_current_account()
            await cdp_broadcast_state(ws, {
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
                await cdp_broadcast_state(ws, {
                    "msg": f"حساب به {acc_key} تغییر یافت. در حال راه‌اندازی مجدد...",
                    "isErr": False
                })
                if not no_restart:
                    def do_restart():
                        time.sleep(0.8)
                        srv.restart_antigravity()
                    threading.Thread(target=do_restart, daemon=True).start()
            else:
                await cdp_broadcast_state(ws, {"msg": res.get("error") or "خطا در جابجایی حساب", "isErr": True})
        elif action == "import":
            tok = (data.get("token") or "").replace("\r", "").replace("\n", "").strip()
            res = srv.import_token(tok)
            await cdp_broadcast_state(ws, {
                "msg": f"اکانت {res.get('email', '')} با موفقیت افزوده شد" if res.get("success") else (res.get("error") or "خطا در ثبت توکن"),
                "isErr": not res.get("success")
            })
        elif action == "delete":
            ak = data.get("accountKey")
            res = srv.delete_account(ak)
            await cdp_broadcast_state(ws, {
                "msg": "اکانت از لیست حذف شد" if res.get("success") else (res.get("error") or "خطا در حذف"),
                "isErr": not res.get("success")
            })
        elif action == "oauth_signin":
            start_shared_oauth_flow()
        elif action == "migrate":
            conv_ids = data.get("conversationIds", [])
            src = data.get("sourceAccount", "")
            tgt = data.get("targetAccount", "")
            mode = data.get("mode", "copy")
            struct = data.get("structure", "separate")
            dual = data.get("dualSync", False)
            res = m_eng.migrate_conversations(conv_ids, src, tgt, mode=mode, structure=struct, dual_sync=dual)
            await cdp_broadcast_state(ws, {
                "msg": f"انتقال {res.get('migrated_count', 0)} گفتگو با موفقیت انجام شد" if res.get("success") else (res.get("error") or "خطا در انتقال"),
                "isErr": not res.get("success")
            })
        elif action in ("save_setting", "save_settings"):
            key = data.get("key")
            val = data.get("value")
            if key:
                save_user_settings({key: val})
            settings_dict = data.get("settings")
            if isinstance(settings_dict, dict):
                save_user_settings(settings_dict)
    except Exception as e:
        log(f"[CDP ACTION ERROR] {e}")

async def cdp_session_loop():
    global _active_cdp_ws, _active_cdp_loop
    _active_cdp_loop = asyncio.get_running_loop()
    import server as srv
    while True:
        try:
            port = get_devtools_port()
            if not port:
                await asyncio.sleep(2)
                continue

            req = urllib.request.Request(f"http://127.0.0.1:{port}/json/list")
            with urllib.request.urlopen(req, timeout=2) as resp:
                targets = json.loads(resp.read().decode())

            page = next((t for t in targets if t.get("type") == "page" and "about:blank" not in t.get("url", "")), None)
            if not page:
                page = next((t for t in targets if t.get("type") == "page"), None)
            if not page or not page.get("webSocketDebuggerUrl"):
                await asyncio.sleep(2)
                continue

            ws_url = page["webSocketDebuggerUrl"]
            log(f"[CDP] Connecting to {ws_url}")

            async with websockets.connect(ws_url, ping_interval=None, ping_timeout=None) as ws:
                _active_cdp_ws = ws
                await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
                await ws.send(json.dumps({"id": 2, "method": "Page.enable"}))
                await ws.send(json.dumps({"id": 3, "method": "DOMStorage.enable"}))
                await ws.send(json.dumps({"id": 4, "method": "Runtime.addBinding", "params": {"name": "__aqm_daemon_ipc"}}))
                
                # Injects the script for new documents
                init_script = get_injector_script(_cached_usage)
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

                log("[CDP] __aqm_daemon_ipc bound successfully.")

                # Broadcast initial state
                await cdp_broadcast_state(ws)

                # Auto-save current account if newly logged in
                token = quota_engine.get_keychain_token()
                if token:
                    m = srv.load_manifest()
                    acc_info = quota_engine.fetch_quota_and_tier(token)
                    email = acc_info.get("email") if acc_info else None
                    if email and email not in m:
                        log(f"[AUTO-SAVE] Saving newly active account {email}")
                        srv.save_current_account()
                        await cdp_broadcast_state(ws)

                async for msg in ws:
                    try:
                        d = json.loads(msg)
                        method = d.get("method")
                        if method == "Runtime.bindingCalled" and d.get("params", {}).get("name") == "__aqm_daemon_ipc":
                            payload_raw = d.get("params", {}).get("payload", "{}")
                            payload = json.loads(payload_raw)
                            action = payload.get("action")
                            if action:
                                await cdp_handle_action(ws, action, payload)

                        elif method in ("DOMStorage.domStorageItemAdded", "DOMStorage.domStorageItemUpdated"):
                            params = d.get("params", {})
                            if params.get("key") == "antigravity:switcher_command":
                                try:
                                    val = json.loads(params.get("newValue", "{}"))
                                    action = val.get("action")
                                    if action:
                                        await cdp_handle_action(ws, action, val)
                                except Exception:
                                    pass

                        elif method in ("Page.loadEventFired", "Page.frameNavigated"):
                            # Re-bind on reload
                            await ws.send(json.dumps({"id": 100, "method": "Runtime.addBinding", "params": {"name": "__aqm_daemon_ipc"}}))
                            nav_script = get_injector_script(_cached_usage)
                            if nav_script:
                                await ws.send(json.dumps({
                                    "id": 101,
                                    "method": "Runtime.evaluate",
                                    "params": {"expression": nav_script}
                                }))
                            # Auto-save newly active account
                            token = quota_engine.get_keychain_token()
                            if token:
                                m = srv.load_manifest()
                                acc_info = quota_engine.fetch_quota_and_tier(token)
                                email = acc_info.get("email") if acc_info else None
                                if email and email not in m:
                                    log(f"[AUTO-SAVE] Saving newly active account {email}")
                                    srv.save_current_account()
                            await cdp_broadcast_state(ws)
                    except Exception as e:
                        log(f"[CDP MSG ERROR] {e}")

        except Exception as e:
            _active_cdp_ws = None
            log(f"[CDP RECONNECT] {e}")
            await asyncio.sleep(2)

def start_cdp_supervisor():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(cdp_session_loop())

def daemon_loop():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Antigravity Quota Monitor on-demand daemon active.", flush=True)
    # Start on-demand local HTTP server
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()

    # Start native CDP IPC supervisor thread
    t_cdp = threading.Thread(target=start_cdp_supervisor, daemon=True)
    t_cdp.start()
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [CDP] Native CDP supervisor thread started.", flush=True)

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

        # 1. Detect if Antigravity is open, changed port, or restarted
        try:
            port = get_devtools_port()
            if port:
                # If port changed, or first time seeing port, or periodic verify every 30 seconds
                if (port != last_injected_port) or (now - last_verify_time > 30):
                    last_verify_time = now
                    last_injected_port = port
                    # Inject without heavy Google OAuth call if usage is already cached
                    if _cached_usage:
                        inject_badge_via_devtools(port, _cached_usage)
                    else:
                        sync_quota_once(force=True, inject=True)
            else:
                last_injected_port = None
        except Exception:
            pass

        # 2. Passive keepalive heartbeat every 15 minutes (900 seconds)
        if now - last_heartbeat_time >= 900:
            last_heartbeat_time = now
            try:
                sync_quota_once(force=False)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [HEARTBEAT] Passive quota heartbeat.", flush=True)
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
