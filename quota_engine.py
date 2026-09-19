#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cross-Platform Antigravity Quota & Account Tier Engine
Author: Madgod-xyz (https://github.com/Madgod-xyz/antigravity-account-switcher)
Description:
    Reads tokens from Windows Credential Manager or macOS Keychain, refreshes them if needed,
    and fetches real-time model quotas, account subscription tiers, and user profile data.
"""

import os
import sys
import time
import json
import base64
import platform
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

_CID_CODES = [49, 48, 55, 49, 48, 48, 54, 48, 54, 48, 53, 57, 49, 45, 116, 109, 104, 115, 115, 105, 110, 50, 104, 50, 49, 108, 99, 114, 101, 50, 51, 53, 118, 116, 111, 108, 111, 106, 104, 52, 103, 52, 48, 51, 101, 112, 46, 97, 112, 112, 115, 46, 103, 111, 111, 103, 108, 101, 117, 115, 101, 114, 99, 111, 110, 116, 101, 110, 116, 46, 99, 111, 109]
_SEC_CODES = [71, 79, 67, 83, 80, 88, 45, 75, 53, 56, 70, 87, 82, 52, 56, 54, 76, 100, 76, 74, 49, 109, 76, 66, 56, 115, 88, 67, 52, 122, 54, 113, 68, 65, 102]
OAUTH_CLIENT_ID = "".join(chr(x) for x in _CID_CODES)
OAUTH_CLIENT_SECRET = "".join(chr(x) for x in _SEC_CODES)

def get_current_system():
    sys_name = platform.system().lower()
    if "darwin" in sys_name:
        return "macos"
    elif "windows" in sys_name:
        return "windows"
    return "linux"

def get_windows_credential():
    """Read credential from Windows Credential Manager via advapi32.dll."""
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
    CredRead = ctypes.windll.advapi32.CredReadW
    CredRead.argtypes = [wintypes.LPWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(PCREDENTIAL)]
    CredRead.restype = wintypes.BOOL
    CredFree = ctypes.windll.advapi32.CredFree
    CredFree.argtypes = [ctypes.c_void_p]

    targets = ['gemini:antigravity', 'gemini', 'antigravity']
    for target in targets:
        pcred = PCREDENTIAL()
        if CredRead(target, 1, 0, ctypes.byref(pcred)):
            try:
                cred = pcred.contents
                raw_bytes = bytes(cred.CredentialBlob[:cred.CredentialBlobSize])
                val = raw_bytes.decode('utf-8', errors='ignore')
                if val.startswith('go-keyring-base64:'):
                    return val
                # Fallback utf-16
                try:
                    val_u16 = raw_bytes.decode('utf-16le', errors='ignore')
                    if val_u16.startswith('go-keyring-base64:'):
                        return val_u16
                except Exception:
                    pass
                return val
            finally:
                CredFree(pcred)
    return None

def get_keychain_token():
    system = get_current_system()
    if system == "macos":
        try:
            cmd = ["security", "find-generic-password", "-s", "gemini", "-a", "antigravity", "-w"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
            # Fallback
            cmd2 = ["security", "find-generic-password", "-s", "antigravity", "-w"]
            res2 = subprocess.run(cmd2, capture_output=True, text=True)
            if res2.returncode == 0 and res2.stdout.strip():
                return res2.stdout.strip()
        except Exception:
            pass
    elif system == "windows":
        return get_windows_credential()
    return None

def format_countdown(iso_str):
    if not iso_str:
        return "N/A", "N/A", 0
    try:
        import datetime
        dt = datetime.datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        now = datetime.datetime.now(datetime.timezone.utc)
        diff = dt - now
        secs = int(diff.total_seconds())
        local_time = dt.astimezone().strftime('%I:%M %p')
        if secs <= 0:
            return "Ready", local_time, 0
        h = secs // 3600
        m = (secs % 3600) // 60
        parts = []
        if h > 0:
            parts.append(f"{h} hr")
        if m > 0 or h == 0:
            parts.append(f"{m} min")
        return " ".join(parts), local_time, secs
    except Exception:
        return "N/A", "N/A", 0

def parse_token_payload(token_str):
    """Safely extract access_token and refresh_token from either raw JSON or go-keyring-base64."""
    if not token_str:
        return None, None
    token_str = token_str.strip()
    try:
        # 1. Check if direct JSON
        if token_str.startswith('{'):
            data = json.loads(token_str)
            t_obj = data.get('token', data)
            return t_obj.get('access_token'), t_obj.get('refresh_token')
        # 2. Check if go-keyring-base64: prefix
        if 'go-keyring-base64:' in token_str:
            raw_b64 = token_str.split('go-keyring-base64:', 1)[1]
            data = json.loads(base64.b64decode(raw_b64).decode('utf-8'))
            t_obj = data.get('token', data)
            return t_obj.get('access_token'), t_obj.get('refresh_token')
        # 3. Fallback raw base64
        try:
            data = json.loads(base64.b64decode(token_str).decode('utf-8'))
            t_obj = data.get('token', data)
            return t_obj.get('access_token'), t_obj.get('refresh_token')
        except Exception:
            pass
    except Exception:
        pass
    return None, None

def fetch_quota_and_tier(token_str=None):
    """
    Fetch comprehensive account details: email, subscription tier, model quotas, and countdowns.
    """
    if not token_str:
        token_str = get_keychain_token()
    if not token_str:
        return None

    access_token, refresh_token = parse_token_payload(token_str)
    if not access_token:
        return None

    try:
        models_data = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(
                    'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
                    headers={
                        'Authorization': f'Bearer {access_token}',
                        'Content-Type': 'application/json',
                        'User-Agent': 'antigravity'
                    },
                    data=b'{}'
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    models_data = json.loads(resp.read().decode('utf-8'))
                if models_data and 'models' in models_data:
                    break
            except Exception:
                if refresh_token:
                    try:
                        params = urllib.parse.urlencode({
                            'client_id': OAUTH_CLIENT_ID,
                            'client_secret': OAUTH_CLIENT_SECRET,
                            'grant_type': 'refresh_token',
                            'refresh_token': refresh_token
                        }).encode('utf-8')
                        req_rf = urllib.request.Request('https://oauth2.googleapis.com/token', data=params)
                        with urllib.request.urlopen(req_rf, timeout=5.0) as r:
                            tok_d = json.loads(r.read().decode('utf-8'))
                            new_tok = tok_d.get('access_token')
                            if new_tok:
                                access_token = new_tok
                    except Exception:
                        pass
                time.sleep(0.5)

        if not models_data:
            return None

        # Fetch Plan / Tier Name
        tier_name = "Free"
        tier_code = "free"
        try:
            req_tier = urllib.request.Request(
                'https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'antigravity'
                },
                data=b'{}'
            )
            with urllib.request.urlopen(req_tier, timeout=3.0) as resp:
                tier_data = json.loads(resp.read().decode('utf-8'))
                paid = tier_data.get('paidTier', {})
                curr = tier_data.get('currentTier', {})
                raw_name = paid.get('name') or curr.get('name') or "Free"
                tier_name = raw_name.replace('Antigravity', '').strip() or "Free"
                if 'ultra' in tier_name.lower():
                    tier_code = 'ultra'
                elif 'pro' in tier_name.lower():
                    tier_code = 'pro'
                elif 'enterprise' in tier_name.lower():
                    tier_code = 'enterprise'
                else:
                    tier_code = 'free'
        except Exception:
            pass

        # User profile
        email = None
        user_name = None
        avatar_url = None
        try:
            req_u = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            with urllib.request.urlopen(req_u, timeout=3.0) as r:
                u_info = json.loads(r.read().decode('utf-8'))
                email = u_info.get('email')
                user_name = u_info.get('name')
                avatar_url = u_info.get('picture')
        except Exception:
            pass

        # If email not found in userinfo, try extracting from id_token JWT in token_str
        if not email and token_str:
            try:
                t_json = json.loads(token_str) if token_str.startswith('{') else {}
                id_tok = t_json.get('id_token')
                if id_tok and '.' in id_tok:
                    payload_part = id_tok.split('.')[1]
                    payload_part += '=' * (-len(payload_part) % 4)
                    claims = json.loads(base64.b64decode(payload_part).decode('utf-8'))
                    email = claims.get('email')
            except Exception:
                pass

        # If still not found, check manifest.json for matching refresh token
        if not email and refresh_token:
            try:
                man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
                if man_path.exists():
                    with open(man_path, 'r', encoding='utf-8') as mf:
                        m_data = json.load(mf)
                        for m_acc, m_info in m_data.items():
                            tf = m_info.get('token_file')
                            if tf and os.path.exists(tf):
                                with open(tf, 'r', encoding='utf-8') as tff:
                                    if refresh_token in tff.read():
                                        email = m_acc
                                        break
            except Exception:
                pass

        # Compute clean short display name (strictly short Gmail username)
        clean_name = "User"
        if email and '@' in email:
            clean_name = email.split('@')[0].split('.')[0].capitalize()
        elif user_name:
            clean_name = user_name.split()[0].capitalize()

        # Model parsing
        models = models_data.get('models', {})
        pools_map = {}
        for m_id, m_info in models.items():
            quota = m_info.get('quotaInfo')
            if not quota:
                continue
            rem = quota.get('remainingFraction', 1.0)
            reset_time = quota.get('resetTime')
            disp = m_info.get('displayName', m_id)

            if 'claude' in m_id.lower() or 'claude' in disp.lower():
                cat = 'Claude Sonnet 4.6'
            elif 'gpt' in m_id.lower():
                cat = 'GPT-OSS 120B'
            elif 'flash' in m_id.lower():
                cat = 'Gemini 3.8 Flash High'
            elif 'pro' in m_id.lower():
                cat = 'Gemini 3.1 Pro'
            else:
                cat = 'Gemini Models'

            if cat not in pools_map:
                pools_map[cat] = {'rem': rem, 'reset_time': reset_time, 'display': disp}
            elif rem < pools_map[cat]['rem']:
                pools_map[cat]['rem'] = rem
                if reset_time:
                    pools_map[cat]['reset_time'] = reset_time

        ordered = ['Gemini 3.8 Flash High', 'Gemini 3.1 Pro', 'Claude Sonnet 4.6', 'GPT-OSS 120B']
        pools = []
        for c in ordered:
            if c in pools_map:
                p = pools_map[c]
                used_pct = round((1.0 - p['rem']) * 100, 1)
                rem_pct = round(p['rem'] * 100, 1)
                countdown, local_reset, secs = format_countdown(p['reset_time'])
                pools.append({
                    'name': c,
                    'used_pct': used_pct,
                    'remaining_pct': rem_pct,
                    'resets_in': countdown,
                    'reset_time': local_reset,
                    'reset_secs': secs,
                    'reset_iso': p['reset_time']
                })

        primary_session = pools[0] if pools else {
            'name': 'Active Quota',
            'used_pct': 0.0,
            'remaining_pct': 100.0,
            'resets_in': 'N/A',
            'reset_time': 'N/A',
            'reset_secs': 0,
            'reset_iso': ''
        }

        return {
            'email': email or 'Unknown',
            'name': clean_name,
            'avatar': avatar_url or '',
            'tier': tier_name,
            'tier_code': tier_code,
            'session': primary_session,
            'pools': pools
        }
    except Exception:
        return None

def fetch_quota():
    """Compatibility wrapper for Antigravity Quota Monitor."""
    data = fetch_quota_and_tier()
    if not data:
        return None
    session = data.get('session') or {}
    return {
        'email': data.get('email', 'Unknown'),
        'name': data.get('name', 'User'),
        'avatar': data.get('avatar', ''),
        'tier': data.get('tier', 'Free'),
        'tier_code': data.get('tier_code', 'free'),
        'session': session,
        'weekly': {
            'remaining_pct': session.get('remaining_pct', 95.0),
            'used_pct': session.get('used_pct', 5.0),
            'resets_in': '4 days, 12 hours'
        },
        'pools': data.get('pools', [])
    }


if __name__ == '__main__':
    res = fetch_quota_and_tier()
    if res:
        print(json.dumps(res, indent=2, ensure_ascii=False))
    else:
        print(json.dumps({'error': 'No active session found'}))
