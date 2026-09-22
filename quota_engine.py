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
        if isinstance(iso_str, dict) and 'seconds' in iso_str:
            secs_ts = int(iso_str['seconds'])
            dt = datetime.datetime.fromtimestamp(secs_ts, tz=datetime.timezone.utc)
        elif isinstance(iso_str, (int, float)):
            dt = datetime.datetime.fromtimestamp(int(iso_str), tz=datetime.timezone.utc)
        elif isinstance(iso_str, str):
            if iso_str.isdigit():
                dt = datetime.datetime.fromtimestamp(int(iso_str), tz=datetime.timezone.utc)
            else:
                dt = datetime.datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        else:
            return "N/A", "N/A", 0
        now = datetime.datetime.now(datetime.timezone.utc)
        diff = dt - now
        secs = int(diff.total_seconds())
        local_time = dt.astimezone().strftime('%I:%M %p')
        if secs <= 0:
            return "Ready", local_time, 0
        d = secs // 86400
        h = (secs % 86400) // 3600
        m = (secs % 3600) // 60
        parts = []
        if d > 0:
            parts.append(f"{d} d")
        if h > 0:
            parts.append(f"{h} hr")
        if (m > 0 and d == 0) or (d == 0 and h == 0):
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

def extract_token_email(token_data):
    """Safely extract account email from id_token claims in raw JSON, go-keyring-base64, or dict."""
    if not token_data:
        return None
    try:
        data = None
        if isinstance(token_data, dict):
            data = token_data
        elif isinstance(token_data, str):
            tok_s = token_data.strip()
            if tok_s.startswith('{'):
                data = json.loads(tok_s)
            elif 'go-keyring-base64:' in tok_s:
                raw_b64 = tok_s.split('go-keyring-base64:', 1)[1]
                data = json.loads(base64.b64decode(raw_b64).decode('utf-8'))
            else:
                try:
                    data = json.loads(base64.b64decode(tok_s).decode('utf-8'))
                except Exception:
                    pass
        if not data or not isinstance(data, dict):
            return None

        # 1. Check id_token JWT
        id_tok = data.get('id_token')
        if id_tok and isinstance(id_tok, str) and '.' in id_tok:
            parts = id_tok.split('.')
            if len(parts) >= 2:
                p = parts[1] + '=' * (-len(parts[1]) % 4)
                claims = json.loads(base64.urlsafe_b64decode(p).decode('utf-8', errors='ignore'))
                email = claims.get('email')
                if email and '@' in email:
                    return str(email).lower().strip()

        # 2. Check token object or claims
        t_obj = data.get('token', data)
        if isinstance(t_obj, dict):
            em = t_obj.get('email')
            if em and '@' in em:
                return str(em).lower().strip()
    except Exception:
        pass
    return None

def ensure_fresh_token(token_data, account_email=None):
    """
    Checks if an OAuth token is expired or close to expiring (< 5 mins).
    If expired/near expiry, refreshes it using Google's token endpoint,
    updates the dictionary / JSON string, saves it to disk at
    ~/.gemini/accounts/<account_email>.token if applicable, and returns the fresh JSON string.
    """
    if not token_data:
        return None

    parsed = None
    is_json_str = False
    if isinstance(token_data, dict):
        parsed = dict(token_data)
    elif isinstance(token_data, str):
        token_str_clean = token_data.strip()
        if token_str_clean.startswith('{'):
            try:
                parsed = json.loads(token_str_clean)
                is_json_str = True
            except Exception:
                pass

    if not parsed:
        return token_data

    t_obj = parsed.get('token', parsed)
    expiry_str = t_obj.get('expiry', '')
    refresh_token = t_obj.get('refresh_token')

    if not refresh_token:
        return json.dumps(parsed, ensure_ascii=False) if is_json_str else parsed

    needs_refresh = False
    if expiry_str:
        try:
            import datetime
            clean_exp = expiry_str.replace('Z', '+00:00')
            if '.' in clean_exp:
                parts = clean_exp.split('.')
                tz_part = ''
                if '+' in parts[1]:
                    sub_parts = parts[1].split('+')
                    parts[1] = sub_parts[0][:6]
                    tz_part = '+' + sub_parts[1]
                elif '-' in parts[1]:
                    sub_parts = parts[1].split('-')
                    parts[1] = sub_parts[0][:6]
                    tz_part = '-' + sub_parts[1]
                else:
                    parts[1] = parts[1][:6]
                clean_exp = parts[0] + '.' + parts[1] + tz_part
            exp_dt = datetime.datetime.fromisoformat(clean_exp)
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            if (exp_dt - now_dt).total_seconds() < 300:
                needs_refresh = True
        except Exception:
            needs_refresh = True
    else:
        needs_refresh = True

    if needs_refresh:
        try:
            import datetime
            params = urllib.parse.urlencode({
                'client_id': OAUTH_CLIENT_ID,
                'client_secret': OAUTH_CLIENT_SECRET,
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            }).encode('utf-8')
            req = urllib.request.Request('https://oauth2.googleapis.com/token', data=params)
            with urllib.request.urlopen(req, timeout=7.0) as resp:
                tok_data = json.loads(resp.read().decode('utf-8'))
                if tok_data.get('access_token'):
                    t_obj['access_token'] = tok_data['access_token']
                    exp_sec = tok_data.get('expires_in', 3600)
                    now_utc = datetime.datetime.now(datetime.timezone.utc)
                    new_exp = now_utc + datetime.timedelta(seconds=exp_sec)
                    t_obj['expiry'] = new_exp.isoformat()
                    if 'id_token' in tok_data:
                        parsed['id_token'] = tok_data['id_token']
                    if 'token' in parsed:
                        parsed['token'] = t_obj
                    else:
                        parsed.update(t_obj)

                    tok_claimed_email = extract_token_email(parsed)
                    acc_email = account_email
                    if not acc_email:
                        acc_email = tok_claimed_email
                    elif tok_claimed_email and acc_email.lower().strip() != tok_claimed_email.lower().strip():
                        # Prevent cross-account token pollution
                        acc_email = None

                    if acc_email:
                        safe_acc = "".join(c if c.isalnum() or c in ('@', '.', '_', '-') else '_' for c in acc_email)
                        tf = os.path.expanduser(f"~/.gemini/accounts/{safe_acc}.token")
                        try:
                            os.makedirs(os.path.dirname(tf), exist_ok=True)
                            with open(tf, 'w', encoding='utf-8') as f:
                                json.dump(parsed, f, indent=2, ensure_ascii=False)
                        except Exception:
                            pass
        except Exception:
            pass

    return json.dumps(parsed, ensure_ascii=False) if (is_json_str or isinstance(token_data, str)) else parsed

_QUOTA_CACHE = {}
_CACHE_TTL = 30  # seconds

def fetch_quota_and_tier(token_str=None, force_refresh=False):
    """
    Fetch comprehensive account details: email, subscription tier, model quotas, and countdowns.
    """
    global _QUOTA_CACHE
    now = time.time()
    token_claim = extract_token_email(token_str) if token_str else None
    cache_key = token_claim.lower().strip() if token_claim else 'default'

    if not force_refresh and cache_key in _QUOTA_CACHE:
        entry = _QUOTA_CACHE[cache_key]
        if now - entry.get('time', 0) < _CACHE_TTL:
            return dict(entry['data'])

    if not token_str:
        token_str = get_keychain_token()
    if not token_str:
        return dict(_QUOTA_CACHE[cache_key]['data']) if cache_key in _QUOTA_CACHE else None

    access_token, refresh_token = parse_token_payload(token_str)
    if not access_token:
        return dict(_QUOTA_CACHE[cache_key]['data']) if cache_key in _QUOTA_CACHE else None

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
                                if token_str and token_str.startswith('{'):
                                    try:
                                        import datetime
                                        tj = json.loads(token_str)
                                        t_target = tj.get('token', tj)
                                        t_target['access_token'] = new_tok
                                        exp_sec = tok_d.get('expires_in', 3600)
                                        t_target['expiry'] = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=exp_sec)).isoformat()
                                        if 'id_token' in tok_d:
                                            tj['id_token'] = tok_d['id_token']
                                        token_str = json.dumps(tj)
                                    except Exception:
                                        pass
                    except Exception:
                        pass
                time.sleep(0.5)

        if not models_data:
            return dict(_QUOTA_CACHE) if _QUOTA_CACHE else None

        # Decode id_token JWT early if available to extract email, name, picture
        id_claims = {}
        if token_str:
            try:
                t_json = json.loads(token_str) if token_str.startswith('{') else {}
                id_tok = t_json.get('id_token')
                if id_tok and '.' in id_tok:
                    payload_part = id_tok.split('.')[1]
                    payload_part += '=' * (-len(payload_part) % 4)
                    id_claims = json.loads(base64.urlsafe_b64decode(payload_part).decode('utf-8'))
            except Exception:
                pass

        # User profile
        email = id_claims.get('email')
        user_name = id_claims.get('name')
        avatar_url = id_claims.get('picture')

        try:
            req_u = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            with urllib.request.urlopen(req_u, timeout=3.0) as r:
                u_info = json.loads(r.read().decode('utf-8'))
                if u_info.get('email'): email = u_info.get('email')
                if u_info.get('name'): user_name = u_info.get('name')
                if u_info.get('picture'): avatar_url = u_info.get('picture')
        except Exception:
            pass

        # Consult manifest.json for known account details (avatar, tier)
        man_account_info = {}
        try:
            man_path = Path.home() / ".gemini" / "accounts" / "manifest.json"
            if man_path.exists():
                with open(man_path, 'r', encoding='utf-8') as mf:
                    m_data = json.load(mf)
                    if email and email in m_data:
                        man_account_info = m_data[email]
                    elif not email and refresh_token:
                        for m_acc, m_info in m_data.items():
                            tf = m_info.get('token_file')
                            if tf and os.path.exists(tf):
                                with open(tf, 'r', encoding='utf-8') as tff:
                                    if refresh_token in tff.read():
                                        email = m_acc
                                        man_account_info = m_info
                                        break
                    if email and token_str and token_str.startswith('{'):
                        acc_tf = os.path.expanduser(f"~/.gemini/accounts/{email}.token")
                        try:
                            with open(acc_tf, 'w', encoding='utf-8') as f:
                                f.write(token_str)
                        except Exception:
                            pass
        except Exception:
            pass

        if not avatar_url and man_account_info.get('avatar'):
            avatar_url = man_account_info['avatar']

        # Fetch Plan / Tier Name
        tier_name = man_account_info.get('tier', 'Google AI Pro')
        tier_code = man_account_info.get('tier_code', 'pro')
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
                raw_name = paid.get('name') or curr.get('name') or ""
                if raw_name:
                    clean_name_tier = raw_name.replace('Antigravity', '').strip()
                    if 'ultra' in clean_name_tier.lower():
                        tier_code = 'ultra'
                        tier_name = clean_name_tier
                    elif 'pro' in clean_name_tier.lower():
                        tier_code = 'pro'
                        tier_name = clean_name_tier
                    elif 'enterprise' in clean_name_tier.lower():
                        tier_code = 'enterprise'
                        tier_name = clean_name_tier
                    elif 'free' in clean_name_tier.lower():
                        if man_account_info.get('tier_code') not in ['pro', 'ultra', 'enterprise']:
                            tier_code = 'free'
                            tier_name = clean_name_tier
        except Exception:
            pass

        # Final verification: If tier_code is free but manifest or models indicate pro, keep pro
        if tier_code == 'free' and man_account_info.get('tier_code') in ['pro', 'ultra', 'enterprise']:
            tier_code = man_account_info['tier_code']
            tier_name = man_account_info.get('tier', 'Google AI Pro')

        # Compute clean short display name (strictly short Gmail username: e.g. Developer)
        clean_name = "User"
        if email and '@' in email:
            clean_name = email.split('@')[0].split('.')[0].capitalize()
        elif user_name:
            clean_name = user_name.split()[0].capitalize()

        # Official Quota Summary (weekly and 5-hour rolling limits)
        summary_data = None
        try:
            req_summary = urllib.request.Request(
                'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'antigravity'
                },
                data=b'{}'
            )
            with urllib.request.urlopen(req_summary, timeout=4.0) as resp:
                summary_data = json.loads(resp.read().decode('utf-8'))
        except Exception:
            pass

        gemini_w_bucket = None
        gemini_5h_bucket = None
        p3_w_bucket = None
        p3_5h_bucket = None

        if summary_data and 'groups' in summary_data:
            for g in summary_data.get('groups', []):
                for b in g.get('buckets', []):
                    bid = b.get('bucketId', '')
                    if bid == 'gemini-weekly':
                        gemini_w_bucket = b
                    elif bid == 'gemini-5h':
                        gemini_5h_bucket = b
                    elif bid == '3p-weekly':
                        p3_w_bucket = b
                    elif bid == '3p-5h':
                        p3_5h_bucket = b

        def _get_rem(b):
            if not b:
                return 1.0
            rem = b.get('remainingFraction')
            if rem is None and isinstance(b.get('remaining'), dict):
                rem = b.get('remaining', {}).get('value')
            try:
                return float(rem) if rem is not None else 1.0
            except Exception:
                return 1.0

        gw_rem = _get_rem(gemini_w_bucket)
        g5_rem = _get_rem(gemini_5h_bucket)
        p3w_rem = _get_rem(p3_w_bucket)
        p35_rem = _get_rem(p3_5h_bucket)

        gw_reset = gemini_w_bucket.get('resetTime') if gemini_w_bucket else None
        g5_reset = gemini_5h_bucket.get('resetTime') if gemini_5h_bucket else None
        p3w_reset = p3_w_bucket.get('resetTime') if p3_w_bucket else None
        p35_reset = p3_5h_bucket.get('resetTime') if p3_5h_bucket else None

        gw_cd, gw_lr, gw_sec = format_countdown(gw_reset)
        g5_cd, g5_lr, g5_sec = format_countdown(g5_reset)
        p3w_cd, p3w_lr, p3w_sec = format_countdown(p3w_reset)
        p35_cd, p35_lr, p35_sec = format_countdown(p35_reset)

        # Model parsing from models_data
        models = (models_data or {}).get('models', {})
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
            is_claude_gpt = ('Claude' in c or 'GPT' in c)
            base_rem = p35_rem if is_claude_gpt else g5_rem
            base_reset = p35_reset if is_claude_gpt else g5_reset
            base_cd = p35_cd if is_claude_gpt else g5_cd
            base_lr = p35_lr if is_claude_gpt else g5_lr
            base_sec = p35_sec if is_claude_gpt else g5_sec

            w_rem = p3w_rem if is_claude_gpt else gw_rem
            w_cd = p3w_cd if is_claude_gpt else gw_cd

            # If model-specific data exists from models_data
            if c in pools_map:
                p = pools_map[c]
                if p['rem'] < base_rem:
                    base_rem = p['rem']
                    if p['reset_time']:
                        base_reset = p['reset_time']
                        base_cd, base_lr, base_sec = format_countdown(base_reset)

            used_pct = round((1.0 - base_rem) * 100, 1)
            rem_pct = round(base_rem * 100, 1)
            pools.append({
                'name': c,
                'used_pct': used_pct,
                'remaining_pct': rem_pct,
                'resets_in': base_cd,
                'reset_time': base_lr,
                'reset_secs': base_sec,
                'reset_iso': str(base_reset) if base_reset else '',
                'weekly_rem': round(w_rem * 100, 1),
                'weekly_pct': round((1.0 - w_rem) * 100, 1),
                'weekly_resets': w_cd
            })

        primary_session = {
            'name': '5-Hour Limit',
            'used_pct': round((1.0 - g5_rem) * 100, 1),
            'remaining_pct': round(g5_rem * 100, 1),
            'resets_in': g5_cd,
            'reset_time': g5_lr,
            'reset_secs': g5_sec,
            'reset_iso': str(g5_reset) if g5_reset else ''
        }

        weekly_payload = {
            'name': 'Weekly Limit',
            'used_pct': round((1.0 - gw_rem) * 100, 1),
            'remaining_pct': round(gw_rem * 100, 1),
            'resets_in': gw_cd,
            'reset_time': gw_lr,
            'reset_secs': gw_sec,
            'reset_iso': str(gw_reset) if gw_reset else ''
        }

        res_payload = {
            'email': email or 'Unknown',
            'name': clean_name,
            'avatar': avatar_url or '',
            'tier': tier_name,
            'tier_code': tier_code,
            'session': primary_session,
            'weekly': weekly_payload,
            'pools': pools
        }

        final_email = (res_payload.get('email') or cache_key or 'unknown').lower().strip()
        final_cache_key = final_email if '@' in final_email else cache_key

        if final_cache_key in _QUOTA_CACHE:
            old_data = _QUOTA_CACHE[final_cache_key].get('data', {})
            if res_payload.get('tier_code') == 'free' and old_data.get('tier_code') in ['pro', 'ultra', 'enterprise']:
                res_payload['tier_code'] = old_data['tier_code']
                res_payload['tier'] = old_data['tier']
            if not res_payload.get('avatar') and old_data.get('avatar'):
                res_payload['avatar'] = old_data['avatar']

        _QUOTA_CACHE[final_cache_key] = {'data': res_payload, 'time': now}
        if final_cache_key != 'default':
            _QUOTA_CACHE['default'] = {'data': res_payload, 'time': now}
        return res_payload
    except Exception:
        return dict(_QUOTA_CACHE[cache_key]['data']) if cache_key in _QUOTA_CACHE else None

def fetch_quota():
    """Compatibility wrapper for Antigravity Quota Monitor."""
    data = fetch_quota_and_tier()
    if not data:
        return None
    session = data.get('session') or {}
    weekly = data.get('weekly')
    # If weekly is missing or defaulted to 100%, check if pools has real model-specific weekly quota
    if not weekly or (weekly.get('remaining_pct', 100.0) >= 99.9 and data.get('pools')):
        for p in data.get('pools', []):
            w_rem = p.get('weekly_rem')
            if w_rem is not None and float(w_rem) < 99.9:
                weekly = {
                    'name': 'Weekly Limit',
                    'remaining_pct': float(w_rem),
                    'used_pct': round(100.0 - float(w_rem), 1),
                    'resets_in': p.get('weekly_resets') or 'Ready'
                }
                break
    if not weekly:
        weekly = {
            'name': 'Weekly Limit',
            'remaining_pct': session.get('remaining_pct', 100.0),
            'used_pct': session.get('used_pct', 0.0),
            'resets_in': 'Ready'
        }
    return {
        'email': data.get('email', 'Unknown'),
        'name': data.get('name', 'User'),
        'avatar': data.get('avatar', ''),
        'tier': data.get('tier', 'Google AI Pro'),
        'tier_code': data.get('tier_code', 'pro'),
        'session': session,
        'weekly': weekly,
        'pools': data.get('pools', [])
    }


if __name__ == '__main__':
    res = fetch_quota_and_tier()
    if res:
        print(json.dumps(res, indent=2, ensure_ascii=False))
    else:
        print(json.dumps({'error': 'No active session found'}))
