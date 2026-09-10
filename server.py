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

def restart_antigravity():
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        subprocess.run(['powershell', '-Command', 'Get-Process -Name Antigravity -ErrorAction SilentlyContinue | Stop-Process -Force'], capture_output=True)
        time.sleep(1)
        # Find exe
        paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe"),
            os.path.expandvars(r"%ProgramFiles%\Antigravity\Antigravity.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Antigravity\Antigravity.exe"),
        ]
        exe = next((p for p in paths if os.path.exists(p)), None)
        if exe:
            subprocess.Popen([exe], creationflags=subprocess.DETACHED_PROCESS if sys_name == 'windows' else 0)
        else:
            subprocess.Popen(['start', 'Antigravity'], shell=True)
    elif sys_name == 'macos':
        subprocess.run(['pkill', '-9', '-f', '/Applications/Antigravity.app'], capture_output=True)
        time.sleep(1)
        subprocess.Popen(['open', '/Applications/Antigravity.app'])

def switch_account(account_key):
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

    restart_antigravity()
    return {'success': True, 'account': account_key}

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

def logout_account():
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
    restart_antigravity()
    return {'success': True}

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
            resp = switch_account(acc_key)
        elif self.path == '/api/save':
            resp = save_current_account()
        elif self.path == '/api/logout':
            resp = logout_account()
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
