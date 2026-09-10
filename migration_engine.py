#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Migration & Transfer Engine
Author: Madgod-xyz (https://github.com/Madgod-xyz/antigravity-account-switcher)
Description:
    Safely inspects, clones, migrates, and syncs Antigravity project conversations
    and agent brains between different Google accounts.
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
SYNC_MANIFEST_PATH = os.path.join(ACCOUNTS_DIR, 'sync_manifest.json')

def ensure_dirs():
    """Ensure all required directories exist."""
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    os.makedirs(BRAIN_DIR, exist_ok=True)
    os.makedirs(ACCOUNTS_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

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

def list_conversations():
    """
    List all local conversations with metadata (title, last modified, size, artifacts).
    """
    ensure_dirs()
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
            
            title = get_conversation_title(conv_id)
            dt_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')

            conversations.append({
                'id': conv_id,
                'title': title,
                'last_modified': dt_str,
                'timestamp': mtime,
                'size_kb': size_kb,
                'has_brain': has_brain
            })
        except Exception as e:
            continue

    # Sort descending by last modified
    conversations.sort(key=lambda x: x['timestamp'], reverse=True)
    return conversations

def create_safety_backup(conv_ids):
    """Create a safety backup archive of targeted conversations before migration."""
    ensure_dirs()
    ts = time.strftime('%Y%m%d_%H%M%S')
    backup_target = os.path.join(BACKUP_DIR, f"pre_migration_{ts}")
    os.makedirs(backup_target, exist_ok=True)
    
    for cid in conv_ids:
        # Copy DB
        src_db = os.path.join(CONVERSATIONS_DIR, f"{cid}.db")
        if os.path.exists(src_db):
            shutil.copy2(src_db, os.path.join(backup_target, f"{cid}.db"))
        # Copy Brain
        src_brain = os.path.join(BRAIN_DIR, cid)
        if os.path.exists(src_brain):
            shutil.copytree(src_brain, os.path.join(backup_target, f"brain_{cid}"), dirs_exist_ok=True)
            
    return backup_target

def clone_single_conversation(source_cid, new_cid=None):
    """
    Clone a single conversation database and brain folder with a new UUID.
    Returns the new conversation UUID.
    """
    if not new_cid:
        new_cid = str(uuid.uuid4())

    src_db = os.path.join(CONVERSATIONS_DIR, f"{source_cid}.db")
    dst_db = os.path.join(CONVERSATIONS_DIR, f"{new_cid}.db")

    if not os.path.exists(src_db):
        return None

    # Copy DB file
    shutil.copy2(src_db, dst_db)

    # Update internal cascade_id / trajectory_meta inside the new SQLite db
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
        # Fix transcript paths inside brain if necessary
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

    return new_cid

def merge_conversations(conv_ids, target_title="Merged Project Timeline"):
    """
    Consolidate multiple selected conversation threads into a single master conversation.
    """
    if not conv_ids:
        return None

    # Use first conversation as template base
    primary_cid = conv_ids[0]
    merged_cid = str(uuid.uuid4())
    
    clone_single_conversation(primary_cid, merged_cid)
    dst_db = os.path.join(CONVERSATIONS_DIR, f"{merged_cid}.db")
    
    try:
        conn_dst = sqlite3.connect(dst_db)
        c_dst = conn_dst.cursor()

        # Append steps from secondary conversations
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
    """
    Register dual-sync pair mappings in sync_manifest.json.
    """
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

def migrate_conversations(conv_ids, source_account, target_account, mode='copy', structure='separate', dual_sync=False):
    """
    Main migration controller:
    - mode: 'copy' (keep in source) or 'move' (remove from source)
    - structure: 'separate' (distinct threads) or 'merge' (single consolidated project)
    - dual_sync: boolean
    """
    if not conv_ids:
        return {'success': False, 'error': 'No conversations specified'}

    # 1. Take safety snapshot
    backup_path = create_safety_backup(conv_ids)
    results = []

    if structure == 'merge':
        merged_id = merge_conversations(conv_ids)
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
        # Separate individual copies / moves
        sync_pairs = []
        for cid in conv_ids:
            new_cid = clone_single_conversation(cid)
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

if __name__ == '__main__':
    # CLI mode for testing / scripts
    if len(sys.argv) > 1 and sys.argv[1] == '--list':
        convs = list_conversations()
        print(json.dumps(convs, indent=2, ensure_ascii=False))
    else:
        print("Antigravity Migration Engine Ready.")
