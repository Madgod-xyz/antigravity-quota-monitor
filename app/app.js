/* ==========================================================================
   Antigravity Switcher & Migration Suite - Interactive Application Controller
   Author: Madgod-xyz (https://github.com/Madgod-xyz/antigravity-account-switcher)
   ========================================================================== */

let currentLang = 'en';
let state = {
  activeAccount: null,
  savedAccounts: {},
  conversations: [],
  migration: {
    sourceAccount: null,
    targetAccount: null,
    mode: 'copy',
    structure: 'separate',
    dualSync: false,
    selectedIds: new Set()
  }
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  detectInitialLanguage();
  initApplication();
  startCountdownTicker();
});

function detectInitialLanguage() {
  const saved = localStorage.getItem('agy_switcher_lang');
  if (saved && translations[saved]) {
    currentLang = saved;
  } else {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('fa')) currentLang = 'fa';
    else if (nav.startsWith('zh')) currentLang = 'zh';
    else if (nav.startsWith('es')) currentLang = 'es';
    else currentLang = 'en';
  }
  document.getElementById('langSelect').value = currentLang;
  applyTranslations();
}

function changeLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('agy_switcher_lang', lang);
  applyTranslations();
  renderAll();
}

function applyTranslations() {
  const t = translations[currentLang];
  document.documentElement.lang = currentLang;
  document.documentElement.dir = t.dir;
  document.body.style.fontFamily = t.font;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.innerText = t[key];
    }
  });

  const searchInput = document.getElementById('convSearchInput');
  if (searchInput && t.searchPlaceholder) {
    searchInput.placeholder = t.searchPlaceholder;
  }
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

// Data Fetching & Sync
async function initApplication() {
  try {
    // Check if initial payload is injected by runner
    if (window.INITIAL_PAYLOAD) {
      handlePayload(window.INITIAL_PAYLOAD);
      return;
    }

    // Try fetching from local bridge server if running
    const res = await fetch('/api/state').then(r => r.json()).catch(() => null);
    if (res) {
      handlePayload(res);
      return;
    }

    // Fallback load mock/demo for testing in standalone browser
    loadFallbackData();
  } catch (err) {
    loadFallbackData();
  }
}

function handlePayload(data) {
  state.activeAccount = data.activeAccount;
  state.savedAccounts = data.savedAccounts || {};
  state.conversations = data.conversations || [];
  renderAll();
}

function loadFallbackData() {
  state.activeAccount = {
    email: "madgod.cum@gmail.com",
    name: "Madgod",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKL_c03MxCossmd802Ci3aMxOH1oka7dLjgyC_xM0FnDA48xlA=s96-c",
    tier: "Google AI Pro",
    tier_code: "pro",
    session: {
      name: "Gemini 3.8 Flash High",
      used_pct: 34.1,
      remaining_pct: 65.9,
      resets_in: "57 min",
      reset_time: "07:27 PM",
      reset_secs: 3421,
      reset_iso: new Date(Date.now() + 57 * 60 * 1000).toISOString()
    },
    pools: [
      { name: "Gemini 3.8 Flash High", used_pct: 34.1, remaining_pct: 65.9, resets_in: "57 min", reset_secs: 3421 },
      { name: "Gemini 3.1 Pro", used_pct: 34.1, remaining_pct: 65.9, resets_in: "57 min", reset_secs: 3421 },
      { name: "Claude Sonnet 4.6", used_pct: 0.0, remaining_pct: 100.0, resets_in: "4 hr 59 min", reset_secs: 17900 },
      { name: "GPT-OSS 120B", used_pct: 0.0, remaining_pct: 100.0, resets_in: "4 hr 59 min", reset_secs: 17900 }
    ]
  };

  state.savedAccounts = {
    "madgod.cum@gmail.com": {
      email: "madgod.cum@gmail.com",
      label: "Madgod (Primary Dev)",
      tier: "Google AI Pro",
      tier_code: "pro",
      remaining_pct: 65.9,
      saved_at: "2026-09-10 18:00"
    }
  };

  renderAll();
}

// Native Bridge Call
function callNative(action, payload = {}) {
  const req = { action, payload, timestamp: Date.now() };

  // Windows WebView2 Bridge
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage(req);
    return;
  }

  // WebKit / macOS Bridge
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
    window.webkit.messageHandlers.nativeBridge.postMessage(req);
    return;
  }

  // Local HTTP API Fallback
  fetch('/api/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {
    console.log("Native bridge called:", action, payload);
  });
}

// Render Functions
function renderAll() {
  renderActiveAccount();
  renderSavedAccounts();
}

function renderActiveAccount() {
  const acc = state.activeAccount;
  if (!acc) {
    document.getElementById('userName').innerText = t('noSavedAccounts');
    document.getElementById('userEmail').innerText = "";
    return;
  }

  document.getElementById('userName').innerText = acc.name || acc.email.split('@')[0];
  document.getElementById('userEmail').innerText = acc.email;

  // Avatar
  const avatarImg = document.getElementById('userAvatar');
  const avatarPlaceholder = document.getElementById('userAvatarPlaceholder');
  if (acc.avatar) {
    avatarImg.src = acc.avatar;
    avatarImg.style.display = 'block';
    avatarPlaceholder.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'flex';
    avatarPlaceholder.innerText = (acc.email[0] || 'A').toUpperCase();
  }

  // Tier Badge
  const tierEl = document.getElementById('tierBadge');
  const tierCode = acc.tier_code || 'pro';
  tierEl.className = `tier-badge ${tierCode}`;
  tierEl.innerText = acc.tier || t('tierPro');

  // Quota Box
  const sess = acc.session || {};
  const used = sess.used_pct || 0;
  const rem = sess.remaining_pct !== undefined ? sess.remaining_pct : (100 - used);
  
  const fillEl = document.getElementById('quotaProgressFill');
  fillEl.style.width = Math.min(100, Math.max(0, used)) + '%';
  fillEl.className = 'liquid-progress-fill';
  if (used > 85) fillEl.classList.add('critical');
  else if (used > 60) fillEl.classList.add('warning');

  document.getElementById('quotaUsedText').innerText = `${used}% ${t('used')}`;
  document.getElementById('quotaRemainingText').innerText = `${rem}% ${t('remaining')}`;
  
  const countdownText = sess.resets_in && sess.resets_in !== 'N/A' 
    ? `⏱ ${t('resetsIn')} ${sess.resets_in}` 
    : t('noActiveLimit');
  document.getElementById('quotaCountdown').innerText = countdownText;

  // Models Grid
  const grid = document.getElementById('modelsGrid');
  grid.innerHTML = '';
  (acc.pools || []).forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'model-chip';
    const pUsed = p.used_pct || 0;
    const pRem = p.remaining_pct !== undefined ? p.remaining_pct : (100 - pUsed);
    
    chip.innerHTML = `
      <div class="model-chip-name">${p.name}</div>
      <div class="model-bar">
        <div class="model-bar-fill" style="width: ${pUsed}%;"></div>
      </div>
      <div class="model-chip-status">
        <span style="color:var(--text-muted);">${pUsed}% ${t('used')}</span>
        <span style="color:var(--accent-cyan); font-weight:600;">${pRem}% ${t('remaining')}</span>
      </div>
    `;
    grid.appendChild(chip);
  });
}

function renderSavedAccounts() {
  const container = document.getElementById('savedAccountsList');
  container.innerHTML = '';

  const accounts = Object.entries(state.savedAccounts);
  document.getElementById('accountsCountBadge').innerText = accounts.length;

  if (accounts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px; color:var(--text-muted); font-size:13px;">
        ${t('noSavedAccounts')}
      </div>
    `;
    return;
  }

  accounts.forEach(([key, acc]) => {
    const isActive = state.activeAccount && state.activeAccount.email === acc.email;
    const card = document.createElement('div');
    card.className = 'account-item-card';

    const tierCode = acc.tier_code || 'pro';
    const remPct = acc.remaining_pct !== undefined ? `${acc.remaining_pct}%` : '100%';

    card.innerHTML = `
      <div class="account-info">
        <div class="account-avatar-small">
          ${(acc.email[0] || 'G').toUpperCase()}
        </div>
        <div class="account-labels">
          <h4>
            <span>${acc.label || acc.email}</span>
            <span class="tier-badge ${tierCode}" style="font-size:9px; padding:2px 6px;">${acc.tier || 'PRO'}</span>
            ${isActive ? `<span class="tier-badge pro" style="font-size:9px; padding:2px 6px;">● ${t('activeBadge')}</span>` : ''}
          </h4>
          <p>${acc.email} • <span style="color:var(--accent-cyan); font-weight:600;">${remPct} ${t('remaining')}</span></p>
        </div>
      </div>

      <div class="account-actions">
        ${!isActive ? `
          <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="switchToAccount('${key}')">
            <span>⚡️</span>
            <span>${t('switchNow')}</span>
          </button>
        ` : ''}

        <button class="btn btn-glass" style="padding: 6px 10px; font-size: 12px;" title="${t('migrateTitle')}" onclick="openMigrationModal('${key}')">
          <span>🔄</span>
        </button>

        <button class="btn btn-ghost-danger" style="padding: 6px 8px; font-size: 12px;" title="Delete" onclick="deleteAccount('${key}')">
          <span>🗑</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// User Actions
function switchToAccount(key) {
  callNative('switch', { accountKey: key });
  alert(`${t('switching')} ${key}\n${t('restartNotice')}`);
}

function saveCurrentAccount() {
  callNative('save', {});
  alert(t('accountSaved'));
}

function logoutAndAddNew() {
  callNative('logout', {});
}

function refreshLiveData() {
  callNative('refresh', {});
  initApplication();
}

function deleteAccount(key) {
  if (confirm(t('deleteConfirm'))) {
    callNative('delete', { accountKey: key });
    delete state.savedAccounts[key];
    renderSavedAccounts();
  }
}

// Migration Modal Logic
async function openMigrationModal(sourceAccountKey) {
  state.migration.sourceAccount = sourceAccountKey || (state.activeAccount ? state.activeAccount.email : null);
  
  // Populate target account dropdown
  const targetSelect = document.getElementById('modalTargetAccountSelect');
  targetSelect.innerHTML = '';
  
  Object.keys(state.savedAccounts).forEach(key => {
    if (key !== state.migration.sourceAccount) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.innerText = key;
      targetSelect.appendChild(opt);
    }
  });

  // If no other account saved, add placeholder
  if (targetSelect.options.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.innerText = "Add another account first to migrate data";
    targetSelect.appendChild(opt);
  }

  // Fetch local conversations list
  await fetchConversationsList();
  renderConversationPicker();

  const modal = document.getElementById('migrationModal');
  modal.classList.add('active');
}

function closeMigrationModal() {
  document.getElementById('migrationModal').classList.remove('active');
}

async function fetchConversationsList() {
  try {
    const res = await fetch('/api/conversations').then(r => r.json()).catch(() => null);
    if (res && Array.isArray(res)) {
      state.conversations = res;
    } else if (window.INITIAL_CONVERSATIONS) {
      state.conversations = window.INITIAL_CONVERSATIONS;
    }
  } catch (err) {}
}

function renderConversationPicker() {
  const container = document.getElementById('conversationPickerList');
  container.innerHTML = '';

  if (state.conversations.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">No active conversations found</div>`;
    return;
  }

  state.conversations.forEach(c => {
    const isChecked = state.migration.selectedIds.has(c.id);
    const item = document.createElement('label');
    item.className = 'conv-item';
    item.innerHTML = `
      <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="toggleConversationSelection('${c.id}', this.checked)" />
      <span class="conv-title">${c.title || c.id}</span>
      <span class="conv-date">${c.size_kb} KB • ${c.last_modified}</span>
    `;
    container.appendChild(item);
  });
}

function toggleConversationSelection(id, checked) {
  if (checked) state.migration.selectedIds.add(id);
  else state.migration.selectedIds.delete(id);
}

function toggleSelectAllConversations(selectAll) {
  state.migration.selectedIds.clear();
  if (selectAll) {
    state.conversations.forEach(c => state.migration.selectedIds.add(c.id));
  }
  renderConversationPicker();
}

function filterConversations(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.conv-item').forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(q) ? 'flex' : 'none';
  });
}

function selectMigrationMode(mode) {
  state.migration.mode = mode;
  document.getElementById('modeCopyCard').className = `radio-card ${mode === 'copy' ? 'selected' : ''}`;
  document.getElementById('modeCutCard').className = `radio-card ${mode === 'move' ? 'selected' : ''}`;
}

function selectStructureMode(struct) {
  state.migration.structure = struct;
  document.getElementById('structSeparateCard').className = `radio-card ${struct === 'separate' ? 'selected' : ''}`;
  document.getElementById('structMergeCard').className = `radio-card ${struct === 'merge' ? 'selected' : ''}`;
}

async function executeMigration() {
  const target = document.getElementById('modalTargetAccountSelect').value;
  if (!target) {
    alert("Please select a target account.");
    return;
  }

  const selectedList = Array.from(state.migration.selectedIds);
  if (selectedList.length === 0) {
    alert(t('selectConversations'));
    return;
  }

  const btn = document.getElementById('startMigrationBtn');
  btn.disabled = true;
  btn.innerText = t('migrating');

  const payload = {
    sourceAccount: state.migration.sourceAccount,
    targetAccount: target,
    conversationIds: selectedList,
    mode: state.migration.mode,
    structure: state.migration.structure,
    dualSync: document.getElementById('dualSyncCheckbox').checked
  };

  callNative('migrate', payload);

  setTimeout(() => {
    btn.disabled = false;
    btn.innerText = t('startMigration');
    alert(t('migrationSuccess'));
    closeMigrationModal();
  }, 1200);
}

// Countdown Ticker
function startCountdownTicker() {
  setInterval(() => {
    if (!state.activeAccount || !state.activeAccount.session) return;
    const sess = state.activeAccount.session;
    if (!sess.reset_iso) return;

    const diff = Math.floor((new Date(sess.reset_iso).getTime() - Date.now()) / 1000);
    if (diff > 0) {
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      let str = "";
      if (h > 0) str += `${h}h `;
      str += `${m}m ${s}s`;
      document.getElementById('quotaCountdown').innerText = `⏱ ${t('resetsIn')} ${str}`;
    } else {
      document.getElementById('quotaCountdown').innerText = t('noActiveLimit');
    }
  }, 1000);
}
