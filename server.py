#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Switcher & Migration Local Server
Author: Madgod-xyz (https://github.com/Madgod-xyz/antigravity-account-switcher)
Description:
    Local lightweight HTTP server that hosts the iOS Liquid Glass web interface
    and handles IPC actions (Switch, Save, Migrate, Delete, Refresh).
"""

import os
import sys
import json
import socket
import time
import subprocess
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import quota_engine
import migration_engine

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 39285
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(SCRIPT_DIR, 'app')
ACCOUNTS_DIR = os.path.expanduser('~/.gemini/accounts')
MANIFEST_PATH = os.path.join(ACCOUNTS_DIR, 'manifest.json')

def load_manifest():
    os.makedirs(ACCOUNTS_DIR, exist_ok=True)
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_manifest(manifest):
    os.makedirs(ACCOUNTS_DIR, exist_ok=True)
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def restart_language_server():
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name language_server -ErrorAction SilentlyContinue | Stop-Process -Force'], capture_output=True)
    elif sys_name == 'macos':
        subprocess.run(['pkill', '-9', '-f', 'language_server'], capture_output=True)

def restart_antigravity():
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name Antigravity, language_server -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue'], capture_output=True)
        time.sleep(1.2)
        paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"),
            os.path.expandvars(r"%ProgramFiles%\Antigravity\Antigravity.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Antigravity\Antigravity.exe"),
        ]
        exe = next((p for p in paths if os.path.exists(p)), None)
        if exe:
            DETACHED_PROCESS = 0x00000008
            CREATE_NEW_PROCESS_GROUP = 0x00000200
            subprocess.Popen([exe], creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)
        else:
            subprocess.run(['powershell', '-NoProfile', '-Command', 'Start-Process Antigravity'], capture_output=True)
    elif sys_name == 'macos':
        subprocess.run(['pkill', '-9', '-f', '/Applications/Antigravity.app'], capture_output=True)
        subprocess.run(['pkill', '-9', '-f', 'language_server'], capture_output=True)
        time.sleep(1.0)
        subprocess.Popen(['open', '/Applications/Antigravity.app'])

def switch_account(account_key, no_restart=False):
    manifest = load_manifest()
    entry = manifest.get(account_key)
    if not entry:
        return {'success': False, 'error': f"Account '{account_key}' not found"}
    
    token_file = entry.get('token_file')
    if not token_file or not os.path.exists(token_file):
        return {'success': False, 'error': "Token file missing"}

    with open(token_file, 'r', encoding='utf-8') as f:
        token = f.read().strip()

    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        import ctypes
        from ctypes import wintypes

        class CREDENTIAL(ctypes.Structure):
            _fields_ = [
                ('Flags', wintypes.DWORD),
                ('Type', wintypes.DWORD),
                ('TargetName', wintypes.LPWSTR),
                ('Comment', wintypes.LPWSTR),
                ('LastWritten', wintypes.FILETIME),
                ('CredentialBlobSize', wintypes.DWORD),
                ('CredentialBlob', ctypes.POINTER(ctypes.c_byte)),
                ('Persist', wintypes.DWORD),
                ('AttributeCount', wintypes.DWORD),
                ('Attributes', ctypes.c_void_p),
                ('TargetAlias', wintypes.LPWSTR),
                ('UserName', wintypes.LPWSTR),
            ]

        PCREDENTIAL = ctypes.POINTER(CREDENTIAL)
        CredWrite = ctypes.windll.advapi32.CredWriteW
        CredWrite.argtypes = [PCREDENTIAL, wintypes.DWORD]
        CredWrite.restype = wintypes.BOOL

        raw_bytes = token.encode('utf-8')
        buf = (ctypes.c_byte * len(raw_bytes))(*raw_bytes)

        for target in ['gemini:antigravity', 'gemini']:
            cred = CREDENTIAL()
            cred.Flags = 0
            cred.Type = 1
            cred.TargetName = target
            cred.UserName = 'antigravity'
            cred.CredentialBlobSize = len(raw_bytes)
            cred.CredentialBlob = ctypes.cast(buf, ctypes.POINTER(ctypes.c_byte))
            cred.Persist = 2
            CredWrite(ctypes.byref(cred), 0)

    elif sys_name == 'macos':
        subprocess.run(['security', 'add-generic-password', '-U', '-s', 'gemini', '-a', 'antigravity', '-w', token])

    email = entry.get('email', account_key)
    clean_name = email.split('@')[0].split('.')[0].capitalize() if ('@' in email) else 'User'
    tier = entry.get('tier', 'Google AI Pro')
    tier_code = entry.get('tier_code', 'pro')
    rem = entry.get('remaining_pct', 100.0)
    quota_data = {
        'email': email,
        'name': clean_name,
        'tier': tier,
        'tier_code': tier_code,
        'session': {
            'name': 'Gemini Models',
            'used_pct': round(100.0 - rem, 1),
            'remaining_pct': round(rem, 1),
            'resets_in': 'Ready'
        },
        'pools': [
            {'name': 'Gemini 3.8 Flash High', 'used_pct': round(100.0 - rem, 1), 'remaining_pct': round(rem, 1), 'resets_in': 'Ready'},
            {'name': 'Gemini 3.1 Pro', 'used_pct': round(100.0 - rem, 1), 'remaining_pct': round(rem, 1), 'resets_in': 'Ready'},
            {'name': 'Claude Sonnet 4.6', 'used_pct': 0.0, 'remaining_pct': 100.0, 'resets_in': 'Ready'},
            {'name': 'GPT-OSS 120B', 'used_pct': 0.0, 'remaining_pct': 100.0, 'resets_in': 'Ready'}
        ]
    }

    global_quota_path = Path.home() / ".gemini" / "antigravity" / "active_quota.json"
    try:
        global_quota_path.parent.mkdir(parents=True, exist_ok=True)
        with open(global_quota_path, 'w', encoding='utf-8') as f:
            json.dump(quota_data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

    def _bg_fetch():
        try:
            fresh = quota_engine.fetch_quota_and_tier(token)
            if fresh:
                with open(global_quota_path, 'w', encoding='utf-8') as f:
                    json.dump(fresh, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
    threading.Thread(target=_bg_fetch, daemon=True).start()

    try:
        if sys_name == 'windows':
            appdata = Path(os.getenv("APPDATA", str(Path.home() / "AppData" / "Roaming")))
            storage_path = appdata / "Antigravity" / "app_storage.json"
        elif sys_name == 'macos':
            storage_path = Path.home() / "Library" / "Application Support" / "Antigravity" / "app_storage.json"
        else:
            storage_path = Path.home() / ".config" / "Antigravity" / "app_storage.json"
        storage_data = {}
        if storage_path.exists():
            with open(storage_path, 'r', encoding='utf-8') as f:
                storage_data = json.load(f)
        storage_data["antigravity:active_quota"] = json.dumps(quota_data)
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        with open(storage_path, 'w', encoding='utf-8') as f:
            json.dump(storage_data, f, indent=2)
    except Exception:
        pass

    if not no_restart:
        restart_antigravity()
    return {'success': True, 'account': account_key, 'quota': quota_data}

def save_current_account():
    token = quota_engine.get_keychain_token()
    if not token:
        return {'success': False, 'error': 'No active account found in credential manager'}

    quota_data = quota_engine.fetch_quota_and_tier(token)
    email = (quota_data.get('email') if quota_data else None) or 'unknown@antigravity.ai'
    tier = (quota_data.get('tier') if quota_data else None) or 'Free'
    tier_code = (quota_data.get('tier_code') if quota_data else None) or 'free'
    rem = (quota_data.get('session', {}).get('remaining_pct') if quota_data else 100.0)

    safe_name = "".join(c if c.isalnum() or c in ('@', '.', '_', '-') else '_' for c in email)
    token_file = os.path.join(ACCOUNTS_DIR, f"{safe_name}.token")
    with open(token_file, 'w', encoding='utf-8') as f:
        f.write(token)

    manifest = load_manifest()
    manifest[email] = {
        'label': email,
        'email': email,
        'tier': tier,
        'tier_code': tier_code,
        'remaining_pct': rem,
        'token_file': token_file,
        'saved_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    save_manifest(manifest)
    return {'success': True, 'email': email, 'tier': tier}

def import_token(token_str):
    if not token_str or not token_str.strip():
        return {'success': False, 'error': 'توکن خالی است'}
    token_str = token_str.strip()
    quota_data = quota_engine.fetch_quota_and_tier(token_str)
    if not quota_data:
        acc_tok, ref_tok = quota_engine.parse_token_payload(token_str)
        if not acc_tok and not ref_tok:
            return {'success': False, 'error': 'فرمت توکن نامعتبر است'}
        email = f'imported_{int(time.time())}@antigravity.ai'
        tier = 'Google AI'
        tier_code = 'pro'
        rem = 100.0
    else:
        email = quota_data.get('email') or f'account_{int(time.time())}@gmail.com'
        tier = quota_data.get('tier') or 'Free'
        tier_code = quota_data.get('tier_code') or 'free'
        rem = (quota_data.get('session', {}).get('remaining_pct') if quota_data else 100.0)

    safe_name = "".join(c if c.isalnum() or c in ('@', '.', '_', '-') else '_' for c in email)
    token_file = os.path.join(ACCOUNTS_DIR, f"{safe_name}.token")
    with open(token_file, 'w', encoding='utf-8') as f:
        f.write(token_str)

    manifest = load_manifest()
    manifest[email] = {
        'label': email,
        'email': email,
        'tier': tier,
        'tier_code': tier_code,
        'remaining_pct': rem,
        'token_file': token_file,
        'saved_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    save_manifest(manifest)
    return {'success': True, 'email': email, 'tier': tier}

def logout_account(no_restart=False):
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        import ctypes
        from ctypes import wintypes
        CredDelete = ctypes.windll.advapi32.CredDeleteW
        CredDelete.argtypes = [wintypes.LPWSTR, wintypes.DWORD, wintypes.DWORD]
        CredDelete.restype = wintypes.BOOL
        CredDelete('gemini:antigravity', 1, 0)
        CredDelete('gemini', 1, 0)
    elif sys_name == 'macos':
        subprocess.run(['security', 'delete-generic-password', '-s', 'gemini', '-a', 'antigravity'])
    if not no_restart:
        restart_antigravity()
    return {'success': True}

def delete_account(account_key):
    m = load_manifest()
    if account_key in m:
        del m[account_key]
        save_manifest(m)
        return {'success': True}
    return {'success': False, 'error': 'Account not found in list'}

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def get_running_browser_profile(process_name="chrome.exe"):
    try:
        cmd = f'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object {{ $_.Name -eq \'{process_name}\' -and $_.CommandLine -notmatch \'--type=\' }} | Select-Object -ExpandProperty CommandLine"'
        out = subprocess.check_output(cmd, shell=True, text=True, timeout=4)
        for line in out.splitlines():
            if '--profile-directory=' in line:
                import re
                m = re.search(r'--profile-directory=["\']?([^"\']+)["\']?', line)
                if m:
                    return m.group(1).strip()
    except Exception:
        pass
    return None

def open_browser_url(url):
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        chrome_candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
        chrome_exe = next((p for p in chrome_candidates if os.path.exists(p)), None)
        active_profile = get_running_browser_profile("chrome.exe")
        
        opened = False
        if chrome_exe:
            try:
                cmd_args = [chrome_exe]
                if active_profile:
                    cmd_args.append(f'--profile-directory={active_profile}')
                cmd_args.append(url)
                subprocess.Popen(cmd_args)
                opened = True
            except Exception:
                pass

        try:
            subprocess.Popen(['rundll32.exe', 'url.dll,FileProtocolHandler', url])
            opened = True
        except Exception:
            pass

        if not opened:
            try:
                subprocess.Popen(['explorer.exe', url])
                opened = True
            except Exception:
                pass
        return opened
    elif sys_name == 'macos':
        try:
            subprocess.Popen(['open', url])
            return True
        except Exception:
            pass
    import webbrowser
    try:
        webbrowser.open(url)
        return True
    except Exception:
        return False

def run_google_oauth_flow(on_url=None, on_complete=None):
    import urllib.parse
    import urllib.request
    import datetime
    from http.server import HTTPServer, BaseHTTPRequestHandler

    save_current_account()

    port = find_free_port()
    redirect_uri = f"http://localhost:{port}/oauth2callback"
    scope = "openid email profile https://www.googleapis.com/auth/cloud-platform"
    params = {
        "client_id": quota_engine.OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "select_account consent"
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    result = {'success': False, 'email': None, 'error': None}

    if on_url:
        try:
            on_url(auth_url)
        except Exception:
            pass

    class OAuthCallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == '/oauth2callback':
                qs = urllib.parse.parse_qs(parsed.query)
                code = qs.get('code', [None])[0]
                error = qs.get('error', [None])[0]
                if error:
                    result['error'] = f"Google OAuth error: {error}"
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(b"<html><body style='background:#111;color:#fff;text-align:center;padding:50px;'><h2>Google Sign-in Canceled</h2></body></html>")
                    return
                if code:
                    try:
                        exchange_params = urllib.parse.urlencode({
                            'client_id': quota_engine.OAUTH_CLIENT_ID,
                            'client_secret': quota_engine.OAUTH_CLIENT_SECRET,
                            'code': code,
                            'grant_type': 'authorization_code',
                            'redirect_uri': redirect_uri
                        }).encode('utf-8')
                        req = urllib.request.Request('https://oauth2.googleapis.com/token', data=exchange_params, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, timeout=10.0) as resp:
                            tok_data = json.loads(resp.read().decode('utf-8'))
                        
                        access_tok = tok_data.get('access_token')
                        refresh_tok = tok_data.get('refresh_token')
                        expires_in = tok_data.get('expires_in', 3600)
                        
                        exp_dt = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expires_in)
                        exp_iso = exp_dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                        
                        token_payload = {
                            "token": {
                                "access_token": access_tok,
                                "token_type": tok_data.get("token_type", "Bearer"),
                                "refresh_token": refresh_tok,
                                "expiry": exp_iso
                            },
                            "auth_method": "consumer",
                            "id_token": tok_data.get("id_token")
                        }
                        token_str = json.dumps(token_payload)
                        
                        quota_data = quota_engine.fetch_quota_and_tier(token_str)
                        email = quota_data.get('email') if quota_data else None
                        if not email:
                            try:
                                req_u = urllib.request.Request('https://www.googleapis.com/oauth2/v3/userinfo', headers={'Authorization': f'Bearer {access_tok}'})
                                with urllib.request.urlopen(req_u, timeout=5.0) as resp_u:
                                    u_info = json.loads(resp_u.read().decode('utf-8'))
                                    email = u_info.get('email')
                            except Exception:
                                pass
                        
                        if not email:
                            email = f"account_{int(time.time())}@gmail.com"
                            
                        tier = quota_data.get('tier') if quota_data else 'Google AI'
                        tier_code = quota_data.get('tier_code') if quota_data else 'pro'
                        rem = quota_data.get('session', {}).get('remaining_pct', 100.0) if quota_data else 100.0
                        
                        safe_name = "".join(c if c.isalnum() or c in ('@', '.', '_', '-') else '_' for c in email)
                        token_file = os.path.join(ACCOUNTS_DIR, f"{safe_name}.token")
                        with open(token_file, 'w', encoding='utf-8') as f:
                            f.write(token_str)
                            
                        manifest = load_manifest()
                        manifest[email] = {
                            'label': email,
                            'email': email,
                            'tier': tier,
                            'tier_code': tier_code,
                            'remaining_pct': rem,
                            'token_file': token_file,
                            'saved_at': time.strftime('%Y-%m-%d %H:%M:%S')
                        }
                        save_manifest(manifest)
                        
                        result['success'] = True
                        result['email'] = email
                        result['tier'] = tier
                        
                        html = f"""<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>ورود موفقیت‌آمیز | Antigravity</title>
<style>
  body {{ background: #07090e; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
  .card {{ background: rgba(18, 24, 38, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 28px; padding: 44px 36px; text-align: center; max-width: 440px; box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6); }}
  .icon {{ width: 68px; height: 68px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; font-size: 34px; color: #10b981; }}
  h2 {{ margin: 0 0 12px; font-size: 21px; font-weight: 700; color: #fff; }}
  p {{ color: #94a3b8; font-size: 13.5px; margin: 0 0 24px; line-height: 1.7; }}
  .badge {{ display: inline-block; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 9999px; padding: 7px 18px; font-size: 13px; font-weight: 600; direction: ltr; font-family: monospace; }}
</style>
</head>
<body>
<div class="card">
  <div class="icon">✓</div>
  <h2>حساب گوگل با موفقیت متصل شد</h2>
  <p>اکانت شما با موفقیت در منوی سوئیچر آنتی‌گرویتی ذخیره شد. اکنون می‌توانید این برگه را ببندید و به محیط کار بازگردید.</p>
  <div class="badge">{email}</div>
</div>
</body>
</html>"""
                        self.send_response(200)
                        self.send_header('Content-Type', 'text/html; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(html.encode('utf-8'))
                    except Exception as e:
                        result['error'] = str(e)
                        self.send_response(500)
                        self.send_header('Content-Type', 'text/html; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(f"<html><body style='background:#111;color:#fff;text-align:center;padding:50px;'><h2>Error</h2><p>{e}</p></body></html>".encode('utf-8'))
        def log_message(self, format, *args):
            pass

    httpd = HTTPServer(('127.0.0.1', port), OAuthCallbackHandler)
    httpd.timeout = 180

    open_browser_url(auth_url)

    httpd.handle_request()
    httpd.server_close()

    if on_complete:
        on_complete(result)

    return result

class SwitcherHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            active = quota_engine.fetch_quota_and_tier()
            saved = load_manifest()
            convs = migration_engine.list_conversations()
            payload = {
                'activeAccount': active,
                'savedAccounts': saved,
                'conversations': convs
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/conversations':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            convs = migration_engine.list_conversations()
            self.wfile.write(json.dumps(convs, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        data = json.loads(body) if body else {}
        resp = {'success': False}

        if self.path == '/api/switch':
            acc_key = data.get('accountKey')
            resp = switch_account(acc_key, no_restart=data.get('noRestart', False))
        elif self.path == '/api/save':
            resp = save_current_account()
        elif self.path == '/api/logout':
            resp = logout_account(no_restart=data.get('noRestart', False))
        elif self.path == '/api/delete':
            acc_key = data.get('accountKey')
            m = load_manifest()
            if acc_key in m:
                tf = m[acc_key].get('token_file')
                if tf and os.path.exists(tf):
                    try: os.remove(tf)
                    except Exception: pass
                del m[acc_key]
                save_manifest(m)
                resp = {'success': True}
        elif self.path == '/api/migrate':
            conv_ids = data.get('conversationIds', [])
            src = data.get('sourceAccount')
            tgt = data.get('targetAccount')
            mode = data.get('mode', 'copy')
            struct = data.get('structure', 'separate')
            dual = data.get('dualSync', False)
            resp = migration_engine.migrate_conversations(conv_ids, src, tgt, mode=mode, structure=struct, dual_sync=dual)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress noisy standard HTTP logs
        return

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_server(port=PORT):
    actual_port = port
    while is_port_in_use(actual_port):
        actual_port += 1

    server = ThreadingHTTPServer(('127.0.0.1', actual_port), SwitcherHTTPHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return actual_port

def launch_gui(port=PORT):
    actual_port = start_server(port)
    url = f"http://127.0.0.1:{actual_port}/index.html"

    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        edge_paths = [
            os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
        ]
        chrome_paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")
        ]
        browser = next((p for p in (edge_paths + chrome_paths) if os.path.exists(p)), None)
        if browser:
            args = f'--app={url} --window-size=620,860 --disable-features=Translate'
            subprocess.Popen([browser, f'--app={url}', '--window-size=620,860', '--disable-features=Translate'])
        else:
            import webbrowser
            webbrowser.open(url)
    elif sys_name == 'macos':
        chrome = "/Applications/Google Chrome.app"
        if os.path.exists(chrome):
            subprocess.Popen(['open', '-na', 'Google Chrome', '--args', f'--app={url}', '--window-size=620,860'])
        else:
            subprocess.Popen(['open', url])

    print(f"🚀 Antigravity Switcher GUI running at {url}")
    # Keep server thread alive while window is open
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--server-only':
        p = start_server()
        print(f"Server started on port {p}")
        try:
            while True: time.sleep(1)
        except KeyboardInterrupt: pass
    else:
        launch_gui()
