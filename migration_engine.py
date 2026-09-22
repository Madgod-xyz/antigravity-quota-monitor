#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Migration & Transfer Engine
Author: Madgod-xyz (https://github.com/Madgod-xyz/antigravity-account-switcher)
Description:
    Safely inspects, clones, migrates, and syncs Antigravity project conversations,
    workspaces, and agent brains between different Google accounts.
    Includes robust Scheduled Tasks isolation and granular project profile assignment.
"""

import os
import sys
import glob
import json
import uuid
import time
import shutil
import sqlite3
import datetime
import subprocess
import urllib.parse
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GEMINI_DIR = os.path.expanduser('~/.gemini')
ANTIGRAVITY_DIR = os.path.join(GEMINI_DIR, 'antigravity')
CONVERSATIONS_DIR = os.path.join(ANTIGRAVITY_DIR, 'conversations')
BRAIN_DIR = os.path.join(ANTIGRAVITY_DIR, 'brain')
ACCOUNTS_DIR = os.path.join(GEMINI_DIR, 'accounts')
BACKUP_DIR = os.path.join(GEMINI_DIR, 'antigravity-backup')
CONFIG_PROJECTS_DIR = os.path.join(GEMINI_DIR, 'config', 'projects')
CONVERSATION_SUMMARIES_DB = os.path.join(ANTIGRAVITY_DIR, 'conversation_summaries.db')

SYNC_MANIFEST_PATH = os.path.join(ACCOUNTS_DIR, 'sync_manifest.json')
PROFILE_SYNC_MANIFEST_PATH = os.path.join(ACCOUNTS_DIR, 'profile_sync_manifest.json')
TASK_ISOLATION_MANIFEST_PATH = os.path.join(ANTIGRAVITY_DIR, 'task_isolation_manifest.json')
TASKS_DIR = os.path.join(ANTIGRAVITY_DIR, 'tasks')
SCHEDULED_DIR = os.path.join(ANTIGRAVITY_DIR, 'scheduled')

def get_primary_account():
    """Dynamically get primary account without hardcoding credentials."""
    try:
        man_path = os.path.join(ACCOUNTS_DIR, 'manifest.json')
        if os.path.exists(man_path):
            with open(man_path, 'r', encoding='utf-8') as f:
                m = json.load(f)
                if m:
                    return list(m.keys())[0]
    except Exception:
        pass
    try:
        import quota_engine
        q = quota_engine.fetch_quota_and_tier()
        if q and q.get('email'):
            return q['email']
    except Exception:
        pass
    return "primary_account"

def get_secondary_account():
    """Dynamically get secondary account from manifest."""
    try:
        man_path = os.path.join(ACCOUNTS_DIR, 'manifest.json')
        if os.path.exists(man_path):
            with open(man_path, 'r', encoding='utf-8') as f:
                m = json.load(f)
                if len(m) > 1:
                    return list(m.keys())[1]
    except Exception:
        pass
    return "secondary_account"

PRIMARY_ACCOUNT = get_primary_account()
SECONDARY_ACCOUNT = get_secondary_account()

def norm_account(acc):
    """Normalize account aliases (instance_1, instance_2, primary, secondary) to canonical email."""
    if not acc:
        return ""
    a = str(acc).strip().lower()
    p = get_primary_account().lower()
    s = get_secondary_account().lower()
    if a in ('instance_1', 'primary', 'acc1') or (p and a == p):
        return get_primary_account()
    if a in ('instance_2', 'secondary', 'acc2') or (s and a == s):
        return get_secondary_account()
    return str(acc).strip()

def ensure_dirs():
    """Ensure all required directories exist."""
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    os.makedirs(BRAIN_DIR, exist_ok=True)
    os.makedirs(ACCOUNTS_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(TASKS_DIR, exist_ok=True)
    os.makedirs(SCHEDULED_DIR, exist_ok=True)
    if not os.path.exists(CONFIG_PROJECTS_DIR):
        try:
            os.makedirs(CONFIG_PROJECTS_DIR, exist_ok=True)
        except Exception:
            pass

# ==============================================================================
# 1. PROFILE & PROJECT SELECTIVE SYNC MANIFEST
# ==============================================================================

def load_profile_sync_manifest():
    """
    Load the profile synchronization manifest mapping projects, conversations,
    and workspaces to specific Google accounts / instances.
    """
    ensure_dirs()
    if os.path.exists(PROFILE_SYNC_MANIFEST_PATH):
        try:
            with open(PROFILE_SYNC_MANIFEST_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass

    # Default initial state: Primary account owns all existing projects,
    # switcher project is shared, others isolated unless explicitly designated.
    initial_manifest = {
        "version": "2.0",
        "updated_at": datetime.datetime.now().isoformat(),
        "accounts": {
            PRIMARY_ACCOUNT: {
                "label": "Primary Account",
                "projects": [],
                "conversations": []
            },
            SECONDARY_ACCOUNT: {
                "label": "Secondary Account",
                "projects": [],
                "conversations": []
            }
        },
        "project_profiles": {},
        "conversation_profiles": {}
    }
    
    # Auto-seed existing projects
    projects = discover_raw_projects()
    for pid, pdata in projects.items():
        assigned = [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT] if SECONDARY_ACCOUNT else [PRIMARY_ACCOUNT]
        initial_manifest["project_profiles"][pid] = {
            "name": pdata.get("name", pid),
            "path": pdata.get("path", ""),
            "assigned_accounts": assigned,
            "sync_mode": "shared"
        }
        initial_manifest["accounts"][PRIMARY_ACCOUNT]["projects"].append(pid)
        if SECONDARY_ACCOUNT:
            initial_manifest["accounts"][SECONDARY_ACCOUNT]["projects"].append(pid)

    save_profile_sync_manifest(initial_manifest)
    return initial_manifest

def save_profile_sync_manifest(manifest):
    """Safely persist the profile synchronization manifest."""
    ensure_dirs()
    manifest["updated_at"] = datetime.datetime.now().isoformat()
    try:
        temp_path = f"{PROFILE_SYNC_MANIFEST_PATH}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        if os.path.exists(PROFILE_SYNC_MANIFEST_PATH):
            os.replace(temp_path, PROFILE_SYNC_MANIFEST_PATH)
        else:
            os.rename(temp_path, PROFILE_SYNC_MANIFEST_PATH)
        return True
    except Exception as e:
        try:
            with open(PROFILE_SYNC_MANIFEST_PATH, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False

def discover_raw_projects():
    """Read all project files from .gemini/config/projects/."""
    projects = {}
    if not os.path.exists(CONFIG_PROJECTS_DIR):
        return projects

    for fname in os.listdir(CONFIG_PROJECTS_DIR):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(CONFIG_PROJECTS_DIR, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                pdata = json.load(f)
                pid = pdata.get('id', os.path.splitext(fname)[0])
                pname = pdata.get('name', pid)
                puri = ''
                res_list = pdata.get('projectResources', {}).get('resources', [])
                for r in res_list:
                    if 'folderUri' in r:
                        puri = r['folderUri']
                        break
                    if 'gitFolder' in r and 'folderUri' in r['gitFolder']:
                        puri = r['gitFolder']['folderUri']
                        break
                if puri.startswith('file:///'):
                    puri = urllib.parse.unquote(puri[8:]).replace('/', '\\')
                projects[pid] = {'id': pid, 'name': pname, 'path': puri}
        except Exception:
            pass
    return projects

def get_project_conversation_counts():
    """Count active conversations per project ID using conversation_summaries.db."""
    counts = {}
    if os.path.exists(CONVERSATION_SUMMARIES_DB):
        try:
            conn = sqlite3.connect(CONVERSATION_SUMMARIES_DB, timeout=3.0)
            cur = conn.cursor()
            cur.execute("SELECT project_id, COUNT(*) FROM conversation_summaries GROUP BY project_id")
            for row in cur.fetchall():
                counts[row[0]] = row[1]
            conn.close()
        except Exception:
            pass
    return counts

def list_projects(account=None):
    """
    List all local projects with their assignment status, paths, conversation counts,
    and dual-instance enablement status.
    """
    manifest = load_profile_sync_manifest()
    raw_projects = discover_raw_projects()
    conv_counts = get_project_conversation_counts()
    project_profiles = manifest.get("project_profiles", {})

    items = []
    # Merge discovered raw projects with manifest
    all_pids = set(raw_projects.keys()).union(set(project_profiles.keys()))

    for pid in all_pids:
        raw = raw_projects.get(pid, {})
        prof = project_profiles.get(pid, {})
        
        name = prof.get("name") or raw.get("name") or pid
        path = prof.get("path") or raw.get("path") or ""
        assigned = prof.get("assigned_accounts", [get_primary_account()])
        quota_account = norm_account(prof.get("quota_account") or (assigned[0] if assigned else get_primary_account()))
        count = conv_counts.get(pid, 0)
        
        item = {
            "id": pid,
            "name": name,
            "path": path,
            "assigned_accounts": assigned,
            "quota_account": quota_account,
            "conversation_count": count,
            "enabled_all": prof.get("enabled_all", False),
            "disabled_all": prof.get("disabled_all", len(assigned) == 0),
            "is_instance1_enabled": any(get_primary_account().lower() in a.lower() for a in assigned),
            "is_instance2_enabled": any(get_secondary_account().lower() in a.lower() for a in assigned),
            "is_shared": (len(assigned) > 1 or prof.get("enabled_all", False)),
            "sync_mode": prof.get("sync_mode", "shared" if len(assigned) > 1 else "isolated")
        }

        if account:
            acc_clean = norm_account(account).lower()
            if not any(norm_account(a).lower() == acc_clean for a in assigned):
                continue

        items.append(item)

    # Sort projects: active first, then by conversation count descending
    items.sort(key=lambda x: (x["disabled_all"], -x["conversation_count"], x["name"].lower()))
    return items

def set_project_assignment(project_id, accounts, sync_mode='shared', enabled=None):
    """
    Assign a project to one or more accounts (e.g. ['account1@example.com', 'account2@example.com']).
    Supports passing a single account string with enabled=True/False to toggle assignment.
    """
    manifest = load_profile_sync_manifest()
    raw_projects = discover_raw_projects()

    if project_id not in manifest.get("project_profiles", {}):
        raw = raw_projects.get(project_id, {})
        manifest.setdefault("project_profiles", {})[project_id] = {
            "name": raw.get("name", project_id),
            "path": raw.get("path", ""),
            "assigned_accounts": [],
            "sync_mode": sync_mode
        }

    existing = list(manifest["project_profiles"][project_id].get("assigned_accounts", []))
    existing = [norm_account(x) for x in existing if x]

    if isinstance(accounts, str):
        target = norm_account(accounts)
        if enabled is False:
            existing = [a for a in existing if norm_account(a).lower() != target.lower()]
        elif enabled is True:
            if not any(norm_account(a).lower() == target.lower() for a in existing):
                existing.append(target)
        else:
            existing = [target]
        clean_accounts = existing
    else:
        clean_accounts = list(dict.fromkeys([norm_account(a) for a in accounts if a and norm_account(a)]))

    manifest["project_profiles"][project_id]["assigned_accounts"] = clean_accounts
    manifest["project_profiles"][project_id]["sync_mode"] = sync_mode if clean_accounts else "disabled"
    manifest["project_profiles"][project_id]["disabled_all"] = (len(clean_accounts) == 0)
    manifest["project_profiles"][project_id]["enabled_all"] = False

    save_profile_sync_manifest(manifest)
    return {
        "success": True,
        "project_id": project_id,
        "assigned_accounts": clean_accounts,
        "sync_mode": manifest["project_profiles"][project_id]["sync_mode"]
    }

def toggle_project_all(project_id, state="all"):
    """Enable or disable a project for all saved accounts."""
    manifest = load_profile_sync_manifest()
    raw_projects = discover_raw_projects()
    prof = manifest.setdefault("project_profiles", {}).setdefault(project_id, {
        "name": raw_projects.get(project_id, {}).get("name", project_id),
        "path": raw_projects.get(project_id, {}).get("path", "")
    })
    
    if state == "all":
        man_path = os.path.join(ACCOUNTS_DIR, 'manifest.json')
        saved_accs = []
        if os.path.exists(man_path):
            try:
                with open(man_path, 'r', encoding='utf-8') as f:
                    saved_accs = list(json.load(f).keys())
            except Exception:
                pass
        if not saved_accs:
            saved_accs = [get_primary_account()]
        prof["assigned_accounts"] = saved_accs
        prof["enabled_all"] = True
        prof["disabled_all"] = False
        prof["sync_mode"] = "shared"
    else:
        prof["assigned_accounts"] = []
        prof["enabled_all"] = False
        prof["disabled_all"] = True
        prof["sync_mode"] = "disabled"

    save_profile_sync_manifest(manifest)
    return {
        "success": True,
        "project_id": project_id,
        "state": state,
        "assigned_accounts": prof["assigned_accounts"]
    }

def get_project_quota_account(project_id):
    """Retrieve the designated quota payer account for a project."""
    manifest = load_profile_sync_manifest()
    prof = manifest.get("project_profiles", {}).get(project_id, {})
    assigned = prof.get("assigned_accounts", [])
    return norm_account(prof.get("quota_account") or (assigned[0] if assigned else get_primary_account()))

def set_project_quota_account(project_id, account):
    """
    Explicitly set which account's quota is consumed for this project.
    Ensures that account is added to assigned_accounts so it has project access.
    """
    manifest = load_profile_sync_manifest()
    raw_projects = discover_raw_projects()
    prof = manifest.setdefault("project_profiles", {}).setdefault(project_id, {
        "name": raw_projects.get(project_id, {}).get("name", project_id),
        "path": raw_projects.get(project_id, {}).get("path", "")
    })
    clean_acc = norm_account(account)
    prof["quota_account"] = clean_acc
    assigned = [norm_account(x) for x in prof.get("assigned_accounts", []) if x]
    if clean_acc and not any(a.lower() == clean_acc.lower() for a in assigned):
        assigned.append(clean_acc)
        prof["assigned_accounts"] = assigned
        prof["disabled_all"] = False

    # Sync quota_account into project local config.json if present
    p_path = prof.get("path")
    if p_path and os.path.isdir(p_path):
        cfg_path = os.path.join(p_path, "config.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as cf:
                    cfg_data = json.load(cf)
                cfg_data["quota_account"] = clean_acc
                with open(cfg_path, "w", encoding="utf-8") as cf:
                    json.dump(cfg_data, cf, indent=2, ensure_ascii=False)
            except Exception:
                pass

    save_profile_sync_manifest(manifest)
    return {
        "success": True,
        "project_id": project_id,
        "quota_account": clean_acc,
        "assigned_accounts": prof["assigned_accounts"]
    }

def sync_project_to_account(project_id, target_account, include_conversations=False):
    """
    Selectively link or sync a project to target_account.
    """
    manifest = load_profile_sync_manifest()
    raw_projects = discover_raw_projects()
    prof = manifest.setdefault("project_profiles", {}).setdefault(project_id, {
        "name": raw_projects.get(project_id, {}).get("name", project_id),
        "path": raw_projects.get(project_id, {}).get("path", ""),
        "assigned_accounts": [PRIMARY_ACCOUNT],
        "sync_mode": "isolated"
    })
    
    tgt = norm_account(target_account)
    assigned = [norm_account(a) for a in prof.get("assigned_accounts", []) if a]
    if tgt and tgt not in assigned:
        assigned.append(tgt)
    prof["assigned_accounts"] = assigned
    prof["sync_mode"] = "shared" if len(assigned) > 1 else "isolated"

    # Synchronize account index lists
    for acc in [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT, tgt]:
        if not acc:
            continue
        acc_dict = manifest.setdefault("accounts", {}).setdefault(acc, {"projects": [], "conversations": []})
        proj_list = acc_dict.setdefault("projects", [])
        if any(acc.lower() == a.lower() for a in assigned):
            if project_id not in proj_list:
                proj_list.append(project_id)
        else:
            if project_id in proj_list:
                proj_list.remove(project_id)

    if include_conversations:
        convs = list_conversations(project_id=project_id)
        tgt_convs = manifest.setdefault("accounts", {}).setdefault(tgt, {}).setdefault("conversations", [])
        for c in convs:
            cid = c["id"]
            c_prof = manifest.setdefault("conversation_profiles", {}).setdefault(cid, {"assigned_accounts": [PRIMARY_ACCOUNT]})
            c_assigned = [norm_account(a) for a in c_prof.get("assigned_accounts", []) if a]
            if tgt and tgt not in c_assigned:
                c_assigned.append(tgt)
            c_prof["assigned_accounts"] = c_assigned
            if cid not in tgt_convs:
                tgt_convs.append(cid)

    save_profile_sync_manifest(manifest)
    return {"success": True, "project_id": project_id, "target_account": tgt, "assigned_accounts": assigned}

def unlink_project_from_account(project_id, account):
    """
    Remove an account from a project's assigned profiles so it does NOT appear
    or bleed into that account's instance window.
    """
    manifest = load_profile_sync_manifest()
    prof = manifest.setdefault("project_profiles", {}).get(project_id)
    if not prof:
        return {"success": False, "error": f"Project '{project_id}' not found"}

    target_acc = norm_account(account)
    assigned = [norm_account(a) for a in prof.get("assigned_accounts", []) if a]
    updated = [a for a in assigned if a.lower() != target_acc.lower()]
    
    # Never leave primary account completely unassigned if it's the only one
    if not updated and target_acc.lower() != PRIMARY_ACCOUNT.lower():
        updated = [PRIMARY_ACCOUNT]

    prof["assigned_accounts"] = updated
    prof["sync_mode"] = "shared" if len(updated) > 1 else "isolated"

    # Synchronize account index lists
    for acc in [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT, target_acc]:
        if not acc:
            continue
        acc_dict = manifest.setdefault("accounts", {}).setdefault(acc, {"projects": [], "conversations": []})
        proj_list = acc_dict.setdefault("projects", [])
        if any(acc.lower() == a.lower() for a in updated):
            if project_id not in proj_list:
                proj_list.append(project_id)
        else:
            if project_id in proj_list:
                proj_list.remove(project_id)

    # Also unlink conversations of this project from target_account
    conv_profiles = manifest.setdefault("conversation_profiles", {})
    convs = list_conversations(project_id=project_id)
    target_convs = manifest.setdefault("accounts", {}).setdefault(target_acc, {}).setdefault("conversations", [])
    for c in convs:
        cid = c["id"]
        if cid in conv_profiles:
            c_assigned = [norm_account(a) for a in conv_profiles[cid].get("assigned_accounts", []) if a]
            c_updated = [a for a in c_assigned if a.lower() != target_acc.lower()]
            if not c_updated:
                c_updated = [PRIMARY_ACCOUNT]
            conv_profiles[cid]["assigned_accounts"] = c_updated
        if cid in target_convs:
            target_convs.remove(cid)

    save_profile_sync_manifest(manifest)
    return {"success": True, "project_id": project_id, "unlinked_account": target_acc, "remaining_accounts": updated}

# ==============================================================================
# 2. CONVERSATIONS & TIMELINES MANAGEMENT
# ==============================================================================

def get_conversation_title(conv_id):
    """Extract human-readable title or first prompt for a conversation."""
    transcript_path = os.path.join(BRAIN_DIR, conv_id, '.system_generated', 'logs', 'transcript.jsonl')
    if os.path.exists(transcript_path):
        try:
            with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if data.get('type') == 'USER_INPUT' or data.get('source') == 'USER_EXPLICIT':
                            content = data.get('content', '').strip()
                            if content:
                                clean = content.replace('<USER_REQUEST>', '').replace('</USER_REQUEST>', '').strip()
                                first_line = clean.split('\n')[0].strip()
                                return (first_line[:75] + '...') if len(first_line) > 75 else first_line
                    except Exception:
                        continue
        except Exception:
            pass
    return f"Conversation {conv_id[:8]}"

def get_conversation_summaries_metadata():
    """Extract preview, title, and project_id from conversation_summaries.db."""
    meta = {}
    if os.path.exists(CONVERSATION_SUMMARIES_DB):
        try:
            conn = sqlite3.connect(CONVERSATION_SUMMARIES_DB, timeout=3.0)
            cur = conn.cursor()
            cur.execute("SELECT conversation_id, title, preview, project_id, workspace_uris, app_data_dir FROM conversation_summaries")
            for row in cur.fetchall():
                cid, title, preview, pid, w_uris, app_data = row
                meta[cid] = {
                    "title": title or preview or "",
                    "preview": preview or "",
                    "project_id": pid or "outside-of-project",
                    "workspace_uris": w_uris or "",
                    "app_data_dir": app_data or "antigravity"
                }
            conn.close()
        except Exception:
            pass
    return meta

def list_conversations(account=None, project_id=None):
    """
    List all local conversations with metadata (title, project, assigned accounts,
    last modified, size, artifacts).
    """
    ensure_dirs()
    manifest = load_profile_sync_manifest()
    project_profiles = manifest.get("project_profiles", {})
    conv_profiles = manifest.get("conversation_profiles", {})
    db_meta = get_conversation_summaries_metadata()

    db_files = glob.glob(os.path.join(CONVERSATIONS_DIR, '*.db'))
    conversations = []

    for db_path in db_files:
        basename = os.path.basename(db_path)
        conv_id = os.path.splitext(basename)[0]
        
        # Skip WAL/SHM temporary files
        if '-wal' in conv_id or '-shm' in conv_id:
            continue

        try:
            stat = os.stat(db_path)
            mtime = stat.st_mtime
            size_kb = round(stat.st_size / 1024, 1)
            
            brain_folder = os.path.join(BRAIN_DIR, conv_id)
            has_brain = os.path.isdir(brain_folder)
            
            c_meta = db_meta.get(conv_id, {})
            c_pid = c_meta.get("project_id") or "outside-of-project"
            
            # Resolve project title
            p_prof = project_profiles.get(c_pid, {})
            p_name = p_prof.get("name") or c_pid
            
            # Determine assigned accounts:
            # 1. Explicit conversation assignment in manifest
            # 2. Inherited from project assignment
            # 3. Default to Primary Account
            if conv_id in conv_profiles and conv_profiles[conv_id].get("assigned_accounts"):
                assigned_accounts = conv_profiles[conv_id]["assigned_accounts"]
            elif c_pid in project_profiles and project_profiles[c_pid].get("assigned_accounts"):
                assigned_accounts = project_profiles[c_pid]["assigned_accounts"]
            else:
                assigned_accounts = [PRIMARY_ACCOUNT]

            if project_id and c_pid != project_id:
                continue

            if account:
                acc_clean = norm_account(account)
                if not any(acc_clean.lower() == norm_account(a).lower() for a in assigned_accounts):
                    continue

            title = c_meta.get("title") or get_conversation_title(conv_id)
            dt_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')

            conversations.append({
                'id': conv_id,
                'title': title,
                'project_id': c_pid,
                'project_name': p_name,
                'assigned_accounts': assigned_accounts,
                'is_in_instance2': any(SECONDARY_ACCOUNT.lower() in a.lower() for a in assigned_accounts),
                'last_modified': dt_str,
                'timestamp': mtime,
                'size_kb': size_kb,
                'has_brain': has_brain
            })
        except Exception:
            continue

    # Sort descending by last modified
    conversations.sort(key=lambda x: x['timestamp'], reverse=True)
    return conversations

def get_allowed_conversations(account):
    """
    Returns list of conversation IDs allowed for the given account/instance.
    Used for selective DOM filtering in Antigravity.
    """
    target = norm_account(account)
    convs = list_conversations(account=target)
    allowed = [c["id"] for c in convs]
    if not allowed:
        all_convs = list_conversations()
        return [c["id"] for c in all_convs]
    return allowed

def assign_conversation_account(conv_id, account, action='add'):
    """Add or remove an account from a conversation's active assignment."""
    manifest = load_profile_sync_manifest()
    c_prof = manifest.setdefault("conversation_profiles", {}).setdefault(conv_id, {"assigned_accounts": []})
    assigned = [norm_account(a) for a in c_prof.get("assigned_accounts", []) if a]

    acc_target = norm_account(account)
    if action == 'add':
        if acc_target and acc_target not in assigned:
            assigned.append(acc_target)
    elif action == 'remove':
        assigned = [a for a in assigned if a.lower() != acc_target.lower()]
        if not assigned:
            assigned = [PRIMARY_ACCOUNT]

    c_prof["assigned_accounts"] = assigned

    # Synchronize account conversation index lists
    for acc in [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT, acc_target]:
        if not acc:
            continue
        acc_dict = manifest.setdefault("accounts", {}).setdefault(acc, {"projects": [], "conversations": []})
        c_list = acc_dict.setdefault("conversations", [])
        if any(acc.lower() == a.lower() for a in assigned):
            if conv_id not in c_list:
                c_list.append(conv_id)
        else:
            if conv_id in c_list:
                c_list.remove(conv_id)

    save_profile_sync_manifest(manifest)
    return {"success": True, "conversation_id": conv_id, "assigned_accounts": assigned}

# ==============================================================================
# 3. SCHEDULED TASKS ISOLATION ENGINE
# ==============================================================================

def load_task_manifest():
    """
    Load task isolation manifest controlling which account and instance
    can run or trigger scheduled tasks / crons.
    """
    ensure_dirs()
    if os.path.exists(TASK_ISOLATION_MANIFEST_PATH):
        try:
            with open(TASK_ISOLATION_MANIFEST_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass

    # Default isolation rules for identified Windows tasks
    default_manifest = {
        "version": "2.0",
        "updated_at": datetime.datetime.now().isoformat(),
        "tasks": {
            "SamansaDailySEOAgent": {
                "name": "SamansaDailySEOAgent",
                "owner_account": PRIMARY_ACCOUNT,
                "allowed_instances": ["instance_1"],
                "isolated_from_account2": True,
                "enabled": True,
                "system_type": "windows_scheduled_task",
                "project_path": os.path.expandvars(r"%USERPROFILE%\Desktop\agent-helper\samansa SEO Agent"),
                "description": "Daily SEO Agent Runner (12:30 PM)"
            },
            "NabiPerfume_Daily_SEO": {
                "name": "NabiPerfume_Daily_SEO",
                "owner_account": PRIMARY_ACCOUNT,
                "allowed_instances": ["instance_1"],
                "isolated_from_account2": True,
                "enabled": True,
                "system_type": "windows_scheduled_task",
                "project_path": os.path.expandvars(r"%USERPROFILE%\Desktop\agent-helper\nabi perfume SEO"),
                "description": "Nabi Perfume SEO Automation"
            },
            "Nabi_Daily_SEO_1230": {
                "name": "Nabi_Daily_SEO_1230",
                "owner_account": PRIMARY_ACCOUNT,
                "allowed_instances": ["instance_1"],
                "isolated_from_account2": True,
                "enabled": True,
                "system_type": "windows_scheduled_task",
                "project_path": os.path.expandvars(r"%USERPROFILE%\Desktop\agent-helper\nabi perfume SEO"),
                "description": "Nabi Daily SEO 12:30 Trigger"
            },
            "AntigravityQuotaMonitor": {
                "name": "AntigravityQuotaMonitor",
                "owner_account": "shared",
                "allowed_instances": ["instance_1", "instance_2"],
                "isolated_from_account2": False,
                "enabled": True,
                "system_type": "windows_scheduled_task",
                "project_path": "",
                "description": "Real-time Multi-Instance Quota Auto-Sync Daemon"
            }
        },
        "account_rules": {
            PRIMARY_ACCOUNT: {
                "allow_running_tasks": True,
                "assigned_tasks": ["SamansaDailySEOAgent", "NabiPerfume_Daily_SEO", "Nabi_Daily_SEO_1230", "AntigravityQuotaMonitor"]
            },
            SECONDARY_ACCOUNT: {
                "allow_running_tasks": True,
                "assigned_tasks": ["AntigravityQuotaMonitor"],
                "blocked_tasks": ["SamansaDailySEOAgent", "NabiPerfume_Daily_SEO", "Nabi_Daily_SEO_1230"]
            }
        }
    }
    save_task_manifest(default_manifest)
    return default_manifest

def save_task_manifest(manifest):
    """Safely persist task isolation manifest."""
    ensure_dirs()
    manifest["updated_at"] = datetime.datetime.now().isoformat()
    try:
        temp_path = f"{TASK_ISOLATION_MANIFEST_PATH}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        if os.path.exists(TASK_ISOLATION_MANIFEST_PATH):
            os.replace(temp_path, TASK_ISOLATION_MANIFEST_PATH)
        else:
            os.rename(temp_path, TASK_ISOLATION_MANIFEST_PATH)
        return True
    except Exception:
        try:
            with open(TASK_ISOLATION_MANIFEST_PATH, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False

_tasks_cache = {}
_tasks_cache_time = 0

def discover_windows_scheduled_tasks(force=False):
    """Query live Windows Scheduled Tasks matching agent or developer keywords."""
    global _tasks_cache, _tasks_cache_time
    now = time.time()
    if not force and _tasks_cache and (now - _tasks_cache_time < 60):
        return _tasks_cache

    tasks = {}
    ignore_prefixes = ['microsoft\\', 'asus\\', 'agent activation runtime', 'adobe\\', 'google\\']
    try:
        cmd = ['schtasks', '/query', '/fo', 'csv', '/nh']
        kwargs = {'capture_output': True, 'text': True, 'errors': 'ignore'}
        if platform.system().lower() == 'windows':
            kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            try:
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                si.wShowWindow = subprocess.SW_HIDE
                kwargs['startupinfo'] = si
            except Exception:
                pass
        res = subprocess.run(cmd, **kwargs)
        for line in res.stdout.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            parts = [p.strip().strip('"') for p in line.split('","')]
            if not parts:
                continue
            tname = parts[0].lstrip('\\')
            tname_lower = tname.lower()
            if any(tname_lower.startswith(pref) for pref in ignore_prefixes):
                continue
            if any(k in tname_lower for k in ['antigravity', 'samansa', 'seo', 'agent', 'nabi', 'quota']):
                next_run = parts[1] if len(parts) > 1 else "N/A"
                status = parts[2] if len(parts) > 2 else "Unknown"
                tasks[tname] = {
                    "name": tname,
                    "next_run": next_run,
                    "status": status,
                    "enabled": (status.lower() != "disabled")
                }
        _tasks_cache = tasks
        _tasks_cache_time = now
    except Exception:
        pass
    return tasks

def list_scheduled_tasks(account=None):
    """
    List all developer / agent scheduled tasks with isolation states, assigned accounts, and owner accounts.
    """
    manifest = load_task_manifest()
    known_tasks = manifest.get("tasks", {})
    live_tasks = discover_windows_scheduled_tasks()

    all_names = set(known_tasks.keys()).union(set(live_tasks.keys()))
    task_list = []

    for name in all_names:
        m_info = known_tasks.get(name, {})
        l_info = live_tasks.get(name, {})

        owner = m_info.get("owner_account", PRIMARY_ACCOUNT)
        
        # Dynamic multi-account assignment support
        assigned = m_info.get("assigned_accounts")
        if assigned is None:
            is_isolated = m_info.get("isolated_from_account2", (owner.lower() == PRIMARY_ACCOUNT.lower()))
            if is_isolated:
                assigned = [owner]
            else:
                assigned = [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT] if SECONDARY_ACCOUNT else [PRIMARY_ACCOUNT]
        clean_assigned = [norm_account(a) for a in assigned if a]

        disabled_all = m_info.get("disabled_all", len(clean_assigned) == 0)
        enabled_all = m_info.get("enabled_all", False)
        
        status = l_info.get("status") or ("Ready" if m_info.get("enabled", True) and not disabled_all else "Disabled")
        enabled = (status.lower() != "disabled") and m_info.get("enabled", True) and not disabled_all
        next_run = l_info.get("next_run", "Scheduled")
        desc = m_info.get("description") or f"Scheduled Agent Task: {name}"

        # If user wants to filter by account
        if account:
            acc_clean = norm_account(account)
            if acc_clean and not any(a.lower() == acc_clean.lower() for a in clean_assigned):
                status = f"Isolated (Blocked in {acc_clean})"
                enabled = False

        quota_account = norm_account(m_info.get("quota_account") or owner)

        task_list.append({
            "name": name,
            "task_name": name,
            "owner_account": owner,
            "quota_account": quota_account,
            "assigned_accounts": clean_assigned,
            "disabled_all": disabled_all,
            "enabled_all": enabled_all,
            "status": status,
            "enabled": enabled,
            "isolated_from_account2": (SECONDARY_ACCOUNT not in clean_assigned),
            "allowed_instances": m_info.get("allowed_instances", ["instance_1", "instance_2"]),
            "next_run": next_run,
            "description": desc,
            "project_path": m_info.get("project_path", "")
        })

    task_list.sort(key=lambda x: (x["owner_account"] == "shared", x["name"]))
    return task_list

def set_task_account_assignment(task_name, accounts, enabled=None):
    """
    Assign arbitrary accounts to a scheduled task or toggle an account on/off.
    accounts can be a list of account emails, or a single account string with enabled (True/False).
    """
    manifest = load_task_manifest()
    tasks = manifest.setdefault("tasks", {})
    task_entry = tasks.setdefault(task_name, {
        "name": task_name,
        "system_type": "windows_scheduled_task"
    })

    existing = task_entry.get("assigned_accounts")
    if existing is None:
        owner = norm_account(task_entry.get("owner_account", PRIMARY_ACCOUNT))
        is_iso = task_entry.get("isolated_from_account2", True)
        existing = [owner] if is_iso else ([PRIMARY_ACCOUNT, SECONDARY_ACCOUNT] if SECONDARY_ACCOUNT else [PRIMARY_ACCOUNT])
    existing = [norm_account(a) for a in existing if a]

    if isinstance(accounts, str):
        target = norm_account(accounts)
        if enabled is False:
            existing = [a for a in existing if norm_account(a).lower() != target.lower()]
        elif enabled is True:
            if not any(norm_account(a).lower() == target.lower() for a in existing):
                existing.append(target)
        else:
            existing = [target]
        clean_accounts = existing
    else:
        clean_accounts = list(dict.fromkeys([norm_account(a) for a in accounts if a and norm_account(a)]))

    disabled_all = (len(clean_accounts) == 0)
    task_entry["assigned_accounts"] = clean_accounts
    task_entry["disabled_all"] = disabled_all
    task_entry["enabled_all"] = False
    task_entry["enabled"] = not disabled_all
    task_entry["isolated_from_account2"] = (norm_account(SECONDARY_ACCOUNT).lower() not in [a.lower() for a in clean_accounts])
    
    # Sync system schtasks status if on Windows
    if disabled_all:
        try:
            cmd = ['schtasks', '/change', '/tn', task_name, '/disable']
            kwargs = {'capture_output': True, 'text': True}
            if platform.system().lower() == 'windows':
                kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            subprocess.run(cmd, **kwargs)
        except Exception:
            pass
    elif len(clean_accounts) > 0:
        try:
            cmd = ['schtasks', '/change', '/tn', task_name, '/enable']
            kwargs = {'capture_output': True, 'text': True}
            if platform.system().lower() == 'windows':
                kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            subprocess.run(cmd, **kwargs)
        except Exception:
            pass

    save_task_manifest(manifest)
    return {
        "success": True,
        "task_name": task_name,
        "assigned_accounts": clean_accounts,
        "disabled_all": disabled_all,
        "enabled": not disabled_all
    }

def toggle_task_all(task_name, state="all"):
    """Enable or disable a scheduled task for all saved accounts."""
    manifest = load_task_manifest()
    tasks = manifest.setdefault("tasks", {})
    task_entry = tasks.setdefault(task_name, {
        "name": task_name,
        "system_type": "windows_scheduled_task"
    })

    if state == "all":
        man_path = os.path.join(ACCOUNTS_DIR, 'manifest.json')
        saved_accs = []
        if os.path.exists(man_path):
            try:
                with open(man_path, 'r', encoding='utf-8') as f:
                    saved_accs = list(json.load(f).keys())
            except Exception:
                pass
        if not saved_accs:
            saved_accs = [PRIMARY_ACCOUNT]
            if SECONDARY_ACCOUNT:
                saved_accs.append(SECONDARY_ACCOUNT)
        
        task_entry["assigned_accounts"] = saved_accs
        task_entry["enabled_all"] = True
        task_entry["disabled_all"] = False
        task_entry["enabled"] = True
        task_entry["isolated_from_account2"] = False
        
        try:
            cmd = ['schtasks', '/change', '/tn', task_name, '/enable']
            kwargs = {'capture_output': True, 'text': True}
            if platform.system().lower() == 'windows':
                kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            subprocess.run(cmd, **kwargs)
        except Exception:
            pass
    else:
        task_entry["assigned_accounts"] = []
        task_entry["enabled_all"] = False
        task_entry["disabled_all"] = True
        task_entry["enabled"] = False
        task_entry["isolated_from_account2"] = True

        try:
            cmd = ['schtasks', '/change', '/tn', task_name, '/disable']
            kwargs = {'capture_output': True, 'text': True}
            if platform.system().lower() == 'windows':
                kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            subprocess.run(cmd, **kwargs)
        except Exception:
            pass

    save_task_manifest(manifest)
    return {
        "success": True,
        "task_name": task_name,
        "state": state,
        "assigned_accounts": task_entry["assigned_accounts"],
        "enabled": task_entry["enabled"]
    }

def get_task_quota_account(task_name):
    """Retrieve the designated quota payer account for a scheduled task."""
    manifest = load_task_manifest()
    task_entry = manifest.get("tasks", {}).get(task_name, {})
    return norm_account(task_entry.get("quota_account") or task_entry.get("owner_account") or PRIMARY_ACCOUNT)

def set_task_quota_account(task_name, account):
    """
    Explicitly set which account's quota is consumed when this scheduled task executes.
    Ensures that account is in assigned_accounts so it can run the task.
    """
    manifest = load_task_manifest()
    tasks = manifest.setdefault("tasks", {})
    task_entry = tasks.setdefault(task_name, {
        "name": task_name,
        "system_type": "windows_scheduled_task"
    })
    clean_acc = norm_account(account)
    task_entry["quota_account"] = clean_acc
    assigned = [norm_account(x) for x in task_entry.get("assigned_accounts", []) if x]
    if clean_acc and not any(a.lower() == clean_acc.lower() for a in assigned):
        assigned.append(clean_acc)
        task_entry["assigned_accounts"] = assigned
        task_entry["disabled_all"] = False

    # Sync quota_account into task project_path config.json if present
    p_path = task_entry.get("project_path")
    if p_path and os.path.isdir(p_path):
        cfg_path = os.path.join(p_path, "config.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as cf:
                    cfg_data = json.load(cf)
                cfg_data["quota_account"] = clean_acc
                with open(cfg_path, "w", encoding="utf-8") as cf:
                    json.dump(cfg_data, cf, indent=2, ensure_ascii=False)
            except Exception:
                pass

    save_task_manifest(manifest)
    return {
        "success": True,
        "task_name": task_name,
        "quota_account": clean_acc,
        "assigned_accounts": task_entry["assigned_accounts"]
    }

def set_task_isolation(task_name, owner_account=PRIMARY_ACCOUNT, isolate_from_account2=True, allowed_instances=None, requesting_account=None):
    """
    Update a task's isolation parameters.
    When isolate_from_account2 is True, Account 2 (Instance 2) is strictly prohibited
    from triggering, enabling, or running this task.
    """
    manifest = load_task_manifest()
    tasks = manifest.setdefault("tasks", {})
    task_entry = tasks.setdefault(task_name, {
        "name": task_name,
        "system_type": "windows_scheduled_task"
    })

    owner_clean = norm_account(task_entry.get("owner_account") or owner_account) or PRIMARY_ACCOUNT

    # Permission check: Block Secondary Account from altering isolation of Primary tasks
    if not requesting_account:
        if os.environ.get("ANTIGRAVITY_INSTANCE_ID") == "instance_2" or os.environ.get("ANTIGRAVITY_ACCOUNT") == SECONDARY_ACCOUNT:
            requesting_account = SECONDARY_ACCOUNT

    if requesting_account:
        req_clean = norm_account(requesting_account)
        if req_clean == SECONDARY_ACCOUNT and owner_clean != SECONDARY_ACCOUNT:
            return {
                "success": False,
                "error": f"مجوز رد شد: تغییر وضعیت ایزولاسیون تسک '{task_name}' متعلق به {owner_clean} از اکانت دوم مجاز نیست."
            }
    task_entry["owner_account"] = owner_clean
    task_entry["isolated_from_account2"] = bool(isolate_from_account2)
    if allowed_instances is not None:
        task_entry["allowed_instances"] = allowed_instances
    else:
        task_entry["allowed_instances"] = ["instance_1"] if isolate_from_account2 else ["instance_1", "instance_2"]

    # Update account_rules
    sec_rules = manifest.setdefault("account_rules", {}).setdefault(SECONDARY_ACCOUNT, {})
    blocked = sec_rules.setdefault("blocked_tasks", [])
    if isolate_from_account2:
        if task_name not in blocked:
            blocked.append(task_name)
    else:
        if task_name in blocked:
            blocked.remove(task_name)

    save_task_manifest(manifest)
    return {
        "success": True,
        "task": task_name,
        "owner_account": owner_clean,
        "isolated_from_account2": isolate_from_account2,
        "allowed_instances": task_entry["allowed_instances"]
    }

def toggle_task_state(task_name, enable=True, requesting_account=None):
    """
    Safely enable or disable a scheduled task with isolation safeguards.
    If requesting_account is secondary account / instance_2 and the task is owned by primary account,
    it strictly denies the operation to prevent cross-account contamination.
    """
    manifest = load_task_manifest()
    task_entry = manifest.get("tasks", {}).get(task_name, {})
    owner = norm_account(task_entry.get("owner_account", PRIMARY_ACCOUNT))
    is_isolated = task_entry.get("isolated_from_account2", True)

    # Permission check: Block Secondary Account from modifying isolated Primary tasks
    if not requesting_account:
        if os.environ.get("ANTIGRAVITY_INSTANCE_ID") == "instance_2" or os.environ.get("ANTIGRAVITY_ACCOUNT") == SECONDARY_ACCOUNT:
            requesting_account = SECONDARY_ACCOUNT

    if requesting_account:
        req_clean = norm_account(requesting_account)
        if req_clean == SECONDARY_ACCOUNT and is_isolated and owner != SECONDARY_ACCOUNT:
            return {
                "success": False,
                "error": f"مجوز رد شد: تسک '{task_name}' متعلق به اکانت {owner} است و در اکانت دوم ایزوله شده است. امکان فعال‌سازی یا تغییر وضعیت آن از اکانت دوم وجود ندارد."
            }

    # Execute system schtasks change if on Windows
    action_flag = '/enable' if enable else '/disable'
    try:
        cmd = ['schtasks', '/change', '/tn', task_name, action_flag]
        kwargs = {'capture_output': True, 'text': True}
        if platform.system().lower() == 'windows':
            kwargs['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
            try:
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                si.wShowWindow = subprocess.SW_HIDE
                kwargs['startupinfo'] = si
            except Exception:
                pass
        res = subprocess.run(cmd, **kwargs)
        if res.returncode != 0 and 'ERROR' in res.stderr:
            pass
    except Exception:
        pass

    # Update manifest
    manifest.setdefault("tasks", {}).setdefault(task_name, {})["enabled"] = bool(enable)
    save_task_manifest(manifest)

    state_str = "فعال" if enable else "غیرفعال"
    return {
        "success": True,
        "task": task_name,
        "enabled": enable,
        "msg": f"تسک '{task_name}' با موفقیت {state_str} شد."
    }

def check_task_guard(task_name, current_account=None, instance_id=None):
    """
    Runtime execution guard for scheduled tasks, cron jobs, and background runners.
    Returns whether current_account and instance_id are permitted to run task_name.
    Strict multi-account assignment checking.
    """
    manifest = load_task_manifest()
    task_entry = manifest.get("tasks", {}).get(task_name)
    if not task_entry:
        return {"allowed": True, "reason": "Unmanaged task"}

    if task_entry.get("disabled_all") is True or task_entry.get("enabled") is False:
        return {
            "allowed": False,
            "reason": f"Task '{task_name}' is explicitly disabled for all accounts."
        }

    curr_instance = instance_id or os.environ.get("ANTIGRAVITY_INSTANCE_ID", "instance_1")

    if not current_account:
        try:
            import sync_daemon
            current_account = sync_daemon.get_instance_active_account(curr_instance)
        except Exception:
            pass
        if not current_account:
            # Check active_<instance_id>.txt
            f_inst = os.path.join(ACCOUNTS_DIR, f"active_{curr_instance}.txt")
            if os.path.exists(f_inst):
                try:
                    with open(f_inst, "r", encoding="utf-8") as f:
                        current_account = f.read().strip()
                except Exception:
                    pass
        if not current_account:
            active_quota_file = os.path.join(ANTIGRAVITY_DIR, 'active_quota.json')
            if os.path.exists(active_quota_file):
                try:
                    with open(active_quota_file, 'r', encoding='utf-8') as f:
                        q = json.load(f)
                        current_account = q.get('email')
                except Exception:
                    pass
        if not current_account:
            current_account = PRIMARY_ACCOUNT

    curr_clean = norm_account(current_account)
    quota_acc = norm_account(task_entry.get("quota_account") or task_entry.get("owner_account") or PRIMARY_ACCOUNT)

    # Multi-account assignment check
    assigned = task_entry.get("assigned_accounts")
    if assigned is not None:
        clean_assigned = [norm_account(a).lower() for a in assigned if a]
        if curr_clean.lower() not in clean_assigned:
            return {
                "allowed": False,
                "quota_account": quota_acc,
                "reason": f"Task '{task_name}' is assigned only to {assigned}, blocked for '{curr_clean}'."
            }
        return {"allowed": True, "assigned_accounts": assigned, "quota_account": quota_acc}

    # Backward compatibility fallback:
    owner = norm_account(task_entry.get("owner_account", PRIMARY_ACCOUNT))
    allowed_instances = task_entry.get("allowed_instances", ["instance_1"])
    isolated2 = task_entry.get("isolated_from_account2", False)

    if allowed_instances and curr_instance not in allowed_instances:
        return {
            "allowed": False,
            "owner": owner,
            "quota_account": quota_acc,
            "reason": f"Task '{task_name}' is restricted to {allowed_instances}, current instance is '{curr_instance}'."
        }

    if curr_clean == SECONDARY_ACCOUNT and (isolated2 or owner != SECONDARY_ACCOUNT):
        return {
            "allowed": False,
            "owner": owner,
            "quota_account": quota_acc,
            "reason": f"Task '{task_name}' is assigned to '{owner}' and blocked for account 2 ('{curr_clean}')."
        }

    if curr_clean == PRIMARY_ACCOUNT and owner == SECONDARY_ACCOUNT:
        return {
            "allowed": False,
            "owner": owner,
            "quota_account": quota_acc,
            "reason": f"Task '{task_name}' is assigned to '{owner}' and blocked for account 1 ('{curr_clean}')."
        }

    return {"allowed": True, "owner": owner, "quota_account": quota_acc}

def get_account_environment(account_email):
    """
    Returns an environment dictionary configured for a specific account,
    including its fresh OAuth token, API keys, and account identifiers.
    """
    env = os.environ.copy()
    clean_acc = norm_account(account_email)
    env["ANTIGRAVITY_ACCOUNT"] = clean_acc
    env["ANTIGRAVITY_QUOTA_ACCOUNT"] = clean_acc
    
    tok_file = os.path.join(ACCOUNTS_DIR, f"{clean_acc}.token")
    if os.path.exists(tok_file):
        try:
            with open(tok_file, 'r', encoding='utf-8') as f:
                raw_tok = f.read().strip()
            import quota_engine
            fresh_tok = quota_engine.ensure_fresh_token(raw_tok, account_email=clean_acc)
            if fresh_tok:
                access_tok = fresh_tok
                if "access_token" in fresh_tok:
                    try:
                        d = json.loads(fresh_tok)
                        access_tok = d.get("token", {}).get("access_token") or d.get("access_token") or fresh_tok
                    except Exception:
                        pass
                env["GEMINI_CLI_OAUTH_TOKEN"] = access_tok
                env["GOOGLE_OAUTH_ACCESS_TOKEN"] = access_tok
        except Exception:
            pass
    return env

def run_guarded_task(task_name, custom_command=None):
    """
    Executes a task under its designated quota_account credentials,
    enforcing guard rules and capturing execution status.
    """
    manifest = load_task_manifest()
    task_entry = manifest.get("tasks", {}).get(task_name, {})
    quota_acc = norm_account(task_entry.get("quota_account") or task_entry.get("owner_account") or PRIMARY_ACCOUNT)
    
    guard = check_task_guard(task_name, current_account=quota_acc)
    if not guard.get("allowed"):
        return {"success": False, "error": f"Task guard blocked execution: {guard.get('reason')}", "quota_account": quota_acc}

    env = get_account_environment(quota_acc)
    cmd = custom_command
    if not cmd:
        proj_path = task_entry.get("project_path", "")
        if "Samansa" in task_name and proj_path:
            cmd = [sys.executable, os.path.join(proj_path, "daily_seo_runner.py"), "--batch-size", "30"]
        elif "Nabi" in task_name and proj_path:
            bat_path = os.path.join(proj_path, "run_daily_seo.bat")
            if os.path.exists(bat_path):
                cmd = ["cmd.exe", "/c", bat_path]
            else:
                cmd = [sys.executable, os.path.join(proj_path, "daily_seo_runner.py"), "--all"]
        else:
            return {"success": False, "error": f"No execution command configured for task '{task_name}'", "quota_account": quota_acc}

    try:
        kwargs = {"env": env}
        if platform.system().lower() == "windows":
            kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        proc = subprocess.Popen(cmd, **kwargs)
        return {
            "success": True,
            "task_name": task_name,
            "pid": proc.pid,
            "quota_account": quota_acc,
            "msg": f"تسک '{task_name}' با سهمیه اکانت '{quota_acc}' اجرا شد (PID: {proc.pid})"
        }
    except Exception as e:
        return {"success": False, "error": str(e), "quota_account": quota_acc}

# ==============================================================================
# 4. SAFETY BACKUP & CONVERSATION CLONING / MERGING
# ==============================================================================

def create_safety_backup(conv_ids):
    """Create a safety backup archive of targeted conversations before migration."""
    ensure_dirs()
    ts = time.strftime('%Y%m%d_%H%M%S')
    backup_target = os.path.join(BACKUP_DIR, f"pre_migration_{ts}")
    os.makedirs(backup_target, exist_ok=True)
    
    for cid in conv_ids:
        src_db = os.path.join(CONVERSATIONS_DIR, f"{cid}.db")
        if os.path.exists(src_db):
            shutil.copy2(src_db, os.path.join(backup_target, f"{cid}.db"))
        src_brain = os.path.join(BRAIN_DIR, cid)
        if os.path.exists(src_brain):
            shutil.copytree(src_brain, os.path.join(backup_target, f"brain_{cid}"), dirs_exist_ok=True)
            
    return backup_target

def clone_single_conversation(source_cid, new_cid=None, target_account=None):
    """
    Clone a single conversation database and brain folder with a new UUID.
    Assigns the new conversation to target_account if provided.
    """
    if not new_cid:
        new_cid = str(uuid.uuid4())

    src_db = os.path.join(CONVERSATIONS_DIR, f"{source_cid}.db")
    dst_db = os.path.join(CONVERSATIONS_DIR, f"{new_cid}.db")

    if not os.path.exists(src_db):
        return None

    # Copy DB file
    shutil.copy2(src_db, dst_db)

    # Update internal cascade_id / trajectory_meta inside SQLite db
    try:
        conn = sqlite3.connect(dst_db)
        cursor = conn.cursor()
        cursor.execute("UPDATE trajectory_meta SET cascade_id = ?", (new_cid,))
        conn.commit()
        conn.close()
    except Exception:
        pass

    # Copy Brain folder
    src_brain = os.path.join(BRAIN_DIR, source_cid)
    dst_brain = os.path.join(BRAIN_DIR, new_cid)
    if os.path.exists(src_brain):
        shutil.copytree(src_brain, dst_brain, dirs_exist_ok=True)
        t_path = os.path.join(dst_brain, '.system_generated', 'logs', 'transcript.jsonl')
        if os.path.exists(t_path):
            try:
                with open(t_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                content = content.replace(source_cid, new_cid)
                with open(t_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            except Exception:
                pass

    # Also register cloned entry in conversation_summaries.db
    if os.path.exists(CONVERSATION_SUMMARIES_DB):
        try:
            conn_sum = sqlite3.connect(CONVERSATION_SUMMARIES_DB, timeout=3.0)
            c_sum = conn_sum.cursor()
            c_sum.execute("SELECT * FROM conversation_summaries WHERE conversation_id = ?", (source_cid,))
            row = c_sum.fetchone()
            if row:
                col_names = [d[0] for d in c_sum.description]
                row_dict = dict(zip(col_names, row))
                row_dict['conversation_id'] = new_cid
                if target_account and (target_account == 'instance_2' or norm_account(target_account) == get_secondary_account()):
                    row_dict['app_data_dir'] = 'antigravity-instance2'
                cols = list(row_dict.keys())
                placeholders = ", ".join(["?"] * len(cols))
                insert_sql = f"INSERT OR REPLACE INTO conversation_summaries ({', '.join(cols)}) VALUES ({placeholders})"
                c_sum.execute(insert_sql, list(row_dict.values()))
                conn_sum.commit()
            conn_sum.close()
        except Exception:
            pass

    # Update profile sync manifest
    if target_account:
        assign_conversation_account(new_cid, target_account, action='add')

    return new_cid

def merge_conversations(conv_ids, target_title="Merged Project Timeline", target_account=None):
    """
    Consolidate multiple selected conversation threads into a single master conversation.
    """
    if not conv_ids:
        return None

    primary_cid = conv_ids[0]
    merged_cid = str(uuid.uuid4())
    
    clone_single_conversation(primary_cid, merged_cid, target_account=target_account)
    dst_db = os.path.join(CONVERSATIONS_DIR, f"{merged_cid}.db")
    
    try:
        conn_dst = sqlite3.connect(dst_db)
        c_dst = conn_dst.cursor()

        for sec_cid in conv_ids[1:]:
            sec_db = os.path.join(CONVERSATIONS_DIR, f"{sec_cid}.db")
            if not os.path.exists(sec_db):
                continue
            conn_sec = sqlite3.connect(sec_db)
            c_sec = conn_sec.cursor()
            
            c_sec.execute("SELECT * FROM steps")
            sec_steps = c_sec.fetchall()
            col_names = [d[0] for d in c_sec.description]
            placeholders = ", ".join(["?"] * len(col_names))
            insert_query = f"INSERT INTO steps ({', '.join(col_names)}) VALUES ({placeholders})"
            
            for row in sec_steps:
                try:
                    c_dst.execute(insert_query, row)
                except Exception:
                    pass
            conn_sec.close()

        conn_dst.commit()
        conn_dst.close()
    except Exception:
        pass

    return merged_cid

def setup_dual_sync(account_a, account_b, sync_pairs):
    """Register dual-sync pair mappings in sync_manifest.json."""
    ensure_dirs()
    manifest = {}
    if os.path.exists(SYNC_MANIFEST_PATH):
        try:
            with open(SYNC_MANIFEST_PATH, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    pair_key = f"{account_a}<->{account_b}"
    if pair_key not in manifest:
        manifest[pair_key] = {
            'account_a': account_a,
            'account_b': account_b,
            'pairs': [],
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'auto_sync': True
        }

    for p in sync_pairs:
        manifest[pair_key]['pairs'].append(p)

    with open(SYNC_MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def migrate_conversations(conv_ids, source_account, target_account, mode='copy', structure='separate', dual_sync=False, project_id=None):
    """
    Main migration controller:
    - mode: 'copy' (keep in source) or 'move' (remove from source)
    - structure: 'separate' (distinct threads) or 'merge' (single consolidated project)
    - dual_sync: boolean
    """
    if not conv_ids:
        return {'success': False, 'error': 'No conversations specified'}

    backup_path = create_safety_backup(conv_ids)
    results = []

    if structure == 'merge':
        merged_id = merge_conversations(conv_ids, target_account=target_account)
        if merged_id:
            results.append({
                'source_ids': conv_ids,
                'target_id': merged_id,
                'type': 'merged'
            })
            if mode == 'move':
                for cid in conv_ids:
                    delete_conversation(cid)
            if dual_sync:
                setup_dual_sync(source_account, target_account, [{'source': conv_ids, 'target': merged_id}])
    else:
        sync_pairs = []
        for cid in conv_ids:
            new_cid = clone_single_conversation(cid, target_account=target_account)
            if new_cid:
                results.append({
                    'source_id': cid,
                    'target_id': new_cid,
                    'type': 'cloned'
                })
                sync_pairs.append({'source': cid, 'target': new_cid})
                if mode == 'move':
                    delete_conversation(cid)

        if dual_sync and sync_pairs:
            setup_dual_sync(source_account, target_account, sync_pairs)

    # If associated project given, also assign project to target_account
    if project_id:
        sync_project_to_account(project_id, target_account, include_conversations=False)

    return {
        'success': True,
        'mode': mode,
        'structure': structure,
        'migrated_count': len(results),
        'results': results,
        'backup_path': backup_path
    }

def delete_conversation(conv_id):
    """Safely delete a conversation database and its brain folder."""
    db_path = os.path.join(CONVERSATIONS_DIR, f"{conv_id}.db")
    for f in [db_path, f"{db_path}-wal", f"{db_path}-shm"]:
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass
    brain_path = os.path.join(BRAIN_DIR, conv_id)
    if os.path.exists(brain_path):
        try:
            shutil.rmtree(brain_path, ignore_errors=True)
        except Exception:
            pass

    # Remove from conversation_summaries.db
    if os.path.exists(CONVERSATION_SUMMARIES_DB):
        try:
            conn = sqlite3.connect(CONVERSATION_SUMMARIES_DB, timeout=3.0)
            cur = conn.cursor()
            cur.execute("DELETE FROM conversation_summaries WHERE conversation_id = ?", (conv_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

def is_account2(email):
    if not email:
        return False
    norm = str(email).lower().strip()
    return norm in ('instance_2', 'secondary_account', 'bombhub.apk@gmail.com') or 'bombhub' in norm or 'account2' in norm

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Antigravity Migration & Profile Isolation Engine")
    parser.add_argument('--list', action='store_true', help='List all conversations')
    parser.add_argument('--projects', action='store_true', help='List all projects')
    parser.add_argument('--tasks', action='store_true', help='List all scheduled tasks')
    parser.add_argument('--allowed-convs', help='List allowed conversation IDs for account')
    parser.add_argument('--check-task-guard', help='Check if task is permitted to execute')
    parser.add_argument('--run-task', help='Run scheduled task with its designated quota_account credentials')
    parser.add_argument('--account', help='Account email or instance alias to check against')
    args = parser.parse_args()

    if args.list:
        print(json.dumps(list_conversations(), indent=2, ensure_ascii=False))
    elif args.projects:
        print(json.dumps(list_projects(), indent=2, ensure_ascii=False))
    elif args.tasks:
        print(json.dumps(list_scheduled_tasks(), indent=2, ensure_ascii=False))
    elif args.allowed_convs:
        print(json.dumps(get_allowed_conversations(args.allowed_convs), indent=2, ensure_ascii=False))
    elif args.check_task_guard:
        guard_res = check_task_guard(args.check_task_guard, current_account=args.account)
        print(json.dumps(guard_res, indent=2, ensure_ascii=False))
        sys.exit(0 if guard_res.get("allowed") else 1)
    elif args.run_task:
        res = run_guarded_task(args.run_task)
        print(json.dumps(res, indent=2, ensure_ascii=False))
        sys.exit(0 if res.get("success") else 1)
    else:
        print("Antigravity Migration & Profile Isolation Engine Ready.")
