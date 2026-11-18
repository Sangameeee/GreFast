/**
 * ============================================================================
 * GRE Verbal Mastery Suite • Google AdSense & Ads Engine
 * Lightweight, production-ready ad manager with Google AdSense support.
 * (Subscription / Ad-Free upgrade features can be toggled on later when needed)
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // --- CONFIGURATION ---
  const CONFIG = {
    // 1. Ads Master Toggle:
    adsEnabled: false,

    // 2. Google AdSense Publisher ID:
    // When you get your approved AdSense ID (e.g. 'ca-pub-1234567890123456'), paste it here:
    googleAdSenseClient: '',

    // 3. Optional Ad Unit Slot IDs (from your AdSense console):
    adSlots: {
      leaderboard: '', // Top & bottom horizontal banners
      sidebar: '',     // Side column ads
      inline: ''       // In-content quiz slots
    },

    // 4. Subscription / Ad-Free feature toggle (keep false for now):
    // Set to true later in Phase 3 if visitors ask for paid ad removal or memberships!
    subscriptionEnabled: false,

    // Storage Key (if subscription enabled in future)
    storageKey: 'gre_verbal_pro_status_v1',
  };

  // --- STATE HELPERS ---
  function isProUser() {
    if (!CONFIG.subscriptionEnabled) return false;
    try {
      const data = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
      return Boolean(data && data.isPro);
    } catch (e) {
      return false;
    }
  }

  // --- ADSENSE SCRIPT LOADER ---
  function loadAdSenseScript() {
    if (!CONFIG.adsEnabled || !CONFIG.googleAdSenseClient || !CONFIG.googleAdSenseClient.startsWith('ca-pub-')) {
      return;
    }
    // Prevent duplicate injection
    if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CONFIG.googleAdSenseClient}`;
    document.head.appendChild(script);
  }

  // --- AD UNITS INITIALIZATION ---
  function initAdContainers() {
    if (!CONFIG.adsEnabled || isProUser()) {
      document.querySelectorAll('.gre-ad-container, [data-gre-ad]').forEach(el => {
        el.style.display = 'none';
      });
      return;
    }

    const containers = document.querySelectorAll('.gre-ad-container, [data-gre-ad]');
    const isLiveAdSense = Boolean(CONFIG.googleAdSenseClient && CONFIG.googleAdSenseClient.startsWith('ca-pub-'));

    containers.forEach(container => {
      if (container.dataset.adInitialized) return;
      container.dataset.adInitialized = 'true';

      const adType = container.dataset.adType || 'leaderboard';

      if (isLiveAdSense) {
        // Live Google AdSense Unit
        container.innerHTML = `
          <div class="gre-ad-header">
            <span class="gre-ad-label">Advertisement</span>
          </div>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="${CONFIG.googleAdSenseClient}"
               data-ad-slot="${CONFIG.adSlots[adType] || ''}"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        `;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          // Script still loading or ad-blocker present
        }
      } else {
        // Clean Academic Partner / Educational Placeholder (Before AdSense is active)
        container.innerHTML = `
          <div class="gre-ad-header">
            <span class="gre-ad-label">Sponsored Resource</span>
          </div>
          <div class="gre-ad-fallback">
            <div class="gre-ad-fallback-content">
              <div class="gre-ad-fallback-title">
                <span>📚 Complete ETS Big Book & GregMat Preparation Hub</span>
              </div>
              <p class="gre-ad-fallback-desc">
                Practice all 27 ETS Big Book Tests (378 TC Questions, 108 Reading Passages) and GregMat 34 Groups Vocabulary with smart timers and instant analytics.
              </p>
            </div>
          </div>
        `;
      }
    });
  }

  // --- INITIALIZATION ---
  function init() {
    loadAdSenseScript();
    initAdContainers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global controller
  window.GRE_ADS = {
    config: CONFIG,
    setAdSenseClient: (clientId) => {
      CONFIG.googleAdSenseClient = clientId;
      loadAdSenseScript();
      initAdContainers();
    },
    refresh: initAdContainers
  };

})(window, document);
