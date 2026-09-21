(() => {
  // Clean up old intervals and popover on reload
  const existingPop = document.getElementById('antigravity-usage-popover');
  if (existingPop) existingPop.remove();
  const existingModal = document.getElementById('antigravity-switcher-modal');
  if (existingModal) existingModal.remove();
  const existingAccPill = document.getElementById('antigravity-account-pill');
  if (existingAccPill) existingAccPill.remove();

  if (window.__aqm_dom_interval) { clearInterval(window.__aqm_dom_interval); window.__aqm_dom_interval = null; }
  if (window.__aqm_task_interval) { clearInterval(window.__aqm_task_interval); window.__aqm_task_interval = null; }
  if (window.__aqm_token_observer) { window.__aqm_token_observer.disconnect(); window.__aqm_token_observer = null; }
  if (window.__aqm_submenu_observer) { window.__aqm_submenu_observer.disconnect(); window.__aqm_submenu_observer = null; }
  if (window.__aqm_dom_observer) { window.__aqm_dom_observer.disconnect(); window.__aqm_dom_observer = null; }
  if (window.__aqm_rtl_interval) { clearInterval(window.__aqm_rtl_interval); window.__aqm_rtl_interval = null; }
  // Clean up only our own tracked timers
  if (Array.isArray(window.__aqm_timers)) {
    window.__aqm_timers.forEach(id => { clearInterval(id); clearTimeout(id); });
    window.__aqm_timers = [];
  }
  function safeAppendToHead(el) {
    try {
      const target = document.head || document.documentElement || document.body;
      if (target) {
        target.appendChild(el);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          (document.head || document.documentElement || document.body)?.appendChild(el);
        }, { once: true });
      }
    } catch(e) {}
  }

  // --- Core Multi-Instance / Multi-Account Helpers ---
  function isAccount2(email) {
    if (!email) return false;
    const norm = String(email).toLowerCase().trim();
    if (norm === 'instance_2' || norm === 'secondary_account' || norm.includes('account2')) return true;
    // Any account other than madgod is an alternate/secondary account (e.g. bombhub, ali135)
    return norm !== 'madgod.cum@gmail.com' && norm !== 'primary_account';
  }

  function isInstance2Window() {
    if (window.__antigravity_instance === 'instance_2') return true;
    if (window.__antigravity_instance === 'instance_1') return false;
    try {
      if (localStorage.getItem('antigravity:instance_id') === 'instance_2') return true;
      if (localStorage.getItem('antigravity:instance_id') === 'instance_1') return false;
    } catch(e) {}
    if (window.__antigravity_accounts) {
      if (window.__antigravity_accounts.instanceId === 'instance_2' || window.__antigravity_accounts.instance_id === 'instance_2') return true;
      if (window.__antigravity_accounts.instanceId === 'instance_1' || window.__antigravity_accounts.instance_id === 'instance_1') return false;
    }
    return false;
  }


  // Clean up any test style or standalone legacy RTL elements
  const testVazir = document.getElementById('aqm-test-vazir');
  if (testVazir) testVazir.remove();
  const oldRtlStyle = document.getElementById('antigravity-rtl-style');
  if (oldRtlStyle) oldRtlStyle.remove();
  const oldRtlWidget = document.querySelector('.rtl-widget-container');
  if (oldRtlWidget) oldRtlWidget.remove();
  const oldRtlWidgetStyle = document.getElementById('rtl-widget-style');
  if (oldRtlWidgetStyle) oldRtlWidgetStyle.remove();

  // 1. Inject Diverse Typography: Estedad, Vazirmatn, Sahel, Shabnam, Samim, Lalezar, Noto Sans Arabic, Outfit, Space Grotesk, JetBrains Mono, Inter, Fredoka, Quicksand
  const FONT_STYLESHEETS = [
    {
      id: 'aqm-fonts-vazirmatn-cdn',
      href: 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css'
    },
    {
      id: 'aqm-fonts-google',
      href: 'https://fonts.googleapis.com/css2?family=Estedad:wght@300;400;500;600;700;800&family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Lalezar&family=Noto+Sans+Arabic:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Quicksand:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&family=Vazirmatn:wght@300;400;500;600;700;800&display=swap'
    },
    {
      id: 'aqm-font-sahel',
      href: 'https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/font-face.css'
    },
    {
      id: 'aqm-font-shabnam',
      href: 'https://cdn.jsdelivr.net/gh/rastikerdar/shabnam-font@v5.0.1/dist/font-face.css'
    },
    {
      id: 'aqm-font-samim',
      href: 'https://cdn.jsdelivr.net/gh/rastikerdar/samim-font@v4.0.5/dist/font-face.css'
    }
  ];

  FONT_STYLESHEETS.forEach(sheet => {
    let link = document.getElementById(sheet.id);
    if (!link) {
      link = document.createElement('link');
      link.id = sheet.id;
      link.rel = 'stylesheet';
      link.href = sheet.href;
      safeAppendToHead(link);
    }
  });

  // Custom user-imported fonts registry
  let customImportedFonts = [];
  try {
    const savedImported = localStorage.getItem('antigravity:custom_imported_fonts');
    if (savedImported) customImportedFonts = JSON.parse(savedImported) || [];
  } catch (e) {}

  function injectImportedFontStyles() {
    customImportedFonts.forEach((f, idx) => {
      if (f.url && f.url.trim()) {
        const id = `aqm-custom-font-${idx}`;
        if (!document.getElementById(id)) {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = f.url.trim();
          safeAppendToHead(link);
        }
      }
    });
  }
  injectImportedFontStyles();

  function ensureFontLoaded(fontName) {
    if (!fontName || fontName === 'default') return;
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load(`14px "${fontName}"`).catch(() => {});
      }
    } catch (e) {}
  }
  ['Fredoka', 'Outfit', 'Space Grotesk', 'JetBrains Mono', 'Inter', 'Plus Jakarta Sans', 'Estedad', 'Vazirmatn', 'Sahel', 'Shabnam', 'Samim', 'Lalezar', 'Noto Sans Arabic'].forEach(ensureFontLoaded);

  // 2. Global Keyframes & Precision Styles
  let style = document.getElementById('aqm-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'aqm-styles';
    safeAppendToHead(style);
  }
  style.textContent = `
      @keyframes aqm-pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 5px currentColor); }
        50% { transform: scale(0.75); opacity: 0.5; filter: drop-shadow(0 0 1px currentColor); }
      }
      @keyframes aqm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes aqm-pop-in {
        0% { opacity: 0; transform: translateY(8px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .aqm-rotating {
        animation: aqm-spin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
        display: inline-block !important;
      }
      .aqm-theme-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        border: 1px solid transparent;
      }
      .aqm-theme-card:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        transform: translateY(-1px);
      }
      .aqm-model-row {
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .aqm-model-row:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.4);
      }
      .aqm-task-active {
        box-shadow: 0 0 16px rgba(251, 191, 36, 0.65) !important;
        border-color: rgba(251, 191, 36, 0.6) !important;
      }
      .aqm-custom-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .aqm-custom-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .aqm-custom-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
      }
      /* In-Editor Switcher & Migration Suite Styles */
      .aqm-switcher-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 10000000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .aqm-switcher-modal.aqm-active {
        opacity: 1;
        pointer-events: auto;
      }
      .aqm-switcher-sheet {
        width: 790px;
        max-width: 95vw;
        height: 700px;
        max-height: 90vh;
        border-radius: 28px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 32px 80px rgba(0,0,0,0.85), 0 0 1px rgba(255,255,255,0.4);
        transform: scale(0.96) translateY(12px);
        transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }
      .aqm-switcher-modal.aqm-active .aqm-switcher-sheet {
        transform: scale(1) translateY(0);
      }
      .aqm-sw-tab-btn {
        padding: 8px 18px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid transparent;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .aqm-sw-tab-btn.active {
        background: rgba(255, 255, 255, 0.16) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      }
      .aqm-sw-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 16px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .aqm-sw-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.18);
        transform: translateY(-1px);
      }
      .aqm-sw-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
      }
      .aqm-sw-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      .aqm-sw-btn:active {
        transform: scale(0.96);
      }
      .aqm-sw-btn-primary {
        background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
        border-color: rgba(99, 102, 241, 0.5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
      }
      .aqm-sw-btn-primary:hover {
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
        filter: brightness(1.1);
      }
      .aqm-sw-toast {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
        padding: 8px 18px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        z-index: 10000005;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
      .aqm-sw-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      .aqm-sw-toast a {
        pointer-events: auto;
        cursor: pointer;
      }
    `;

  let swStyleTag = document.getElementById('aqm-switcher-styles');
  if (!swStyleTag) {
    swStyleTag = document.createElement('style');
    swStyleTag.id = 'aqm-switcher-styles';
    safeAppendToHead(swStyleTag);
  }
  swStyleTag.textContent = `
    .aqm-switcher-modal {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0, 0, 0, 0.68) !important;
      backdrop-filter: blur(18px) !important;
      -webkit-backdrop-filter: blur(18px) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0 !important;
      pointer-events: none !important;
      visibility: hidden !important;
      transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s !important;
    }
    .aqm-switcher-modal.aqm-active {
      opacity: 1 !important;
      pointer-events: auto !important;
      visibility: visible !important;
    }
    .aqm-switcher-sheet {
      width: 560px !important;
      max-width: 92vw !important;
      height: 520px !important;
      max-height: 86vh !important;
      border-radius: 18px !important;
      background: rgba(13, 17, 24, 0.94) !important;
      backdrop-filter: blur(30px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      transform: scale(0.97) translateY(6px) !important;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
      user-select: none !important;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      letter-spacing: normal !important;
      line-height: 1.65 !important;
      -webkit-font-smoothing: antialiased !important;
    }
    .aqm-switcher-modal.aqm-active .aqm-switcher-sheet {
      transform: scale(1) translateY(0) !important;
    }
    .aqm-sw-tab-btn {
      padding: 5px 14px !important;
      border-radius: 9999px !important;
      font-size: 11.5px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      border: 1px solid transparent !important;
      background: transparent !important;
      color: #94a3b8 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      letter-spacing: normal !important;
    }
    .aqm-sw-tab-btn:hover {
      color: #f8fafc !important;
    }
    .aqm-sw-tab-btn.active {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      color: #ffffff !important;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2) !important;
    }
    .aqm-sw-card {
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 14px !important;
      padding: 13px 15px !important;
      transition: all 0.15s ease !important;
      letter-spacing: normal !important;
    }
    .aqm-sw-card:hover {
      background: rgba(255, 255, 255, 0.035) !important;
      border-color: rgba(255, 255, 255, 0.09) !important;
    }
    .aqm-sw-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      padding: 4px 11px !important;
      border-radius: 9999px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      background: rgba(255, 255, 255, 0.04) !important;
      color: #f1f5f9 !important;
      letter-spacing: normal !important;
    }
    .aqm-sw-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.18) !important;
    }
    .aqm-sw-btn:active {
      transform: scale(0.97) !important;
    }
    .aqm-sw-btn-primary {
      background: #3b82f6 !important;
      border-color: #60a5fa !important;
      color: #ffffff !important;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25) !important;
    }
    .aqm-sw-btn-primary:hover {
      background: #2563eb !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
    }
    .aqm-sw-toast {
      position: absolute !important;
      top: 14px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(-14px) !important;
      opacity: 0 !important;
      padding: 6px 14px !important;
      border-radius: 9999px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      z-index: 10000005 !important;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      pointer-events: none !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
      background: rgba(15, 23, 42, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      color: #ffffff !important;
      letter-spacing: normal !important;
    }
    .aqm-sw-toast.show {
      transform: translateX(-50%) translateY(0) !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    .aqm-sw-toast a {
      pointer-events: auto !important;
      cursor: pointer !important;
    }
  `;

  // 3. Bespoke Themes with Unique Font Pairings, Textures & Deep Aesthetics
  const THEMES = {
    cyber: {
      id: 'cyber',
      name: 'سایبر نئون',
      desc: 'آبی الکتریک • فونت Space Grotesk & استعداد',
      icon: '🔷',
      fontFamily: "'Space Grotesk', 'Estedad', sans-serif",
      fontEn: "'Space Grotesk', sans-serif",
      fontFa: "'Estedad', sans-serif",
      cardBg: 'radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.14), transparent 55%), linear-gradient(155deg, rgba(9, 14, 28, 0.94) 0%, rgba(4, 7, 16, 0.98) 100%)',
      cardBorder: 'rgba(56, 189, 248, 0.32)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.16), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)',
      accent: '#38bdf8',
      accentSecondary: '#818cf8',
      accentGrad: 'linear-gradient(90deg, #00f0ff 0%, #38bdf8 45%, #6366f1 100%)',
      accentGlow: '0 0 18px rgba(56, 189, 248, 0.5)',
      textColor: '#f8fafc',
      subText: '#94a3b8',
      itemBg: 'rgba(255, 255, 255, 0.03)',
      itemBorder: 'rgba(255, 255, 255, 0.06)',
      itemHoverBorder: 'rgba(56, 189, 248, 0.35)',
      pillBg: 'linear-gradient(135deg, rgba(14, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%)',
      pillBorder: 'rgba(56, 189, 248, 0.38)',
      pillColor: '#38bdf8',
      dotColor: '#38bdf8',
      chipBg: 'rgba(56, 189, 248, 0.14)',
      chipColor: '#38bdf8',
      previewGradients: 'linear-gradient(135deg, #00f0ff, #6366f1)',
      isDark: true,
      workspaceBg: '#070b14',
      workspaceSidebar: '#04070d',
      workspaceInputBg: '#0c1322',
      workspaceBorder: 'rgba(56, 189, 248, 0.16)',
      workspaceCardBorder: 'rgba(56, 189, 248, 0.22)',
      chatTextColor: '#f8fafc',
      thinkingBg: 'rgba(56, 189, 248, 0.07)',
      thinkingBorder: 'rgba(56, 189, 248, 0.28)',
      formulaColor: '#38bdf8',
      formulaGlow: '0 0 10px rgba(56, 189, 248, 0.45)'
    },
    pastel: {
      id: 'pastel',
      name: 'صورتی پاستیلی',
      desc: 'شکوفه، آبنباتی و یاسی کیوت • فونت Fredoka & وزیرمتن',
      icon: '🎀',
      fontFamily: "'Fredoka', 'Vazirmatn', sans-serif",
      fontEn: "'Fredoka', sans-serif",
      fontFa: "'Vazirmatn', sans-serif",
      cardBg: 'radial-gradient(circle at 15% 15%, rgba(255, 112, 166, 0.28), transparent 55%), radial-gradient(circle at 85% 85%, rgba(216, 180, 254, 0.25), transparent 50%), linear-gradient(155deg, rgba(38, 16, 34, 0.95) 0%, rgba(22, 10, 22, 0.98) 100%)',
      cardBorder: 'rgba(255, 112, 166, 0.48)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.88), 0 0 35px rgba(255, 112, 166, 0.28), inset 0 1px 2px 0 rgba(255, 255, 255, 0.35)',
      accent: '#ff70a6',
      accentSecondary: '#d8b4fe',
      accentGrad: 'linear-gradient(90deg, #ff70a6 0%, #ff9770 35%, #ffd670 70%, #d8b4fe 100%)',
      accentGlow: '0 0 20px rgba(255, 112, 166, 0.65)',
      textColor: '#fff5f8',
      subText: '#fbcfe8',
      itemBg: 'rgba(255, 255, 255, 0.05)',
      itemBorder: 'rgba(255, 112, 166, 0.22)',
      itemHoverBorder: 'rgba(255, 112, 166, 0.55)',
      pillBg: 'linear-gradient(135deg, rgba(58, 22, 48, 0.92) 0%, rgba(32, 12, 28, 0.98) 100%)',
      pillBorder: 'rgba(255, 112, 166, 0.5)',
      pillColor: '#ff70a6',
      dotColor: '#ff70a6',
      chipBg: 'rgba(255, 112, 166, 0.2)',
      chipColor: '#ff9ebb',
      previewGradients: 'linear-gradient(135deg, #ff70a6, #ffd670, #c084fc)',
      isDark: true,
      workspaceBg: '#160b16',
      workspaceSidebar: '#0e060e',
      workspaceInputBg: '#221024',
      workspaceBorder: 'rgba(255, 112, 166, 0.22)',
      workspaceCardBorder: 'rgba(255, 112, 166, 0.32)',
      chatTextColor: '#fff5f8',
      thinkingBg: 'rgba(255, 112, 166, 0.09)',
      thinkingBorder: 'rgba(255, 112, 166, 0.35)',
      formulaColor: '#ff70a6',
      formulaGlow: '0 0 10px rgba(255, 112, 166, 0.5)'
    },
    gravity: {
      id: 'gravity',
      name: 'گرویتی استودیو',
      desc: 'هارمونی استودیو ادیتور • فونت Inter & وزیرمتن',
      icon: '⚡',
      fontFamily: "'Inter', 'Vazirmatn', sans-serif",
      fontEn: "'Inter', sans-serif",
      fontFa: "'Vazirmatn', sans-serif",
      cardBg: 'radial-gradient(circle at 80% 20%, rgba(66, 133, 244, 0.12), transparent 50%), linear-gradient(155deg, rgba(24, 26, 32, 0.94) 0%, rgba(14, 15, 19, 0.98) 100%)',
      cardBorder: 'rgba(255, 255, 255, 0.15)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.92), inset 0 1px 1px 0 rgba(255, 255, 255, 0.18)',
      accent: '#4285f4',
      accentSecondary: '#f59e0b',
      accentGrad: 'linear-gradient(90deg, #4285f4 0%, #60a5fa 50%, #f59e0b 100%)',
      accentGlow: '0 0 16px rgba(66, 133, 244, 0.45)',
      textColor: '#f8fafc',
      subText: '#94a3b8',
      itemBg: 'rgba(255, 255, 255, 0.035)',
      itemBorder: 'rgba(255, 255, 255, 0.07)',
      itemHoverBorder: 'rgba(66, 133, 244, 0.4)',
      pillBg: 'linear-gradient(135deg, rgba(30, 32, 40, 0.88) 0%, rgba(18, 19, 25, 0.96) 100%)',
      pillBorder: 'rgba(255, 255, 255, 0.2)',
      pillColor: '#60a5fa',
      dotColor: '#4285f4',
      chipBg: 'rgba(66, 133, 244, 0.15)',
      chipColor: '#93c5fd',
      previewGradients: 'linear-gradient(135deg, #4285f4, #f59e0b)',
      isDark: true,
      workspaceBg: '#101114',
      workspaceSidebar: '#0c0d10',
      workspaceInputBg: '#16181d',
      workspaceBorder: 'rgba(255, 255, 255, 0.08)',
      workspaceCardBorder: 'rgba(255, 255, 255, 0.12)',
      chatTextColor: '#f8fafc',
      thinkingBg: 'rgba(66, 133, 244, 0.06)',
      thinkingBorder: 'rgba(66, 133, 244, 0.22)',
      formulaColor: '#60a5fa',
      formulaGlow: '0 0 8px rgba(96, 165, 250, 0.4)'
    },
    emerald: {
      id: 'emerald',
      name: 'زمرد کوانت',
      desc: 'ترمینال مالی بلومبرگ • فونت JetBrains Mono & استعداد',
      icon: '🌿',
      fontFamily: "'JetBrains Mono', 'Estedad', monospace",
      fontEn: "'JetBrains Mono', monospace",
      fontFa: "'Estedad', sans-serif",
      cardBg: 'radial-gradient(circle at 50% 10%, rgba(16, 185, 129, 0.16), transparent 55%), linear-gradient(155deg, rgba(5, 22, 17, 0.94) 0%, rgba(3, 12, 9, 0.98) 100%)',
      cardBorder: 'rgba(16, 185, 129, 0.35)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.18), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
      accent: '#10b981',
      accentSecondary: '#00ff9d',
      accentGrad: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #00ff9d 100%)',
      accentGlow: '0 0 18px rgba(16, 185, 129, 0.5)',
      textColor: '#f0fdf4',
      subText: '#86efac',
      itemBg: 'rgba(255, 255, 255, 0.03)',
      itemBorder: 'rgba(16, 185, 129, 0.15)',
      itemHoverBorder: 'rgba(16, 185, 129, 0.42)',
      pillBg: 'linear-gradient(135deg, rgba(8, 36, 28, 0.88) 0%, rgba(4, 18, 14, 0.96) 100%)',
      pillBorder: 'rgba(16, 185, 129, 0.38)',
      pillColor: '#34d399',
      dotColor: '#00ff9d',
      chipBg: 'rgba(16, 185, 129, 0.15)',
      chipColor: '#6ee7b7',
      previewGradients: 'linear-gradient(135deg, #10b981, #00ff9d)',
      isDark: true,
      workspaceBg: '#040f0c',
      workspaceSidebar: '#020806',
      workspaceInputBg: '#081d17',
      workspaceBorder: 'rgba(16, 185, 129, 0.16)',
      workspaceCardBorder: 'rgba(16, 185, 129, 0.24)',
      chatTextColor: '#f0fdf4',
      thinkingBg: 'rgba(16, 185, 129, 0.07)',
      thinkingBorder: 'rgba(16, 185, 129, 0.28)',
      formulaColor: '#00ff9d',
      formulaGlow: '0 0 10px rgba(0, 255, 157, 0.45)'
    },
    vision: {
      id: 'vision',
      name: 'ویژن فراست',
      desc: 'کریستال مات VisionOS • فونت Plus Jakarta & وزیرمتن',
      icon: '❄️',
      fontFamily: "'Plus Jakarta Sans', 'Vazirmatn', sans-serif",
      fontEn: "'Plus Jakarta Sans', sans-serif",
      fontFa: "'Vazirmatn', sans-serif",
      cardBg: 'linear-gradient(155deg, rgba(32, 38, 52, 0.82) 0%, rgba(16, 20, 30, 0.94) 100%)',
      cardBorder: 'rgba(255, 255, 255, 0.32)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.88), inset 0 1px 2px 0 rgba(255, 255, 255, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      accent: '#ffffff',
      accentSecondary: '#cbd5e1',
      accentGrad: 'linear-gradient(90deg, #ffffff 0%, #e2e8f0 50%, #94a3b8 100%)',
      accentGlow: '0 0 18px rgba(255, 255, 255, 0.55)',
      textColor: '#ffffff',
      subText: '#cbd5e1',
      itemBg: 'rgba(255, 255, 255, 0.05)',
      itemBorder: 'rgba(255, 255, 255, 0.12)',
      itemHoverBorder: 'rgba(255, 255, 255, 0.4)',
      pillBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
      pillBorder: 'rgba(255, 255, 255, 0.35)',
      pillColor: '#ffffff',
      dotColor: '#ffffff',
      chipBg: 'rgba(255, 255, 255, 0.14)',
      chipColor: '#ffffff',
      previewGradients: 'linear-gradient(135deg, #ffffff, #94a3b8)',
      isDark: true,
      workspaceBg: '#0d0f14',
      workspaceSidebar: '#090a0d',
      workspaceInputBg: '#141720',
      workspaceBorder: 'rgba(255, 255, 255, 0.1)',
      workspaceCardBorder: 'rgba(255, 255, 255, 0.18)',
      chatTextColor: '#ffffff',
      thinkingBg: 'rgba(255, 255, 255, 0.06)',
      thinkingBorder: 'rgba(255, 255, 255, 0.22)',
      formulaColor: '#ffffff',
      formulaGlow: '0 0 8px rgba(255, 255, 255, 0.5)'
    },
    sunset: {
      id: 'sunset',
      name: 'افق سولار',
      desc: 'مرجانی و کهکشانی • فونت Outfit & استعداد',
      icon: '🌅',
      fontFamily: "'Outfit', 'Estedad', sans-serif",
      fontEn: "'Outfit', sans-serif",
      fontFa: "'Estedad', sans-serif",
      cardBg: 'radial-gradient(circle at 80% 20%, rgba(251, 146, 60, 0.18), transparent 55%), linear-gradient(155deg, rgba(32, 14, 22, 0.94) 0%, rgba(18, 8, 15, 0.98) 100%)',
      cardBorder: 'rgba(251, 146, 60, 0.35)',
      cardShadow: '0 32px 85px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(251, 146, 60, 0.18), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)',
      accent: '#fb923c',
      accentSecondary: '#f43f5e',
      accentGrad: 'linear-gradient(90deg, #fb923c 0%, #f43f5e 50%, #e11d48 100%)',
      accentGlow: '0 0 18px rgba(251, 146, 60, 0.5)',
      textColor: '#fff7ed',
      subText: '#fdba74',
      itemBg: 'rgba(255, 255, 255, 0.04)',
      itemBorder: 'rgba(251, 146, 60, 0.15)',
      itemHoverBorder: 'rgba(251, 146, 60, 0.42)',
      pillBg: 'linear-gradient(135deg, rgba(45, 18, 25, 0.88) 0%, rgba(24, 10, 15, 0.96) 100%)',
      pillBorder: 'rgba(251, 146, 60, 0.42)',
      pillColor: '#fb923c',
      dotColor: '#f97316',
      chipBg: 'rgba(251, 146, 60, 0.16)',
      chipColor: '#fed7aa',
      previewGradients: 'linear-gradient(135deg, #fb923c, #f43f5e)',
      isDark: true,
      workspaceBg: '#12080d',
      workspaceSidebar: '#0a0407',
      workspaceInputBg: '#1b0d14',
      workspaceBorder: 'rgba(251, 146, 60, 0.18)',
      workspaceCardBorder: 'rgba(251, 146, 60, 0.26)',
      chatTextColor: '#fff7ed',
      thinkingBg: 'rgba(251, 146, 60, 0.08)',
      thinkingBorder: 'rgba(251, 146, 60, 0.28)',
      formulaColor: '#fb923c',
      formulaGlow: '0 0 10px rgba(251, 146, 60, 0.45)'
    }
  };

  const userSettings = (typeof window !== 'undefined' && window.__antigravity_user_settings) || {};

  let currentThemeId = 'cyber';
  if (userSettings.theme && THEMES[userSettings.theme]) {
    currentThemeId = userSettings.theme;
  } else {
    try {
      const savedTheme = localStorage.getItem('antigravity:quota_theme');
      if (savedTheme && THEMES[savedTheme]) currentThemeId = savedTheme;
    } catch (e) {}
  }

  let isFullAppThemingEnabled = true;
  if (userSettings.fullTheming !== undefined) {
    isFullAppThemingEnabled = Boolean(userSettings.fullTheming);
  } else {
    try {
      const savedAppTheming = localStorage.getItem('antigravity:full_app_theming');
      if (savedAppTheming !== null) isFullAppThemingEnabled = (savedAppTheming === 'true');
    } catch (e) {}
  }

  let customFontEn = (userSettings.fontEn && userSettings.fontEn !== 'default') ? userSettings.fontEn : 'default';
  if (customFontEn === 'default') {
    try {
      const savedEn = localStorage.getItem('antigravity:custom_font_en');
      if (savedEn) customFontEn = savedEn;
    } catch (e) {}
  }

  let customFontFa = (userSettings.fontFa && userSettings.fontFa !== 'default') ? userSettings.fontFa : 'default';
  if (customFontFa === 'default') {
    try {
      const savedFa = localStorage.getItem('antigravity:custom_font_fa');
      if (savedFa) customFontFa = savedFa;
    } catch (e) {}
  }

  function persistUserSettings(patch) {
    if (!patch || typeof patch !== 'object') return;
    try {
      window.__antigravity_user_settings = Object.assign({}, window.__antigravity_user_settings || {}, patch);
    } catch(e) {}
    try {
      callDaemonIpc('save_user_settings', patch);
    } catch(e) {}
    try {
      fetch('http://127.0.0.1:39281/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      }).catch(() => {});
    } catch(e) {}
  }

  let isImportFormOpen = false;

  function cleanFontName(fontStr) {
    if (!fontStr) return '';
    return fontStr
      .replace(/,\s*(sans-serif|serif|monospace|system-ui)/gi, '')
      .replace(/['"]/g, '')
      .trim();
  }

  function getEffectiveFonts(theme) {
    const rawEn = (customFontEn !== 'default') ? customFontEn : cleanFontName(theme.fontEn || 'Outfit');
    const rawFa = (customFontFa !== 'default') ? customFontFa : cleanFontName(theme.fontFa || 'Vazirmatn');
    const fontEn = `'${rawEn}', sans-serif`;
    const fontFa = `'${rawFa}', sans-serif`;
    const fullFamily = `'${rawEn}', '${rawFa}', sans-serif`;
    return { rawEn, rawFa, fontEn, fontFa, fullFamily };
  }

  function getActiveTheme() {
    try {
      const savedTheme = localStorage.getItem('antigravity:quota_theme');
      if (savedTheme && THEMES[savedTheme]) currentThemeId = savedTheme;
    } catch (e) {}
    return THEMES[currentThemeId] || THEMES.cyber;
  }

  function applyAppWorkspaceTheme(theme, enabled) {
    const { rawEn, rawFa, fontEn, fontFa, fullFamily } = getEffectiveFonts(theme);

    let typoStyle = document.getElementById('aqm-typography-style');
    if (!typoStyle) {
      typoStyle = document.createElement('style');
      typoStyle.id = 'aqm-typography-style';
      safeAppendToHead(typoStyle);
    }
    typoStyle.textContent = `
      #antigravity-usage-popover {
        font-family: ${fullFamily} !important;
      }
      #antigravity-usage-popover [data-font="en"] {
        font-family: ${fontEn} !important;
      }
      #antigravity-usage-popover [data-font="fa"] {
        font-family: ${fontFa} !important;
      }
      #antigravity-usage-popover [data-font="mono"] {
        font-family: 'JetBrains Mono', monospace !important;
      }
    `;

    let style = document.getElementById('aqm-app-workspace-theme');
    if (!enabled || theme.id === 'gravity') {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = 'aqm-app-workspace-theme';
      safeAppendToHead(style);
    }

    style.textContent = `
      :root, body, .theme-standalone {
        --background: ${theme.workspaceBg || '#101010'} !important;
        --color-background: ${theme.workspaceBg || '#101010'} !important;
        --content: ${theme.workspaceInputBg || '#141414'} !important;
        --border: ${theme.workspaceBorder || 'rgba(255,255,255,0.06)'} !important;
        --card-border: ${theme.workspaceCardBorder || 'rgba(255,255,255,0.1)'} !important;
        --sidebar: ${theme.workspaceSidebar || '#161616'} !important;
        --color-sidebar-secondary: ${theme.workspaceSidebar || '#161616'} !important;
        --color-primary: ${theme.accent} !important;
        --color-code: ${theme.formulaColor || theme.accent} !important;
        --code-foreground: ${theme.formulaColor || theme.accent} !important;
        --font-sans: ${fullFamily} !important;
      }
      body {
        background-color: ${theme.workspaceBg || '#101010'} !important;
        font-family: ${fullFamily} !important;
      }
      .bg-sidebar {
        background-color: ${theme.workspaceSidebar || '#161616'} !important;
        border-right: 1px solid ${theme.workspaceBorder || 'rgba(255,255,255,0.06)'} !important;
      }
      header, [class*="titlebar"], [class*="Header"] {
        background-color: ${theme.workspaceBg || '#101010'} !important;
      }
      .no-focus-agent-input {
        background-color: ${theme.workspaceInputBg || '#141414'} !important;
        border: 1px solid ${theme.workspaceBorder || 'rgba(255,255,255,0.1)'} !important;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3), 0 0 20px ${theme.chipBg} !important;
      }

      /* 1. Universal Chat, Prose, Markdown, Inputs & Prompts Typography */
      .markdown, [class*="prose"], .theme-standalone p, .theme-standalone li, .theme-standalone span,
      [data-testid*="user-input"], [data-testid*="user-input-step"] *, [data-testid*="chat-message"] *:not(pre):not(code),
      [class*="leading-relaxed"] *:not(pre):not(code), .line-content,
      [class*="conversation"] p, [class*="conversation"] span,
      [class*="conversation"] div:not([class*="code"]):not(pre),
      [class*="markdown-body"] *:not(pre):not(code) {
        font-family: ${fullFamily} !important;
      }
      .markdown, [class*="prose"], .theme-standalone p, .theme-standalone li {
        color: ${theme.chatTextColor || theme.textColor} !important;
      }
      .theme-standalone h1, .theme-standalone h2, .theme-standalone h3, .theme-standalone h4,
      [class*="conversation"] h1, [class*="conversation"] h2, [class*="conversation"] h3, [class*="conversation"] h4 {
        color: ${theme.textColor} !important;
        font-family: ${fullFamily} !important;
        letter-spacing: -0.01em;
      }

      /* 2. Model Thinking / Reasoning Process Blocks */
      [class*="thinking"], [class*="thought"], details[class*="thought"], [data-testid*="thought"], [data-testid*="thinking"] {
        background-color: ${theme.thinkingBg || 'rgba(255, 255, 255, 0.03)'} !important;
        border: 1px solid ${theme.thinkingBorder || theme.itemBorder} !important;
        border-radius: 12px !important;
      }
      [class*="thinking"] summary, [class*="thought"] summary, [class*="thinking"] [class*="title"] {
        color: ${theme.accent} !important;
        font-weight: 600 !important;
      }

      /* 3. Mathematical Formulas (KaTeX / LaTeX) */
      .katex, .katex-display, .katex-html, math {
        color: ${theme.formulaColor || theme.accent} !important;
        text-shadow: ${theme.formulaGlow || 'none'} !important;
        font-weight: 600 !important;
      }

      /* 4. Highlighted Code & Inline Code */
      :not(pre) > code {
        background-color: ${theme.chipBg || 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${theme.accent} !important;
        border: 1px solid ${theme.itemBorder || 'rgba(255, 255, 255, 0.12)'} !important;
        border-radius: 6px !important;
        padding: 1.5px 6px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 0.9em !important;
      }
      pre {
        border: 1px solid ${theme.workspaceBorder || 'rgba(255, 255, 255, 0.08)'} !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
      }

      /* 5. Tool Calls & Action Cards */
      [data-testid*="tool"], [class*="tool-call"], [class*="action-card"], [class*="step-container"] {
        border-color: ${theme.workspaceCardBorder || theme.itemBorder} !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
      }
      [data-testid*="tool"]:hover, [class*="tool-call"]:hover {
        border-color: ${theme.accent} !important;
        box-shadow: 0 0 15px ${theme.chipBg} !important;
      }
    `;
    applyRtlStyles();
  }

  // 3. Smart RTL & Persian Engine
  let rtlConfig = {
    isRTL: true,
    forceRTL: false,
    fixAtSign: true,
    lineHeight: '1.6',
    fontSize: '16'
  };
  try {
    if (userSettings.rtl) {
      const parsedRtl = typeof userSettings.rtl === 'string' ? JSON.parse(userSettings.rtl) : userSettings.rtl;
      rtlConfig = { ...rtlConfig, ...parsedRtl };
    } else {
      const savedRtl = localStorage.getItem('antigravity:rtl_config');
      if (savedRtl) rtlConfig = { ...rtlConfig, ...JSON.parse(savedRtl) };
    }
  } catch (e) {}

  function saveRtlConfig() {
    try {
      localStorage.setItem('antigravity:rtl_config', JSON.stringify(rtlConfig));
    } catch (e) {}
    persistUserSettings({ rtl: rtlConfig });
  }

  function applyRtlStyles() {
    let rtlStyle = document.getElementById('aqm-rtl-engine-style');
    if (!rtlConfig.isRTL) {
      if (rtlStyle) rtlStyle.remove();
      return;
    }
    if (!rtlStyle) {
      rtlStyle = document.createElement('style');
      rtlStyle.id = 'aqm-rtl-engine-style';
      safeAppendToHead(rtlStyle);
    }

    const forceRtlRule = rtlConfig.forceRTL ? `
      /* Force RTL strictly for text elements, never layout containers */
      .prose p, .prose li, .prose h1, .prose h2, .prose h3, .prose h4, .prose blockquote,
      [data-testid="chat-message"] p, [data-testid="chat-message"] li,
      .markdown-body p, .markdown-body li,
      .leading-relaxed p, .leading-relaxed li {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: isolate !important;
      }
    ` : '';

    rtlStyle.textContent = `
      /* Clean, Native, Flicker-Free Text Direction */
      .prose p, .prose li, .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6, .prose blockquote,
      .markdown-body p, .markdown-body li, .markdown-body h1, .markdown-body h2, .markdown-body h3,
      .leading-relaxed p, .leading-relaxed li, .leading-relaxed h1, .leading-relaxed h2, .leading-relaxed h3,
      [data-testid="chat-message"] p, [data-testid="chat-message"] li,
      label[for^="ask-opt-"] {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }

      /* RTL List Indentation Fix */
      ul:not(#_)[dir="rtl"], ol:not(#_)[dir="rtl"],
      [dir="rtl"] ul:not(#_), [dir="rtl"] ol:not(#_),
      ul[dir="rtl"], ol[dir="rtl"] {
        padding-left: 0 !important;
        padding-right: 1.25rem !important;
      }
      [dir="rtl"] ul:not(#_) ul:not(#_), [dir="rtl"] ul:not(#_) ol:not(#_),
      [dir="rtl"] ol:not(#_) ul:not(#_), [dir="rtl"] ol:not(#_) ol:not(#_),
      ul[dir="rtl"] ul, ul[dir="rtl"] ol,
      ol[dir="rtl"] ul, ol[dir="rtl"] ol {
        padding-left: 0 !important;
        padding-right: 2.5rem !important;
      }

      /* Thinking Blocks (Strictly LTR & Clean Isolated Layout) */
      .cursor-edit.text-secondary-foreground,
      .cursor-edit.text-secondary-foreground *,
      [class*="thinking"], [data-testid*="thinking"] {
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
      }

      /* Code Blocks & Formulas (Strictly LTR) */
      pre, code, pre *, code *, .katex, .katex-display, .line-content, [class*="code-block"] {
        unicode-bidi: isolate !important;
        direction: ltr !important;
        text-align: left !important;
      }

      /* Inputs & Lexical Editor (Native start alignment, no jumping) */
      [contenteditable="true"], [contenteditable="true"] p, textarea[data-testid="ask-question-writein"] {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }

      /* Universal Typography Line Height & Font Size */
      .prose p, .prose li, .markdown-body p, [data-testid="chat-message"] p, [data-testid="chat-message"] .leading-relaxed, .leading-relaxed, [data-testid="user-input-step"], [data-testid="user-input-step"] div, [data-lexical-text="true"], [contenteditable="true"], [contenteditable="true"] p, label[for^="ask-opt-"] {
        line-height: ${rtlConfig.lineHeight} !important;
      }
      .prose, [data-testid="chat-message"], .markdown-body, .leading-relaxed, [contenteditable="true"], [contenteditable="true"] p {
        font-size: ${rtlConfig.fontSize}px !important;
      }

      /* Smart Direction for Navigation & Sidebar */
      [role="navigation"][aria-label="Sidebar"] *, .truncate {
        unicode-bidi: plaintext !important;
        text-align: start !important;
      }

      ${forceRtlRule}
    `;
  }

  const RTL_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  let updateDirTimer = null;
  function debouncedUpdateDir() {
    if (updateDirTimer) clearTimeout(updateDirTimer);
    updateDirTimer = setTimeout(() => {
      updateDir();
    }, 200);
  }

  function updateDir() {
    if (!rtlConfig.isRTL) return;

    // 1. Text Inputs: safely set direction based on first non-whitespace/symbol character
    document.querySelectorAll('[contenteditable="true"] p, textarea[data-testid="ask-question-writein"]').forEach(el => {
      if (el.id && el.id.startsWith('aqm-')) return;
      const text = (el.tagName === 'TEXTAREA' ? el.value : el.textContent || '').trim();
      if (!text) {
        if (el.hasAttribute('dir')) el.removeAttribute('dir');
        return;
      }
      const clean = text.replace(/[\u200B-\u200F\uFEFF\s\d\W_]/g, '');
      if (clean.length > 0) {
        const isRtl = RTL_CHAR_REGEX.test(clean[0]);
        const targetDir = isRtl ? 'rtl' : 'ltr';
        if (el.getAttribute('dir') !== targetDir) {
          el.setAttribute('dir', targetDir);
        }
      }
    });

    // 2. Lists: add dir="rtl" to lists containing Persian/Arabic items for proper bullet alignment
    document.querySelectorAll('.prose ul, .prose ol, .markdown-body ul, .markdown-body ol, [data-testid="chat-message"] ul, [data-testid="chat-message"] ol').forEach(list => {
      if (list.closest('[class*="thinking"]')) return;
      const text = (list.textContent || '').trim();
      const clean = text.replace(/[\u200B-\u200F\uFEFF\s\d\W_]/g, '');
      if (clean.length > 0 && RTL_CHAR_REGEX.test(clean[0])) {
        if (list.getAttribute('dir') !== 'rtl') list.setAttribute('dir', 'rtl');
      } else {
        if (list.getAttribute('dir') === 'rtl') list.removeAttribute('dir');
      }
    });
  }

  function clearDir() {
    document.querySelectorAll('[dir]').forEach(el => {
      if (!el.id?.startsWith('aqm-') && !el.closest('#antigravity-usage-popover')) {
        el.removeAttribute('dir');
      }
    });
  }

  // Set up RTL observers & keyboard listeners
  if (!window.__aqm_rtl_listener_bound) {
    window.__aqm_rtl_listener_bound = true;
    document.body.addEventListener('input', debouncedUpdateDir, { capture: true, passive: true });

    document.addEventListener('keydown', (e) => {
      // Alt + R to toggle RTL
      if (e.altKey && e.code === 'KeyR') {
        e.preventDefault();
        rtlConfig.isRTL = !rtlConfig.isRTL;
        saveRtlConfig();
        applyRtlStyles();
        if (rtlConfig.isRTL) updateDir(); else clearDir();
        renderPopover();
        return;
      }
      // Intercept Shift + 2 in Persian keyboard
      if (rtlConfig.fixAtSign && e.code === 'Digit2' && e.shiftKey) {
        if (e.key === '٬' || e.key === '،') {
          e.preventDefault();
          document.execCommand('insertText', false, '@');
        }
      }
    }, { capture: true });
  }

  let displayMode = userSettings.mode || 'remaining';
  if (!userSettings.mode) {
    try {
      const saved = localStorage.getItem('antigravity:quota_mode');
      if (saved === 'remaining' || saved === 'used') displayMode = saved;
    } catch (e) {}
  }

  let isPrivacyMode = (userSettings.privacyMode !== undefined) ? Boolean(userSettings.privacyMode) : false;
  if (userSettings.privacyMode === undefined) {
    try {
      const p = localStorage.getItem('antigravity:privacy_mode');
      if (p !== null) isPrivacyMode = (p !== 'false');
    } catch (e) {}
  }

  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let popStartLeft = 0, popStartTop = 0;

  let isRefreshing = false;
  let activeTaskPollingInterval = null;

  let currentUsage = (() => {
    const isInst2 = (typeof window !== 'undefined' && window.__antigravity_instance === 'instance_2') || 
                    (typeof localStorage !== 'undefined' && localStorage.getItem('antigravity:instance_id') === 'instance_2');
    try {
      // Priority 1: window.__antigravity_quota set by daemon (always fresh, most trusted)
      if (window.__antigravity_quota && window.__antigravity_quota.session) {
        // Always trust daemon-injected quota — it's set correctly per instance
        return window.__antigravity_quota;
      }
      // Priority 2: localStorage keyed by instance-specific email
      const instanceAccount = localStorage.getItem('antigravity:account_email');
      if (instanceAccount) {
        const emailKey = 'antigravity:active_quota:' + instanceAccount;
        const itemByEmail = localStorage.getItem(emailKey);
        if (itemByEmail) {
          const parsed = JSON.parse(itemByEmail);
          if (parsed && parsed.session) return parsed;
        }
      }
      // Priority 3: generic localStorage — only if email matches this instance
      const item = localStorage.getItem('antigravity:active_quota');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.session) {
          const qEmail = parsed.email;
          const assignedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '';
          if (!assignedEmail || !qEmail || qEmail.toLowerCase() === assignedEmail.toLowerCase()) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    // Fallback: use manifest to get correct email dynamically
    let assignedEmail = '';
    try {
      assignedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '';
    } catch(e) {}
    let fallbackEmail = assignedEmail || (isInst2 ? 'bombhub.apk@gmail.com' : 'madgod.cum@gmail.com');
    let fallbackName = (assignedEmail ? (assignedEmail.split('@')[0].split('.')[0].charAt(0).toUpperCase() + assignedEmail.split('@')[0].split('.')[0].slice(1)) : (isInst2 ? 'Secondary' : 'Primary'));
    let fallbackAvatar = '';
    try {
      const manifestStr = localStorage.getItem('antigravity:accounts_manifest');
      if (manifestStr) {
        const manifest = JSON.parse(manifestStr);
        const keys = Object.keys(manifest || {});
        if (assignedEmail && manifest[assignedEmail]) {
          fallbackEmail = assignedEmail;
          fallbackName = manifest[assignedEmail]?.name || assignedEmail;
          fallbackAvatar = manifest[assignedEmail]?.avatar || '';
        } else if (keys.length > 0) {
          const matchKey = (isInst2 ? (keys.find(k => isAccount2(k)) || keys[1]) : keys[0]) || keys[0];
          fallbackEmail = matchKey;
          fallbackName = manifest[matchKey]?.name || matchKey;
          fallbackAvatar = manifest[matchKey]?.avatar || '';
        }
      }
    } catch(e) {}
    return {
      email: fallbackEmail,
      name: fallbackName,
      avatar: fallbackAvatar,
      tier: "Google AI Pro",
      tier_code: "pro",
      session: {
        name: "Gemini 3.8 Flash High",
        used_pct: 0,
        remaining_pct: 100,
        weekly_rem: 100,
        weekly_pct: 0,
        resets_in: "loading...",
        reset_time: ""
      },
      weekly: {
        remaining_pct: 100,
        used_pct: 0,
        resets_in: "loading..."
      },
      pools: []
    };
  })();

  function getActiveModelName() {
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    if (!trigger) return 'Gemini 3.8 Flash High';
    const firstLine = trigger.innerText.split('\n')[0].trim();
    return firstLine || 'Gemini 3.8 Flash High';
  }

  async function fetchStoredQuota() {
    try {
      const assignedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '';
      if (window.__antigravity_quota && window.__antigravity_quota.session) {
        const qEmail = window.__antigravity_quota.email;
        if (!assignedEmail || !qEmail || qEmail.toLowerCase() === assignedEmail.toLowerCase()) {
          currentUsage = { ...currentUsage, ...window.__antigravity_quota };
          return;
        }
      }
      const item = localStorage.getItem('antigravity:active_quota');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.session) {
          const qEmail = parsed.email;
          if (!assignedEmail || !qEmail || qEmail.toLowerCase() === assignedEmail.toLowerCase()) {
            currentUsage = { ...currentUsage, ...parsed };
          }
        }
      }
    } catch (e) {}
  }

  async function fetchLiveQuotaFromCloudCode() {
    try {
      if (!window.__cloudCodeService) {
        const rootEl = document.getElementById('root') || document.body;
        const rk = Object.keys(rootEl).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
        if (rk) {
          let queue = [rootEl[rk]];
          let scanned = 0;
          while (queue.length > 0 && scanned < 2000) {
            const f = queue.shift();
            scanned++;
            if (!f) continue;
            if (f.memoizedProps?.value?.core?.cloudCodeService) {
              window.__cloudCodeService = f.memoizedProps.value.core.cloudCodeService;
              break;
            }
            if (f.child) queue.push(f.child);
            if (f.sibling) queue.push(f.sibling);
          }
        }
      }

      if (window.__cloudCodeService && window.__cloudCodeService.retrieveUserQuotaSummary) {
        const raw = await window.__cloudCodeService.retrieveUserQuotaSummary(false);
        const groups = raw?.response?.groups || raw?.groups || [];
        if (groups && groups.length > 0) {
          const pools = [];
          let geminiSession = null;
          let geminiWeekly = null;

          groups.forEach(g => {
            const gName = g.displayName || '';
            const weeklyBucket = (g.buckets || []).find(b => b.displayName?.includes('Weekly'));
            const sessionBucket = (g.buckets || []).find(b => b.displayName?.includes('Five Hour') || b.displayName?.includes('5-Hour'));

            const wRem = weeklyBucket?.remaining?.value ?? weeklyBucket?.remainingFraction ?? 1.0;
            const sRem = sessionBucket?.remaining?.value ?? sessionBucket?.remainingFraction ?? 1.0;
            const sDesc = sessionBucket?.description || '';
            const wDesc = weeklyBucket?.description || '';

            let resetsIn = 'Ready to reset';
            const m = sDesc.match(/in\s+([0-9]+\s+[a-zA-Z]+(?:\s*,\s*[0-9]+\s+[a-zA-Z]+)?)/i);
            if (m) {
              resetsIn = m[1].replace(/hours?/gi, 'hr').replace(/minutes?/gi, 'min').replace(/days?/gi, 'd');
            }

            let wResetsIn = '2d, 19hr';
            const mw = wDesc.match(/in\s+([0-9]+\s+[a-zA-Z]+(?:\s*,\s*[0-9]+\s+[a-zA-Z]+)?)/i);
            if (mw) {
              wResetsIn = mw[1].replace(/hours?/gi, 'hr').replace(/minutes?/gi, 'min').replace(/days?/gi, 'd');
            }

            const poolObj = {
              name: gName,
              remaining_pct: Math.round(sRem * 1000) / 10,
              used_pct: Math.round((1.0 - sRem) * 1000) / 10,
              weekly_rem: Math.round(wRem * 1000) / 10,
              weekly_pct: Math.round((1.0 - wRem) * 1000) / 10,
              resets_in: resetsIn,
              reset_time: '',
              weekly_desc: wDesc,
              session_desc: sDesc
            };

            pools.push(poolObj);

            if (gName.includes('Gemini')) {
              geminiSession = {
                name: gName,
                used_pct: poolObj.used_pct,
                remaining_pct: poolObj.remaining_pct,
                resets_in: resetsIn,
                weekly_rem: poolObj.weekly_rem,
                weekly_pct: poolObj.weekly_pct
              };
              geminiWeekly = {
                remaining_pct: poolObj.weekly_rem,
                used_pct: poolObj.weekly_pct,
                resets_in: wResetsIn
              };
            }
          });

          if (geminiSession && geminiWeekly) {
            return {
              session: geminiSession,
              weekly: geminiWeekly,
              pools
            };
          }
        }
      }
    } catch (e) {
      console.warn('[AQM] Live quota error:', e);
    }
    return null;
  }

  function safeJsonStringify(obj) {
    try {
      return JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? Number(v) : v);
    } catch (e) {
      return null;
    }
  }

  async function refreshQuota() {
    if (isRefreshing) return;
    isRefreshing = true;
    renderBadge();
    const pop = document.getElementById('antigravity-usage-popover');
    if (pop && pop.style.display !== 'none' && !pop.matches(':hover')) renderPopover();

    try {
      // Always fetch from daemon first (most reliable, per-instance)
      const instParam = isInstance2Window() ? 'instance_2' : 'instance_1';
      let daemonData = null;
      try {
        const res = await fetch(`http://127.0.0.1:39281/sync?instance=${instParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.session) {
            const isInst2 = isInstance2Window();
            // Only accept data that matches this instance
            const dataEmail = (data.email || '').toLowerCase();
            const currentEmail = (currentUsage.email || '').toLowerCase();
            // Accept if: no email mismatch, or email matches current instance's account
            const assignedEmail = (localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '').toLowerCase();
            const emailOk = !assignedEmail || !dataEmail || (dataEmail === assignedEmail);
            if (emailOk) {
              daemonData = data;
            }
          }
        }
      } catch(e) {}

      if (daemonData) {
        currentUsage = {
          ...currentUsage,
          ...daemonData,
          session: daemonData.session,
          weekly: daemonData.weekly || currentUsage.weekly,
          pools: daemonData.pools || currentUsage.pools || []
        };
        window.__antigravity_quota = currentUsage;
        try {
          const s = safeJsonStringify(currentUsage);
          if (s) {
            localStorage.setItem('antigravity:active_quota', s);
            if (currentUsage.email) localStorage.setItem('antigravity:active_quota:' + currentUsage.email, s);
          }
        } catch (e) {}
      } else {
        // Fallback: try live cloud code (less reliable due to shared credential store)
        const liveData = await fetchLiveQuotaFromCloudCode();
        if (liveData && liveData.session) {
          // Preserve identity from currentUsage, only update quota numbers
          currentUsage = {
            ...currentUsage,
            session: liveData.session,
            weekly: liveData.weekly || currentUsage.weekly,
            pools: liveData.pools || currentUsage.pools || []
          };
          window.__antigravity_quota = currentUsage;
          try {
            const s = safeJsonStringify(currentUsage);
            if (s) {
              localStorage.setItem('antigravity:active_quota', s);
              if (currentUsage.email) localStorage.setItem('antigravity:active_quota:' + currentUsage.email, s);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[AQM] refreshQuota error:', e);
    } finally {
      isRefreshing = false;
      renderBadge();
      const p = document.getElementById('antigravity-usage-popover');
      if (p && p.style.display !== 'none' && !p.matches(':hover')) renderPopover();
    }
  }

  // --- Brand Vector Marks ---
  const SVGS = {
    gemini: `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" fill="url(#aqmGeminiGrad)"/>
        <defs>
          <linearGradient id="aqmGeminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4285F4"/>
            <stop offset="50%" stop-color="#9B72CB"/>
            <stop offset="100%" stop-color="#D96570"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    claude: `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
        <path d="M13.8 2.5a1.8 1.8 0 0 0-3.6 0l-.8 7.3a1.8 1.8 0 0 1-1.6 1.6l-7.3.8a1.8 1.8 0 0 0 0 3.6l7.3.8a1.8 1.8 0 0 1 1.6 1.6l.8 7.3a1.8 1.8 0 0 0 3.6 0l.8-7.3a1.8 1.8 0 0 1 1.6-1.6l7.3-.8a1.8 1.8 0 0 0 0-3.6l-7.3-.8a1.8 1.8 0 0 1-1.6-1.6l-.8-7.3z" fill="#D97706"/>
      </svg>
    `,
    gpt: `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <path d="M12 2a10 10 0 0 0-9.5 6.9A10 10 0 0 0 4.2 19a10 10 0 0 0 15.6.1 10 10 0 0 0 1.7-10.2A10 10 0 0 0 12 2z"/>
        <path d="M12 6a6 6 0 0 0-5.7 4.1A6 6 0 0 0 7.3 16a6 6 0 0 0 9.4 0 6 6 0 0 0 1-6A6 6 0 0 0 12 6z"/>
      </svg>
    `,
    standalone: `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `,
    lightning: `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    `,
    palette: `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
    `,
    refresh: `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    `
  };

  let lastPopoverOpenTime = 0;
  function getOrCreatePopover() {
    let pop = document.getElementById('antigravity-usage-popover');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'antigravity-usage-popover';
      pop.style.position = 'fixed';
      pop.style.zIndex = '999999';
      pop.style.width = '445px';
      pop.style.boxSizing = 'border-box';
      pop.style.padding = '18px 20px';
      pop.style.borderRadius = '24px';
      pop.style.backdropFilter = 'blur(32px) saturate(210%)';
      pop.style.webkitBackdropFilter = 'blur(32px) saturate(210%)';
      pop.style.animation = 'aqm-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      pop.style.display = 'none';

      pop.addEventListener('click', (e) => e.stopPropagation());
      pop.addEventListener('mousedown', (e) => e.stopPropagation());
      pop.addEventListener('pointerdown', (e) => e.stopPropagation());

      document.body.appendChild(pop);
    }

    if (!window.__aqm_click_bound) {
      window.__aqm_click_bound = true;
      document.addEventListener('click', (e) => {
        const p = document.getElementById('antigravity-usage-popover');
        const pl = document.getElementById('antigravity-usage-pill');
        if (p && p.style.display !== 'none') {
          if (Date.now() - lastPopoverOpenTime < 250) return;
          if (!p.contains(e.target) && (!pl || !pl.contains(e.target))) {
            p.style.display = 'none';
            const drop = document.getElementById('aqm-theme-dropdown');
            if (drop) drop.style.display = 'none';
          }
        }
      });
    }
    return pop;
  }

  function renderPopover() {
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    if (!trigger) return;

    const theme = getActiveTheme();
    const { fontEn, fontFa, fullFamily } = getEffectiveFonts(theme);
    applyAppWorkspaceTheme(theme, isFullAppThemingEnabled);

    const pop = getOrCreatePopover();
    const existingDropdown = pop.querySelector('#aqm-theme-dropdown');
    const wasDrawerOpen = Boolean(existingDropdown && (existingDropdown.style.display === 'block' || existingDropdown.style.display === 'flex'));

    pop.style.background = theme.cardBg;
    pop.style.border = `1px solid ${theme.cardBorder}`;
    pop.style.boxShadow = theme.cardShadow;
    pop.style.color = theme.textColor;
    pop.style.fontFamily = fullFamily;

    let customPos = null;
    try {
      customPos = JSON.parse(localStorage.getItem('antigravity:popover_pos') || 'null');
    } catch (e) {}

    const anchor = document.getElementById('antigravity-usage-pill') || trigger;
    const rect = anchor.getBoundingClientRect();
    const popWidth = 445;
    const popHeight = 494;

    if (customPos && customPos.left !== undefined && customPos.top !== undefined) {
      let l = parseFloat(customPos.left);
      let t = parseFloat(customPos.top);
      l = Math.min(Math.max(12, l), Math.max(12, window.innerWidth - popWidth - 12));
      t = Math.min(Math.max(12, t), Math.max(12, window.innerHeight - popHeight - 12));
      pop.style.left = l + 'px';
      pop.style.top = t + 'px';
      pop.style.bottom = 'auto';
    } else {
      let desiredLeft = Math.max(12, rect.left - 20);
      if (desiredLeft + popWidth > window.innerWidth - 12) {
        desiredLeft = Math.max(12, window.innerWidth - popWidth - 12);
      }

      let desiredTop = rect.top - popHeight - 14;
      if (desiredTop < 12) {
        if (rect.bottom + 14 + popHeight <= window.innerHeight - 12) {
          desiredTop = rect.bottom + 14;
        } else {
          desiredTop = 12;
        }
      }

      pop.style.left = desiredLeft + 'px';
      pop.style.top = desiredTop + 'px';
      pop.style.bottom = 'auto';
    }

    pop.style.overflow = 'visible';

    try {
      const p = localStorage.getItem('antigravity:privacy_mode');
      if (p !== null) isPrivacyMode = (p !== 'false');
    } catch (e) {}

    const isRem = (displayMode === 'remaining');
    const sessRem = Math.round(currentUsage.session?.remaining_pct ?? (100 - Math.round(currentUsage.session?.used_pct ?? 0)));
    const sessUsed = Math.round(currentUsage.session?.used_pct ?? (100 - sessRem));
    const sessReset = currentUsage.session?.resets_in || 'Ready';
    const sessResetTime = currentUsage.session?.reset_time || '';
    let email = currentUsage.email || window.__antigravity_account || localStorage.getItem('antigravity:account_email') || '';
    if (email === 'developer@antigravity.ai' || !email) {
      email = window.__antigravity_account || localStorage.getItem('antigravity:account_email') || 'user@example.com';
    }
    const displayEmail = isPrivacyMode ? '••••••••••••@gmail.com' : email;

    const mainPct = isRem ? sessRem : sessUsed;
    const subPct = isRem ? sessUsed : sessRem;
    const mainLabel = isRem ? 'مانده' : 'مصرف';
    const subLabel = isRem ? 'مصرف' : 'مانده';

    const weeklyRem = Math.round(currentUsage.weekly?.remaining_pct ?? (100 - Math.round(currentUsage.weekly?.used_pct ?? 0)));
    const weeklyUsed = Math.round(currentUsage.weekly?.used_pct ?? (100 - weeklyRem));
    const weeklyShow = isRem ? weeklyRem : weeklyUsed;

    const activeModel = getActiveModelName();

    const geminiPool = (currentUsage.pools || []).find(p => p.name?.toLowerCase().includes('gemini'));
    const claudeGptPool = (currentUsage.pools || []).find(p => p.name?.toLowerCase().includes('claude') || p.name?.toLowerCase().includes('gpt'));

    const geminiSessUsed = geminiPool ? Math.round(geminiPool.used_pct) : sessUsed;
    const geminiSessRem = geminiPool ? Math.round(geminiPool.remaining_pct) : sessRem;
    const geminiWeekRem = geminiPool ? Math.round(geminiPool.weekly_rem) : weeklyRem;
    const geminiWeekUsed = geminiPool ? Math.round(geminiPool.weekly_pct) : weeklyUsed;
    const geminiResets = geminiPool?.resets_in || sessReset;

    const claudeSessUsed = claudeGptPool ? Math.round(claudeGptPool.used_pct) : 0;
    const claudeSessRem = claudeGptPool ? Math.round(claudeGptPool.remaining_pct) : 100;
    const claudeWeekRem = claudeGptPool ? Math.round(claudeGptPool.weekly_rem) : 97;
    const claudeWeekUsed = claudeGptPool ? Math.round(claudeGptPool.weekly_pct) : 3;
    const claudeResets = claudeGptPool?.resets_in || '5h';

    // ACCURATE MODEL NAMES DETECTED IN ANTIGRAVITY
    // Gemini 3.8 Flash, Gemini 3.1 Pro, Claude Sonnet 4.6, GPT-OSS 120B
    const pools = [
      {
        id: 'gemini-flash',
        name: 'Gemini 3.8 Flash',
        svg: SVGS.gemini,
        isActive: activeModel.toLowerCase().includes('flash'),
        used_pct: geminiSessUsed,
        remaining_pct: geminiSessRem,
        weekly_rem: geminiWeekRem,
        weekly_pct: geminiWeekUsed,
        resets_in: geminiResets
      },
      {
        id: 'gemini-pro',
        name: 'Gemini 3.1 Pro',
        svg: SVGS.gemini,
        isActive: activeModel.toLowerCase().includes('3.1') || (activeModel.toLowerCase().includes('pro') && !activeModel.toLowerCase().includes('flash')),
        used_pct: geminiSessUsed,
        remaining_pct: geminiSessRem,
        weekly_rem: geminiWeekRem,
        weekly_pct: geminiWeekUsed,
        resets_in: geminiResets
      },
      {
        id: 'claude',
        name: 'Claude Sonnet 4.6',
        svg: SVGS.claude,
        isActive: activeModel.toLowerCase().includes('claude'),
        used_pct: claudeSessUsed,
        remaining_pct: claudeSessRem,
        weekly_rem: claudeWeekRem,
        weekly_pct: claudeWeekUsed,
        resets_in: claudeResets
      },
      {
        id: 'gpt-oss',
        name: 'GPT-OSS 120B',
        svg: SVGS.gpt,
        isActive: activeModel.toLowerCase().includes('gpt') || activeModel.toLowerCase().includes('oss'),
        used_pct: claudeSessUsed,
        remaining_pct: claudeSessRem,
        weekly_rem: claudeWeekRem,
        weekly_pct: claudeWeekUsed,
        resets_in: claudeResets
      },
      {
        id: 'others',
        name: 'سایر مدل‌های هوش مصنوعی',
        svg: SVGS.standalone,
        isActive: false,
        used_pct: 0,
        remaining_pct: 100,
        weekly_rem: 100,
        weekly_pct: 0,
        resets_in: 'N/A'
      }
    ];

    let poolsHtml = '';
    for (const p of pools) {
      const pRem = Math.round(p.remaining_pct ?? (100 - (p.used_pct || 0)));
      const pUsed = Math.round(p.used_pct || 0);
      const pWeekRem = Math.round(p.weekly_rem ?? (100 - (p.weekly_pct || 0)));
      const pWeekUsed = Math.round(p.weekly_pct ?? (100 - pWeekRem));
      const r = p.resets_in || 'N/A';

      const showVal = isRem ? pRem : pUsed;
      const showWeek = isRem ? pWeekRem : pWeekUsed;
      const statusColor = showVal > 35 ? theme.accent : (showVal > 15 ? '#fbbf24' : '#f43f5e');

      poolsHtml += `
        <div class="aqm-model-row" style="height:36px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0, 1fr) 88px 64px;align-items:center;gap:10px;padding:0 12px;border-radius:11px;background:${p.isActive ? (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : theme.itemBg};border:1px solid ${p.isActive ? theme.itemHoverBorder : theme.itemBorder};font-size:12px;direction:ltr;">
          <!-- Model Identity: Brand icon + Name + Clean glowing dot if active -->
          <div style="display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;">
            <div style="width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${p.svg}
            </div>
            <span data-font="en" style="font-weight:600;color:${theme.textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em;font-size:11.8px;font-family:${fontEn};">${p.name}</span>
            ${p.isActive ? `<span style="width:6px;height:6px;border-radius:50%;background:${theme.dotColor};box-shadow:0 0 6px ${theme.dotColor};flex-shrink:0;animation:aqm-pulse-dot 2s infinite ease-in-out;" title="مدل انتخاب‌شده فعلی"></span>` : ''}
          </div>

          <!-- Session Quota Track -->
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;">
            <div style="display:flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${statusColor};" data-font="mono">
              <span dir="ltr">${showVal}%</span>
              <span data-font="en" style="font-family:${fontEn};font-size:9px;color:${theme.subText};font-weight:500;opacity:0.8;">(${r})</span>
            </div>
            <div style="width:100%;height:3px;border-radius:9999px;background:rgba(255,255,255,0.08);overflow:hidden;">
              <div style="height:100%;width:${showVal}%;border-radius:9999px;background:${theme.accentGrad};"></div>
            </div>
          </div>

          <!-- Weekly Quota Track -->
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;">
            <div style="display:flex;align-items:center;gap:3px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:${theme.chipColor};" data-font="mono">
              <span style="font-size:8.5px;color:${theme.subText};font-weight:500;">W:</span>
              <span dir="ltr">${showWeek}%</span>
            </div>
            <div style="width:100%;height:2.5px;border-radius:9999px;background:rgba(255,255,255,0.06);overflow:hidden;">
              <div style="height:100%;width:${showWeek}%;border-radius:9999px;background:${theme.accentSecondary || theme.accent};"></div>
            </div>
          </div>
        </div>
      `;
    }

    const themeKeys = ['cyber', 'pastel', 'gravity', 'emerald', 'vision', 'sunset'];
    let themeCardsHtml = '';
    for (const tk of themeKeys) {
      const t = THEMES[tk];
      const isCur = (currentThemeId === tk);
      themeCardsHtml += `
        <div data-theme-id="${tk}" class="aqm-theme-card" style="background:${isCur ? (theme.isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.06)') : 'transparent'};border-color:${isCur ? theme.cardBorder : 'transparent'};">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:20px;height:20px;border-radius:50%;background:${t.previewGradients};box-shadow:0 0 10px ${t.accentGlow || 'rgba(0,0,0,0.3)'};border:1.5px solid rgba(255,255,255,0.25);flex-shrink:0;"></div>
            <div style="display:flex;flex-direction:column;text-align:right;">
              <span style="font-weight:700;font-size:11.8px;color:${isCur ? theme.accent : theme.textColor};font-family:${t.fontFa};">${t.name}</span>
              <span style="font-size:9px;color:${theme.subText};opacity:0.85;font-family:${t.fontFa};">${t.desc}</span>
            </div>
          </div>
          ${isCur ? `<span style="font-size:12px;font-weight:800;color:${theme.accent};">✓</span>` : ''}
        </div>
      `;
    }

    const BUILTIN_FONTS_EN = [
      { id: 'default', label: 'پیش‌فرض' },
      { id: 'Fredoka', label: 'Fredoka' },
      { id: 'Outfit', label: 'Outfit' },
      { id: 'Space Grotesk', label: 'Space' },
      { id: 'JetBrains Mono', label: 'Mono' },
      { id: 'Inter', label: 'Inter' },
      { id: 'Plus Jakarta Sans', label: 'Jakarta' }
    ];

    const BUILTIN_FONTS_FA = [
      { id: 'default', label: 'پیش‌فرض' },
      { id: 'Vazirmatn', label: 'وزیرمتن' },
      { id: 'Estedad', label: 'استعداد' },
      { id: 'Sahel', label: 'ساحل' },
      { id: 'Shabnam', label: 'شبنم' },
      { id: 'Samim', label: 'صمیم' },
      { id: 'Lalezar', label: 'لاله‌زار' },
      { id: 'Noto Sans Arabic', label: 'نوتو عربی' },
      { id: 'IRANSansX', label: 'ایران‌سنس' },
      { id: 'B Yekan', label: 'یکان' }
    ];

    const importedEn = customImportedFonts.filter(f => f.type === 'en');
    const importedFa = customImportedFonts.filter(f => f.type === 'fa');

    pop.innerHTML = `
      <!-- Header Area: Clean, Draggable & Privacy-Protected -->
      <div id="aqm-drag-handle" style="display:flex;justify-content:space-between;align-items:center;direction:ltr;cursor:grab;user-select:none;padding-bottom:4px;" title="جهت جابه‌جایی پنجره بکشید (دوبار کلیک برای بازنشانی به موقعیت پیش‌فرض)">
        <div style="display:flex;align-items:center;gap:9px;">
          <div style="width:34px;height:34px;border-radius:10px;background:${theme.chipBg};border:1px solid ${theme.cardBorder};display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 1px rgba(255,255,255,0.2);">
            <div style="color:${theme.accent};filter:drop-shadow(0 0 6px ${theme.accent});">
              ${SVGS.gemini}
            </div>
          </div>
          <div>
            <div data-font="en" style="font-weight:700;font-size:13.5px;letter-spacing:-0.02em;color:${theme.textColor};font-family:${fontEn};">Gemini Quota HUD</div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:0.5px;">
              <span data-font="en" style="font-size:10.5px;color:${theme.subText};opacity:0.85;font-family:${fontEn};">${displayEmail}</span>
              <button id="aqm-privacy-btn" type="button" title="${isPrivacyMode ? 'نمایش ایمیل' : 'مخفی‌سازی ایمیل (حالت حریم خصوصی)'}" style="background:none;border:none;cursor:pointer;font-size:10px;padding:0;line-height:1;color:${theme.subText};opacity:0.75;transition:opacity 0.2s ease;">
                ${isPrivacyMode ? '🔒' : '👁'}
              </button>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          <!-- Segmented Toggle -->
          <div style="display:flex;padding:2px;border-radius:9999px;background:rgba(0,0,0,0.25);border:1px solid ${theme.itemBorder};backdrop-filter:blur(10px);">
            <button id="aqm-mode-rem-btn" type="button" data-font="fa" style="background:${isRem ? theme.accentGrad : 'transparent'};color:${isRem ? (theme.isDark ? '#0b111e' : '#ffffff') : theme.subText};border:none;padding:2.5px 8px;border-radius:9999px;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s ease;font-family:${fontFa};">مانده</button>
            <button id="aqm-mode-used-btn" type="button" data-font="fa" style="background:${!isRem ? theme.accentGrad : 'transparent'};color:${!isRem ? (theme.isDark ? '#0b111e' : '#ffffff') : theme.subText};border:none;padding:2.5px 8px;border-radius:9999px;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s ease;font-family:${fontFa};">مصرف</button>
          </div>

          <!-- Theme Trigger -->
          <button id="aqm-theme-menu-trigger" type="button" data-font="fa" title="گالری تم‌ها و پوسته‌ها" style="display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:9999px;background:${theme.itemBg};border:1px solid ${theme.itemBorder};color:${theme.textColor};font-size:10.5px;font-weight:600;cursor:pointer;transition:all 0.2s ease;font-family:${fontFa};user-select:none;">
            <span style="color:${theme.accent};">${SVGS.palette}</span>
            <span style="font-size:10px;opacity:0.95;">پوسته</span>
            <span style="font-size:7.5px;opacity:0.6;">▼</span>
          </button>

          <!-- Account Switcher Trigger -->
          <button id="aqm-account-switcher-trigger" type="button" data-font="fa" title="سوئیچ اکانت و مهاجرت پروژه‌ها" style="display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:9999px;background:${theme.itemBg};border:1px solid ${theme.itemBorder};color:${theme.textColor};font-size:10.5px;font-weight:600;cursor:pointer;transition:all 0.2s ease;font-family:${fontFa};user-select:none;">
            <span style="color:${theme.accent};">⚡️</span>
            <span style="font-size:10px;opacity:0.95;">سوئیچ</span>
          </button>

          <!-- Refresh Action -->
          <button id="aqm-refresh-btn" type="button" title="همگام‌سازی لحظه‌ای سهمیه" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${theme.itemBg};border:1px solid ${theme.itemBorder};color:${theme.accent};cursor:pointer;transition:all 0.2s ease;">
            <span class="${isRefreshing ? 'aqm-rotating' : ''}">${SVGS.refresh}</span>
          </button>

          <!-- Close Button -->
          <button id="aqm-close-btn" type="button" title="بستن پنجره" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${theme.itemBg};border:1px solid ${theme.itemBorder};color:${theme.subText};font-size:10.5px;cursor:pointer;transition:all 0.2s ease;">
            ✕
          </button>
        </div>
      </div>

      <!-- Luxury Floating Theme Drawer (Side-by-side or boundary clamped) -->
      <div id="aqm-theme-dropdown" style="display:${wasDrawerOpen ? 'block' : 'none'};position:absolute;top:0;bottom:0;left:calc(100% + 14px);width:335px;height:100%;box-sizing:border-box;overflow-y:auto;padding:14px;border-radius:24px;background:${theme.isDark ? 'rgba(11, 15, 25, 0.98)' : 'rgba(255, 255, 255, 0.98)'};border:1px solid ${theme.cardBorder};box-shadow:0 24px 60px rgba(0,0,0,0.65), 0 0 20px ${theme.chipBg};backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);z-index:1000000;direction:rtl;" class="aqm-custom-scroll">
          <div data-font="fa" style="font-size:11.5px;font-weight:800;color:${theme.textColor};margin-bottom:8px;padding:0 4px;display:flex;justify-content:space-between;align-items:center;font-family:${fontFa};">
            <span>پالت‌های اختصاصی</span>
            <span style="font-size:9px;color:${theme.subText};padding:1px 6px;border-radius:9999px;background:${theme.chipBg};">۶ سبک منحصربفرد</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;max-height:170px;overflow-y:auto;" class="aqm-custom-scroll">
            ${themeCardsHtml}
          </div>

          <!-- Typography Customizer Section -->
          <div style="margin:9px 0 7px 0;border-top:1px solid ${theme.itemBorder};padding-top:7px;">
            <div data-font="fa" style="font-size:11px;font-weight:800;color:${theme.textColor};margin-bottom:6px;padding:0 2px;display:flex;justify-content:space-between;align-items:center;font-family:${fontFa};">
              <span>تایپوگرافی و فونت</span>
              <span data-font="en" style="font-size:8.5px;color:${theme.accent};font-family:${fontEn};">Persian & English</span>
            </div>

            <!-- English Font selector -->
            <div style="margin-bottom:7px;">
              <div data-font="fa" style="font-size:9.5px;color:${theme.subText};margin-bottom:3px;font-family:${fontFa};">فونت انگلیسی و کد:</div>
              <div style="display:flex;gap:3px;flex-wrap:wrap;">
                ${BUILTIN_FONTS_EN.map(item => `
                  <button type="button" data-font-en="${item.id}" style="background:${customFontEn === item.id ? theme.accentGrad : 'rgba(255,255,255,0.06)'};color:${customFontEn === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.textColor};border:1px solid ${customFontEn === item.id ? theme.cardBorder : 'rgba(255,255,255,0.08)'};padding:2px 6px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;transition:all 0.15s ease;font-family:${item.id === 'default' ? fontFa : `'${item.id}', sans-serif`};">
                    ${item.label}
                  </button>
                `).join('')}
                ${importedEn.map(item => `
                  <div style="display:inline-flex;align-items:center;background:${customFontEn === item.id ? theme.accentGrad : 'rgba(255,255,255,0.06)'};border:1px solid ${customFontEn === item.id ? theme.cardBorder : 'rgba(255,255,255,0.08)'};border-radius:6px;padding:2px 3px 2px 6px;gap:3px;">
                    <button type="button" data-font-en="${item.id}" style="background:none;border:none;color:${customFontEn === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.textColor};font-size:9px;font-weight:700;cursor:pointer;padding:0;font-family:'${item.id}', sans-serif;">
                      ${item.name}
                    </button>
                    <button type="button" data-delete-imported-font="${item.id}" title="حذف فونت" style="background:none;border:none;color:${customFontEn === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.subText};cursor:pointer;font-size:9.5px;padding:0 1px;line-height:1;opacity:0.75;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Persian Font selector -->
            <div>
              <div data-font="fa" style="font-size:9.5px;color:${theme.subText};margin-bottom:3px;font-family:${fontFa};">فونت فارسی و توضیحات:</div>
              <div style="display:flex;gap:3px;flex-wrap:wrap;">
                ${BUILTIN_FONTS_FA.map(item => `
                  <button type="button" data-font-fa="${item.id}" style="background:${customFontFa === item.id ? theme.accentGrad : 'rgba(255,255,255,0.06)'};color:${customFontFa === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.textColor};border:1px solid ${customFontFa === item.id ? theme.cardBorder : 'rgba(255,255,255,0.08)'};padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;font-family:${item.id === 'default' ? fontFa : `'${item.id}', sans-serif`};">
                    ${item.label}
                  </button>
                `).join('')}
                ${importedFa.map(item => `
                  <div style="display:inline-flex;align-items:center;background:${customFontFa === item.id ? theme.accentGrad : 'rgba(255,255,255,0.06)'};border:1px solid ${customFontFa === item.id ? theme.cardBorder : 'rgba(255,255,255,0.08)'};border-radius:6px;padding:2px 3px 2px 7px;gap:3px;">
                    <button type="button" data-font-fa="${item.id}" style="background:none;border:none;color:${customFontFa === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.textColor};font-size:9.5px;font-weight:700;cursor:pointer;padding:0;font-family:'${item.id}', sans-serif;">
                      ${item.name}
                    </button>
                    <button type="button" data-delete-imported-font="${item.id}" title="حذف فونت" style="background:none;border:none;color:${customFontFa === item.id ? (theme.isDark ? '#080d16' : '#ffffff') : theme.subText};cursor:pointer;font-size:9.5px;padding:0 1px;line-height:1;opacity:0.75;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Custom Font Import Section -->
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed ${theme.itemBorder};">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span data-font="fa" style="font-size:9.5px;font-weight:700;color:${theme.textColor};font-family:${fontFa};">ایمپورت فونت سفارشی</span>
                <button id="aqm-toggle-import-btn" type="button" style="background:${theme.chipBg};border:1px solid ${theme.itemBorder};border-radius:6px;color:${theme.accent};font-size:9px;font-weight:700;cursor:pointer;padding:2px 6px;font-family:${fontFa};">
                  ${isImportFormOpen ? 'بستن فرم ▲' : '➕ افزودن فونت'}
                </button>
              </div>

              <div id="aqm-import-form" style="display:${isImportFormOpen ? 'flex' : 'none'};flex-direction:column;gap:5px;background:${theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'};padding:8px;border-radius:10px;border:1px solid ${theme.itemBorder};margin-bottom:4px;">
                <div>
                  <input id="aqm-import-name" type="text" placeholder="نام دقیق فونت (مثلاً IRANSansX یا Dana)" style="width:100%;box-sizing:border-box;background:${theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'};border:1px solid ${theme.itemBorder};border-radius:6px;padding:4px 7px;font-size:9.5px;color:${theme.textColor};outline:none;font-family:${fontFa};direction:rtl;" />
                </div>
                <div>
                  <input id="aqm-import-url" type="text" placeholder="لینک وب‌فونت یا CSS (اختیاری برای فونت ویندوز)" style="width:100%;box-sizing:border-box;background:${theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'};border:1px solid ${theme.itemBorder};border-radius:6px;padding:4px 7px;font-size:9px;color:${theme.textColor};outline:none;font-family:'JetBrains Mono',monospace;direction:ltr;" />
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
                  <div style="display:flex;gap:8px;font-size:9px;color:${theme.subText};align-items:center;">
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-family:${fontFa};">
                      <input type="radio" name="aqm-import-type" value="fa" checked style="accent-color:${theme.accent};" />
                      فارسی
                    </label>
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-family:${fontFa};">
                      <input type="radio" name="aqm-import-type" value="en" style="accent-color:${theme.accent};" />
                      انگلیسی
                    </label>
                  </div>
                  <button id="aqm-import-submit-btn" type="button" style="background:${theme.accentGrad};color:${theme.isDark ? '#060d13' : '#ffffff'};border:none;border-radius:6px;padding:3.5px 10px;font-size:9.5px;font-weight:700;cursor:pointer;transition:all 0.2s ease;box-shadow:${theme.accentGlow};font-family:${fontFa};">
                    افزودن و اعمال
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style="margin:8px 0;border-top:1px solid ${theme.itemBorder};"></div>
          <!-- Full Workspace Theming Toggle -->
          <div id="aqm-full-app-toggle-row" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;cursor:pointer;border-radius:10px;user-select:none;background:${theme.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'};">
            <div style="display:flex;flex-direction:column;">
              <span data-font="fa" style="font-size:10.5px;font-weight:700;color:${theme.textColor};font-family:${fontFa};">پوسته سراسری ادیتور</span>
              <span data-font="fa" style="font-size:8.5px;color:${theme.subText};margin-top:1px;font-family:${fontFa};">هماهنگی رنگ کل پنجره با پوسته انتخابی</span>
            </div>
            <div id="aqm-full-app-switch" style="width:32px;height:18px;border-radius:9999px;background:${isFullAppThemingEnabled ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')};position:relative;transition:all 0.2s ease;">
              <div style="width:14px;height:14px;border-radius:50%;background:#ffffff;position:absolute;top:2px;${isFullAppThemingEnabled ? 'left:2px;' : 'right:2px;'};transition:all 0.2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
            </div>
          </div>

          <!-- Smart RTL & Persian Suite Section -->
          <div style="margin:8px 0;border-top:1px solid ${theme.itemBorder};padding-top:7px;">
            <div data-font="fa" style="font-size:11px;font-weight:800;color:${theme.textColor};margin-bottom:6px;padding:0 2px;display:flex;justify-content:space-between;align-items:center;font-family:${fontFa};">
              <span>پشتیبانی راست‌چین و فارسی (Smart RTL)</span>
              <span style="font-size:8.5px;color:${theme.accent};font-family:'JetBrains Mono',monospace;">Alt + R</span>
            </div>

            <!-- RTL Auto Direction Toggle Row -->
            <div id="aqm-rtl-toggle-row" style="display:flex;justify-content:space-between;align-items:center;padding:5px 7px;cursor:pointer;border-radius:8px;user-select:none;background:${theme.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'};margin-bottom:4px;">
              <div style="display:flex;flex-direction:column;">
                <span data-font="fa" style="font-size:10px;font-weight:700;color:${theme.textColor};font-family:${fontFa};">راست‌چین هوشمند</span>
                <span data-font="fa" style="font-size:8.5px;color:${theme.subText};font-family:${fontFa};">تنظیم خودکار جهت پاراگراف‌ها بر اساس زبان</span>
              </div>
              <div style="width:30px;height:17px;border-radius:9999px;background:${rtlConfig.isRTL ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')};position:relative;transition:all 0.2s ease;">
                <div style="width:13px;height:13px;border-radius:50%;background:#ffffff;position:absolute;top:2px;${rtlConfig.isRTL ? 'left:2px;' : 'right:2px;'};transition:all 0.2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
              </div>
            </div>

            <!-- Force RTL Toggle Row -->
            <div id="aqm-rtl-force-row" style="display:flex;justify-content:space-between;align-items:center;padding:5px 7px;cursor:pointer;border-radius:8px;user-select:none;background:${theme.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'};margin-bottom:4px;">
              <div style="display:flex;flex-direction:column;">
                <span data-font="fa" style="font-size:10px;font-weight:700;color:${theme.textColor};font-family:${fontFa};">اجبار راست‌چین (Force RTL)</span>
                <span data-font="fa" style="font-size:8.5px;color:${theme.subText};font-family:${fontFa};">راست‌چین کامل تمام پیام‌ها و چت‌ها</span>
              </div>
              <div style="width:30px;height:17px;border-radius:9999px;background:${rtlConfig.forceRTL ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')};position:relative;transition:all 0.2s ease;">
                <div style="width:13px;height:13px;border-radius:50%;background:#ffffff;position:absolute;top:2px;${rtlConfig.forceRTL ? 'left:2px;' : 'right:2px;'};transition:all 0.2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
              </div>
            </div>

            <!-- Fix @ Key Toggle Row -->
            <div id="aqm-rtl-at-row" style="display:flex;justify-content:space-between;align-items:center;padding:5px 7px;cursor:pointer;border-radius:8px;user-select:none;background:${theme.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'};margin-bottom:6px;">
              <div style="display:flex;flex-direction:column;">
                <span data-font="fa" style="font-size:10px;font-weight:700;color:${theme.textColor};font-family:${fontFa};">اصلاح کلید @ با Shift+2</span>
                <span data-font="fa" style="font-size:8.5px;color:${theme.subText};font-family:${fontFa};">تایپ @ به جای کاما در کیبورد فارسی</span>
              </div>
              <div style="width:30px;height:17px;border-radius:9999px;background:${rtlConfig.fixAtSign ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')};position:relative;transition:all 0.2s ease;">
                <div style="width:13px;height:13px;border-radius:50%;background:#ffffff;position:absolute;top:2px;${rtlConfig.fixAtSign ? 'left:2px;' : 'right:2px;'};transition:all 0.2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
              </div>
            </div>

            <!-- Line Height & Font Size Controls -->
            <div style="display:flex;gap:6px;background:${theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)'};padding:6px 8px;border-radius:8px;border:1px solid ${theme.itemBorder};">
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;font-size:9px;color:${theme.subText};margin-bottom:3px;font-family:${fontFa};">
                  <span>فاصله خطوط:</span>
                  <span style="font-family:'JetBrains Mono',monospace;color:${theme.textColor};">${rtlConfig.lineHeight}</span>
                </div>
                <input id="aqm-rtl-lh-slider" type="range" min="1.2" max="2.4" step="0.1" value="${rtlConfig.lineHeight}" style="width:100%;accent-color:${theme.accent};cursor:pointer;height:3px;" />
              </div>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;font-size:9px;color:${theme.subText};margin-bottom:3px;font-family:${fontFa};">
                  <span>اندازه قلم:</span>
                  <span style="font-family:'JetBrains Mono',monospace;color:${theme.textColor};">${rtlConfig.fontSize}px</span>
                </div>
                <input id="aqm-rtl-fs-slider" type="range" min="12" max="22" step="1" value="${rtlConfig.fontSize}" style="width:100%;accent-color:${theme.accent};cursor:pointer;height:3px;" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hero HUD Card: Decluttered, Pure & Minimal -->
      <div style="margin-top:13px;padding:14px 16px;border-radius:16px;background:${theme.itemBg};border:1px solid ${theme.itemBorder};box-shadow:inset 0 1px 1px rgba(255,255,255,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;direction:ltr;">
          <!-- Left: Label & Reset time -->
          <div>
            <div data-font="en" style="font-size:11px;color:${theme.subText};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;font-family:${fontEn};">
              5-Hour Session Quota
            </div>
            <div data-font="fa" style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:${theme.subText};margin-top:3px;font-family:${fontFa};">
              <span>بازنشانی در</span>
              <span style="font-weight:700;color:${theme.textColor};font-family:'JetBrains Mono',monospace;" data-font="mono" dir="ltr">${sessResetTime}</span>
              <span style="opacity:0.4;">•</span>
              <span style="color:${theme.accent};font-weight:600;">${sessReset} مانده</span>
            </div>
          </div>

          <!-- Right: Big Percentage -->
          <div style="text-align:right;direction:rtl;">
            <div style="display:flex;align-items:baseline;gap:5px;justify-content:flex-end;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:800;color:${theme.accent};letter-spacing:-0.03em;text-shadow:${theme.accentGlow};line-height:1;" data-font="mono" dir="ltr">${mainPct}%</span>
              <span data-font="fa" style="font-size:11.5px;color:${theme.subText};font-weight:600;font-family:${fontFa};">${mainLabel}</span>
            </div>
            <div data-font="fa" style="font-size:10px;color:${theme.subText};margin-top:2px;font-family:${fontFa};">
              ${subLabel}: <strong style="color:${theme.textColor};font-family:'JetBrains Mono',monospace;" data-font="mono" dir="ltr">${subPct}%</strong>
            </div>
          </div>
        </div>

        <!-- Main Progress Track -->
        <div style="margin-top:11px;height:6px;border-radius:9999px;background:${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};overflow:hidden;position:relative;">
          <div style="height:100%;width:${mainPct}%;background:${theme.accentGrad};border-radius:9999px;box-shadow:${theme.accentGlow};transition:width 0.4s cubic-bezier(0.16, 1, 0.3, 1);"></div>
        </div>

        <!-- Weekly Quota Sub-Track -->
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid ${theme.itemBorder};display:flex;justify-content:space-between;align-items:center;direction:ltr;">
          <div data-font="fa" style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:${theme.subText};font-family:${fontFa};">
            <span style="font-weight:600;color:${theme.textColor};">سهمیه هفتگی:</span>
            <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${theme.chipColor};" data-font="mono" dir="ltr">${weeklyShow}%</span>
            <span>${mainLabel}</span>
            <span style="opacity:0.5;">(${currentUsage.weekly?.resets_in || 'Ready'})</span>
          </div>
          <div style="width:80px;height:3.5px;border-radius:9999px;background:rgba(255,255,255,0.08);overflow:hidden;">
            <div style="height:100%;width:${weeklyShow}%;background:${theme.accentSecondary || theme.accent};border-radius:9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Models Section Header -->
      <div data-font="en" style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;margin-bottom:7px;padding:0 4px;font-size:10px;font-weight:700;letter-spacing:0.06em;color:${theme.subText};direction:ltr;font-family:${fontEn};">
        <span>ACTIVE MODEL POOLS</span>
        <span>SESSION • WEEKLY</span>
      </div>

      <!-- Uniform Precision Model Cards -->
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${poolsHtml}
      </div>

      <!-- Divider -->
      <div style="margin-top:13px;border-top:1px solid ${theme.itemBorder};"></div>

      <!-- Luxury Footer -->
      <div style="margin-top:9px;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;direction:ltr;">
        <div data-font="fa" style="display:flex;align-items:center;gap:6px;color:${theme.subText};font-size:10px;font-family:${fontFa};">
          <span style="width:5.5px;height:5.5px;border-radius:50%;background:#10b981;box-shadow:0 0 7px rgba(16,185,129,0.8);animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
          <span style="opacity:0.88;">پایش بهینه مصرف • On-Demand</span>
        </div>
        <div data-font="en" style="font-size:10px;color:${theme.subText};opacity:0.75;font-family:${fontEn};letter-spacing:0.02em;">
          Antigravity Quota HUD
        </div>
      </div>
    `;

    function updateDropdownPosition() {
      const drop = pop.querySelector('#aqm-theme-dropdown');
      if (!drop) return;
      const popRect = pop.getBoundingClientRect();
      const spaceRight = window.innerWidth - popRect.right;
      const spaceLeft = popRect.left;

      if (spaceRight >= 350) {
        // Dock to right of HUD
        drop.style.left = 'calc(100% + 14px)';
        drop.style.right = 'auto';
        drop.style.top = '0';
        drop.style.bottom = '0';
        drop.style.width = '335px';
        drop.style.height = '100%';
        drop.style.maxHeight = 'none';
      } else if (spaceLeft >= 350) {
        // Dock to left of HUD
        drop.style.left = 'auto';
        drop.style.right = 'calc(100% + 14px)';
        drop.style.top = '0';
        drop.style.bottom = '0';
        drop.style.width = '335px';
        drop.style.height = '100%';
        drop.style.maxHeight = 'none';
      } else {
        // Narrow screen fallback: dock above or below with clamped height
        drop.style.left = '0';
        drop.style.right = '0';
        drop.style.width = '100%';
        if (popRect.top > 320) {
          drop.style.top = 'auto';
          drop.style.bottom = 'calc(100% + 12px)';
          drop.style.height = 'auto';
          drop.style.maxHeight = Math.max(220, popRect.top - 24) + 'px';
        } else {
          drop.style.top = 'calc(100% + 12px)';
          drop.style.bottom = 'auto';
          drop.style.height = 'auto';
          drop.style.maxHeight = Math.max(220, window.innerHeight - popRect.bottom - 24) + 'px';
        }
      }
    }

    // Restore drawer state if it was open
    if (wasDrawerOpen) {
      const d = pop.querySelector('#aqm-theme-dropdown');
      if (d) {
        d.style.display = 'block';
        updateDropdownPosition();
      }
    }

    // Bind Event Listeners
    pop.querySelector('#aqm-close-btn').onclick = (e) => {
      e.stopPropagation();
      pop.style.display = 'none';
      const d = pop.querySelector('#aqm-theme-dropdown');
      if (d) d.style.display = 'none';
    };

    pop.querySelector('#aqm-refresh-btn').onclick = (e) => {
      e.stopPropagation();
      refreshQuota();
    };

    const privacyBtn = pop.querySelector('#aqm-privacy-btn');
    if (privacyBtn) {
      privacyBtn.onclick = (e) => {
        e.stopPropagation();
        isPrivacyMode = !isPrivacyMode;
        try {
          localStorage.setItem('antigravity:privacy_mode', String(isPrivacyMode));
        } catch (err) {}
        persistUserSettings({ privacyMode: isPrivacyMode });
        renderPopover();
      };
    }

    pop.querySelector('#aqm-mode-rem-btn').onclick = (e) => {
      e.stopPropagation();
      displayMode = 'remaining';
      try { localStorage.setItem('antigravity:quota_mode', 'remaining'); } catch (err) {}
      persistUserSettings({ mode: 'remaining' });
      renderBadge();
      renderPopover();
    };

    pop.querySelector('#aqm-mode-used-btn').onclick = (e) => {
      e.stopPropagation();
      displayMode = 'used';
      try { localStorage.setItem('antigravity:quota_mode', 'used'); } catch (err) {}
      persistUserSettings({ mode: 'used' });
      renderBadge();
      renderPopover();
    };

    const themeMenuTrigger = pop.querySelector('#aqm-theme-menu-trigger');
    const themeDropdown = pop.querySelector('#aqm-theme-dropdown');
    themeMenuTrigger.onclick = (e) => {
      e.stopPropagation();
      const isCurrentlyOpen = (themeDropdown.style.display === 'block' || themeDropdown.style.display === 'flex');
      if (isCurrentlyOpen) {
        themeDropdown.style.display = 'none';
      } else {
        themeDropdown.style.display = 'block';
        updateDropdownPosition();
      }
    };

    const switcherTrigger = pop.querySelector('#aqm-account-switcher-trigger');
    if (switcherTrigger) {
      switcherTrigger.onclick = (e) => {
        e.stopPropagation();
        switcherTrigger.style.transform = 'scale(0.92)';
        setTimeout(() => { switcherTrigger.style.transform = ''; }, 160);
        toggleSwitcherModal();
      };
    }

    themeDropdown.querySelectorAll('.aqm-theme-card').forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        const tid = item.getAttribute('data-theme-id');
        if (THEMES[tid]) {
          currentThemeId = tid;
          try { localStorage.setItem('antigravity:quota_theme', tid); } catch (err) {}
          persistUserSettings({ theme: tid });
          applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
          renderBadge();
          renderPopover();
        }
      };
    });

    themeDropdown.querySelectorAll('[data-font-en]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const fn = btn.getAttribute('data-font-en');
        customFontEn = fn;
        try { localStorage.setItem('antigravity:custom_font_en', fn); } catch (err) {}
        persistUserSettings({ fontEn: fn });
        ensureFontLoaded(fn);
        applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
        renderBadge();
        renderPopover();
      };
    });

    themeDropdown.querySelectorAll('[data-font-fa]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const fn = btn.getAttribute('data-font-fa');
        customFontFa = fn;
        try { localStorage.setItem('antigravity:custom_font_fa', fn); } catch (err) {}
        persistUserSettings({ fontFa: fn });
        ensureFontLoaded(fn);
        applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
        renderBadge();
        renderPopover();
      };
    });

    const toggleImportBtn = pop.querySelector('#aqm-toggle-import-btn');
    if (toggleImportBtn) {
      toggleImportBtn.onclick = (e) => {
        e.stopPropagation();
        isImportFormOpen = !isImportFormOpen;
        renderPopover();
      };
    }

    const importNameInput = pop.querySelector('#aqm-import-name');
    const importUrlInput = pop.querySelector('#aqm-import-url');
    if (importNameInput) {
      importNameInput.onclick = (e) => e.stopPropagation();
      importNameInput.onkeydown = (e) => e.stopPropagation();
    }
    if (importUrlInput) {
      importUrlInput.onclick = (e) => e.stopPropagation();
      importUrlInput.onkeydown = (e) => e.stopPropagation();
    }

    const importSubmitBtn = pop.querySelector('#aqm-import-submit-btn');
    if (importSubmitBtn) {
      importSubmitBtn.onclick = (e) => {
        e.stopPropagation();
        const rawName = importNameInput ? importNameInput.value.trim() : '';
        if (!rawName) {
          if (importNameInput) {
            importNameInput.style.borderColor = '#ef4444';
            importNameInput.placeholder = 'لطفاً نام فونت را بنویسید!';
          }
          return;
        }
        const rawUrl = importUrlInput ? importUrlInput.value.trim() : '';
        const typeRadio = pop.querySelector('input[name="aqm-font-type"]:checked');
        const fType = typeRadio ? typeRadio.value : 'fa';

        if (!customImportedFonts.some(f => f.id.toLowerCase() === rawName.toLowerCase())) {
          customImportedFonts.push({
            id: rawName,
            name: rawName,
            url: rawUrl,
            type: fType
          });
          try {
            localStorage.setItem('antigravity:custom_imported_fonts', JSON.stringify(customImportedFonts));
          } catch(err) {}
        }

        if (rawUrl) {
          injectImportedFontStyles();
        }

        if (fType === 'fa') {
          customFontFa = rawName;
          try { localStorage.setItem('antigravity:custom_font_fa', rawName); } catch(err){}
        } else {
          customFontEn = rawName;
          try { localStorage.setItem('antigravity:custom_font_en', rawName); } catch(err){}
        }

        persistUserSettings({
          customImportedFonts,
          fontEn: customFontEn,
          fontFa: customFontFa
        });

        ensureFontLoaded(rawName);
        applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
        isImportFormOpen = false;
        renderBadge();
        renderPopover();
      };
    }

    themeDropdown.querySelectorAll('[data-delete-imported-font]').forEach(delBtn => {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        const fid = delBtn.getAttribute('data-delete-imported-font');
        customImportedFonts = customImportedFonts.filter(f => f.id !== fid);
        try {
          localStorage.setItem('antigravity:custom_imported_fonts', JSON.stringify(customImportedFonts));
        } catch(err) {}

        if (customFontFa === fid) {
          customFontFa = 'default';
          try { localStorage.setItem('antigravity:custom_font_fa', 'default'); } catch(err){}
        }
        if (customFontEn === fid) {
          customFontEn = 'default';
          try { localStorage.setItem('antigravity:custom_font_en', 'default'); } catch(err){}
        }

        persistUserSettings({
          customImportedFonts,
          fontEn: customFontEn,
          fontFa: customFontFa
        });

        applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
        renderBadge();
        renderPopover();
      };
    });

    const fullAppToggleRow = pop.querySelector('#aqm-full-app-toggle-row');
    fullAppToggleRow.onclick = (e) => {
      e.stopPropagation();
      isFullAppThemingEnabled = !isFullAppThemingEnabled;
      try { localStorage.setItem('antigravity:full_app_theming', String(isFullAppThemingEnabled)); } catch (err) {}
      persistUserSettings({ fullTheming: isFullAppThemingEnabled });
      applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
      renderBadge();
      renderPopover();
    };

    const rtlToggleRow = pop.querySelector('#aqm-rtl-toggle-row');
    if (rtlToggleRow) {
      rtlToggleRow.onclick = (e) => {
        e.stopPropagation();
        rtlConfig.isRTL = !rtlConfig.isRTL;
        saveRtlConfig();
        applyRtlStyles();
        if (rtlConfig.isRTL) updateDir(); else clearDir();
        renderPopover();
      };
    }

    const rtlForceRow = pop.querySelector('#aqm-rtl-force-row');
    if (rtlForceRow) {
      rtlForceRow.onclick = (e) => {
        e.stopPropagation();
        rtlConfig.forceRTL = !rtlConfig.forceRTL;
        saveRtlConfig();
        applyRtlStyles();
        if (rtlConfig.isRTL) updateDir();
        renderPopover();
      };
    }

    const rtlAtRow = pop.querySelector('#aqm-rtl-at-row');
    if (rtlAtRow) {
      rtlAtRow.onclick = (e) => {
        e.stopPropagation();
        rtlConfig.fixAtSign = !rtlConfig.fixAtSign;
        saveRtlConfig();
        renderPopover();
      };
    }

    const rtlLhSlider = pop.querySelector('#aqm-rtl-lh-slider');
    if (rtlLhSlider) {
      rtlLhSlider.onclick = (e) => e.stopPropagation();
      rtlLhSlider.oninput = (e) => {
        rtlConfig.lineHeight = e.target.value;
        saveRtlConfig();
        applyRtlStyles();
      };
    }

    const rtlFsSlider = pop.querySelector('#aqm-rtl-fs-slider');
    if (rtlFsSlider) {
      rtlFsSlider.onclick = (e) => e.stopPropagation();
      rtlFsSlider.oninput = (e) => {
        rtlConfig.fontSize = e.target.value;
        saveRtlConfig();
        applyRtlStyles();
      };
    }

    // Draggable HUD Engine with boundary clamping and double-click reset
    const dragHandle = pop.querySelector('#aqm-drag-handle');
    if (dragHandle) {
      dragHandle.onmousedown = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('a')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const popRect = pop.getBoundingClientRect();
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startLeft = popRect.left;
        const startTop = popRect.top;

        pop.style.bottom = 'auto';
        pop.style.top = startTop + 'px';
        pop.style.left = startLeft + 'px';
        dragHandle.style.cursor = 'grabbing';

        let hasMoved = false;

        function onMouseMove(moveEvent) {
          moveEvent.preventDefault();
          hasMoved = true;
          const dx = moveEvent.clientX - startMouseX;
          const dy = moveEvent.clientY - startMouseY;

          const newLeft = Math.min(Math.max(10, startLeft + dx), window.innerWidth - popRect.width - 10);
          const newTop = Math.min(Math.max(10, startTop + dy), window.innerHeight - popRect.height - 10);

          pop.style.left = newLeft + 'px';
          pop.style.top = newTop + 'px';

          if (themeDropdown && (themeDropdown.style.display === 'block' || themeDropdown.style.display === 'flex')) {
            updateDropdownPosition();
          }
        }

        function onMouseUp() {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          dragHandle.style.cursor = 'grab';

          if (hasMoved) {
            try {
              const pos = { left: pop.style.left, top: pop.style.top };
              localStorage.setItem('antigravity:popover_pos', JSON.stringify(pos));
              persistUserSettings({ popoverPos: pos });
            } catch (err) {}
          }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      dragHandle.ondblclick = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        e.stopPropagation();
        try {
          localStorage.removeItem('antigravity:popover_pos');
          persistUserSettings({ popoverPos: null });
        } catch (err) {}
        const anchor = document.getElementById('antigravity-usage-pill') || trigger;
        const rect = anchor.getBoundingClientRect();
        pop.style.left = Math.max(16, rect.left - 20) + 'px';
        pop.style.bottom = (window.innerHeight - rect.top + 14) + 'px';
        pop.style.top = 'auto';
        if (themeDropdown && (themeDropdown.style.display === 'block' || themeDropdown.style.display === 'flex')) {
          updateDropdownPosition();
        }
      };
    }
  }

  function togglePopover(e) {
    if (e) {
      e.stopPropagation();
      try { e.preventDefault(); } catch (err) {}
    }
    const pop = getOrCreatePopover();
    if (pop.style.display === 'none' || !pop.style.display) {
      lastPopoverOpenTime = Date.now();
      renderPopover();
      pop.style.display = 'block';
    } else {
      pop.style.display = 'none';
      const drop = document.getElementById('aqm-theme-dropdown');
      if (drop) drop.style.display = 'none';
    }
  }


  // ==========================================
  // In-Editor Account Switcher & Migration Suite (Madgod-xyz)
  // ==========================================
  const SW_I18N = {
    fa: {
      appName: "مدیریت حساب‌ها",
      appSubtitle: "مدیریت حساب‌ها و مهاجرت گفتگوها",
      tabAccounts: "حساب‌ها",
      tabMigration: "مهاجرت گفتگوها",
      activeAccount: "حساب فعال",
      saveCurrent: "ذخیره این اکانت",
      savedAccounts: "حساب‌های ذخیره‌شده",
      noSavedAccounts: "هنوز اکانت دیگری ذخیره نشده است. با دکمه بالا، اکانت فعلی خود را ذخیره کنید تا همیشه در دسترس باشد!",
      switchNow: "⚡️ سوئیچ به این اکانت",
      deleteAccount: "حذف",
      addNewAccount: "➕ ورود با اکانت جدید (خروج)",
      refresh: "🔄 به‌روزرسانی",
      resetsIn: "⏱ ریست:",
      targetAccount: "اکانت مقصد برای مهاجرت:",
      transferMode: "نحوه انتقال دیتا:",
      modeCopy: "🛡️ کپی ایمن (Safe Copy - نگه‌داشتن در هر دو حساب)",
      modeCut: "✂️ انتقال قطعی (Cut & Move - حذف از مبدا)",
      structureMode: "چیدمان در مقصد:",
      structSeparate: "📁 پروژه‌ها و صفحات مجزا (پیشنهادی)",
      structMerge: "🔗 تجمیع در یک پروژه واحد (Merge Timeline)",
      dualSync: "🔄 همگام‌سازی دوطرفه خودکار بین دو اکانت (Continuous Dual-Sync)",
      selectConvs: "انتخاب مکالمات جهت انتقال:",
      selectAll: "انتخاب همه",
      deselectAll: "لغو انتخاب",
      searchPlaceholder: "جستجو در عنوان یا شناسه مکالمات...",
      startMigration: "🚀 شروع مهاجرت ایمن مکالمات",
      migrating: "در حال انتقال مکالمات...",
      switching: "در حال سوئیچ اکانت و راه‌اندازی مجدد...",
      migrationDone: "مهاجرت مکالمات با موفقیت انجام شد!",
      backupNotice: "پشتیبان ایمن در پوشه زیر ایجاد شد:",
      author: "توسعه داده شده با افتخار توسط Madgod-xyz",
      tabProjects: "📁 پروژه‌ها",
      tabTasks: "⏱ تسک‌ها",
      projectsDesc: "انتخاب پروژه‌های مجاز برای اکانت ۲ (بمب هاب). پروژه‌های تیک‌نخورده در پنجره دوم باز نخواهند شد.",
      tasksDesc: "مدیریت تسک‌های زمان‌بندی ویندوز. تسک‌های ایزوله‌شده توسط اکانت ۲ اجرا یا تغییر وضعیت داده نمی‌شوند.",
      isolateTaskBtn: "🛡️ ایزوله از اکانت ۲",
      unisolateTaskBtn: "🔓 اشتراک‌گذاری تسک",
      taskIsolatedBadge: "🔒 فقط اکانت ۱",
      taskSharedBadge: "🌐 مشترک دو اکانت",
      taskEnabled: "فعال",
      taskDisabled: "غیرفعال",
      unlinkFromAcc2: "✕ جداسازی از اکانت ۲",
      taskLockedBadge: "🔒 قفل شده در اکانت ۱",
      taskLockedMsg: "این تسک متعلق به اکانت اصلی (مدگاد) است و از اکانت ۲ قابل تغییر نیست.",
      syncNow: "🔄 سینک با اکانت ۲",
      assignToAcc2: "مجاز در اکانت ۲ (بمب هاب)",
      noProjectsFound: "هیچ پروژه‌ای یافت نشد.",
      noTasksFound: "هیچ تسک زمان‌بندی مرتبطی یافت نشد.",
      launchDual: "⚡️ پنجره ۲",
      launchDualTitle: "اجرای همزمان در پنجره دوم آنتی‌گرویتی",
      dualLaunching: "در حال اجرای پنجره دوم آنتی‌گرویتی...",
      dualLaunched: "پنجره دوم با موفقیت اجرا شد!",
      activeBadge: "فعال",
      pro: "پرو",
      ultra: "اولترا",
      free: "معمولی"
    },
    en: {
      appName: "Antigravity Switcher",
      appSubtitle: "Multi-Account & Project Migration Suite",
      tabAccounts: "👤 Accounts & Quota",
      tabProjects: "📁 Projects",
      tabTasks: "⏱ Scheduled Tasks",
      tabMigration: "⇄ Chat Migration",
      activeAccount: "Active Account",
      saveCurrent: "💾 Save Current Account",
      savedAccounts: "Saved Accounts",
      noSavedAccounts: "No other accounts saved yet. Click 'Save Current' to register your active session!",
      switchNow: "⚡️ Switch Account",
      deleteAccount: "Delete",
      addNewAccount: "➕ Add New Account (Logout)",
      refresh: "🔄 Refresh",
      resetsIn: "⏱ Resets:",
      targetAccount: "Target Account for Migration:",
      transferMode: "Transfer Mode:",
      modeCopy: "🛡️ Safe Copy (Keep in both accounts)",
      modeCut: "✂️ Cut & Move (Remove from source)",
      structureMode: "Destination Layout:",
      structSeparate: "📁 Separate Projects (Recommended)",
      structMerge: "🔗 Merge into Single Master Project",
      dualSync: "🔄 Continuous Dual-Sync",
      selectConvs: "Select Conversations to Migrate:",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      searchPlaceholder: "Search conversations or projects...",
      startMigration: "🚀 Start Safe Migration",
      migrating: "Migrating conversations...",
      switching: "Switching account & restarting...",
      migrationDone: "Migration completed successfully!",
      backupNotice: "Safe backup created at:",
      author: "Developed with precision by Madgod-xyz",
      tabProjects: "📁 Projects",
      tabTasks: "⏱ Scheduled Tasks",
      projectsDesc: "Select projects accessible to Account 2. Unselected projects will not appear in Instance 2.",
      tasksDesc: "Manage Windows scheduled tasks. Isolated tasks cannot be triggered or toggled by Account 2.",
      isolateTaskBtn: "🛡️ Isolate from Account 2",
      unisolateTaskBtn: "🔓 Share with Account 2",
      taskIsolatedBadge: "🔒 Account 1 Only",
      taskSharedBadge: "🌐 Shared",
      taskEnabled: "Enabled",
      taskDisabled: "Disabled",
      unlinkFromAcc2: "✕ Unlink from Account 2",
      taskLockedBadge: "🔒 Locked in Account 1",
      taskLockedMsg: "This task belongs to Account 1 and is locked in Account 2.",
      syncNow: "🔄 Sync with Account 2",
      assignToAcc2: "Allow in Account 2",
      noProjectsFound: "No projects found.",
      noTasksFound: "No scheduled tasks found.",
      launchDual: "⚡️ 2nd Window",
      launchDualTitle: "Open concurrently in 2nd Antigravity Window",
      dualLaunching: "Launching 2nd Antigravity instance...",
      dualLaunched: "2nd instance started successfully!",
      activeBadge: "ACTIVE",
      pro: "PRO",
      ultra: "ULTRA",
      free: "FREE"
    },
    zh: {
      appName: "Antigravity 账号切换器",
      appSubtitle: "多账号管理与项目无缝迁移套件",
      tabAccounts: "👤 账号与配额",
      tabProjects: "📁 项目管理",
      tabTasks: "⏱ 定时任务",
      tabMigration: "⇄ 对话迁移",
      activeAccount: "当前活跃账号",
      saveCurrent: "💾 保存当前账号",
      savedAccounts: "已保存账号",
      noSavedAccounts: "暂未保存其他账号。点击上方按钮保存当前账号！",
      switchNow: "⚡️ 切换至该账号",
      deleteAccount: "删除",
      addNewAccount: "➕ 登录新账号 (注销)",
      refresh: "🔄 刷新",
      resetsIn: "⏱ 重置时间：",
      targetAccount: "迁移目标账号：",
      transferMode: "迁移模式：",
      modeCopy: "🛡️ 安全克隆 (Safe Copy - 两端保留)",
      modeCut: "✂️ 剪切移动 (Cut & Move - 从源端移除)",
      structureMode: "目标布局：",
      structSeparate: "📁 独立项目文件夹 (推荐)",
      structMerge: "🔗 合并至单一主项目",
      dualSync: "🔄 持续双向自动同步",
      selectConvs: "选择要迁移的对话：",
      selectAll: "全选",
      deselectAll: "取消全选",
      searchPlaceholder: "搜索对话标题或 ID...",
      startMigration: "🚀 开始安全迁移",
      migrating: "正在迁移对话...",
      switching: "正在切换账号并重启...",
      migrationDone: "迁移顺利完成！",
      backupNotice: "安全备份保存在：",
      author: "由 Madgod-xyz 精心研发",
      projectsDesc: "选择允许在账号2中访问的项目。未勾选的项目不会在第二实例中加载。",
      tasksDesc: "管理Windows计划任务。隔离的任务无法被账号2触发或切换。",
      isolateTaskBtn: "🛡️ 隔离至主账号",
      unisolateTaskBtn: "🔓 与账号2共享",
      taskIsolatedBadge: "🔒 仅限账号1",
      taskSharedBadge: "🌐 共享",
      taskEnabled: "已启用",
      taskDisabled: "已禁用",
      unlinkFromAcc2: "✕ 从账号2解除关联",
      taskLockedBadge: "🔒 账号1锁定",
      taskLockedMsg: "该任务归属主账号，在账号2中已被锁定，无法修改。",
      syncNow: "🔄 同步至账号2",
      assignToAcc2: "在账号2中启用",
      noProjectsFound: "未找到任何项目。",
      noTasksFound: "未找到任何计划任务。",
      launchDual: "⚡️ 独立多开",
      launchDualTitle: "在第二个窗口并发运行",
      dualLaunching: "正在启动第二个实例...",
      dualLaunched: "第二个实例已成功启动！",
      activeBadge: "当前活跃",
      pro: "PRO",
      ultra: "ULTRA",
      free: "FREE"
    },
    es: {
      appName: "Antigravity Switcher",
      appSubtitle: "Suite de Cuentas y Migración de Proyectos",
      tabAccounts: "👤 Cuentas y Cuota",
      tabProjects: "📁 Proyectos",
      tabTasks: "⏱ Tareas Programadas",
      tabMigration: "⇄ Migración de Chats",
      activeAccount: "Cuenta Activa",
      saveCurrent: "💾 Guardar Cuenta Actual",
      savedAccounts: "Cuentas Guardadas",
      noSavedAccounts: "No hay cuentas guardadas aún. ¡Haz clic arriba para guardar tu sesión actual!",
      switchNow: "⚡️ Cambiar a esta cuenta",
      deleteAccount: "Eliminar",
      addNewAccount: "➕ Agregar Nueva Cuenta (Cerrar sesión)",
      refresh: "🔄 Actualizar",
      resetsIn: "⏱ Se reinicia:",
      targetAccount: "Cuenta de destino:",
      transferMode: "Modo de Transferencia:",
      modeCopy: "🛡️ Copia Segura (Mantener en ambas cuentas)",
      modeCut: "✂️ Cortar y Mover (Eliminar del origen)",
      structureMode: "Estructura de Destino:",
      structSeparate: "📁 Proyectos Separados (Recomendado)",
      structMerge: "🔗 Fusionar en un Solo Proyecto",
      dualSync: "🔄 Sincronización Dual Continua",
      selectConvs: "Seleccionar Conversaciones para Migrar:",
      selectAll: "Seleccionar Todo",
      deselectAll: "Deseleccionar Todo",
      searchPlaceholder: "Buscar conversaciones...",
      startMigration: "🚀 Iniciar Migración Segura",
      migrating: "Migrando conversaciones...",
      switching: "Cambiando de cuenta y reiniciando...",
      migrationDone: "¡Migración completada con éxito!",
      backupNotice: "Copia de seguridad guardada en:",
      author: "Desarrollado con precisión por Madgod-xyz",
      projectsDesc: "Selecciona proyectos accesibles para Cuenta 2. Los proyectos no seleccionados no aparecerán en la Instancia 2.",
      tasksDesc: "Administrar tareas programadas. Las tareas aisladas no pueden ser ejecutadas o modificadas por Cuenta 2.",
      isolateTaskBtn: "🛡️ Aislar de Cuenta 2",
      unisolateTaskBtn: "🔓 Compartir con Cuenta 2",
      taskIsolatedBadge: "🔒 Solo Cuenta 1",
      taskSharedBadge: "🌐 Compartido",
      taskEnabled: "Habilitado",
      taskDisabled: "Deshabilitado",
      unlinkFromAcc2: "✕ Desvincular de Cuenta 2",
      taskLockedBadge: "🔒 Bloqueada en Cuenta 1",
      taskLockedMsg: "Esta tarea pertenece a la Cuenta 1 y está bloqueada en la Cuenta 2.",
      syncNow: "🔄 Sincronizar con Cuenta 2",
      assignToAcc2: "Permitir en Cuenta 2",
      noProjectsFound: "No se encontraron proyectos.",
      noTasksFound: "No se encontraron tareas programadas.",
      launchDual: "⚡️ 2ª Ventana",
      launchDualTitle: "Abrir concurrentemente en 2ª ventana de Antigravity",
      dualLaunching: "Iniciando segunda ventana de Antigravity...",
      dualLaunched: "¡Segunda ventana iniciada exitosamente!",
      activeBadge: "ACTIVA",
      pro: "PRO",
      ultra: "ULTRA",
      free: "GRATIS"
    }
  };

  function isInstance2Window() {
    if (window.__antigravity_instance === 'instance_2') return true;
    try {
      if (localStorage.getItem('antigravity:instance_id') === 'instance_2') return true;
      const acc = localStorage.getItem('antigravity:account_email');
      if (acc && (acc.toLowerCase().includes('instance2') || acc === 'instance_2')) return true;
    } catch(e) {}
    if (window.__antigravity_accounts && (window.__antigravity_accounts.instanceId === 'instance_2' || window.__antigravity_accounts.instance_id === 'instance_2')) return true;
    return false;
  }

  function isAccount2(email) {
    if (!email) return false;
    const norm = String(email).toLowerCase().trim();
    if (norm === 'instance_2' || norm === 'secondary_account' || norm.includes('account2')) return true;
    return norm !== 'madgod.cum@gmail.com' && norm !== 'primary_account';
  }

  let swState = {
    activeAccount: (() => {
      const isInst2 = isInstance2Window();
      try {
        let assignedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '';

        if (window.__antigravity_accounts && window.__antigravity_accounts.activeAccount) {
          const a = window.__antigravity_accounts.activeAccount;
          if (a && a.email && a.email !== 'developer@antigravity.ai') {
            if (!assignedEmail || a.email.toLowerCase() === assignedEmail.toLowerCase()) {
              return a;
            }
          }
        }
        if (window.__antigravity_quota && window.__antigravity_quota.email && window.__antigravity_quota.email !== 'developer@antigravity.ai') {
          const qEmail = window.__antigravity_quota.email;
          if (!assignedEmail || qEmail.toLowerCase() === assignedEmail.toLowerCase()) {
            return window.__antigravity_quota;
          }
        }
        const cachedActive = localStorage.getItem('antigravity:active_quota');
        if (cachedActive) {
          const p = JSON.parse(cachedActive);
          if (p && p.email && p.email !== 'developer@antigravity.ai') {
            if (!assignedEmail || p.email.toLowerCase() === assignedEmail.toLowerCase()) {
              return p;
            }
          }
        }
        if (assignedEmail) {
          let manifest = {};
          try {
            manifest = JSON.parse(localStorage.getItem('antigravity:accounts_manifest') || '{}');
          } catch(e) {}
          if (manifest[assignedEmail]) {
            return {
              email: assignedEmail,
              name: manifest[assignedEmail].name || assignedEmail.split('@')[0],
              avatar: manifest[assignedEmail].avatar || '',
              tier: manifest[assignedEmail].tier || 'Google AI Pro',
              tier_code: manifest[assignedEmail].tier_code || 'pro'
            };
          }
        }
      } catch(e) {}
      if (isInst2) {
        return {
          email: "bombhub.apk@gmail.com",
          name: "Bombhub",
          avatar: "https://lh3.googleusercontent.com/a/ACg8ocKTPRhpR3YKTGdBUU3d4-lhBT_p1zB89ww-TIJ_o1g54w4Cfp4=s96-c",
          tier: "Google AI Pro",
          tier_code: "pro"
        };
      }
      return {
        email: "madgod.cum@gmail.com",
        name: "Madgod",
        avatar: "https://lh3.googleusercontent.com/a/ACg8ocKL_c03MxCossmd802Ci3aMxOH1oka7dLjgyC_xM0FnDA48xlA=s96-c",
        tier: "Google AI Pro",
        tier_code: "pro"
      };
    })(),
    savedAccounts: {},
    conversations: [],
    projects: [],
    tasks: [],
    allowedConversations: (() => {
      try {
        if (window.__antigravity_accounts && Array.isArray(window.__antigravity_accounts.allowedConversations)) {
          return window.__antigravity_accounts.allowedConversations;
        }
        const s = localStorage.getItem('antigravity:allowed_conversations');
        if (s) return JSON.parse(s);
      } catch(e) {}
      return [];
    })(),
    isLoaded: false,
    isLoading: false
  };

  function applyConversationIsolationFilter() {
    if (!isInstance2Window()) {
      document.querySelectorAll('[data-aqm-isolated="true"]').forEach(el => {
        el.style.removeProperty('display');
        el.removeAttribute('data-aqm-isolated');
      });
      return;
    }

    let allowedList = null;
    if (window.__antigravity_accounts && Array.isArray(window.__antigravity_accounts.allowedConversations)) {
      allowedList = window.__antigravity_accounts.allowedConversations;
    } else if (swState && Array.isArray(swState.allowedConversations)) {
      allowedList = swState.allowedConversations;
    } else if (swState && swState.allowedConversations && Array.isArray(swState.allowedConversations.instance_2)) {
      allowedList = swState.allowedConversations.instance_2;
    }

    if (!allowedList) {
      try {
        const stored = localStorage.getItem('antigravity:allowed_conversations');
        if (stored) allowedList = JSON.parse(stored);
      } catch(e) {}
    }

    // Default safe: If allowedList is empty or not set, DO NOT hide anything! Show all!
    if (!Array.isArray(allowedList) || allowedList.length === 0) {
      document.querySelectorAll('[data-aqm-isolated="true"]').forEach(el => {
        el.style.removeProperty('display');
        el.removeAttribute('data-aqm-isolated');
      });
      return;
    }

    const allowedSet = new Set(allowedList);

    const links = document.querySelectorAll('a[href*="/c/"]');
    links.forEach(a => {
      try {
        const href = a.getAttribute('href') || a.href || '';
        const match = href.match(/\/c\/([a-f0-9\-]{36})/i);
        if (!match) return;
        const cid = match[1];

        let row = a;
        while (row && row.parentElement && row.parentElement !== document.body) {
          const p = row.parentElement;
          if (row.classList.contains('group') || row.classList.contains('w-full') || (p.children.length > 1 && row.classList.contains('relative'))) {
            break;
          }
          row = p;
        }
        if (!row) row = a.parentElement || a;

        if (!allowedSet.has(cid)) {
          if (row.style.display !== 'none') {
            row.style.setProperty('display', 'none', 'important');
            row.setAttribute('data-aqm-isolated', 'true');
          }
        } else {
          if (row.getAttribute('data-aqm-isolated') === 'true') {
            row.style.removeProperty('display');
            row.removeAttribute('data-aqm-isolated');
          }
        }
      } catch(e) {}
    });
  }

  // Immediate synchronous restore from localStorage
  try {
    const cachedMan = localStorage.getItem('antigravity:accounts_manifest');
    if (cachedMan) {
      swState.savedAccounts = JSON.parse(cachedMan) || {};
      swState.isLoaded = true;
    }
  } catch(e) {}

  let swLang = (userSettings && userSettings.lang) || localStorage.getItem('antigravity:switcher_lang') || 'fa';
  let swTab = 'accounts';
  let swSelectedConvs = new Set();
  let swMode = 'copy';
  let swStructure = 'separate';
  let swDualSync = false;
  let swSearch = '';
  let swTargetAccount = '';
  let swIsMigrating = false;
  let swShowAddPanel = false;
  let swShowTokenInput = false;
  let swOAuthUrl = null;
  let swToastTimeout = null;

  function getCleanUserDisplayName(rawCandidate, rawEmail) {
    let email = rawEmail || (swState.activeAccount && swState.activeAccount.email) || (window.__antigravity_quota && window.__antigravity_quota.email) || '';
    if (!email && rawCandidate && rawCandidate.includes('@')) {
      email = rawCandidate;
    }
    if (email && email.includes('@')) {
      let part = email.split('@')[0];
      if (part.includes('.')) part = part.split('.')[0];
      if (part.includes('+')) part = part.split('+')[0];
      part = part.trim();
      if (part.length > 0) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    if (rawCandidate && typeof rawCandidate === 'string' && rawCandidate.trim()) {
      const c = rawCandidate.trim().split(' ')[0];
      if (!c.toLowerCase().includes('user') && !c.toLowerCase().includes('ethan')) {
        return c.charAt(0).toUpperCase() + c.slice(1);
      }
    }
    return 'Developer';
  }

  function callDaemonIpc(action, payload = {}) {
    if (typeof window.__aqm_daemon_ipc === 'function') {
      try {
        window.__aqm_daemon_ipc(JSON.stringify({ action, ...payload }));
        return true;
      } catch(e) {}
    }
    return false;
  }

  window.__onSwitcherStateUpdate = function(data) {
    if (!data) return;
    const isInst2 = isInstance2Window();

    // If payload has instanceId and doesn't match this window, ignore activeAccount
    const instMismatch = (data.instanceId && ((isInst2 && data.instanceId !== 'instance_2') || (!isInst2 && data.instanceId !== 'instance_1')));

    if (data.savedAccounts) swState.savedAccounts = data.savedAccounts;
    if (data.conversations) swState.conversations = data.conversations;
    if (data.projects) swState.projects = data.projects;
    if (data.tasks) swState.tasks = data.tasks;
    if (data.allowedConversations) {
      swState.allowedConversations = data.allowedConversations;
      try {
        localStorage.setItem('antigravity:allowed_conversations', JSON.stringify(data.allowedConversations));
      } catch(e) {}
    }

    if (data.activeAccount && !instMismatch) {
      const prevAcc = swState.activeAccount || {};
      let newAcc = { ...data.activeAccount };

      if (newAcc.email) {
        try {
          localStorage.setItem('antigravity:account_email', newAcc.email);
        } catch(e) {}
      }

      // Never downgrade an active pro/ultra tier to free on transient network updates
      if ((!newAcc.tier_code || newAcc.tier_code === 'free') && (prevAcc.tier_code === 'pro' || prevAcc.tier_code === 'ultra' || prevAcc.tier_code === 'enterprise')) {
        newAcc.tier_code = prevAcc.tier_code;
        newAcc.tier = prevAcc.tier;
      }
      // Never drop an avatar to empty on transient updates
      if (!newAcc.avatar && prevAcc.avatar) {
        newAcc.avatar = prevAcc.avatar;
      }
      if (!newAcc.avatar) {
        const saved = (swState.savedAccounts && swState.savedAccounts[newAcc.email || prevAcc.email]) || {};
        if (saved.avatar) newAcc.avatar = saved.avatar;
      }

      swState.activeAccount = newAcc;
      window.__antigravity_quota = newAcc;
      try {
        localStorage.setItem('antigravity:active_quota', JSON.stringify(newAcc));
      } catch(e) {}
    }

    swState.isLoaded = true;
    swState.isLoading = false;
    try {
      localStorage.setItem('antigravity:accounts_manifest', JSON.stringify(swState.savedAccounts));
    } catch(e) {}
    applyConversationIsolationFilter();
    if (typeof renderBadge === 'function') renderBadge();
    const modal = document.getElementById('antigravity-switcher-modal');
    if (modal && modal.classList.contains('aqm-active')) {
      renderSwitcherModal();
    }
  };

  window.__showSwitcherToast = showSwitcherToast;

  function fetchSwitcherState(cb) {
    const inst = isInstance2Window() ? 'instance_2' : 'instance_1';
    fetch(`http://127.0.0.1:39281/api/state?instance=${inst}`)
      .then(r => r.json())
      .then(data => {
        window.__onSwitcherStateUpdate(data);
        if (cb) cb();
      })
      .catch(() => {
        if (cb) cb();
      });
  }

  function showSwitcherToast(msg, isError = false) {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (!modal) return;
    let toast = modal.querySelector('.aqm-sw-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'aqm-sw-toast';
      modal.appendChild(toast);
    }
    if (typeof msg === 'string' && (msg.includes('<') && msg.includes('>'))) {
      toast.innerHTML = msg;
    } else {
      toast.textContent = msg;
    }
    toast.style.pointerEvents = 'auto';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#ffffff';
    toast.style.border = `1px solid ${isError ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'}`;
    toast.classList.add('show');
    if (swToastTimeout) clearTimeout(swToastTimeout);
    const hasLink = typeof msg === 'string' && msg.includes('<a');
    const delay = hasLink ? 35000 : 6000;
    swToastTimeout = setTimeout(() => { toast.classList.remove('show'); }, delay);
  }

  window.__onOAuthUrlReady = function(url) {
    if (!url) return;
    swOAuthUrl = url;
    swShowAddPanel = true;
    renderSwitcherModal();
  };

  function openSwitcherModal() {
    let modal = document.getElementById('antigravity-switcher-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'antigravity-switcher-modal';
      modal.className = 'aqm-switcher-modal';
      document.body.appendChild(modal);

      modal.onclick = (e) => {
        if (e.target === modal && !swIsMigrating) closeSwitcherModal();
      };
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && (modal.classList.contains('aqm-active') || modal.style.visibility === 'visible') && !swIsMigrating) {
          closeSwitcherModal();
        }
      });
    }

    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '2147483647';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0, 0, 0, 0.72)';
    modal.style.backdropFilter = 'blur(16px)';
    modal.style.webkitBackdropFilter = 'blur(16px)';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.visibility = 'visible';
    modal.style.transition = 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.24s';

    modal.classList.add('aqm-active');
    renderSwitcherModal();
    fetchSwitcherState(() => {
      renderSwitcherModal();
    });
  }

  function closeSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (modal) {
      modal.classList.remove('aqm-active');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      modal.style.visibility = 'hidden';
    }
  }

  function toggleSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (modal && (modal.classList.contains('aqm-active') || modal.style.visibility === 'visible')) {
      closeSwitcherModal();
    } else {
      openSwitcherModal();
    }
  }

  function renderSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (!modal) return;

    const theme = getActiveTheme();
    const t = SW_I18N[swLang] || SW_I18N.en;
    const isFa = (swLang === 'fa');
    const dir = isFa ? 'rtl' : 'ltr';
    const fontFamily = "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    const isInst2 = isInstance2Window();
    const activeAcc = swState.activeAccount || currentUsage || {};
    let email = activeAcc.email;
    let assignedEmail = '';
    try {
      assignedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || '';
    } catch(e) {}
    if (assignedEmail && swState.savedAccounts && swState.savedAccounts[assignedEmail]) {
      email = assignedEmail;
      Object.assign(activeAcc, swState.savedAccounts[assignedEmail]);
    } else if (email && swState.savedAccounts && swState.savedAccounts[email]) {
      Object.assign(activeAcc, swState.savedAccounts[email]);
    } else if (assignedEmail) {
      email = assignedEmail;
    }
    if (!email) email = isInst2 ? 'bombhub.apk@gmail.com' : 'madgod.cum@gmail.com';
    let cleanDisplayName = (typeof getCleanUserDisplayName === 'function') 
      ? getCleanUserDisplayName(activeAcc.name, email) 
      : ((email ? email.split('@')[0].split('.')[0] : 'User'));
    cleanDisplayName = cleanDisplayName ? (cleanDisplayName.charAt(0).toUpperCase() + cleanDisplayName.slice(1)) : 'User';
    if (isInstance2Window() && (!cleanDisplayName || cleanDisplayName.toLowerCase() === 'user')) {
      cleanDisplayName = (email ? (email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + email.split('@')[0].split('.')[0].slice(1)) : 'Secondary');
    }
    else if (cleanDisplayName.toLowerCase() === 'developer') cleanDisplayName = 'Account 1';
    const avatar = activeAcc.avatar || '';
    const tier = activeAcc.tier || 'Google AI Pro';
    const tierCode = (activeAcc.tier_code || 'pro').toLowerCase();

    const sess = activeAcc.session || (window.__antigravity_quota && window.__antigravity_quota.session) || {};
    const usedPct = Math.round(sess.used_pct ?? 6);
    const remPct = Math.round(sess.remaining_pct ?? 94);
    const resetsIn = sess.resets_in || '4 hr 20 min';

    const savedKeys = Object.keys(swState.savedAccounts || {});
    const savedCount = savedKeys.length;
    const isCurrentSaved = !!(email && swState.savedAccounts && swState.savedAccounts[email]);

    swTab = swTab || 'accounts';
    const filteredConvs = (swState.conversations || []).filter(c => {
      if (!swSearch) return true;
      const q = swSearch.toLowerCase();
      return (c.title && c.title.toLowerCase().includes(q)) || (c.id && c.id.toLowerCase().includes(q));
    });
    const projectsList = swState.projects || [];
    const tasksList = swState.tasks || [];

    modal.innerHTML = `
      <div class="aqm-switcher-sheet" style="font-family:${fontFamily};direction:${dir};color:#f8fafc;">
        
        <!-- Header -->
        <div style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.85;">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style="font-size:13.5px;font-weight:700;">${t.appName || (isFa ? 'مدیریت حساب‌ها' : 'Antigravity Switcher')}</span>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <!-- Language Switcher (Tri-Language EN / فا / ES) -->
            <button id="aqm-lang-toggle-btn" title="Toggle Language (EN / فا / ES)" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;padding:2px 8px;border-radius:9999px;font-size:10.5px;font-weight:600;cursor:pointer;transition:all 0.15s;outline:none;">
              ${swLang === 'fa' ? 'فا' : (swLang === 'es' ? 'ES' : 'EN')}
            </button>

            <!-- Close Button -->
            <button id="aqm-sw-modal-close" style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.15s;">✕</button>
          </div>
        </div>

        <!-- Tab Navigation Bar (Liquid Glass Pill Tabs) -->
        <div style="display:flex;gap:6px;padding:8px 18px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.12);overflow-x:auto;flex-shrink:0;" class="aqm-custom-scroll">
          <button class="aqm-sw-tab-btn ${swTab === 'accounts' ? 'active' : ''}" id="aqm-tab-btn-accounts">
            <span>👤</span>
            <span>${t.tabAccounts || 'Accounts'}</span>
          </button>
          <button class="aqm-sw-tab-btn ${swTab === 'projects' ? 'active' : ''}" id="aqm-tab-btn-projects">
            <span>📁</span>
            <span>${t.tabProjects || 'Projects'}</span>
            <span style="font-size:9px;padding:0 5px;border-radius:9999px;background:rgba(255,255,255,0.08);">${projectsList.length}</span>
          </button>
          <button class="aqm-sw-tab-btn ${swTab === 'tasks' ? 'active' : ''}" id="aqm-tab-btn-tasks">
            <span>⏱</span>
            <span>${t.tabTasks || 'Tasks'}</span>
            <span style="font-size:9px;padding:0 5px;border-radius:9999px;background:rgba(255,255,255,0.08);">${tasksList.length}</span>
          </button>
          <button class="aqm-sw-tab-btn ${swTab === 'migration' ? 'active' : ''}" id="aqm-tab-btn-migration">
            <span>⇄</span>
            <span>${t.tabMigration || 'Migration'}</span>
            <span style="font-size:9px;padding:0 5px;border-radius:9999px;background:rgba(255,255,255,0.08);">${(swState.conversations || []).length}</span>
          </button>
        </div>

        <!-- Content Body (Scrollable) -->
        <div class="aqm-custom-scroll" style="flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px;">
          
          ${swTab === 'accounts' ? `
            <!-- ACTIVE ACCOUNT CARD -->
            <div class="aqm-sw-card" style="padding:14px 15px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="position:relative;flex-shrink:0;">
                    ${avatar ? `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.18);" />` : `
                      <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#f8fafc;">${cleanDisplayName[0]}</div>
                    `}
                    <div style="position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#10b981;border:1.5px solid #0d1118;"></div>
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:13.5px;font-weight:700;">${cleanDisplayName}</span>
                      <span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:9999px;background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);text-transform:uppercase;">${tierCode.toUpperCase()}</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;font-family:'JetBrains Mono',monospace;" dir="ltr">${email}</div>
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:6px;">
                  ${isCurrentSaved ? `
                    <span style="font-size:11px;color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(16,185,129,0.08);border-radius:9999px;border:1px solid rgba(16,185,129,0.2);">
                      <span>●</span>
                      <span>${isFa ? 'ذخیره در لیست' : 'Saved'}</span>
                    </span>
                  ` : `
                    <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-save-current-btn" title="${isFa ? 'ذخیره این اکانت در لیست' : 'Save Account'}">
                      <span>💾</span>
                      <span>${isFa ? 'ذخیره اکانت' : 'Save'}</span>
                    </button>
                  `}
                  <button class="aqm-sw-btn" id="aqm-sw-refresh-btn" title="${isFa ? 'بروزرسانی' : 'Refresh'}" style="padding:4px 8px;">
                    <span class="${isRefreshing ? 'aqm-rotating' : ''}">🔄</span>
                  </button>
                </div>
              </div>

              <!-- Minimal Quota Bar -->
              <div style="background:rgba(0,0,0,0.18);border-radius:10px;padding:9px 12px;border:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;font-size:11px;">
                  <span style="color:#cbd5e1;font-weight:600;">${isFa ? 'سهمیه نشست جاری' : 'Session Quota'}</span>
                  <span style="color:#94a3b8;font-size:10.5px;">${isFa ? 'تمدید در' : 'Resets in'} <b style="color:#f1f5f9;" dir="ltr">${resetsIn}</b></span>
                </div>
                <div style="height:4px;border-radius:9999px;background:rgba(255,255,255,0.06);overflow:hidden;margin-bottom:5px;">
                  <div style="height:100%;width:${remPct}%;background:linear-gradient(90deg, #10b981, #38bdf8);border-radius:9999px;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;font-family:'JetBrains Mono',monospace;">
                  <span>${remPct}% ${isFa ? 'باقی‌مانده' : 'remaining'}</span>
                  <span>${usedPct}% ${isFa ? 'مصرف‌شده' : 'used'}</span>
                </div>
              </div>
            </div>

            <!-- SAVED ACCOUNTS SECTION -->
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:12px;font-weight:700;color:#cbd5e1;">${isFa ? 'حساب‌های من' : 'Saved Accounts'}</span>
                  <span style="font-size:10px;padding:0 6px;border-radius:9999px;background:rgba(255,255,255,0.06);color:#94a3b8;font-family:'JetBrains Mono',monospace;">${savedCount}</span>
                </div>

                <!-- Safe Add Account Button -->
                <button class="aqm-sw-btn" id="aqm-sw-toggle-add-btn" style="font-size:11px;padding:3px 9px;">
                  <span>${swShowAddPanel ? (isFa ? '✕ بستن' : '✕ Close') : (isFa ? '＋ افزودن حساب' : '＋ Add Account')}</span>
                </button>
              </div>

              <!-- SAFE ADD ACCOUNT DRAWER -->
              ${swShowAddPanel ? `
                <div class="aqm-sw-card" style="border:1px solid rgba(59,130,246,0.25);background:rgba(59,130,246,0.03);margin-bottom:10px;padding:12px 14px;">
                  <div style="font-size:11.5px;font-weight:700;color:#93c5fd;margin-bottom:4px;">${isFa ? 'افزودن حساب جدید به آنتی‌گرویتی' : 'Add New Account'}</div>
                  <div style="font-size:10.5px;color:#94a3b8;margin-bottom:10px;line-height:1.6;">
                    ${isFa 
                      ? `حساب فعال شما (<b>${cleanDisplayName}</b>) با امنیت کامل در سیستم ذخیره است و هیچ داده‌ای پاک نمی‌شود. یکی از روش‌ها را انتخاب کنید:`
                      : `Your active account (<b>${cleanDisplayName}</b>) is safely saved. Choose an option:`}
                  </div>

                  <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-add-oauth-btn" style="flex:1;padding:6px 10px;font-size:11px;">
                      <span>🔑</span>
                      <span>${isFa ? 'ورود با جیمیل جدید (گوگل)' : 'Sign In with Google'}</span>
                    </button>
                    <button class="aqm-sw-btn" id="aqm-sw-toggle-manual-token-btn" style="flex:1;padding:6px 10px;font-size:11px;">
                      <span>📋</span>
                      <span>${isFa ? 'ورود با توکن دستی' : 'Direct Token Import'}</span>
                    </button>
                  </div>

                  ${swShowTokenInput ? `
                    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
                      <textarea id="aqm-sw-token-input" placeholder="${isFa ? 'متن توکن یا سشن را اینجا جای‌گذاری کنید...' : 'Paste token or JSON payload here...'}" style="width:100%;height:52px;border-radius:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:10.5px;padding:6px 8px;resize:none;font-family:'JetBrains Mono',monospace;outline:none;" dir="ltr"></textarea>
                      <div style="display:flex;justify-content:flex-end;">
                        <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-submit-token-btn" style="padding:4px 12px;font-size:11px;">
                          <span>${isFa ? 'ثبت و ذخیره توکن' : 'Save Token'}</span>
                        </button>
                      </div>
                    </div>
                  ` : ''}

                  ${swOAuthUrl ? `
                    <div id="aqm-oauth-live-box" style="margin-top:10px;padding:12px;border-radius:12px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);text-align:center;">
                      <div style="font-size:12px;font-weight:700;color:#93c5fd;margin-bottom:5px;">
                        🌐 ${isFa ? 'صفحه ورود گوگل در مرورگر باز شد' : 'Google Sign-In Opened in Chrome'}
                      </div>
                      <div style="font-size:10.5px;color:#cbd5e1;margin-bottom:10px;line-height:1.5;">
                        ${isFa ? 'اگر صفحه ورود در مرورگر باز نشد، روی دکمه زیر کلیک کنید:' : 'If browser did not open automatically, click below:'}
                      </div>
                      <a href="${swOAuthUrl}" target="_blank" rel="noreferrer" class="aqm-sw-btn aqm-sw-btn-primary" style="display:inline-block;text-decoration:none;padding:7px 18px;font-size:11.5px;font-weight:700;border-radius:8px;">
                        🔗 ${isFa ? 'ورود به حساب گوگل (کلیک مستقیم)' : 'Direct Google Sign-In Link'}
                      </a>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- LIST OF SAVED ACCOUNTS -->
              ${savedCount === 0 ? `
                <div class="aqm-sw-card" style="text-align:center;padding:20px 14px;border-style:dashed;">
                  <div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px;">${isFa ? 'هنوز حسابی ذخیره نشده است.' : 'No accounts saved yet.'}</div>
                  <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-save-current-empty-btn" style="padding:5px 12px;">
                    <span>${isFa ? 'ذخیره اکانت فعلی' : 'Save Current Account'}</span>
                  </button>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:5px;max-height:200px;overflow-y:auto;" class="aqm-custom-scroll">
                  ${savedKeys.map(k => {
                    const acc = (swState.savedAccounts && swState.savedAccounts[k]) || {};
                    const isCur = (k === email || acc.email === email);
                    const accEmailStr = acc.email || k;
                    const accShort = getCleanUserDisplayName(acc.name, accEmailStr);
                    const accInitial = accShort.charAt(0).toUpperCase();
                    const needsAuth = !!(acc.needs_reauth || !acc.token_file);
                    return `
                      <div class="aqm-sw-card" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;${isCur ? 'border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.03);' : ''}">
                        <div style="display:flex;align-items:center;gap:9px;">
                          <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;">
                            ${accInitial}
                          </div>
                          <div>
                            <div style="display:flex;align-items:center;gap:6px;">
                              <span style="font-size:12px;font-weight:700;">${accShort}</span>
                              <span style="font-size:8.5px;padding:1px 5px;border-radius:9999px;background:rgba(255,255,255,0.06);color:#94a3b8;text-transform:uppercase;">${acc.tier_code || 'PRO'}</span>
                              ${needsAuth ? `
                                <span style="font-size:8.5px;padding:1px 5px;border-radius:9999px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">${isFa ? 'نیاز به ورود' : 'Needs Auth'}</span>
                              ` : ''}
                            </div>
                            <div style="font-size:10.5px;color:#64748b;font-family:'JetBrains Mono',monospace;" dir="ltr">${acc.email || k}</div>
                          </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;">
                          ${isCur ? `
                            <span style="font-size:10.5px;color:#10b981;font-weight:700;padding:2px 8px;">${t.activeBadge || (isFa ? 'فعال' : 'Active')}</span>
                          ` : needsAuth ? `
                            <button class="aqm-sw-btn aqm-sw-btn-primary" data-action="reauth" data-acc="${k}" data-email="${accEmailStr}" style="padding:3px 10px;font-size:11px;background:linear-gradient(135deg, #f59e0b, #d97706) !important;border-color:rgba(245,158,11,0.5) !important;" title="${isFa ? 'ورود به حساب گوگل' : 'Sign In with Google'}">
                              <span>🔑</span>
                              <span>${isFa ? 'ورود با گوگل' : 'Sign In'}</span>
                            </button>
                          ` : `
                            <button class="aqm-sw-btn aqm-sw-btn-primary" data-action="switch" data-acc="${k}" style="padding:3px 10px;font-size:11px;">
                              <span>${t.switchNow || (isFa ? 'سوئیچ' : 'Switch')}</span>
                            </button>
                            <button class="aqm-sw-btn" data-action="launch-dual" data-acc="${k}" data-account="${k}" data-email="${accEmailStr}" title="${t.launchDualTitle || 'Open concurrently in 2nd Antigravity Window'}" style="padding:3px 8px;font-size:11px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;display:inline-flex;align-items:center;gap:3px;cursor:pointer;">
                              <span>${t.launchDual || '⚡️ 2nd Window'}</span>
                            </button>
                          `}
                          <button class="aqm-sw-btn" data-action="delete" data-acc="${k}" title="${t.deleteAccount || (isFa ? 'حذف از لیست' : 'Delete')}" style="padding:3px 7px;font-size:10.5px;color:#94a3b8;border-color:transparent;background:transparent;">
                            <span>✕</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : swTab === 'projects' ? `
            <!-- PROJECTS TAB -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;">
                <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
                  ${t.projectsDesc}
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="aqm-sw-btn" id="aqm-proj-allow-all-btn" style="padding:3px 8px;font-size:10.5px;color:#10b981;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.08);">
                    ✓ ${isFa ? 'مجاز کردن همه' : (swLang === 'es' ? 'Permitir Todos' : 'Allow All')}
                  </button>
                  <button class="aqm-sw-btn" id="aqm-proj-isolate-all-btn" style="padding:3px 8px;font-size:10.5px;color:#f87171;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);">
                    ✕ ${isFa ? 'جداسازی همه' : (swLang === 'es' ? 'Aislar Todos' : 'Isolate All')}
                  </button>
                </div>
              </div>
              ${projectsList.length === 0 ? `
                <div class="aqm-sw-card" style="text-align:center;padding:24px 14px;border-style:dashed;">
                  <div style="font-size:11.5px;color:#94a3b8;">${t.noProjectsFound}</div>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:7px;max-height:360px;overflow-y:auto;" class="aqm-custom-scroll">
                  ${projectsList.map(p => {
                    const assigned = p.assigned_accounts || ['instance_1'];
                    const isAcc2 = !!(p.is_instance2_enabled || p.is_shared || assigned.includes('instance_2') || assigned.some(a => isAccount2(a)));
                    return `
                      <div class="aqm-sw-card" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div style="flex:1;min-width:0;">
                          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                            <span style="font-size:12.5px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name || p.id}</span>
                            <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">${isFa ? 'اکانت ۱' : 'Account 1'}</span>
                            ${isAcc2 ? `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">${isFa ? 'اکانت ۲' : 'Account 2'}</span>
                            ` : `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(255,255,255,0.06);color:#94a3b8;">${isFa ? 'فقط اکانت ۱' : 'Account 1 Only'}</span>
                            `}
                          </div>
                          <div style="font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr" title="${p.path || ''}">
                            ${p.path || p.id}
                          </div>
                          <div style="font-size:10px;color:#94a3b8;margin-top:3px;">
                            💬 ${(p.conversations || []).length || p.conversation_count || 0} ${isFa ? 'مکالمه' : 'chats'}
                          </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                          <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#cbd5e1;cursor:pointer;background:rgba(255,255,255,0.04);padding:4px 9px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
                            <input type="checkbox" class="aqm-proj-toggle-cb" data-pid="${p.id}" ${isAcc2 ? 'checked' : ''} style="width:14px;height:14px;accent-color:#10b981;cursor:pointer;" />
                            <span>${t.assignToAcc2}</span>
                          </label>
                          <button class="aqm-sw-btn aqm-proj-sync-btn" data-pid="${p.id}" title="${t.syncNow}" style="padding:4px 9px;font-size:11px;">
                            <span>🔄</span>
                            <span>${isFa ? 'سینک' : 'Sync'}</span>
                          </button>
                          <button class="aqm-sw-btn aqm-proj-unlink-btn" data-pid="${p.id}" title="${t.unlinkFromAcc2}" style="padding:4px 9px;font-size:11px;color:#f87171;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);">
                            <span>✕</span>
                            <span>${isFa ? 'جداسازی' : (swLang === 'es' ? 'Desvincular' : 'Unlink')}</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : swTab === 'tasks' ? `
            <!-- TASKS TAB -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="font-size:11px;color:#94a3b8;line-height:1.5;padding:0 2px;">
                ${t.tasksDesc}
              </div>
              ${tasksList.length === 0 ? `
                <div class="aqm-sw-card" style="text-align:center;padding:24px 14px;border-style:dashed;">
                  <div style="font-size:11.5px;color:#94a3b8;">${t.noTasksFound}</div>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:7px;max-height:360px;overflow-y:auto;" class="aqm-custom-scroll">
                  ${tasksList.map(task => {
                    const isIso = !!task.isolated_from_account2;
                    const isEn = !!task.enabled;
                    const owner = (task.owner_account || '').toLowerCase();
                    const isOwnerAcc1 = !owner || owner === 'instance_1' || !owner.includes('instance_2');
                    const isLockedInInst2 = isInstance2Window() && isIso && isOwnerAcc1;
                    return `
                      <div class="aqm-sw-card" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;${isLockedInInst2 ? 'border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.03);' : (isIso ? 'border-color:rgba(251,191,36,0.25);background:rgba(251,191,36,0.02);' : '')}">
                        <div style="flex:1;min-width:0;">
                          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                            <span style="font-size:12.5px;font-weight:700;color:#f8fafc;">${task.task_name}</span>
                            ${isEn ? `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">● ${t.taskEnabled}</span>
                            ` : `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(255,255,255,0.06);color:#94a3b8;">○ ${t.taskDisabled}</span>
                            `}
                            ${isLockedInInst2 ? `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);">${t.taskLockedBadge || '🔒 قفل شده در اکانت ۱'}</span>
                            ` : isIso ? `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">${t.taskIsolatedBadge}</span>
                            ` : `
                              <span style="font-size:9px;padding:1px 6px;border-radius:9999px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">${t.taskSharedBadge}</span>
                            `}
                          </div>
                          <div style="font-size:10.5px;color:#94a3b8;margin-bottom:2px;">
                            ⏱ ${task.schedule || task.trigger || (isFa ? 'زمان‌بندی روزانه' : 'Daily Schedule')}
                          </div>
                          <div style="font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="ltr" title="${task.command || task.action || ''}">
                            ${task.command || task.action || task.description || ''}
                          </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                          <button class="aqm-sw-btn aqm-task-toggle-btn" 
                            data-task="${task.task_name}" 
                            data-enabled="${isEn}" 
                            data-locked="${isLockedInInst2}" 
                            ${isLockedInInst2 ? 'disabled' : ''} 
                            title="${isLockedInInst2 ? t.taskLockedMsg : (isEn ? (isFa ? 'غیرفعال‌سازی تسک' : 'Disable Task') : (isFa ? 'فعال‌سازی تسک' : 'Enable Task'))}" 
                            style="padding:4px 9px;font-size:11px;${isLockedInInst2 ? 'opacity:0.4;cursor:not-allowed;' : ''}">
                            <span>${isEn ? '⏸' : '▶'}</span>
                            <span>${isEn ? (isFa ? 'غیرفعال‌سازی' : 'Disable') : (isFa ? 'فعال‌سازی' : 'Enable')}</span>
                          </button>
                          <button class="aqm-sw-btn ${isIso ? '' : 'aqm-sw-btn-primary'} aqm-task-isolate-btn" 
                            data-task="${task.task_name}" 
                            data-isolated="${isIso}" 
                            data-locked="${isLockedInInst2}" 
                            ${isLockedInInst2 ? 'disabled' : ''} 
                            title="${isLockedInInst2 ? t.taskLockedMsg : (isIso ? t.unisolateTaskBtn : t.isolateTaskBtn)}" 
                            style="padding:4px 10px;font-size:11px;${isLockedInInst2 ? 'opacity:0.4;cursor:not-allowed;' : ''}">
                            <span>${isIso ? t.unisolateTaskBtn : t.isolateTaskBtn}</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : `
            <!-- MIGRATION TAB -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <!-- Target Account & Transfer Mode Grid -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                
                <!-- Target Account -->
                <div class="aqm-sw-card" style="padding:9px 11px;">
                  <label style="font-size:10.5px;font-weight:700;margin-bottom:4px;display:block;color:#94a3b8;">${isFa ? 'اکانت مقصد:' : 'Target Account:'}</label>
                  <select id="aqm-sw-target-select" style="width:100%;padding:5px 8px;border-radius:7px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);color:#fff;font-size:11px;outline:none;" dir="ltr">
                    ${savedKeys.length > 0 ? savedKeys.map(k => `
                      <option value="${k}" ${k === swTargetAccount ? 'selected' : ''}>${swState.savedAccounts[k].email || k}</option>
                    `).join('') : `
                      <option value="">${isFa ? 'ابتدا یک اکانت مقصد ذخیره کنید' : 'No target accounts'}</option>
                    `}
                  </select>
                </div>

                <!-- Transfer Mode -->
                <div class="aqm-sw-card" style="padding:9px 11px;">
                  <label style="font-size:10.5px;font-weight:700;margin-bottom:4px;display:block;color:#94a3b8;">${isFa ? 'روش انتقال:' : 'Mode:'}</label>
                  <div style="display:flex;gap:4px;">
                    <button class="aqm-sw-btn ${swMode === 'copy' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-mode-copy" style="flex:1;padding:4px;font-size:10.5px;">
                      <span>${isFa ? 'کپی ایمن' : 'Copy'}</span>
                    </button>
                    <button class="aqm-sw-btn ${swMode === 'move' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-mode-move" style="flex:1;padding:4px;font-size:10.5px;">
                      <span>${isFa ? 'برش و انتقال' : 'Move'}</span>
                    </button>
                  </div>
                </div>

                <!-- Structure Mode -->
                <div class="aqm-sw-card" style="padding:9px 11px;">
                  <label style="font-size:10.5px;font-weight:700;margin-bottom:4px;display:block;color:#94a3b8;">${isFa ? 'ساختار مقصد:' : 'Structure:'}</label>
                  <div style="display:flex;gap:4px;">
                    <button class="aqm-sw-btn ${swStructure === 'separate' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-struct-sep" style="flex:1;padding:4px;font-size:10.5px;">
                      <span>${isFa ? 'مجزا' : 'Separate'}</span>
                    </button>
                    <button class="aqm-sw-btn ${swStructure === 'merge' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-struct-merge" style="flex:1;padding:4px;font-size:10.5px;">
                      <span>${isFa ? 'ادغام' : 'Merge'}</span>
                    </button>
                  </div>
                </div>

                <!-- Dual Sync Toggle -->
                <div class="aqm-sw-card" style="padding:9px 11px;display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <div style="font-size:11px;font-weight:700;">${isFa ? 'سینک دوطرفه' : 'Dual-Sync'}</div>
                    <div style="font-size:9.5px;color:#64748b;">${isFa ? 'همگام‌سازی تغییرات' : 'Sync updates'}</div>
                  </div>
                  <input type="checkbox" id="aqm-sw-dual-sync" ${swDualSync ? 'checked' : ''} style="width:15px;height:15px;accent-color:#3b82f6;cursor:pointer;" />
                </div>

              </div>

              <!-- Conversation Selector -->
              <div class="aqm-sw-card" style="padding:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">
                  <input type="text" id="aqm-sw-search-input" value="${swSearch}" placeholder="${isFa ? `جستجو در میان ${(swState.conversations || []).length} مکالمه...` : 'Search conversations...'}" style="flex:1;padding:5px 8px;border-radius:7px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);color:#fff;font-size:11px;outline:none;" />
                  <button class="aqm-sw-btn" id="aqm-sw-select-all-btn" style="padding:4px 8px;font-size:10.5px;">
                    ${swSelectedConvs.size === filteredConvs.length && filteredConvs.length > 0 ? (isFa ? 'عدم انتخاب همه' : 'Deselect All') : (isFa ? 'انتخاب همه' : 'Select All')} (${swSelectedConvs.size})
                  </button>
                </div>

                <div class="aqm-custom-scroll" style="max-height:130px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;">
                  ${filteredConvs.length === 0 ? `
                    <div style="text-align:center;padding:12px;color:#64748b;font-size:11px;">${isFa ? 'هیچ مکالمه‌ای یافت نشد.' : 'No conversations found.'}</div>
                  ` : filteredConvs.map(c => {
                    const isChecked = swSelectedConvs.has(c.id);
                    return `
                      <label style="display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:7px;background:${isChecked ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.015)'};border:1px solid ${isChecked ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)'};cursor:pointer;transition:all 0.12s;">
                        <input type="checkbox" data-cid="${c.id}" class="aqm-conv-checkbox" ${isChecked ? 'checked' : ''} style="width:13px;height:13px;accent-color:#3b82f6;cursor:pointer;" />
                        <div style="flex:1;overflow:hidden;">
                          <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.title || c.id}</div>
                        </div>
                        <span style="font-size:9px;color:#64748b;font-family:'JetBrains Mono',monospace;">${(c.updated_at || '').split(' ')[0] || ''}</span>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Start Migration Button -->
              <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-start-migration-btn" style="padding:8px;font-size:11.5px;border-radius:9px;" ${swIsMigrating ? 'disabled' : ''}>
                <span>${swIsMigrating ? (isFa ? 'در حال انتقال...' : 'Migrating...') : (isFa ? `انتقال ${swSelectedConvs.size} مکالمه به اکانت مقصد` : `Migrate ${swSelectedConvs.size} Chats`)}</span>
              </button>
            </div>
          `}

        </div>

      </div>
    `;

    // Wire Event Listeners
    const closeBtn = modal.querySelector('#aqm-sw-modal-close');
    if (closeBtn) closeBtn.onclick = closeSwitcherModal;

    const langBtn = modal.querySelector('#aqm-lang-toggle-btn');
    if (langBtn) {
      langBtn.onclick = () => {
        if (swLang === 'en') swLang = 'fa';
        else if (swLang === 'fa') swLang = 'es';
        else swLang = 'en';
        try { localStorage.setItem('antigravity:switcher_lang', swLang); } catch(e){}
        persistUserSettings({ lang: swLang });
        renderSwitcherModal();
      };
    }

    const tabAcc = modal.querySelector('#aqm-tab-btn-accounts');
    if (tabAcc) tabAcc.onclick = () => { swTab = 'accounts'; renderSwitcherModal(); };
    const tabProj = modal.querySelector('#aqm-tab-btn-projects');
    if (tabProj) tabProj.onclick = () => { swTab = 'projects'; renderSwitcherModal(); };
    const tabTasks = modal.querySelector('#aqm-tab-btn-tasks');
    if (tabTasks) tabTasks.onclick = () => { swTab = 'tasks'; renderSwitcherModal(); };
    const tabMig = modal.querySelector('#aqm-tab-btn-migration');
    if (tabMig) tabMig.onclick = () => { swTab = 'migration'; renderSwitcherModal(); };

    // Accounts tab actions
    const saveCurBtn = modal.querySelector('#aqm-sw-save-current-btn') || modal.querySelector('#aqm-sw-save-current-empty-btn');
    if (saveCurBtn) {
      saveCurBtn.onclick = () => {
        showSwitcherToast(isFa ? 'در حال ذخیره اکانت...' : 'Saving account...');
        if (callDaemonIpc('save')) return;
        fetch('http://127.0.0.1:39281/api/save', { method: 'POST' })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              showSwitcherToast(isFa ? 'اکانت فعلی با موفقیت ذخیره شد' : 'Account saved successfully');
              fetchSwitcherState(() => { renderSwitcherModal(); });
            } else {
              showSwitcherToast(res.error || (isFa ? 'خطا در ذخیره اکانت' : 'Error saving account'), true);
            }
          })
          .catch(() => {
            showSwitcherToast(isFa ? 'خطا در اتصال به سرویس لوکال' : 'Connection error', true);
          });
      };
    }

    const refreshBtn = modal.querySelector('#aqm-sw-refresh-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        fetchSwitcherState(() => {
          showSwitcherToast(isFa ? 'سهمیه و اکانت‌ها بروزرسانی شد' : 'Updated');
          renderSwitcherModal();
        });
      };
    }

    // Toggle Add Account Drawer
    const toggleAddBtn = modal.querySelector('#aqm-sw-toggle-add-btn');
    if (toggleAddBtn) {
      toggleAddBtn.onclick = () => {
        swShowAddPanel = !swShowAddPanel;
        swShowTokenInput = false;
        renderSwitcherModal();
      };
    }

    // Toggle Manual Token Input
    const toggleTokenBtn = modal.querySelector('#aqm-sw-toggle-manual-token-btn');
    if (toggleTokenBtn) {
      toggleTokenBtn.onclick = () => {
        swShowTokenInput = !swShowTokenInput;
        renderSwitcherModal();
      };
    }

    // Submit Manual Token
    const submitTokenBtn = modal.querySelector('#aqm-sw-submit-token-btn');
    if (submitTokenBtn) {
      submitTokenBtn.onclick = () => {
        const input = modal.querySelector('#aqm-sw-token-input');
        const tokVal = input ? input.value.trim() : '';
        if (!tokVal) {
          showSwitcherToast(isFa ? 'لطفاً متن توکن را وارد کنید' : 'Please enter token', true);
          return;
        }
        showSwitcherToast(isFa ? 'در حال اعتبارسنجی و ثبت توکن...' : 'Importing token...');
        if (callDaemonIpc('import', { token: tokVal })) {
          swShowAddPanel = false;
          swShowTokenInput = false;
          return;
        }
        fetch('http://127.0.0.1:39281/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokVal })
        })
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            showSwitcherToast(isFa ? `اکانت ${res.email || ''} با موفقیت افزوده شد` : 'Account imported successfully');
            swShowAddPanel = false;
            swShowTokenInput = false;
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || (isFa ? 'فرمت توکن نامعتبر است' : 'Invalid token format'), true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرویس' : 'Service error', true);
        });
      };
    }

    // Safe Google OAuth Sign In (In-Browser Google OAuth)
    const addOAuthBtn = modal.querySelector('#aqm-sw-add-oauth-btn');
    if (addOAuthBtn) {
      addOAuthBtn.onclick = () => {
        showSwitcherToast(isFa ? 'در حال باز کردن مرورگر کروم برای ورود به گوگل...' : 'Opening Chrome for Google sign-in...');
        fetch('http://127.0.0.1:39281/api/oauth_signin', { method: 'POST' })
          .then(r => r.json())
          .then(res => {
            if (res && res.auth_url) {
              swOAuthUrl = res.auth_url;
              renderSwitcherModal();
              try { window.open(res.auth_url, '_blank'); } catch(e) {}
              showSwitcherToast(isFa 
                ? 'مرورگر باز شد. اگر باز نشد، <a href="' + res.auth_url + '" target="_blank" style="color:#93c5fd;text-decoration:underline;font-weight:700;">اینجا کلیک کنید</a>'
                : 'Browser opened. If not, <a href="' + res.auth_url + '" target="_blank">click here</a>');
            }
          })
          .catch(() => {
            callDaemonIpc('oauth_signin');
          });
      };
    }

    // Re-Auth / Sign-In action for unauthenticated accounts
    modal.querySelectorAll('[data-action="reauth"]').forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.stopPropagation();
        const accKey = btn.getAttribute('data-acc') || btn.getAttribute('data-account') || btn.getAttribute('data-email') || (btn.closest && btn.closest('[data-acc]') && btn.closest('[data-acc]').getAttribute('data-acc'));
        showSwitcherToast(isFa ? 'در حال باز کردن صفحه ورود گوگل در مرورگر...' : 'Opening Google sign-in...');
        fetch('http://127.0.0.1:39281/api/oauth_signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountKey: accKey })
        })
          .then(r => r.json())
          .then(res => {
            if (res && res.auth_url) {
              swOAuthUrl = res.auth_url;
              renderSwitcherModal();
              try { window.open(res.auth_url, '_blank'); } catch(err) {}
            }
          })
          .catch(() => {
            callDaemonIpc('oauth_signin', { accountKey: accKey });
          });
      };
    });

    // Switch Account action
    modal.querySelectorAll('[data-action="switch"]').forEach(btn => {
      btn.onclick = () => {
        const accKey = btn.getAttribute('data-acc');
        showSwitcherToast(isFa ? 'در حال جابجایی حساب و راه‌اندازی مجدد...' : 'Switching account & restarting...');
        if (callDaemonIpc('switch', { accountKey: accKey })) return;
        fetch('http://127.0.0.1:39281/api/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountKey: accKey })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.needs_reauth) {
            showSwitcherToast(res.error || (isFa ? 'این حساب نیاز به ورود دارد' : 'Account requires sign-in'), true);
            fetch('http://127.0.0.1:39281/api/oauth_signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountKey: accKey })
            })
              .then(r => r.json())
              .then(ores => {
                if (ores && ores.auth_url) {
                  swOAuthUrl = ores.auth_url;
                  renderSwitcherModal();
                  try { window.open(ores.auth_url, '_blank'); } catch(err) {}
                }
              }).catch(() => { callDaemonIpc('oauth_signin', { accountKey: accKey }); });
            return;
          }
          if (res && res.success) {
            showSwitcherToast(isFa ? 'حساب فعال شد. در حال راه‌اندازی مجدد...' : 'Account active. Restarting...');
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast((res && res.error) || (isFa ? 'خطا در جابجایی حساب' : 'Switch error'), true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در اتصال به سرویس لوکال' : 'Connection error', true);
        });
      };
    });

    // Launch Dual Instance (Secondary Window) action
    modal.querySelectorAll('[data-action="launch-dual"]').forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.stopPropagation();
        const accKey = btn.getAttribute('data-acc') || btn.getAttribute('data-account') || btn.getAttribute('data-email') || (btn.closest && btn.closest('[data-acc]') && btn.closest('[data-acc]').getAttribute('data-acc'));
        if (!accKey) return;

        btn.disabled = true;
        setTimeout(() => { try { btn.disabled = false; } catch(err){} }, 3000);

        showSwitcherToast(t.dualLaunching || (isFa ? 'در حال اجرای پنجره دوم آنتی‌گرویتی...' : 'Launching 2nd Antigravity instance...'));

        if (callDaemonIpc('launch_dual', { accountKey: accKey })) {
          return;
        }

        // Fallback to daemon HTTP endpoint if CDP IPC is not available
        fetch('http://127.0.0.1:39281/api/launch_dual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountKey: accKey })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.needs_reauth) {
            showSwitcherToast(res.error || (isFa ? 'این حساب نیاز به ورود دارد' : 'Account requires sign-in'), true);
            fetch('http://127.0.0.1:39281/api/oauth_signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountKey: accKey })
            })
              .then(r => r.json())
              .then(ores => {
                if (ores && ores.auth_url) {
                  swOAuthUrl = ores.auth_url;
                  renderSwitcherModal();
                  try { window.open(ores.auth_url, '_blank'); } catch(err) {}
                }
              }).catch(() => { callDaemonIpc('oauth_signin', { accountKey: accKey }); });
            return;
          }
          if (res && res.success) {
            showSwitcherToast(res.msg || t.dualLaunched || (isFa ? 'پنجره دوم با موفقیت اجرا شد!' : '2nd instance started successfully!'));
          } else if (res && res.error) {
            showSwitcherToast(res.error, true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرویس لانچر' : 'Launcher connection error', true);
        });
      };
    });

    // Delete Account action
    modal.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.onclick = () => {
        const accKey = btn.getAttribute('data-acc');
        const confirmMsg = isFa ? `آیا از حذف اکانت "${accKey}" از لیست مطمئن هستید؟` : `Delete account "${accKey}" from list?`;
        if (confirm(confirmMsg)) {
          if (callDaemonIpc('delete', { accountKey: accKey })) return;
          fetch('http://127.0.0.1:39281/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountKey: accKey })
          })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              showSwitcherToast(isFa ? 'اکانت از لیست حذف شد' : 'Account removed');
              fetchSwitcherState(() => { renderSwitcherModal(); });
            }
          });
        }
      };
    });

    // Projects Tab Actions
    const allowAllBtn = modal.querySelector('#aqm-proj-allow-all-btn');
    if (allowAllBtn) {
      allowAllBtn.onclick = async () => {
        showSwitcherToast(isFa ? 'در حال فعال‌سازی تمام پروژه‌ها برای اکانت ۲...' : 'Allowing all projects in Account 2...');
        for (const p of projectsList) {
          await fetch('http://127.0.0.1:39281/api/project_assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: p.id, account: 'instance_2', enabled: true })
          }).catch(() => {});
        }
        showSwitcherToast(isFa ? 'تمام پروژه‌ها برای اکانت ۲ فعال شدند' : 'All projects allowed in Account 2');
        applyConversationIsolationFilter();
        fetchSwitcherState(() => renderSwitcherModal());
      };
    }

    const isolateAllBtn = modal.querySelector('#aqm-proj-isolate-all-btn');
    if (isolateAllBtn) {
      isolateAllBtn.onclick = async () => {
        showSwitcherToast(isFa ? 'در حال جداسازی تمام پروژه‌ها از اکانت ۲...' : 'Isolating all projects to Account 1...');
        for (const p of projectsList) {
          await fetch('http://127.0.0.1:39281/api/project_unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: p.id, account: 'instance_2' })
          }).catch(() => {});
        }
        showSwitcherToast(isFa ? 'تمام پروژه‌ها از اکانت ۲ جدا شدند' : 'All projects isolated from Account 2');
        applyConversationIsolationFilter();
        fetchSwitcherState(() => renderSwitcherModal());
      };
    }

    modal.querySelectorAll('.aqm-proj-toggle-cb').forEach(cb => {
      cb.onchange = () => {
        const pid = cb.getAttribute('data-pid');
        const en = cb.checked;
        showSwitcherToast(isFa ? 'در حال به‌روزرسانی دسترسی پروژه...' : 'Updating project access...');
        const endpoint = en ? '/api/project_assign' : '/api/project_unlink';
        const payload = en ? { projectId: pid, account: 'instance_2', enabled: true } : { projectId: pid, account: 'instance_2' };
        fetch(`http://127.0.0.1:39281${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            showSwitcherToast(isFa ? 'پروژه با موفقیت به‌روزرسانی شد' : 'Project updated');
            applyConversationIsolationFilter();
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || 'Error', true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرور' : 'Connection error', true);
        });
      };
    });

    modal.querySelectorAll('.aqm-proj-sync-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.getAttribute('data-pid');
        showSwitcherToast(isFa ? 'در حال سینک پروژه به اکانت ۲...' : 'Syncing project to Account 2...');
        fetch('http://127.0.0.1:39281/api/project_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: pid, targetAccount: 'instance_2' })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            showSwitcherToast(isFa ? 'پروژه با اکانت ۲ همگام‌سازی شد' : 'Project synced to Account 2');
            applyConversationIsolationFilter();
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || 'Error', true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرور' : 'Connection error', true);
        });
      };
    });

    modal.querySelectorAll('.aqm-proj-unlink-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.getAttribute('data-pid');
        showSwitcherToast(isFa ? 'در حال جداسازی پروژه از اکانت ۲...' : 'Unlinking project from Account 2...');
        fetch('http://127.0.0.1:39281/api/project_unlink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: pid, account: 'instance_2' })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            showSwitcherToast(isFa ? 'پروژه با موفقیت از اکانت ۲ جدا شد' : 'Project unlinked from Account 2');
            applyConversationIsolationFilter();
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || 'Error', true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرور' : 'Connection error', true);
        });
      };
    });

    // Tasks Tab Actions
    modal.querySelectorAll('.aqm-task-toggle-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.getAttribute('data-locked') === 'true' || btn.hasAttribute('disabled')) {
          showSwitcherToast(t.taskLockedMsg || (isFa ? 'این تسک متعلق به اکانت اصلی است و از اکانت ۲ قابل تغییر نیست.' : 'This task belongs to Account 1 and cannot be modified from Account 2.'), true);
          return;
        }
        const tname = btn.getAttribute('data-task');
        const curEn = btn.getAttribute('data-enabled') === 'true';
        showSwitcherToast(isFa ? 'در حال تغییر وضعیت تسک...' : 'Toggling task state...');
        const callerAcc = isInstance2Window() ? (window.__antigravity_account || 'instance_2') : email;
        if (callDaemonIpc('toggleTask', { taskName: tname, enabled: !curEn, callerAccount: callerAcc })) {
          setTimeout(() => fetchSwitcherState(() => renderSwitcherModal()), 300);
          return;
        }
        fetch('http://127.0.0.1:39281/api/task_toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName: tname, enabled: !curEn, callerAccount: callerAcc })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            showSwitcherToast(isFa ? 'وضعیت تسک با موفقیت تغییر کرد' : 'Task state updated');
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || (isFa ? 'عدم دسترسی به تغییر وضعیت تسک' : 'Access denied'), true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرور' : 'Connection error', true);
        });
      };
    });

    modal.querySelectorAll('.aqm-task-isolate-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.getAttribute('data-locked') === 'true' || btn.hasAttribute('disabled')) {
          showSwitcherToast(t.taskLockedMsg || (isFa ? 'تغییر وضعیت ایزولاسیون این تسک از اکانت ۲ مجاز نیست.' : 'Modifying isolation of this task from Account 2 is not permitted.'), true);
          return;
        }
        const tname = btn.getAttribute('data-task');
        const curIso = btn.getAttribute('data-isolated') === 'true';
        showSwitcherToast(isFa ? 'در حال تغییر وضعیت ایزولاسیون تسک...' : 'Updating task isolation...');
        const callerAcc = isInstance2Window() ? (window.__antigravity_account || 'instance_2') : email;
        if (callDaemonIpc('isolateTask', { taskName: tname, isolate: !curIso, callerAccount: callerAcc })) {
          setTimeout(() => fetchSwitcherState(() => renderSwitcherModal()), 300);
          return;
        }
        fetch('http://127.0.0.1:39281/api/task_isolate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName: tname, isolate: !curIso, callerAccount: callerAcc })
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            showSwitcherToast(isFa ? 'ایزولاسیون تسک به‌روزرسانی شد' : 'Task isolation updated');
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || 'Error', true);
          }
        })
        .catch(() => {
          showSwitcherToast(isFa ? 'خطا در ارتباط با سرور' : 'Connection error', true);
        });
      };
    });

    // Migration tab actions
    const targetSelect = modal.querySelector('#aqm-sw-target-select');
    if (targetSelect) {
      targetSelect.onchange = (e) => {
        swTargetAccount = e.target.value;
      };
    }

    const copyBtn = modal.querySelector('#aqm-sw-mode-copy');
    if (copyBtn) copyBtn.onclick = () => { swMode = 'copy'; renderSwitcherModal(); };
    const moveBtn = modal.querySelector('#aqm-sw-mode-move');
    if (moveBtn) moveBtn.onclick = () => { swMode = 'move'; renderSwitcherModal(); };

    const sepBtn = modal.querySelector('#aqm-sw-struct-sep');
    if (sepBtn) sepBtn.onclick = () => { swStructure = 'separate'; renderSwitcherModal(); };
    const mergeBtn = modal.querySelector('#aqm-sw-struct-merge');
    if (mergeBtn) mergeBtn.onclick = () => { swStructure = 'merge'; renderSwitcherModal(); };

    const dualSyncCb = modal.querySelector('#aqm-sw-dual-sync');
    if (dualSyncCb) {
      dualSyncCb.onchange = (e) => {
        swDualSync = e.target.checked;
      };
    }

    const searchInput = modal.querySelector('#aqm-sw-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        swSearch = e.target.value;
        renderSwitcherModal();
        const nextInput = modal.querySelector('#aqm-sw-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
        }
      };
    }

    const selectAllBtn = modal.querySelector('#aqm-sw-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.onclick = () => {
        if (swSelectedConvs.size === filteredConvs.length && filteredConvs.length > 0) {
          swSelectedConvs.clear();
        } else {
          filteredConvs.forEach(c => swSelectedConvs.add(c.id));
        }
        renderSwitcherModal();
      };
    }

    modal.querySelectorAll('.aqm-conv-checkbox').forEach(cb => {
      cb.onchange = (e) => {
        const cid = cb.getAttribute('data-cid');
        if (cb.checked) swSelectedConvs.add(cid);
        else swSelectedConvs.delete(cid);
        renderSwitcherModal();
      };
    });

    const startMigrateBtn = modal.querySelector('#aqm-sw-start-migration-btn');
    if (startMigrateBtn) {
      startMigrateBtn.onclick = () => {
        if (swSelectedConvs.size === 0) {
          showSwitcherToast(isFa ? 'حداقل یک گفتگو را برای انتقال انتخاب کنید' : 'Select at least one conversation', true);
          return;
        }
        if (!swTargetAccount) {
          showSwitcherToast(isFa ? 'لطفاً اکانت مقصد را انتخاب کنید' : 'Select target account', true);
          return;
        }
        swIsMigrating = true;
        renderSwitcherModal();
        showSwitcherToast(isFa ? 'در حال انتقال مکالمات...' : 'Migrating conversations...');

        const activeKey = email || (activeAcc && activeAcc.email) || 'Active Account';
        fetch('http://127.0.0.1:39281/api/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationIds: Array.from(swSelectedConvs),
            sourceAccount: activeKey,
            targetAccount: swTargetAccount,
            mode: swMode,
            structure: swStructure,
            dualSync: swDualSync
          })
        })
        .then(r => r.json())
        .then(res => {
          swIsMigrating = false;
          if (res.success) {
            showSwitcherToast(isFa ? `انتقال ${res.migrated_count || swSelectedConvs.size} گفتگو با موفقیت انجام شد` : 'Migration completed!');
            swSelectedConvs.clear();
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || (isFa ? 'خطا در انتقال' : 'Migration error'), true);
            renderSwitcherModal();
          }
        })
        .catch(err => {
          swIsMigrating = false;
          showSwitcherToast(isFa ? 'ارتباط با سرویس برقرار نشد' : 'Service error', true);
          renderSwitcherModal();
        });
      };
    }
  }

  // Pre-fetch switcher state on start
  setTimeout(() => {
    fetchSwitcherState();
  }, 1000);

  function renderBadge() {
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    if (!trigger) return;

    const theme = getActiveTheme();
    const { fontEn, fontFa, fullFamily } = getEffectiveFonts(theme);

    // 1. Precision Trigger Badge
    let badge = document.getElementById('antigravity-usage-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'antigravity-usage-badge';
      const svg = trigger.querySelector('svg');
      if (svg && svg.parentNode) {
        try {
          svg.parentNode.insertBefore(badge, svg);
        } catch (e) {
          trigger.appendChild(badge);
        }
      } else {
        trigger.appendChild(badge);
      }
    }
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '6px';
    badge.style.marginLeft = '6px';
    badge.style.marginRight = '2px';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '9999px';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '700';
    badge.style.fontFamily = `'JetBrains Mono', ${fullFamily}`;
    badge.style.background = theme.chipBg;
    badge.style.border = `1px solid ${theme.cardBorder}`;
    badge.style.color = theme.accent;
    badge.style.cursor = 'default';
    badge.style.pointerEvents = 'none';
    badge.style.userSelect = 'none';
    badge.style.transition = 'all 0.2s ease';
    badge.style.boxShadow = `0 1px 4px rgba(0,0,0,0.2)`;

    // 2. Floating Capsule Pill Button (Apple Dynamic Island Inspired)
    let pill = document.getElementById('antigravity-usage-pill');
    if (!pill) {
      pill = document.createElement('button');
      pill.id = 'antigravity-usage-pill';
      pill.type = 'button';
      const wrapper = trigger.closest('.no-focus-agent-input') || trigger.parentElement;
      wrapper.insertAdjacentElement('afterend', pill);
    }
    pill.style.display = 'inline-flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '7px';
    pill.style.marginLeft = '7px';
    pill.style.padding = '0 11px';
    pill.style.height = '28px';
    pill.style.borderRadius = '9999px';
    pill.style.fontSize = '11.5px';
    pill.style.fontWeight = '700';
    pill.style.fontFamily = `'JetBrains Mono', ${fullFamily}`;
    pill.style.background = theme.pillBg;
    pill.style.border = `1px solid ${theme.pillBorder}`;
    pill.style.color = theme.pillColor;
    pill.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.2), 0 4px 14px rgba(0,0,0,0.3)`;
    pill.style.cursor = 'pointer';
    pill.style.userSelect = 'none';
    pill.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

    const isRem = (displayMode === 'remaining');
    const sessRem = Math.round(currentUsage.session?.remaining_pct ?? (100 - Math.round(currentUsage.session?.used_pct ?? 0)));
    const sessUsed = Math.round(currentUsage.session?.used_pct ?? (100 - sessRem));
    const sessReset = currentUsage.session?.resets_in || 'Ready';

    const weekRem = Math.round(currentUsage.weekly?.remaining_pct ?? (100 - Math.round(currentUsage.weekly?.used_pct ?? 0)));
    const weekUsed = Math.round(currentUsage.weekly?.used_pct ?? (100 - weekRem));
    const weekReset = currentUsage.weekly?.resets_in || 'Ready';

    const badgeSess = isRem ? sessRem : sessUsed;
    const badgeWeek = isRem ? weekRem : weekUsed;

    const titleTooltip = `Gemini Quota HUD\n• 5-Hour: ${sessRem}% Remaining (${sessUsed}% Used) - Resets in: ${sessReset}\n• Weekly: ${weekRem}% Remaining (${weekUsed}% Used) - Resets in: ${weekReset}\nClick to view full HUD`;

    const badgeSig = `${badgeSess}|${badgeWeek}|${theme.dotColor}|${theme.id}`;
    if (badge.dataset.aqmSig !== badgeSig) {
      badge.dataset.aqmSig = badgeSig;
      badge.title = titleTooltip;
      badge.innerHTML = `
        <span style="width:5.5px;height:5.5px;border-radius:50%;background:${theme.dotColor};box-shadow:0 0 7px ${theme.dotColor};animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
        <span dir="ltr">${badgeSess}%</span>
        <span style="opacity:0.35;font-weight:400;margin:0 1px;">|</span>
        <span style="opacity:0.85;font-size:10px;font-weight:600;" dir="ltr">W: ${badgeWeek}%</span>
      `;
    }

    const pillSig = `${badgeSess}|${sessReset}|${isRefreshing}|${theme.dotColor}|${theme.id}`;
    if (pill.dataset.aqmSig !== pillSig) {
      pill.dataset.aqmSig = pillSig;
      pill.title = titleTooltip;
      pill.innerHTML = `
        <span style="width:5.5px;height:5.5px;border-radius:50%;background:${theme.dotColor};box-shadow:0 0 7px ${theme.dotColor};animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
        <span class="${isRefreshing ? 'aqm-rotating' : ''}" style="color:${theme.id === 'pastel' ? '#ff70a6' : '#fbbf24'};display:flex;align-items:center;filter:drop-shadow(0 0 5px ${theme.id === 'pastel' ? 'rgba(255,112,166,0.6)' : 'rgba(251,191,36,0.6)'});">
          ${theme.id === 'pastel' ? '🌸' : SVGS.lightning}
        </span>
        <span style="letter-spacing:-0.02em;" dir="ltr">${badgeSess}%</span>
        <span style="opacity:0.75;font-size:10px;font-weight:500;font-family:${fontFa};">(${sessReset})</span>
      `;
    }

    pill.onclick = togglePopover;

    // 3. Floating Account Capsule Pill (In-Editor Native Switcher Trigger)
    let accPill = document.getElementById('antigravity-account-pill');
    if (!accPill) {
      accPill = document.createElement('button');
      accPill.id = 'antigravity-account-pill';
      accPill.type = 'button';
      pill.insertAdjacentElement('afterend', accPill);
    }

    accPill.style.display = 'inline-flex';
    accPill.style.alignItems = 'center';
    accPill.style.gap = '6px';
    accPill.style.marginLeft = '7px';
    accPill.style.padding = '0 10px';
    accPill.style.height = '28px';
    accPill.style.borderRadius = '9999px';
    accPill.style.fontSize = '11px';
    accPill.style.fontWeight = '700';
    accPill.style.fontFamily = `'Vazirmatn', ${fullFamily}`;
    accPill.style.background = theme.pillBg || 'rgba(15, 23, 42, 0.75)';
    accPill.style.border = `1px solid ${theme.pillBorder || 'rgba(255, 255, 255, 0.16)'}`;
    accPill.style.color = theme.textColor || '#f1f5f9';
    accPill.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.3)`;
    accPill.style.cursor = 'pointer';
    accPill.style.userSelect = 'none';
    accPill.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    const isInst2 = isInstance2Window();
    let designatedEmail = '';
    try {
      designatedEmail = localStorage.getItem('antigravity:account_email') || window.__antigravity_account || (swState.activeAccount && swState.activeAccount.email) || (currentUsage && currentUsage.email) || '';
    } catch(e) {}
    if (!designatedEmail) {
      designatedEmail = isInst2 ? 'bombhub.apk@gmail.com' : 'madgod.cum@gmail.com';
    }

    let targetKey = designatedEmail;
    if (swState.savedAccounts && !swState.savedAccounts[targetKey]) {
      const matchKey = Object.keys(swState.savedAccounts).find(k => k.toLowerCase() === targetKey.toLowerCase());
      if (matchKey) {
        targetKey = matchKey;
      } else if (isInst2) {
        const foundKey = Object.keys(swState.savedAccounts).find(e => isAccount2(e));
        if (foundKey) targetKey = foundKey;
      }
    }

    const savedInfo = (swState.savedAccounts && swState.savedAccounts[targetKey]) || {};
    let fallbackName = savedInfo.name || (targetKey ? (targetKey.split('@')[0].split('.')[0].charAt(0).toUpperCase() + targetKey.split('@')[0].split('.')[0].slice(1)) : (isInst2 ? 'Secondary' : 'Madgod'));
    let fallbackAvatar = savedInfo.avatar || '';

    let accUser = {
      email: targetKey,
      name: fallbackName,
      avatar: fallbackAvatar,
      tier: savedInfo.tier || 'Google AI Pro',
      tier_code: savedInfo.tier_code || 'pro'
    };

    if (swState.activeAccount && swState.activeAccount.email && swState.activeAccount.email.toLowerCase() === targetKey.toLowerCase()) {
      accUser = { ...accUser, ...swState.activeAccount };
    } else if (currentUsage && currentUsage.email && currentUsage.email.toLowerCase() === targetKey.toLowerCase()) {
      accUser = { ...accUser, ...currentUsage };
    }

    if (accUser.name && (accUser.name === 'Account 2' || accUser.name.toLowerCase() === 'user')) {
      accUser.name = savedInfo.name || fallbackName;
    }

    let accEmail = targetKey;
    let accName = accUser.name || fallbackName;
    let accAvatar = accUser.avatar || fallbackAvatar;
    let accTier = accUser.tier || 'Google AI Pro';
    let accTierCode = (accUser.tier_code || 'pro').toLowerCase();

    const tierBadgeBg = accTierCode === 'ultra' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : (accTierCode === 'pro' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.35))' : 'rgba(148,163,184,0.15)');
    const tierBadgeColor = accTierCode === 'ultra' ? '#ffffff' : (accTierCode === 'pro' ? '#fbbf24' : '#94a3b8');
    const tierBadgeBorder = accTierCode === 'ultra' ? 'rgba(236,72,153,0.5)' : (accTierCode === 'pro' ? 'rgba(251,191,36,0.45)' : 'rgba(148,163,184,0.25)');

    const initialChar = accName ? accName.charAt(0).toUpperCase() : (isInst2 ? 'B' : 'M');
    const initialAvatarHtml = `<span style="width:17px;height:17px;border-radius:50%;background:${isInst2 ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)' : 'linear-gradient(135deg, #4285f4, #9b72cb)'};display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:800;pointer-events:none;">${initialChar}</span>`;

    const accPillSig = `${accEmail}|${accName}|${accAvatar}|${accTierCode}|${theme.pillBg}`;
    if (accPill.dataset.aqmSig !== accPillSig) {
      accPill.dataset.aqmSig = accPillSig;
      accPill.title = `اکانت فعال: ${accName} (${accTier})\nبرای سوئیچ اکانت یا جابجایی پروژه‌ها کلیک کنید`;
      accPill.innerHTML = `
        <span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;animation:aqm-pulse-dot 2s infinite ease-in-out;pointer-events:none;"></span>
        ${accAvatar ? `<img src="${accAvatar}" style="width:17px;height:17px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.3);pointer-events:none;" onerror="this.style.display='none'" />` : initialAvatarHtml}
        <span style="letter-spacing:-0.01em;font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;" dir="ltr">${accName}</span>
        <span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:9999px;background:${tierBadgeBg};color:${tierBadgeColor};border:1px solid ${tierBadgeBorder};text-transform:uppercase;letter-spacing:0.02em;pointer-events:none;">${accTierCode.toUpperCase()}</span>
        <span style="font-size:8px;opacity:0.6;margin-left:1px;pointer-events:none;">▼</span>
      `;
    }

    accPill.onclick = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      toggleSwitcherModal();
    };
    accPill.onpointerdown = (e) => {
      if (e) {
        e.stopPropagation();
      }
    };

    accPill.onmouseenter = () => { accPill.style.transform = 'translateY(-1px) scale(1.02)'; };
    accPill.onmouseleave = () => { accPill.style.transform = ''; };

    const pop = document.getElementById('antigravity-usage-popover');
    if (pop && pop.style.display !== 'none' && !pop.matches(':hover')) {
      renderPopover();
    }
  }

  // 4. Safe Non-Blocking DOM Watcher & Task Poller
  let isTaskRunning = false;

  function startActiveTaskPolling() {
    if (window.__aqm_task_interval) return;
    const pill = document.getElementById('antigravity-usage-pill');
    if (pill) pill.classList.add('aqm-task-active');

    refreshQuota();
    window.__aqm_task_interval = setInterval(() => {
      const stopBtn = document.querySelector('button[aria-label*="Stop execution"], button[aria-label*="Cancel"]');
      if (!stopBtn) {
        stopActiveTaskPolling();
        return;
      }
      refreshQuota();
    }, 3500);
  }

  function stopActiveTaskPolling() {
    if (window.__aqm_task_interval) {
      clearInterval(window.__aqm_task_interval);
      window.__aqm_task_interval = null;
    }
    const pill = document.getElementById('antigravity-usage-pill');
    if (pill) pill.classList.remove('aqm-task-active');

    setTimeout(() => {
      refreshQuota();
    }, 600);
  }

  function startDomWatcher() {
    if (window.__aqm_dom_interval) clearInterval(window.__aqm_dom_interval);
    window.__aqm_dom_interval = setInterval(() => {
      const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
      const badge = document.getElementById('antigravity-usage-badge');
      const pill = document.getElementById('antigravity-usage-pill');
      const accPill = document.getElementById('antigravity-account-pill');
      if (trigger && (!badge || !pill || !accPill)) {
        renderBadge();
      }

      const stopBtn = document.querySelector('button[aria-label*="Stop execution"], button[aria-label*="Cancel"]');
      if (stopBtn && !isTaskRunning) {
        isTaskRunning = true;
        startActiveTaskPolling();
      } else if (!stopBtn && isTaskRunning) {
        isTaskRunning = false;
        stopActiveTaskPolling();
      }
    }, 1200);
  }

  window.__openSwitcherModal = openSwitcherModal;
  window.__closeSwitcherModal = closeSwitcherModal;
  window.__toggleSwitcherModal = toggleSwitcherModal;
  window.__renderAntigravityBadge = renderBadge;
  window.__refreshAntigravityQuota = refreshQuota;
  window.__openAntigravityPopover = () => {
    lastPopoverOpenTime = Date.now();
    const pop = getOrCreatePopover();
    renderPopover();
    pop.style.display = 'block';
  };
  window.__closeAntigravityPopover = () => {
    const pop = document.getElementById('antigravity-usage-popover');
    if (pop) pop.style.display = 'none';
  };
  window.__setAntigravityTheme = (themeId) => {
    if (THEMES[themeId]) {
      currentThemeId = themeId;
      try { localStorage.setItem('antigravity:quota_theme', themeId); } catch (e) {}
      persistUserSettings({ theme: themeId });
      applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
      renderBadge();
      renderPopover();
    }
  };
  window.__toggleFullAppTheming = (enabled) => {
    isFullAppThemingEnabled = !!enabled;
    try { localStorage.setItem('antigravity:full_app_theming', String(isFullAppThemingEnabled)); } catch (e) {}
    persistUserSettings({ fullTheming: isFullAppThemingEnabled });
    applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
    renderPopover();
  };
  window.__toggleAntigravityPrivacyMode = (enabled) => {
    isPrivacyMode = (typeof enabled === 'boolean') ? enabled : !isPrivacyMode;
    try { localStorage.setItem('antigravity:privacy_mode', String(isPrivacyMode)); } catch (e) {}
    persistUserSettings({ privacyMode: isPrivacyMode });
    renderPopover();
  };
  window.__setAntigravityFont = (en, fa) => {
    if (en) { customFontEn = en; try { localStorage.setItem('antigravity:custom_font_en', en); } catch(e){} }
    if (fa) { customFontFa = fa; try { localStorage.setItem('antigravity:custom_font_fa', fa); } catch(e){} }
    persistUserSettings({ fontEn: customFontEn, fontFa: customFontFa });
    applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
    renderBadge();
    renderPopover();
  };
  window.__importAntigravityFont = (name, url = '', type = 'fa') => {
    if (!name) return;
    if (!customImportedFonts.some(f => f.id.toLowerCase() === name.toLowerCase())) {
      customImportedFonts.push({ id: name, name, url, type });
      try { localStorage.setItem('antigravity:custom_imported_fonts', JSON.stringify(customImportedFonts)); } catch(e){}
    }
    if (url) injectImportedFontStyles();
    if (type === 'fa') {
      customFontFa = name;
      try { localStorage.setItem('antigravity:custom_font_fa', name); } catch(e){}
    } else {
      customFontEn = name;
      try { localStorage.setItem('antigravity:custom_font_en', name); } catch(e){}
    }
    persistUserSettings({ customImportedFonts, fontEn: customFontEn, fontFa: customFontFa });
    ensureFontLoaded(name);
    applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
    renderBadge();
    renderPopover();
  };

  // Smart RTL Global API & Exports
  window.updateDir = updateDir;
  window.openSwitcherModal = openSwitcherModal;
  window.closeSwitcherModal = closeSwitcherModal;
  window.renderSwitcherModal = renderSwitcherModal;
  window.setRTLActive = (active) => {
    rtlConfig.isRTL = !!active;
    saveRtlConfig();
    applyRtlStyles();
    if (rtlConfig.isRTL) updateDir(); else clearDir();
    renderPopover();
  };
  window.__toggleAntigravityRTL = () => {
    rtlConfig.isRTL = !rtlConfig.isRTL;
    saveRtlConfig();
    applyRtlStyles();
    if (rtlConfig.isRTL) updateDir(); else clearDir();
    renderPopover();
  };
  window.__setAntigravityRtlConfig = (cfg) => {
    if (typeof cfg === 'object' && cfg !== null) {
      rtlConfig = { ...rtlConfig, ...cfg };
      saveRtlConfig();
      applyRtlStyles();
      if (rtlConfig.isRTL) updateDir(); else clearDir();
      renderPopover();
    }
  };

  startDomWatcher();
  applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
  applyRtlStyles();
  if (rtlConfig.isRTL) {
    updateDir();
  }
  ensureFontLoaded(customFontEn);
  ensureFontLoaded(customFontFa);
  applyConversationIsolationFilter();
  try {
    let isoDebounce = null;
    const isoObserver = new MutationObserver(() => {
      if (!isInstance2Window()) return;
      if (isoDebounce) return;
      isoDebounce = setTimeout(() => {
        isoDebounce = null;
        applyConversationIsolationFilter();
      }, 150);
    });
    isoObserver.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      if (isInstance2Window()) applyConversationIsolationFilter();
    }, 2000);
  } catch(e) {}
  fetchStoredQuota().then(() => {
    renderBadge();
    refreshQuota();
    applyConversationIsolationFilter();
  });
  renderBadge();
})();
