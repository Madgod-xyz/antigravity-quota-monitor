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

def inject_badge_via_devtools(port, usage=None):
    if not INJECTOR_PATH.exists():
        return
    try:
        with open(INJECTOR_PATH, "r", encoding="utf-8") as f:
            code = f.read()

        req = urllib.request.Request(f"http://127.0.0.1:{port}/json/list")
        with urllib.request.urlopen(req, timeout=2) as resp:
            targets = json.loads(resp.read().decode())

        pages = [t for t in targets if t.get("type") == "page" and "about:blank" not in t.get("url", "")]
        if not pages:
            pages = [t for t in targets if t.get("type") == "page"]

        node_bin = find_node_binary()
        usage_json = json.dumps(usage) if usage else "{}"

        script_to_run = (
            "(() => {\n"
            f"  window.__antigravity_quota = {usage_json};\n"
            "  try { localStorage.setItem('antigravity:active_quota', JSON.stringify(window.__antigravity_quota)); } catch(e) {}\n"
            + code + "\n"
            "  if (typeof window.__renderAntigravityBadge === 'function') window.__renderAntigravityBadge();\n"
            "})();\n"
        )

        cdp_payload_eval = json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": script_to_run,
                "returnByValue": True
            }
        })
        cdp_payload_page_enable = json.dumps({
            "id": 2,
            "method": "Page.enable"
        })
        cdp_payload_page_add = json.dumps({
            "id": 3,
            "method": "Page.addScriptToEvaluateOnNewDocument",
            "params": {
                "source": script_to_run
            }
        })

        for page in pages:
            ws_url = page.get("webSocketDebuggerUrl")
            if not ws_url:
                continue

            node_cmd = f"""
            const ws = new (globalThis.WebSocket || require('undici').WebSocket)('{ws_url}');
            ws.onopen = () => {{
              try {{ ws.send({json.dumps(cdp_payload_page_enable)}); }} catch(e) {{}}
              try {{ ws.send({json.dumps(cdp_payload_page_add)}); }} catch(e) {{}}
              try {{ ws.send({json.dumps(cdp_payload_eval)}); }} catch(e) {{}}
              setTimeout(() => process.exit(0), 700);
            }};
            ws.onerror = () => process.exit(0);
            setTimeout(() => process.exit(0), 2500);
            """
            run_kwargs = {"input": node_cmd.encode('utf-8'), "capture_output": True, "timeout": 4}
            if sys.platform == "win32":
                run_kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
            subprocess.run([node_bin, "-"], **run_kwargs)
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

    def log_message(self, format, *args):
        pass

def start_http_server(port=39281):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), QuotaHttpHandler)
        server.daemon_threads = True
        server.serve_forever()
    except Exception as e:
        print(f"[ERROR] HTTP server failed on port {port}: {e}", flush=True)

def daemon_loop():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Antigravity Quota Monitor on-demand daemon active.", flush=True)
    # Start on-demand local HTTP server
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()

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
