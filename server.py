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
                    for k, v in saved.items():
                        if k not in ("instances", "accounts"):
                            base[k] = v
                    if account_email and "accounts" in saved and isinstance(saved["accounts"], dict):
                        acc_settings = saved["accounts"].get(account_email) or saved["accounts"].get(account_email.lower())
                        if isinstance(acc_settings, dict):
                            base.update(acc_settings)
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

        if isinstance(patch, dict):
            if not instance_id and patch.get("instance_id"):
                instance_id = patch.get("instance_id")
            if not account_email and patch.get("account"):
                account_email = patch.get("account")

        clean_patch = {k: v for k, v in patch.items() if k not in ("instance_id", "account")} if isinstance(patch, dict) else {}

        if instance_id:
            inst_cur = raw["instances"].get(instance_id, {})
            if not isinstance(inst_cur, dict):
                inst_cur = {}
            inst_cur.update(clean_patch)
            raw["instances"][instance_id] = inst_cur

        if account_email:
            acc_cur = raw["accounts"].get(account_email, {})
            if not isinstance(acc_cur, dict):
                acc_cur = {}
            acc_cur.update(clean_patch)
            raw["accounts"][account_email] = acc_cur

        for k, v in clean_patch.items():
            raw[k] = v

        USER_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(USER_SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2, ensure_ascii=False)
            
        resolved = load_user_settings(instance_id=instance_id, account_email=account_email)
        return True, resolved
    except Exception as e:
        return False, str(e)

def restart_language_server():
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name language_server -ErrorAction SilentlyContinue | Stop-Process -Force'], capture_output=True, creationflags=0x08000000)
    elif sys_name == 'macos':
        subprocess.run(['pkill', '-9', '-f', 'language_server'], capture_output=True)

def restart_antigravity():
    sys_name = quota_engine.get_current_system()
    if sys_name == 'windows':
        subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name Antigravity, language_server -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue'], capture_output=True, creationflags=0x08000000)
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
            subprocess.run(['powershell', '-NoProfile', '-Command', 'Start-Process Antigravity'], capture_output=True, creationflags=0x08000000)
    elif sys_name == 'macos':
        subprocess.run(['pkill', '-9', '-f', '/Applications/Antigravity.app'], capture_output=True)
        subprocess.run(['pkill', '-9', '-f', 'language_server'], capture_output=True)
        time.sleep(1.0)
        subprocess.Popen(['open', '/Applications/Antigravity.app'])

def write_token_to_credential_manager(token):
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

_launch_dual_lock = threading.Lock()
_last_dual_launch_time = 0
_dual_launch_in_progress = False

def is_dual_launching():
    """Returns True if a dual instance launch is currently swapping credentials temporarily."""
    return _dual_launch_in_progress

def is_instance_running(inst_dir_or_name):
    """Check if an Antigravity instance with a given user-data-dir is currently running."""
    if not inst_dir_or_name:
        return False
    needle = inst_dir_or_name.name.lower() if hasattr(inst_dir_or_name, "name") else str(inst_dir_or_name).lower()
    try:
        import psutil
        for p in psutil.process_iter(['pid', 'name', 'cmdline']):
            name = (p.info.get('name') or '').lower()
            if 'antigravity' in name:
                cmd = p.info.get('cmdline') or []
                if any(needle in arg.lower() for arg in cmd):
                    return True
    except Exception:
        pass
    return False

def is_instance2_running():
    """Backward compatibility alias for Instance 2."""
    return is_instance_running("Antigravity-Instance2")

def focus_instance(inst_dir):
    """
    Brings an Antigravity instance window to the foreground and un-minimizes it.
    Uses CDP Page.bringToFront combined with native Win32 window restoration.
    """
    focused = False
    sys_name = quota_engine.get_current_system()
    inst_dir = Path(inst_dir)
    dir_name = inst_dir.name
    if sys_name == 'windows':
        port_file = inst_dir / "DevToolsActivePort"
        
        # 1. CDP Page.bringToFront via active DevTools port
        if port_file.exists():
            try:
                with open(port_file, 'r', encoding='utf-8') as f:
                    lines = f.read().strip().split('\n')
                    port = int(lines[0]) if lines else 0
                if port > 0:
                    req = urllib.request.Request(f"http://127.0.0.1:{port}/json/list")
                    with urllib.request.urlopen(req, timeout=1.0) as resp:
                        targets = json.loads(resp.read().decode('utf-8'))
                    page = next((t for t in targets if t.get("type") == "page" and "about:blank" not in t.get("url", "")), None)
                    if not page:
                        page = next((t for t in targets if t.get("type") == "page"), None)
                    if page and page.get("webSocketDebuggerUrl"):
                        import websockets
                        import asyncio
                        async def _cdp_bring_front():
                            async with websockets.connect(page["webSocketDebuggerUrl"], ping_timeout=1.5) as ws:
                                await ws.send(json.dumps({"id": 1, "method": "Page.bringToFront"}))
                                await ws.recv()
                        asyncio.run(_cdp_bring_front())
                        focused = True
            except Exception:
                pass

        # 2. Native Win32 window restoration and foreground activation
        try:
            import ctypes
            from ctypes import wintypes
            import psutil

            inst_pids = set()
            for p in psutil.process_iter(['pid', 'name', 'cmdline']):
                name = (p.info.get('name') or '').lower()
                if 'antigravity' in name:
                    cmd = p.info.get('cmdline') or []
                    if any(dir_name.lower() in arg.lower() for arg in cmd):
                        inst_pids.add(p.info['pid'])

            if inst_pids:
                user32 = ctypes.windll.user32
                h_desk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
                if h_desk:
                    user32.SetThreadDesktop(h_desk)

                WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
                def enum_cb(hwnd, lparam):
                    pid = wintypes.DWORD()
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                    if pid.value in inst_pids:
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            SW_RESTORE = 9
                            user32.ShowWindow(hwnd, SW_RESTORE)
                            user32.BringWindowToTop(hwnd)
                            user32.keybd_event(0x12, 0, 0, 0)
                            user32.SetForegroundWindow(hwnd)
                            user32.keybd_event(0x12, 0, 2, 0)
                    return True

                user32.EnumDesktopWindows(h_desk, WNDENUMPROC(enum_cb), 0)
                focused = True
        except Exception:
            pass
    elif sys_name == 'macos':
        try:
            subprocess.run(['osascript', '-e', 'tell application "Antigravity" to activate'], capture_output=True)
            focused = True
        except Exception:
            pass
    return focused

def focus_instance2():
    """Backward compatibility alias for Instance 2."""
    appdata = Path(os.getenv("APPDATA", str(Path.home() / "AppData" / "Roaming")))
    return focus_instance(appdata / "Antigravity-Instance2")

def get_instance_dir_for_account(account_key):
    """
    Resolves or assigns an isolated user-data-dir for an account.
    Returns (instance_id, Path(instance_dir)).
    Supports arbitrary numbers of instances (Instance2, Instance3, Instance4, etc.).
    """
    sys_name = quota_engine.get_current_system()
    home = Path.home()
    if sys_name == 'windows':
        appdata = Path(os.getenv("APPDATA", str(home / "AppData" / "Roaming")))
    else:
        appdata = home / "Library" / "Application Support"

    manifest = load_manifest()
    entry = manifest.setdefault(account_key, {})
    target_email = account_key.lower().strip()

    # 1. If manifest already has an explicit instance_id for THIS account
    assigned_inst = entry.get("instance_id")
    if assigned_inst and assigned_inst != "instance_1":
        num = "".join(filter(str.isdigit, assigned_inst))
        if num:
            inst_dir = appdata / f"Antigravity-Instance{num}"
            storage_p = inst_dir / "app_storage.json"
            if storage_p.exists():
                try:
                    with open(storage_p, "r", encoding="utf-8") as f:
                        acc = json.load(f).get("antigravity:account_email")
                        if not acc or acc.lower().strip() == target_email:
                            return assigned_inst, inst_dir
                except Exception:
                    return assigned_inst, inst_dir
            else:
                return assigned_inst, inst_dir

    # 2. Check existing Antigravity-Instance* directories on disk for THIS account
    used_slots = set()
    try:
        for inst_dir in sorted(appdata.glob("Antigravity-Instance*")):
            if not inst_dir.is_dir():
                continue
            dir_name = inst_dir.name
            num_str = "".join(filter(str.isdigit, dir_name))
            if num_str and num_str.isdigit():
                used_slots.add(int(num_str))

            storage_p = inst_dir / "app_storage.json"
            if storage_p.exists():
                try:
                    with open(storage_p, "r", encoding="utf-8") as f:
                        acc = json.load(f).get("antigravity:account_email")
                        if acc and acc.lower().strip() == target_email:
                            inst_id = f"instance_{num_str}" if num_str else dir_name.lower().replace("-", "_")
                            entry["instance_id"] = inst_id
                            manifest[account_key] = entry
                            save_manifest(manifest)
                            return inst_id, inst_dir
                except Exception:
                    pass
    except Exception:
        pass

    # Also check manifest entries for other accounts
    for acc, data in manifest.items():
        if acc.lower().strip() == target_email:
            continue
        i_id = data.get("instance_id", "")
        num = "".join(filter(str.isdigit, i_id))
        if num and num.isdigit():
            used_slots.add(int(num))

    # 3. Find first completely unassigned slot >= 2
    slot = 2
    while slot in used_slots:
        slot += 1

    # Double check directory doesn't already belong to another account
    while (appdata / f"Antigravity-Instance{slot}").exists():
        cand_storage = (appdata / f"Antigravity-Instance{slot}") / "app_storage.json"
        if cand_storage.exists():
            try:
                with open(cand_storage, "r", encoding="utf-8") as f:
                    c_acc = json.load(f).get("antigravity:account_email")
                    if c_acc and c_acc.lower().strip() == target_email:
                        break
            except Exception:
                pass
        slot += 1

    inst_id = f"instance_{slot}"
    target_dir = appdata / f"Antigravity-Instance{slot}"
    target_dir.mkdir(parents=True, exist_ok=True)
    entry["instance_id"] = inst_id
    manifest[account_key] = entry
    save_manifest(manifest)
    return inst_id, target_dir

def launch_dual_instance(account_key, project_path=None):
    """
    Safely launches or focuses a concurrent Antigravity instance for any account
    with an isolated profile (--user-data-dir) and target account credentials.
    Supports unlimited concurrent accounts (Instance2, Instance3, Instance4, etc.).
    Zero interference with primary active session.
    """
    global _last_dual_launch_time, _dual_launch_in_progress
    with _launch_dual_lock:
        now = time.time()
        # Debounce rapid clicks within 2.0s
        if now - _last_dual_launch_time < 2.0:
            return {'success': True, 'msg': 'در حال آماده‌سازی پنجره...'}
        _last_dual_launch_time = now

        manifest = load_manifest()
        entry = manifest.get(account_key)
        if not entry and account_key:
            entry = next((v for k, v in manifest.items() if k.lower() == account_key.lower() or v.get('email', '').lower() == account_key.lower()), None)
        if not entry and not account_key:
            # Auto-detect secondary account from manifest
            active_email = ""
            try:
                active_q = quota_engine.fetch_quota_and_tier()
                if active_q and active_q.get('email'):
                    active_email = active_q['email']
            except Exception:
                pass
            if not active_email and manifest:
                active_email = list(manifest.keys())[0]
            for k, v in manifest.items():
                if k.lower() != active_email.lower() and v.get('email', '').lower() != active_email.lower():
                    entry = v
                    account_key = k
                    break
        if not entry:
            return {'success': False, 'error': f"حساب '{account_key}' در لیست حساب‌ها یافت نشد"}
        
        token_file = entry.get('token_file')
        if token_file:
            token_file = os.path.normpath(token_file)
        if not token_file or not os.path.exists(token_file):
            if entry.get('needs_reauth') or not token_file:
                return {'success': False, 'needs_reauth': True, 'account': account_key, 'error': f"حساب '{account_key}' نیاز به ورود مجدد دارد. لطفاً روی دکمه ورود با گوگل کلیک کنید."}
            return {'success': False, 'error': f"فایل توکن حساب '{account_key}' موجود نیست"}
            
        with open(token_file, 'r', encoding='utf-8') as f:
            target_token = f.read().strip()
        
        # Verify token actually belongs to account_key!
        token_email = quota_engine.extract_token_email(target_token)
        if token_email and token_email.lower().strip() != account_key.lower().strip():
            print(f"[DUAL REJECTED] Token email '{token_email}' does not match target account '{account_key}'!", flush=True)
            entry['needs_reauth'] = True
            entry['token_file'] = ''
            manifest[account_key] = entry
            save_manifest(manifest)
            return {
                'success': False,
                'needs_reauth': True,
                'account': account_key,
                'error': f"توکن ذخیره شده متعلق به '{token_email}' است و با حساب '{account_key}' تطابق ندارد. لطفاً روی دکمه ورود با گوگل کلیک کنید."
            }

        # Ensure target token is 100% fresh and has valid access_token
        target_token = quota_engine.ensure_fresh_token(target_token, account_email=account_key)
            
        sys_name = quota_engine.get_current_system()
        inst_id, target_inst_dir = get_instance_dir_for_account(account_key)

        # Resolve designated project path for this instance if not passed explicitly
        if not project_path:
            try:
                prof_man = migration_engine.load_profile_sync_manifest()
                for pid, pdata in prof_man.get("project_profiles", {}).items():
                    assigned = pdata.get("assigned_accounts", [])
                    if any(account_key.lower() in a.lower() for a in assigned):
                        cand_path = pdata.get("path")
                        if cand_path and os.path.exists(cand_path):
                            project_path = cand_path
                            break
            except Exception:
                pass

        # If this instance is already running, focus and bring to front directly!
        if is_instance_running(target_inst_dir):
            focus_instance(target_inst_dir)
            return {
                'success': True,
                'account': account_key,
                'instance_id': inst_id,
                'user_data_dir': str(target_inst_dir),
                'project_path': project_path or '',
                'msg': f'پنجره حساب {account_key} فعال شد'
            }

        # Deterministic primary token resolution: Prioritize live keychain token
        primary_token = quota_engine.get_keychain_token()
        active_email = quota_engine.extract_token_email(primary_token) if primary_token else ""
        if not active_email:
            try:
                import sync_daemon
                active_email = sync_daemon.get_instance_active_account("instance_1")
            except Exception:
                pass

        if not primary_token and active_email and active_email in manifest and os.path.exists(manifest[active_email].get('token_file', '')):
            try:
                with open(manifest[active_email]['token_file'], 'r', encoding='utf-8') as pf:
                    primary_token = pf.read().strip()
            except Exception:
                pass

        if sys_name == 'windows':
            target_inst_dir.mkdir(parents=True, exist_ok=True)
            
            # Clean stale locks and ports
            for f_name in ["DevToolsActivePort", "lockfile"]:
                f_p = target_inst_dir / f_name
                if f_p.exists():
                    try:
                        f_p.unlink()
                    except Exception:
                        pass

            # Pre-configure instance project in app_storage.json if designated
            designated_pid = ""
            try:
                prof_man = migration_engine.load_profile_sync_manifest()
                for pid, pdata in prof_man.get("project_profiles", {}).items():
                    if project_path and (pdata.get("path", "").lower() == str(project_path).lower() or pid == project_path):
                        designated_pid = pid
                        break
                    elif not designated_pid and any(account_key.lower() in a.lower() for a in pdata.get("assigned_accounts", [])):
                        designated_pid = pid
            except Exception:
                pass

            try:
                storage_p = target_inst_dir / "app_storage.json"
                s_data = {}
                if storage_p.exists():
                    with open(storage_p, 'r', encoding='utf-8') as sf:
                        s_data = json.load(sf)
                if designated_pid:
                    s_data["new-convo-last-selected-project"] = designated_pid
                s_data["antigravity:instance_id"] = inst_id
                s_data["antigravity:account_email"] = account_key
                if project_path:
                    s_data["antigravity:designated_project"] = project_path
                # Prime quota in app_storage so the new instance immediately displays secondary account info
                sec_quota = quota_engine.fetch_quota_and_tier(target_token)
                if sec_quota:
                    s_data["antigravity:active_quota"] = json.dumps(sec_quota)
                with open(storage_p, 'w', encoding='utf-8') as sf:
                    json.dump(s_data, sf, indent=2)
            except Exception:
                pass

            paths = [
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"),
                os.path.expandvars(r"%ProgramFiles%\Antigravity\Antigravity.exe"),
                os.path.expandvars(r"%ProgramFiles(x86)%\Antigravity\Antigravity.exe"),
            ]
            exe = next((p for p in paths if os.path.exists(p)), None)
            if not exe:
                try:
                    import psutil
                    for p in psutil.process_iter(['name', 'exe']):
                        if 'antigravity' in (p.info.get('name') or '').lower() and p.info.get('exe'):
                            if os.path.exists(p.info['exe']):
                                exe = p.info['exe']
                                break
                except Exception:
                    pass
            if not exe:
                return {'success': False, 'error': 'فایل اجرایی Antigravity.exe یافت نشد'}

            _dual_launch_in_progress = True
            # Prime target token in credential manager for instance startup
            write_token_to_credential_manager(target_token)
            
            # Launch secondary instance with isolated user-data-dir and designated project
            DETACHED_PROCESS = 0x00000008
            CREATE_NEW_PROCESS_GROUP = 0x00000200
            CREATE_BREAKAWAY_FROM_JOB = 0x01000000
            cmd = [exe, f'--user-data-dir={str(target_inst_dir)}']
            if project_path and os.path.exists(project_path):
                cmd.append(project_path)
            flags = DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
            existing_ls_pids = set()
            try:
                import psutil
                for p in psutil.process_iter(['pid', 'name']):
                    if 'language_server' in (p.info.get('name') or '').lower():
                        existing_ls_pids.add(p.info['pid'])
            except Exception:
                pass

            try:
                proc = subprocess.Popen(cmd, creationflags=flags | CREATE_BREAKAWAY_FROM_JOB)
            except Exception:
                proc = subprocess.Popen(cmd, creationflags=flags)
            
            # Restore primary token and bring window to front
            def _post_launch_worker(launch_pid, target_acc, orig_pids, target_dir_path):
                global _dual_launch_in_progress
                start_t = time.time()
                found_ls = False
                try:
                    import psutil
                    # Wait up to 30s for the newly spawned language_server.exe to boot
                    for _ in range(60):
                        time.sleep(0.5)
                        for p in psutil.process_iter(['pid', 'name', 'create_time']):
                            p_name = (p.info.get('name') or '').lower()
                            if 'language_server' in p_name:
                                if (p.info['pid'] not in orig_pids) or (p.info.get('create_time', 0) >= (start_t - 2.0)):
                                    found_ls = True
                                    break
                        if found_ls:
                            # Language server process is alive! Give it 5.0 seconds to read and cache credentials
                            time.sleep(5.0)
                            break
                except Exception as e:
                    print(f"[MULTI-INSTANCE] Error detecting language_server: {e}", flush=True)

                if not found_ls:
                    time.sleep(10.0)

                # Now restore primary token back for Instance 1
                if primary_token:
                    fresh_primary = quota_engine.ensure_fresh_token(primary_token, account_email=active_email)
                    write_token_to_credential_manager(fresh_primary)
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [MULTI-INSTANCE] Restored primary token for active session ({inst_id} target {target_acc} safely initialized).", flush=True)
                _dual_launch_in_progress = False

                # Bring window to front once rendered
                for _ in range(15):
                    time.sleep(0.5)
                    if focus_instance(target_dir_path):
                        break

            threading.Thread(target=_post_launch_worker, args=(proc.pid, account_key, existing_ls_pids, target_inst_dir), daemon=True).start()
            
            clean_name = entry.get('name') or account_key.split('@')[0]
            return {
                'success': True,
                'pid': proc.pid,
                'account': account_key,
                'instance_id': inst_id,
                'user_data_dir': str(target_inst_dir),
                'msg': f'پنجره جدید ({clean_name}) با موفقیت اجرا شد'
            }
        elif sys_name == 'macos':
            app_path = '/Applications/Antigravity.app'
            if not os.path.exists(app_path):
                return {'success': False, 'error': 'Antigravity.app not found on macOS'}
            target_inst_dir.mkdir(parents=True, exist_ok=True)
            write_token_to_credential_manager(target_token)
            cmd = ['open', '-n', '-a', app_path, '--args', f'--user-data-dir={str(target_inst_dir)}']
            proc = subprocess.Popen(cmd)
            def _restore_primary_mac():
                time.sleep(5.0)
                if primary_token:
                    write_token_to_credential_manager(primary_token)
            threading.Thread(target=_restore_primary_mac, daemon=True).start()
            return {'success': True, 'pid': proc.pid, 'account': account_key, 'instance_id': inst_id, 'user_data_dir': str(target_inst_dir)}
        else:
            return {'success': False, 'error': 'Multi-instance launch is optimized for Windows/macOS'}

def switch_account(account_key, no_restart=False):
    manifest = load_manifest()
    entry = manifest.get(account_key)
    if not entry:
        return {'success': False, 'error': f"Account '{account_key}' not found"}
    
    token_file = entry.get('token_file')
    if not token_file or not os.path.exists(token_file):
        if entry.get('needs_reauth') or not token_file:
            return {'success': False, 'needs_reauth': True, 'account': account_key, 'error': f"حساب '{account_key}' نیاز به ورود مجدد دارد. لطفاً روی دکمه ورود با گوگل کلیک کنید."}
        return {'success': False, 'error': "Token file missing"}

    with open(token_file, 'r', encoding='utf-8') as f:
        token = f.read().strip()

    token_email = quota_engine.extract_token_email(token)
    if token_email and token_email.lower().strip() != account_key.lower().strip():
        entry['needs_reauth'] = True
        entry['token_file'] = ''
        manifest[account_key] = entry
        save_manifest(manifest)
        return {
            'success': False,
            'needs_reauth': True,
            'account': account_key,
            'error': f"توکن ذخیره شده متعلق به '{token_email}' است و با حساب '{account_key}' تطابق ندارد. لطفاً روی دکمه ورود با گوگل کلیک کنید."
        }

    token = quota_engine.ensure_fresh_token(token, account_email=account_key)
    write_token_to_credential_manager(token)

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
        active_inst1_file = Path.home() / ".gemini" / "accounts" / "active_instance_1.txt"
        active_inst1_file.parent.mkdir(parents=True, exist_ok=True)
        active_inst1_file.write_text(email, encoding="utf-8")
    except Exception:
        pass

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
        storage_data["antigravity:account_email"] = email
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

    clean_name = (quota_data.get('name') if quota_data else '') or (email.split('@')[0].split('.')[0].capitalize() if '@' in email else email)
    avatar = (quota_data.get('avatar') if quota_data else '') or ''
    manifest = load_manifest()
    manifest[email] = {
        'label': email,
        'name': clean_name,
        'avatar': avatar,
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

    clean_name = (quota_data.get('name') if quota_data else '') or (email.split('@')[0].split('.')[0].capitalize() if '@' in email else email)
    avatar = (quota_data.get('avatar') if quota_data else '') or ''
    manifest = load_manifest()
    manifest[email] = {
        'label': email,
        'name': clean_name,
        'avatar': avatar,
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

def run_google_oauth_flow(target_account=None, on_url=None, on_complete=None):
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
    if target_account:
        params["login_hint"] = target_account.strip()

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
                            email = quota_engine.extract_token_email(token_str)

                        if not email:
                            email = target_account or f"account_{int(time.time())}@gmail.com"

                        # Security check: If target account was specified, prevent mismatched accounts!
                        if target_account and email and email.lower().strip() != target_account.lower().strip():
                            err_msg = f"شما با حساب ({email}) وارد شدید، اما حساب مورد نظر ({target_account}) است."
                            result['error'] = err_msg
                            result['success'] = False
                            err_html = f"""<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>خطا در تطابق حساب | Antigravity</title>
<style>
  body {{ background: #07090e; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
  .card {{ background: rgba(30, 18, 18, 0.9); backdrop-filter: blur(24px); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 28px; padding: 44px 36px; text-align: center; max-width: 480px; box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6); }}
  .icon {{ width: 68px; height: 68px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; font-size: 34px; color: #ef4444; }}
  h2 {{ margin: 0 0 12px; font-size: 21px; font-weight: 700; color: #fca5a5; }}
  p {{ color: #cbd5e1; font-size: 13.5px; margin: 0 0 16px; line-height: 1.7; }}
  .badge {{ display: inline-block; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 9999px; padding: 7px 18px; font-size: 13px; font-weight: 600; direction: ltr; font-family: monospace; margin: 4px; }}
</style>
</head>
<body>
<div class="card">
  <div class="icon">✕</div>
  <h2>عدم تطابق حساب کاربری گوگل</h2>
  <p>شما در مرورگر با حساب زیر وارد شدید:</p>
  <div class="badge">{email}</div>
  <p style="margin-top:16px;">اما در آنتی‌گرویتی قصد اتصال به حساب زیر را داشتید:</p>
  <div class="badge" style="background:rgba(59,130,246,0.2);color:#93c5fd;border-color:rgba(59,130,246,0.4);">{target_account}</div>
  <div style="margin-top:18px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:14px;padding:14px;font-size:12.5px;color:#93c5fd;line-height:1.7;text-align:right;">
    💡 <b>راهنمای حل:</b> در صفحه ورود گوگل، مرورگر حساب پیش‌فرض شما ({email}) را انتخاب کرده است. برای اتصال به {target_account}، در صفحه ورود گوگل روی گزینه <b>«استفاده از حساب دیگر» (Use another account)</b> کلیک کرده و ایمیل <b>{target_account}</b> را وارد کنید.
  </div>
  <p style="margin-top:16px;font-size:12px;color:#94a3b8;">برای جلوگیری از تداخل سهمیه و نشست‌ها، توکن مغایر ذخیره نشد. می‌توانید این برگه را ببندید.</p>
</div>
</body>
</html>"""
                            self.send_response(200)
                            self.send_header('Content-Type', 'text/html; charset=utf-8')
                            self.end_headers()
                            self.wfile.write(err_html.encode('utf-8'))
                            return
                            
                        tier = quota_data.get('tier') if quota_data else 'Google AI'
                        tier_code = quota_data.get('tier_code') if quota_data else 'pro'
                        rem = quota_data.get('session', {}).get('remaining_pct', 100.0) if quota_data else 100.0
                        
                        safe_name = "".join(c if c.isalnum() or c in ('@', '.', '_', '-') else '_' for c in email)
                        token_file = os.path.join(ACCOUNTS_DIR, f"{safe_name}.token")
                        with open(token_file, 'w', encoding='utf-8') as f:
                            f.write(token_str)
                            
                        clean_name = (quota_data.get('name') if quota_data else '') or (email.split('@')[0].split('.')[0].capitalize() if '@' in email else email)
                        avatar = (quota_data.get('avatar') if quota_data else '') or ''
                        manifest = load_manifest()
                        manifest[email] = {
                            'label': email,
                            'name': clean_name,
                            'avatar': avatar,
                            'email': email,
                            'tier': tier,
                            'tier_code': tier_code,
                            'remaining_pct': rem,
                            'token_file': token_file,
                            'needs_reauth': False,
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
        import urllib.parse
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            qs = urllib.parse.parse_qs(parsed.query)
            req_inst = qs.get('instance', [None])[0]
            saved = load_manifest()

            # Dynamic active account resolution per instance
            if req_inst == 'instance_2':
                # Try reading assigned email from Antigravity-Instance2/app_storage.json
                inst2_acc = None
                appdata = Path(os.getenv("APPDATA", str(Path.home() / "AppData" / "Roaming")))
                inst2_storage = appdata / "Antigravity-Instance2" / "app_storage.json"
                if inst2_storage.exists():
                    try:
                        with open(inst2_storage, 'r', encoding='utf-8') as f:
                            s_data = json.load(f)
                            inst2_acc = s_data.get('antigravity:account_email')
                    except Exception:
                        pass
                if not inst2_acc or inst2_acc not in saved:
                    # fallback to any non-madgod account
                    inst2_acc = next((k for k in saved.keys() if k != 'madgod.cum@gmail.com'), 'bombhub.apk@gmail.com')
                
                entry = saved.get(inst2_acc, {})
                tok_file = entry.get('token_file', '')
                if tok_file and os.path.exists(tok_file):
                    with open(tok_file, 'r', encoding='utf-8') as tf:
                        tok_str = tf.read().strip()
                    active = quota_engine.fetch_quota_and_tier(tok_str) or entry
                else:
                    active = entry
            else:
                active = quota_engine.fetch_quota_and_tier()

            convs = migration_engine.list_conversations()
            projects = migration_engine.list_projects()
            tasks = migration_engine.list_scheduled_tasks()
            payload = {
                'activeAccount': active,
                'savedAccounts': saved,
                'conversations': convs,
                'projects': projects,
                'tasks': tasks,
                'allowedConversations': {
                    'instance_1': migration_engine.get_allowed_conversations('instance_1'),
                    'instance_2': migration_engine.get_allowed_conversations('instance_2')
                }
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/conversations':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            convs = migration_engine.list_conversations()
            self.wfile.write(json.dumps(convs, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/projects':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            projects = migration_engine.list_projects()
            self.wfile.write(json.dumps(projects, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/tasks':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            tasks = migration_engine.list_scheduled_tasks()
            self.wfile.write(json.dumps(tasks, ensure_ascii=False).encode('utf-8'))
        elif self.path.startswith('/api/settings'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(load_user_settings(), ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/dual_status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            payload = {'instance2_running': is_instance2_running()}
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        data = json.loads(body) if body else {}
        resp = {'success': False}

        if self.path.startswith('/api/settings'):
            ok, res = save_user_settings(data)
            resp = {'success': ok, 'settings': res}
        elif self.path == '/api/switch':
            acc_key = data.get('accountKey')
            resp = switch_account(acc_key, no_restart=data.get('noRestart', False))
        elif self.path == '/api/launch_dual':
            acc_key = data.get('accountKey')
            project_path = data.get('projectPath')
            resp = launch_dual_instance(acc_key, project_path=project_path)
        elif self.path == '/api/oauth_signin':
            target_acc = data.get('accountKey') or data.get('email')
            def _bg_oauth():
                run_google_oauth_flow(target_account=target_acc)
            threading.Thread(target=_bg_oauth, daemon=True).start()
            resp = {'success': True, 'msg': 'در حال باز کردن مرورگر برای ورود...'}
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
            p_id = data.get('projectId')
            resp = migration_engine.migrate_conversations(conv_ids, src, tgt, mode=mode, structure=struct, dual_sync=dual, project_id=p_id)
        elif self.path == '/api/project_assign':
            p_id = data.get('projectId')
            accs = data.get('accounts') or data.get('account', [])
            enb = data.get('enabled')
            sm = data.get('syncMode', 'shared')
            resp = migration_engine.set_project_assignment(p_id, accs, sync_mode=sm, enabled=enb)
        elif self.path == '/api/project_sync':
            p_id = data.get('projectId')
            t_acc = data.get('targetAccount')
            inc_c = data.get('includeConversations', False)
            resp = migration_engine.sync_project_to_account(p_id, t_acc, include_conversations=inc_c)
        elif self.path == '/api/project_unlink':
            p_id = data.get('projectId')
            acc = data.get('account')
            resp = migration_engine.unlink_project_from_account(p_id, acc)
        elif self.path == '/api/task_isolate':
            t_name = data.get('taskName') or data.get('name')
            owner = data.get('ownerAccount') or (list(load_manifest().keys())[0] if load_manifest() else 'primary_account')
            iso = data.get('isolateFromAccount2', data.get('isolate', True))
            insts = data.get('allowedInstances')
            req_acc = data.get('account') or data.get('callerAccount')
            resp = migration_engine.set_task_isolation(t_name, owner, isolate_from_account2=iso, allowed_instances=insts, requesting_account=req_acc)
        elif self.path == '/api/task_toggle':
            t_name = data.get('taskName') or data.get('name')
            enb = data.get('enable', data.get('enabled', True))
            req_acc = data.get('account') or data.get('callerAccount')
            resp = migration_engine.toggle_task_state(t_name, enable=enb, requesting_account=req_acc)
        elif self.path == '/api/conversation_assign':
            c_id = data.get('conversationId')
            acc = data.get('account')
            act = data.get('action', 'add')
            resp = migration_engine.assign_conversation_account(c_id, acc, action=act)

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
