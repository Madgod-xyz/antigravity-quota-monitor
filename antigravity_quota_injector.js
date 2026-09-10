(() => {
  // Clean up old intervals and popover on reload
  const existingPop = document.getElementById('antigravity-usage-popover');
  if (existingPop) existingPop.remove();
  const existingModal = document.getElementById('antigravity-switcher-modal');
  if (existingModal) existingModal.remove();
  const existingAccPill = document.getElementById('antigravity-account-pill');
  if (existingAccPill) existingAccPill.remove();

  if (window.__aqm_dom_interval) { clearInterval(window.__aqm_dom_interval); window.__aqm_dom_interval = null; }
  if (window.__aqm_token_observer) { window.__aqm_token_observer.disconnect(); window.__aqm_token_observer = null; }
  if (window.__aqm_submenu_observer) { window.__aqm_submenu_observer.disconnect(); window.__aqm_submenu_observer = null; }
  if (window.__aqm_dom_observer) { window.__aqm_dom_observer.disconnect(); window.__aqm_dom_observer = null; }
  if (window.__aqm_rtl_interval) { clearInterval(window.__aqm_rtl_interval); window.__aqm_rtl_interval = null; }

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
      document.head.appendChild(link);
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
          document.head.appendChild(link);
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
  if (!document.getElementById('aqm-styles')) {
    const style = document.createElement('style');
    style.id = 'aqm-styles';
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
      }
    `;
    document.head.appendChild(style);
  }

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

  let currentThemeId = 'cyber';
  try {
    const savedTheme = localStorage.getItem('antigravity:quota_theme');
    if (savedTheme && THEMES[savedTheme]) currentThemeId = savedTheme;
  } catch (e) {}

  let isFullAppThemingEnabled = true;
  try {
    const savedAppTheming = localStorage.getItem('antigravity:full_app_theming');
    if (savedAppTheming !== null) isFullAppThemingEnabled = (savedAppTheming === 'true');
  } catch (e) {}

  let customFontEn = 'default';
  try {
    const savedEn = localStorage.getItem('antigravity:custom_font_en');
    if (savedEn) customFontEn = savedEn;
  } catch (e) {}

  let customFontFa = 'default';
  try {
    const savedFa = localStorage.getItem('antigravity:custom_font_fa');
    if (savedFa) customFontFa = savedFa;
  } catch (e) {}

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
      document.head.appendChild(typoStyle);
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
      document.head.appendChild(style);
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
    const savedRtl = localStorage.getItem('antigravity:rtl_config');
    if (savedRtl) rtlConfig = { ...rtlConfig, ...JSON.parse(savedRtl) };
  } catch (e) {}

  function saveRtlConfig() {
    try {
      localStorage.setItem('antigravity:rtl_config', JSON.stringify(rtlConfig));
    } catch (e) {}
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
      document.head.appendChild(rtlStyle);
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

  let displayMode = 'remaining';
  try {
    const saved = localStorage.getItem('antigravity:quota_mode');
    if (saved === 'remaining' || saved === 'used') displayMode = saved;
  } catch (e) {}

  let isPrivacyMode = true;
  try {
    isPrivacyMode = localStorage.getItem('antigravity:privacy_mode') !== 'false';
  } catch (e) {}

  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let popStartLeft = 0, popStartTop = 0;

  let isRefreshing = false;
  let activeTaskPollingInterval = null;

  let currentUsage = {
    email: "developer@antigravity.ai",
    session: {
      name: "Gemini (Pro & Flash)",
      used_pct: 28.0,
      remaining_pct: 72.0,
      weekly_rem: 51.0,
      weekly_pct: 49.0,
      resets_in: "2 hr 4 min",
      reset_time: "02:16 PM"
    },
    weekly: {
      remaining_pct: 51.0,
      used_pct: 49.0,
      resets_in: "2 days, 19 hours"
    },
    pools: []
  };

  function getActiveModelName() {
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    if (!trigger) return 'Gemini 3.8 Flash High';
    const firstLine = trigger.innerText.split('\n')[0].trim();
    return firstLine || 'Gemini 3.8 Flash High';
  }

  async function fetchStoredQuota() {
    try {
      if (window.__antigravity_quota && window.__antigravity_quota.session) {
        currentUsage = { ...currentUsage, ...window.__antigravity_quota };
        return;
      }
      const item = localStorage.getItem('antigravity:active_quota');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.session) currentUsage = { ...currentUsage, ...parsed };
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
      const liveData = await fetchLiveQuotaFromCloudCode();
      if (liveData && liveData.session) {
        currentUsage = { ...currentUsage, ...liveData };
        window.__antigravity_quota = currentUsage;
        try {
          const s = safeJsonStringify(currentUsage);
          if (s) localStorage.setItem('antigravity:active_quota', s);
        } catch (e) {}
      } else {
        const res = await fetch('http://127.0.0.1:39281/sync');
        if (res.ok) {
          const data = await res.json();
          if (data && data.session) {
            currentUsage = { ...currentUsage, ...data };
            window.__antigravity_quota = currentUsage;
            try {
              const s = safeJsonStringify(currentUsage);
              if (s) localStorage.setItem('antigravity:active_quota', s);
            } catch (e) {}
          }
        }
      }
    } catch (e) {} finally {
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
    const sessUsed = Math.round(currentUsage.session?.used_pct ?? 28);
    const sessRem = Math.round(currentUsage.session?.remaining_pct ?? (100 - sessUsed));
    const sessReset = currentUsage.session?.resets_in || '2 hr 4 min';
    const sessResetTime = currentUsage.session?.reset_time || '02:16 PM';
    const email = currentUsage.email || 'developer@antigravity.ai';
    const displayEmail = isPrivacyMode ? '••••••••••••@gmail.com' : email;

    const mainPct = isRem ? sessRem : sessUsed;
    const subPct = isRem ? sessUsed : sessRem;
    const mainLabel = isRem ? 'مانده' : 'مصرف';
    const subLabel = isRem ? 'مصرف' : 'مانده';

    const weeklyUsed = Math.round(currentUsage.weekly?.used_pct ?? 49);
    const weeklyRem = Math.round(currentUsage.weekly?.remaining_pct ?? (100 - weeklyUsed));
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
          <button id="aqm-account-switcher-trigger" type="button" data-font="fa" title="سوئیچ اکانت و مهاجرت پروژه‌ها (iOS Liquid Glass)" style="display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:9999px;background:${theme.itemBg};border:1px solid ${theme.itemBorder};color:${theme.textColor};font-size:10.5px;font-weight:600;cursor:pointer;transition:all 0.2s ease;font-family:${fontFa};user-select:none;">
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
            <span style="opacity:0.5;">(${currentUsage.weekly?.resets_in || '2 days, 19 hours'})</span>
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
        renderPopover();
      };
    }

    pop.querySelector('#aqm-mode-rem-btn').onclick = (e) => {
      e.stopPropagation();
      displayMode = 'remaining';
      try { localStorage.setItem('antigravity:quota_mode', 'remaining'); } catch (err) {}
      renderBadge();
      renderPopover();
    };

    pop.querySelector('#aqm-mode-used-btn').onclick = (e) => {
      e.stopPropagation();
      displayMode = 'used';
      try { localStorage.setItem('antigravity:quota_mode', 'used'); } catch (err) {}
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
        const typeRadio = pop.querySelector('input[name="aqm-import-type"]:checked');
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
              localStorage.setItem('antigravity:popover_pos', JSON.stringify({
                left: pop.style.left,
                top: pop.style.top
              }));
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
      appName: "آنتی‌گرویتی سوئیچر",
      appSubtitle: "سوئیت فوق‌لوکس مدیریت اکانت و مهاجرت پروژه‌ها",
      tabAccounts: "👤 اکانت‌ها و سهمیه",
      tabMigration: "⇄ مرکز مهاجرت چت‌ها",
      activeAccount: "اکانت فعال جاری",
      saveCurrent: "💾 ذخیره اکانت فعلی",
      savedAccounts: "اکانت‌های ذخیره‌شده",
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
      pro: "پرو",
      ultra: "اولترا",
      free: "معمولی"
    },
    en: {
      appName: "Antigravity Switcher",
      appSubtitle: "Multi-Account & Project Migration Suite",
      tabAccounts: "👤 Accounts & Quota",
      tabMigration: "⇄ Chat & Project Migration",
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
      pro: "PRO",
      ultra: "ULTRA",
      free: "FREE"
    },
    zh: {
      appName: "Antigravity 账号切换器",
      appSubtitle: "多账号管理与项目无缝迁移套件",
      tabAccounts: "👤 账号与配额",
      tabMigration: "⇄ 对话与项目迁移",
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
      pro: "PRO",
      ultra: "ULTRA",
      free: "FREE"
    },
    es: {
      appName: "Antigravity Switcher",
      appSubtitle: "Suite de Cuentas y Migración de Proyectos",
      tabAccounts: "👤 Cuentas y Cuota",
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
      pro: "PRO",
      ultra: "ULTRA",
      free: "GRATIS"
    }
  };

  let swState = {
    activeAccount: null,
    savedAccounts: {},
    conversations: [],
    isLoaded: false,
    isLoading: false
  };
  let swLang = localStorage.getItem('antigravity:switcher_lang') || 'fa';
  let swTab = 'accounts';
  let swSelectedConvs = new Set();
  let swMode = 'copy';
  let swStructure = 'separate';
  let swDualSync = false;
  let swSearch = '';
  let swTargetAccount = '';
  let swIsMigrating = false;
  let swToastTimeout = null;

  function fetchSwitcherState(cb) {
    if (swState.isLoading) return;
    swState.isLoading = true;
    fetch('http://127.0.0.1:39281/api/state')
      .then(r => r.json())
      .then(data => {
        swState.activeAccount = data.activeAccount || null;
        swState.savedAccounts = data.savedAccounts || {};
        swState.conversations = data.conversations || [];
        swState.isLoaded = true;
        swState.isLoading = false;
        if (!swTargetAccount && Object.keys(swState.savedAccounts).length > 0) {
          swTargetAccount = Object.keys(swState.savedAccounts)[0];
        }
        if (typeof renderBadge === 'function') renderBadge();
        const modal = document.getElementById('antigravity-switcher-modal');
        if (modal && modal.classList.contains('aqm-active')) {
          renderSwitcherModal();
        }
        if (cb) cb();
      })
      .catch(err => {
        swState.isLoading = false;
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
    toast.textContent = msg;
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#ffffff';
    toast.style.border = `1px solid ${isError ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'}`;
    toast.classList.add('show');
    if (swToastTimeout) clearTimeout(swToastTimeout);
    swToastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3400);
  }

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
        if (e.key === 'Escape' && modal.classList.contains('aqm-active') && !swIsMigrating) {
          closeSwitcherModal();
        }
      });
    }
    modal.classList.add('aqm-active');
    renderSwitcherModal();
    fetchSwitcherState(() => {
      renderSwitcherModal();
    });
  }

  function closeSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (modal) modal.classList.remove('aqm-active');
  }

  function toggleSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (modal && modal.classList.contains('aqm-active')) {
      closeSwitcherModal();
    } else {
      openSwitcherModal();
    }
  }

  function renderSwitcherModal() {
    const modal = document.getElementById('antigravity-switcher-modal');
    if (!modal) return;

    const theme = getActiveTheme();
    const t = SW_I18N[swLang] || SW_I18N.fa;
    const isFa = (swLang === 'fa');
    const dir = isFa ? 'rtl' : 'ltr';
    const fontFamily = isFa ? "'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif" : "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif";

    const activeAcc = swState.activeAccount || {};
    const email = activeAcc.email || (window.__antigravity_quota && window.__antigravity_quota.email) || 'madgod.cum@gmail.com';
    const name = activeAcc.name || (email ? email.split('@')[0] : 'Madgod');
    const avatar = activeAcc.avatar || '';
    const tier = activeAcc.tier || 'Google AI Pro';
    const tierCode = (activeAcc.tier_code || 'pro').toLowerCase();

    const sess = activeAcc.session || (window.__antigravity_quota && window.__antigravity_quota.session) || {};
    const usedPct = Math.round(sess.used_pct ?? 6);
    const remPct = Math.round(sess.remaining_pct ?? 94);
    const resetsIn = sess.resets_in || '4 hr 20 min';

    const savedKeys = Object.keys(swState.savedAccounts || {});
    const savedCount = savedKeys.length;

    // Filter conversations for Migration tab
    const filteredConvs = (swState.conversations || []).filter(c => {
      if (!swSearch.trim()) return true;
      const q = swSearch.toLowerCase();
      return (c.title && c.title.toLowerCase().includes(q)) || (c.id && c.id.toLowerCase().includes(q));
    });

    modal.innerHTML = `
      <div class="aqm-switcher-sheet" style="background:${theme.isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'};border:1px solid ${theme.cardBorder || 'rgba(255,255,255,0.18)'};backdrop-filter:blur(40px) saturate(190%);-webkit-backdrop-filter:blur(40px) saturate(190%);color:${theme.textColor || '#f8fafc'};font-family:${fontFamily};direction:${dir};">
        
        <!-- Header -->
        <div style="padding:18px 24px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg, #38bdf8, #6366f1);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(99,102,241,0.4);color:#ffffff;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div style="font-size:15px;font-weight:800;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;">
                <span>${t.appName}</span>
                <span style="font-size:9.5px;padding:2px 7px;border-radius:9999px;background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(99,102,241,0.3);font-weight:700;">v2.0 PRO</span>
              </div>
              <div style="font-size:11px;color:${theme.subText || '#94a3b8'};opacity:0.85;">${t.author}</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <!-- Language Pills -->
            <div style="display:flex;padding:3px;border-radius:9999px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.1);">
              <button class="aqm-lang-btn ${swLang === 'fa' ? 'active' : ''}" data-lang="fa" style="background:${swLang === 'fa' ? 'rgba(255,255,255,0.18)' : 'transparent'};border:none;color:${theme.textColor || '#fff'};padding:3px 9px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;">🇮🇷 فا</button>
              <button class="aqm-lang-btn ${swLang === 'en' ? 'active' : ''}" data-lang="en" style="background:${swLang === 'en' ? 'rgba(255,255,255,0.18)' : 'transparent'};border:none;color:${theme.textColor || '#fff'};padding:3px 9px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;">🇺🇸 EN</button>
              <button class="aqm-lang-btn ${swLang === 'zh' ? 'active' : ''}" data-lang="zh" style="background:${swLang === 'zh' ? 'rgba(255,255,255,0.18)' : 'transparent'};border:none;color:${theme.textColor || '#fff'};padding:3px 9px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;">🇨🇳 中</button>
              <button class="aqm-lang-btn ${swLang === 'es' ? 'active' : ''}" data-lang="es" style="background:${swLang === 'es' ? 'rgba(255,255,255,0.18)' : 'transparent'};border:none;color:${theme.textColor || '#fff'};padding:3px 9px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;">🇪🇸 ES</button>
            </div>

            <!-- Close Button -->
            <button id="aqm-sw-modal-close" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:${theme.textColor || '#fff'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;">✕</button>
          </div>
        </div>

        <!-- Segmented Navigation Tabs -->
        <div style="padding:10px 24px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;background:rgba(0,0,0,0.12);flex-shrink:0;">
          <button class="aqm-sw-tab-btn ${swTab === 'accounts' ? 'active' : ''}" id="aqm-tab-btn-accounts" style="color:${theme.textColor || '#fff'};">
            <span>👤</span>
            <span>${t.tabAccounts}</span>
          </button>
          <button class="aqm-sw-tab-btn ${swTab === 'migration' ? 'active' : ''}" id="aqm-tab-btn-migration" style="color:${theme.textColor || '#fff'};">
            <span>⇄</span>
            <span>${t.tabMigration}</span>
            <span style="font-size:9.5px;padding:1px 6px;border-radius:9999px;background:rgba(59,130,246,0.25);color:#60a5fa;border:1px solid rgba(59,130,246,0.4);">${(swState.conversations || []).length}</span>
          </button>
        </div>

        <!-- Content Body (Scrollable) -->
        <div class="aqm-custom-scroll" style="flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px;">
          
          ${swTab === 'accounts' ? `
            <!-- ACTIVE ACCOUNT HERO CARD -->
            <div class="aqm-sw-card" style="background:linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.85));border:1px solid rgba(255,255,255,0.14);box-shadow:0 10px 30px rgba(0,0,0,0.3);">
              
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="position:relative;">
                    ${avatar ? `<img src="${avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #38bdf8;box-shadow:0 0 16px rgba(56,189,248,0.4);" />` : `
                      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, #6366f1, #3b82f6);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;border:2px solid #38bdf8;">${name[0] || 'A'}</div>
                    `}
                    <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#10b981;border:2px solid #0f172a;box-shadow:0 0 8px #10b981;"></div>
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:16px;font-weight:800;letter-spacing:-0.02em;">${name}</span>
                      <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);text-transform:uppercase;">${tier}</span>
                    </div>
                    <div style="font-size:12px;color:${theme.subText || '#94a3b8'};opacity:0.9;" dir="ltr">${email}</div>
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                  <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-save-current-btn">
                    <span>💾</span>
                    <span>${t.saveCurrent}</span>
                  </button>
                  <button class="aqm-sw-btn" id="aqm-sw-refresh-btn" title="${t.refresh}">
                    <span>🔄</span>
                  </button>
                </div>
              </div>

              <!-- Live Quota Gauge -->
              <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:12px 16px;border:1px solid rgba(255,255,255,0.08);margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:12px;">
                  <span style="font-weight:700;display:flex;align-items:center;gap:6px;">
                    <span style="color:#fbbf24;">⚡️</span>
                    <span>Gemini 3.8 Flash & Pro</span>
                  </span>
                  <span style="color:#94a3b8;font-size:11px;">${t.resetsIn} <b style="color:#f8fafc;" dir="ltr">${resetsIn}</b></span>
                </div>
                <div style="height:7px;border-radius:9999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:8px;">
                  <div style="height:100%;width:${remPct}%;background:linear-gradient(90deg, #10b981, #38bdf8);border-radius:9999px;box-shadow:0 0 10px rgba(56,189,248,0.5);"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:${theme.subText || '#94a3b8'};">
                  <span>${remPct}% باقی‌مانده</span>
                  <span>${usedPct}% مصرف‌شده</span>
                </div>
              </div>

              <!-- Models Pool Chips -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:8px;">
                ${((activeAcc.pools && activeAcc.pools.length > 0) ? activeAcc.pools : [
                  { name: 'Gemini 3.8 Flash High', remaining_pct: remPct, resets_in: resetsIn },
                  { name: 'Gemini 3.1 Pro', remaining_pct: remPct, resets_in: resetsIn },
                  { name: 'Claude Sonnet 4.6', remaining_pct: 100, resets_in: '4 hr 59 min' },
                  { name: 'GPT-OSS 120B', remaining_pct: 100, resets_in: '4 hr 59 min' }
                ]).map(p => `
                  <div style="padding:8px 12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:3px;">
                    <span style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</span>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;">
                      <span style="color:#10b981;font-weight:800;" dir="ltr">${p.remaining_pct}%</span>
                      <span dir="ltr">${p.resets_in || ''}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

            </div>

            <!-- SAVED ACCOUNTS LIST -->
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <h3 style="margin:0;font-size:14px;font-weight:800;">${t.savedAccounts}</h3>
                  <span style="font-size:10.5px;padding:2px 7px;border-radius:9999px;background:rgba(255,255,255,0.08);color:#94a3b8;font-weight:700;">${savedCount}</span>
                </div>
                <button class="aqm-sw-btn" id="aqm-sw-add-new-btn" style="padding:5px 12px;font-size:11.5px;">
                  <span>➕</span>
                  <span>${t.addNewAccount}</span>
                </button>
              </div>

              ${savedCount === 0 ? `
                <div class="aqm-sw-card" style="text-align:center;padding:28px 20px;border-style:dashed;">
                  <div style="font-size:32px;margin-bottom:8px;">💾</div>
                  <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${t.noSavedAccounts}</div>
                  <div style="font-size:11.5px;color:#94a3b8;margin-bottom:14px;">با ذخیره کردن اکانت، می‌توانید هر زمان که بخواهید با یک کلیک بین اکانت‌ها جابجا شوید.</div>
                  <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-save-current-empty-btn">
                    <span>💾</span>
                    <span>${t.saveCurrent}</span>
                  </button>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${savedKeys.map(k => {
                    const acc = swState.savedAccounts[k];
                    const isCur = (acc.email && acc.email.toLowerCase() === email.toLowerCase());
                    return `
                      <div class="aqm-sw-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;${isCur ? 'border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.04);' : ''}">
                        <div style="display:flex;align-items:center;gap:12px;">
                          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;border:1px solid rgba(255,255,255,0.15);">
                            ${(acc.email || k)[0].toUpperCase()}
                          </div>
                          <div>
                            <div style="display:flex;align-items:center;gap:8px;">
                              <span style="font-size:13px;font-weight:700;" dir="ltr">${acc.email || k}</span>
                              <span style="font-size:9.5px;padding:1px 6px;border-radius:9999px;background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);text-transform:uppercase;">${acc.tier || 'PRO'}</span>
                              ${isCur ? `<span style="font-size:9.5px;padding:1px 6px;border-radius:9999px;background:rgba(16,185,129,0.2);color:#10b981;font-weight:800;">فعال</span>` : ''}
                            </div>
                            <div style="font-size:11px;color:#94a3b8;">${acc.name || ''} ${acc.saved_at ? `• ذخیره: ${acc.saved_at.split(' ')[0]}` : ''}</div>
                          </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:8px;">
                          ${!isCur ? `
                            <button class="aqm-sw-btn aqm-sw-btn-primary" data-action="switch" data-acc="${k}" style="padding:6px 12px;font-size:11px;">
                              <span>⚡️</span>
                              <span>${t.switchNow}</span>
                            </button>
                          ` : ''}
                          <button class="aqm-sw-btn" data-action="prep-migrate" data-acc="${k}" title="مهاجرت به این اکانت" style="padding:6px 10px;font-size:11px;">
                            <span>⇄</span>
                          </button>
                          <button class="aqm-sw-btn" data-action="delete" data-acc="${k}" title="${t.deleteAccount}" style="padding:6px 10px;font-size:11px;color:#ef4444;">
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : `
            <!-- MIGRATION HUB TAB -->
            <div style="display:flex;flex-direction:column;gap:14px;">
              
              <!-- Notice Card -->
              <div class="aqm-sw-card" style="background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.25);padding:14px 18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <span style="font-size:20px;">🚀</span>
                  <div style="font-size:13.5px;font-weight:800;color:#60a5fa;">${t.tabMigration}</div>
                </div>
                <div style="font-size:11.5px;color:#cbd5e1;line-height:1.6;">
                  انتقال، کپی ایمن، یا تجمیع پروژه‌ها، گفت‌وگوهای ایجنت، و دیتابیس‌های سشن بین اکانت‌های گوگل با حفظ ۱۰۰٪ کامل داده‌ها و آرتیفکت‌های مغز ایجنت (Brain).
                </div>
              </div>

              <!-- Options Grid -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                
                <!-- Target Account Dropdown -->
                <div class="aqm-sw-card" style="padding:14px;">
                  <label style="font-size:12px;font-weight:800;margin-bottom:8px;display:block;">${t.targetAccount}</label>
                  <select id="aqm-sw-target-select" style="width:100%;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:12px;outline:none;" dir="ltr">
                    ${savedKeys.length > 0 ? savedKeys.map(k => `
                      <option value="${k}" ${k === swTargetAccount ? 'selected' : ''}>${swState.savedAccounts[k].email || k} (${swState.savedAccounts[k].tier || 'Pro'})</option>
                    `).join('') : `
                      <option value="">ابتدا یک اکانت مقصد در تب اکانت‌ها ذخیره کنید</option>
                    `}
                  </select>
                </div>

                <!-- Transfer Mode -->
                <div class="aqm-sw-card" style="padding:14px;">
                  <label style="font-size:12px;font-weight:800;margin-bottom:8px;display:block;">${t.transferMode}</label>
                  <div style="display:flex;gap:6px;">
                    <button class="aqm-sw-btn ${swMode === 'copy' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-mode-copy" style="flex:1;padding:7px 8px;font-size:11px;">
                      <span>🛡️</span>
                      <span>کپی ایمن</span>
                    </button>
                    <button class="aqm-sw-btn ${swMode === 'move' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-mode-move" style="flex:1;padding:7px 8px;font-size:11px;">
                      <span>✂️</span>
                      <span>انتقال و برش</span>
                    </button>
                  </div>
                </div>

                <!-- Structure Mode -->
                <div class="aqm-sw-card" style="padding:14px;">
                  <label style="font-size:12px;font-weight:800;margin-bottom:8px;display:block;">${t.structureMode}</label>
                  <div style="display:flex;gap:6px;">
                    <button class="aqm-sw-btn ${swStructure === 'separate' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-struct-sep" style="flex:1;padding:7px 8px;font-size:11px;">
                      <span>📁</span>
                      <span>پروژه‌های مجزا</span>
                    </button>
                    <button class="aqm-sw-btn ${swStructure === 'merge' ? 'aqm-sw-btn-primary' : ''}" id="aqm-sw-struct-merge" style="flex:1;padding:7px 8px;font-size:11px;">
                      <span>🔗</span>
                      <span>ادغام پروژه‌ها</span>
                    </button>
                  </div>
                </div>

                <!-- Dual-Sync -->
                <div class="aqm-sw-card" style="padding:14px;display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <div style="font-size:12px;font-weight:800;margin-bottom:2px;">همگام‌سازی دوطرفه</div>
                    <div style="font-size:10.5px;color:#94a3b8;">سینک تغییرات آتی در هر دو حساب</div>
                  </div>
                  <input type="checkbox" id="aqm-sw-dual-sync" ${swDualSync ? 'checked' : ''} style="width:18px;height:18px;accent-color:#3b82f6;cursor:pointer;" />
                </div>

              </div>

              <!-- Conversation Selector List -->
              <div class="aqm-sw-card" style="padding:16px;">
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px;">
                  <input type="text" id="aqm-sw-search-input" value="${swSearch}" placeholder="${t.searchPlaceholder}" style="flex:1;padding:8px 14px;border-radius:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:12px;outline:none;" />
                  <button class="aqm-sw-btn" id="aqm-sw-select-all-btn" style="padding:7px 12px;font-size:11px;">
                    ${swSelectedConvs.size === filteredConvs.length && filteredConvs.length > 0 ? t.deselectAll : t.selectAll} (${swSelectedConvs.size})
                  </button>
                </div>

                <div class="aqm-custom-scroll" style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
                  ${filteredConvs.length === 0 ? `
                    <div style="text-align:center;padding:24px;color:#94a3b8;font-size:12px;">هیچ مکالمه‌ای یافت نشد.</div>
                  ` : filteredConvs.map(c => {
                    const isChecked = swSelectedConvs.has(c.id);
                    return `
                      <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:${isChecked ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isChecked ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.05)'};cursor:pointer;transition:all 0.15s;">
                        <input type="checkbox" data-cid="${c.id}" class="aqm-conv-checkbox" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;" />
                        <div style="flex:1;overflow:hidden;">
                          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.title || c.id}</div>
                          <div style="font-size:10px;color:#94a3b8;display:flex;gap:10px;">
                            <span dir="ltr">${c.last_modified || ''}</span>
                            <span>${c.size_kb} KB</span>
                            ${c.has_brain ? `<span style="color:#a855f7;">• Brain: فعال</span>` : ''}
                          </div>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>

              </div>

              <!-- Start Migration Button -->
              <button class="aqm-sw-btn aqm-sw-btn-primary" id="aqm-sw-start-migration-btn" style="padding:12px;font-size:13px;border-radius:14px;box-shadow:0 6px 20px rgba(59,130,246,0.4);" ${swIsMigrating ? 'disabled' : ''}>
                <span>${swIsMigrating ? '⏳' : '🚀'}</span>
                <span>${swIsMigrating ? t.migrating : `${t.startMigration} (${swSelectedConvs.size} مکالمه)`}</span>
              </button>

            </div>
          `}

        </div>

        <!-- Footer -->
        <div style="padding:12px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:${theme.subText || '#94a3b8'};background:rgba(0,0,0,0.15);flex-shrink:0;">
          <div>
            <span>${t.author} • </span>
            <a href="https://github.com/Madgod-xyz/antigravity-account-switcher" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:700;">GitHub Repository</a>
          </div>
          <div style="opacity:0.8;">iOS Liquid Glass Engine</div>
        </div>

      </div>
    `;

    // Wire Event Listeners
    const closeBtn = modal.querySelector('#aqm-sw-modal-close');
    if (closeBtn) closeBtn.onclick = closeSwitcherModal;

    modal.querySelectorAll('.aqm-lang-btn').forEach(btn => {
      btn.onclick = () => {
        const lang = btn.getAttribute('data-lang');
        swLang = lang;
        try { localStorage.setItem('antigravity:switcher_lang', lang); } catch(e){}
        renderSwitcherModal();
      };
    });

    const tabAcc = modal.querySelector('#aqm-tab-btn-accounts');
    if (tabAcc) tabAcc.onclick = () => { swTab = 'accounts'; renderSwitcherModal(); };
    const tabMig = modal.querySelector('#aqm-tab-btn-migration');
    if (tabMig) tabMig.onclick = () => { swTab = 'migration'; renderSwitcherModal(); };

    // Accounts tab actions
    const saveCurBtn = modal.querySelector('#aqm-sw-save-current-btn') || modal.querySelector('#aqm-sw-save-current-empty-btn');
    if (saveCurBtn) {
      saveCurBtn.onclick = () => {
        saveCurBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { saveCurBtn.style.transform = ''; }, 150);
        showSwitcherToast('در حال ذخیره اکانت...');
        fetch('http://127.0.0.1:39281/api/save', { method: 'POST' })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              showSwitcherToast(t.accountSaved || 'اکانت با موفقیت ذخیره شد!');
              fetchSwitcherState(() => { renderSwitcherModal(); });
            } else {
              showSwitcherToast(res.error || 'خطا در ذخیره اکانت', true);
            }
          })
          .catch(err => {
            showSwitcherToast('ارتباط با دیمن برقرار نشد', true);
          });
      };
    }

    const refreshBtn = modal.querySelector('#aqm-sw-refresh-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        refreshBtn.style.transform = 'rotate(180deg)';
        setTimeout(() => { refreshBtn.style.transform = ''; }, 300);
        fetchSwitcherState(() => {
          showSwitcherToast('سهمیه و اکانت‌ها به‌روزرسانی شدند');
          renderSwitcherModal();
        });
      };
    }

    const addNewBtn = modal.querySelector('#aqm-sw-add-new-btn');
    if (addNewBtn) {
      addNewBtn.onclick = () => {
        if (confirm('آیا مایل به خروج از حساب فعلی جهت ورود با اکانت جدید هستید؟')) {
          showSwitcherToast('در حال خروج...');
          fetch('http://127.0.0.1:39281/api/logout', { method: 'POST' });
        }
      };
    }

    // Saved accounts click actions
    modal.querySelectorAll('[data-action="switch"]').forEach(b => {
      b.onclick = () => {
        const accKey = b.getAttribute('data-acc');
        showSwitcherToast(t.switching || 'در حال اعمال اکانت و راه‌اندازی مجدد...');
        fetch('http://127.0.0.1:39281/api/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountKey: accKey })
        });
      };
    });

    modal.querySelectorAll('[data-action="prep-migrate"]').forEach(b => {
      b.onclick = () => {
        swTargetAccount = b.getAttribute('data-acc');
        swTab = 'migration';
        renderSwitcherModal();
      };
    });

    modal.querySelectorAll('[data-action="delete"]').forEach(b => {
      b.onclick = () => {
        const accKey = b.getAttribute('data-acc');
        if (confirm(`آیا از حذف اکانت ${accKey} مطمئن هستید؟`)) {
          fetch('http://127.0.0.1:39281/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountKey: accKey })
          }).then(() => {
            showSwitcherToast('اکانت حذف شد.');
            fetchSwitcherState(() => { renderSwitcherModal(); });
          });
        }
      };
    });

    // Migration tab actions
    const targetSelect = modal.querySelector('#aqm-sw-target-select');
    if (targetSelect) {
      targetSelect.onchange = () => { swTargetAccount = targetSelect.value; };
    }

    const modeCopyBtn = modal.querySelector('#aqm-sw-mode-copy');
    if (modeCopyBtn) {
      modeCopyBtn.onclick = () => { swMode = 'copy'; renderSwitcherModal(); };
    }
    const modeMoveBtn = modal.querySelector('#aqm-sw-mode-move');
    if (modeMoveBtn) {
      modeMoveBtn.onclick = () => { swMode = 'move'; renderSwitcherModal(); };
    }

    const structSepBtn = modal.querySelector('#aqm-sw-struct-sep');
    if (structSepBtn) {
      structSepBtn.onclick = () => { swStructure = 'separate'; renderSwitcherModal(); };
    }
    const structMergeBtn = modal.querySelector('#aqm-sw-struct-merge');
    if (structMergeBtn) {
      structMergeBtn.onclick = () => { swStructure = 'merge'; renderSwitcherModal(); };
    }

    const dualSyncCheck = modal.querySelector('#aqm-sw-dual-sync');
    if (dualSyncCheck) {
      dualSyncCheck.onchange = () => { swDualSync = dualSyncCheck.checked; };
    }

    const searchInput = modal.querySelector('#aqm-sw-search-input');
    if (searchInput) {
      searchInput.oninput = () => {
        swSearch = searchInput.value;
        renderSwitcherModal();
        const freshInput = modal.querySelector('#aqm-sw-search-input');
        if (freshInput) {
          freshInput.focus();
          freshInput.setSelectionRange(freshInput.value.length, freshInput.value.length);
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
      cb.onchange = () => {
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
          showSwitcherToast('لطفاً حداقل یک مکالمه را انتخاب کنید', true);
          return;
        }
        if (!swTargetAccount) {
          showSwitcherToast('لطفاً اکانت مقصد را انتخاب کنید', true);
          return;
        }

        swIsMigrating = true;
        renderSwitcherModal();
        showSwitcherToast(t.migrating);

        fetch('http://127.0.0.1:39281/api/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationIds: Array.from(swSelectedConvs),
            sourceAccount: email,
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
            showSwitcherToast(`${t.migrationDone} (${res.migrated_count} پروژه منتقل شد)`);
            swSelectedConvs.clear();
            fetchSwitcherState(() => { renderSwitcherModal(); });
          } else {
            showSwitcherToast(res.error || 'خطا در مهاجرت چت‌ها', true);
            renderSwitcherModal();
          }
        })
        .catch(err => {
          swIsMigrating = false;
          showSwitcherToast('ارتباط با دیمن مهاجرت برقرار نشد', true);
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
      if (svg) trigger.insertBefore(badge, svg);
      else trigger.appendChild(badge);
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
    const sessUsed = Math.round(currentUsage.session?.used_pct ?? 28);
    const sessRem = Math.round(currentUsage.session?.remaining_pct ?? (100 - sessUsed));
    const sessReset = currentUsage.session?.resets_in || '2 hr 4 min';

    const weekUsed = Math.round(currentUsage.weekly?.used_pct ?? 27);
    const weekRem = Math.round(currentUsage.weekly?.remaining_pct ?? (100 - weekUsed));

    const badgeSess = isRem ? sessRem : sessUsed;
    const badgeWeek = isRem ? weekRem : weekUsed;

    const titleTooltip = `Gemini Quota HUD\n• 5-Hour: ${sessRem}% Remaining (${sessUsed}% Used)\n• Weekly: ${weekRem}% Remaining (${weekUsed}% Used)\n• Resets in: ${sessReset}\nClick to view full HUD`;

    badge.title = titleTooltip;
    badge.innerHTML = `
      <span style="width:5.5px;height:5.5px;border-radius:50%;background:${theme.dotColor};box-shadow:0 0 7px ${theme.dotColor};animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
      <span dir="ltr">${badgeSess}%</span>
      <span style="opacity:0.35;font-weight:400;margin:0 1px;">|</span>
      <span style="opacity:0.85;font-size:10px;font-weight:600;" dir="ltr">W: ${badgeWeek}%</span>
    `;

    pill.title = titleTooltip;
    pill.innerHTML = `
      <span style="width:5.5px;height:5.5px;border-radius:50%;background:${theme.dotColor};box-shadow:0 0 7px ${theme.dotColor};animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
      <span class="${isRefreshing ? 'aqm-rotating' : ''}" style="color:${theme.id === 'pastel' ? '#ff70a6' : '#fbbf24'};display:flex;align-items:center;filter:drop-shadow(0 0 5px ${theme.id === 'pastel' ? 'rgba(255,112,166,0.6)' : 'rgba(251,191,36,0.6)'});">
        ${theme.id === 'pastel' ? '🌸' : SVGS.lightning}
      </span>
      <span style="letter-spacing:-0.02em;" dir="ltr">${badgeSess}%</span>
      <span style="opacity:0.75;font-size:10px;font-weight:500;font-family:${fontFa};">(${sessReset})</span>
    `;

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

    const accUser = swState.activeAccount || {};
    const accEmail = accUser.email || currentUsage.email || 'madgod.cum@gmail.com';
    const accName = accUser.name || (accEmail ? accEmail.split('@')[0] : 'Madgod');
    const accAvatar = accUser.avatar || '';
    const accTier = accUser.tier || 'Google AI Pro';
    const accTierCode = (accUser.tier_code || 'pro').toLowerCase();

    const tierBadgeBg = accTierCode === 'ultra' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : (accTierCode === 'pro' ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.35))' : 'rgba(148,163,184,0.15)');
    const tierBadgeColor = accTierCode === 'ultra' ? '#ffffff' : (accTierCode === 'pro' ? '#fbbf24' : '#94a3b8');
    const tierBadgeBorder = accTierCode === 'ultra' ? 'rgba(236,72,153,0.5)' : (accTierCode === 'pro' ? 'rgba(251,191,36,0.45)' : 'rgba(148,163,184,0.25)');

    accPill.title = `اکانت فعال: ${accEmail} (${accTier})\nبرای سوئیچ اکانت یا جابجایی پروژه‌ها کلیک کنید`;
    accPill.innerHTML = `
      <span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;animation:aqm-pulse-dot 2s infinite ease-in-out;"></span>
      ${accAvatar ? `<img src="${accAvatar}" style="width:17px;height:17px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.3);" />` : `<span style="font-size:11px;">⚡️</span>`}
      <span style="letter-spacing:-0.01em;font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" dir="ltr">${accName}</span>
      <span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:9999px;background:${tierBadgeBg};color:${tierBadgeColor};border:1px solid ${tierBadgeBorder};text-transform:uppercase;letter-spacing:0.02em;">${accTierCode.toUpperCase()}</span>
      <span style="font-size:8px;opacity:0.6;margin-left:1px;">▼</span>
    `;

    accPill.onclick = (e) => {
      e.stopPropagation();
      toggleSwitcherModal();
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
    if (activeTaskPollingInterval) return;
    const pill = document.getElementById('antigravity-usage-pill');
    if (pill) pill.classList.add('aqm-task-active');

    refreshQuota();
    activeTaskPollingInterval = setInterval(() => {
      const stopBtn = document.querySelector('button[aria-label*="Stop execution"], button[aria-label*="Cancel"]');
      if (!stopBtn) {
        stopActiveTaskPolling();
        return;
      }
      refreshQuota();
    }, 3500);
  }

  function stopActiveTaskPolling() {
    if (activeTaskPollingInterval) {
      clearInterval(activeTaskPollingInterval);
      activeTaskPollingInterval = null;
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
      applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
      renderBadge();
      renderPopover();
    }
  };
  window.__toggleFullAppTheming = (enabled) => {
    isFullAppThemingEnabled = !!enabled;
    try { localStorage.setItem('antigravity:full_app_theming', String(isFullAppThemingEnabled)); } catch (e) {}
    applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
    renderPopover();
  };
  window.__toggleAntigravityPrivacyMode = (enabled) => {
    isPrivacyMode = (typeof enabled === 'boolean') ? enabled : !isPrivacyMode;
    try { localStorage.setItem('antigravity:privacy_mode', String(isPrivacyMode)); } catch (e) {}
    renderPopover();
  };
  window.__setAntigravityFont = (en, fa) => {
    if (en) { customFontEn = en; try { localStorage.setItem('antigravity:custom_font_en', en); } catch(e){} }
    if (fa) { customFontFa = fa; try { localStorage.setItem('antigravity:custom_font_fa', fa); } catch(e){} }
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
    ensureFontLoaded(name);
    applyAppWorkspaceTheme(getActiveTheme(), isFullAppThemingEnabled);
    renderBadge();
    renderPopover();
  };

  // Smart RTL Global API & Exports
  window.updateDir = updateDir;
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
  fetchStoredQuota().then(() => {
    renderBadge();
    refreshQuota();
  });
  renderBadge();
})();
