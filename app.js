/**
 * GRE Vocab Master - 34 Groups + Custom Big Book Words Application Logic
 * Full Keyboard Support (A/D, Left/Right, 1/2/3, Space),
 * 1-2-3 Rating System (Green, Orange, Red),
 * Dedicated Rated Words Practice, Cross-Group Synonyms, Custom Words Deck, LocalStorage
 */

(function () {
  'use strict';

  // ================= State & Storage Keys =================
  const STORAGE_KEY_RATINGS = 'gre_vocab_ratings_v1';
  const STORAGE_KEY_THEME = 'gre_vocab_theme_v1';
  const STORAGE_KEY_SETTINGS = 'gre_vocab_settings_v1';
  const STORAGE_KEY_CUSTOM_WORDS = 'gre_vocab_custom_words_v1';

  let ratings = {}; // { [cardId]: 1 | 2 | 3 }
  let customWords = []; // [ { id, word, definition, notes, group: 'Custom' } ]
  let activeGroup = 1; // 1 to 34, 'all', or 'custom'
  let currentDeck = [];
  let currentIndex = 0;
  let isFlipped = false;
  let isShuffled = false;
  let autoAdvance = true;
  let focusMode = false;
  let activeTab = 'flashcards';

  // Rated Practice Tab State
  let ratedFilter = '3'; // '3' | '2' | '1' | 'hard' | 'all'
  let ratedScope = 'current'; // 'current' | 'all'

  // Similar Words State
  let synMode = 'cross'; // 'cross' (All 34 groups universal) | 'group' (within active group)
  let synSearchQuery = '';

  // Directory Search State
  let searchQuery = '';
  let searchRatingFilter = 'all';

  // Custom Words Search State
  let customSearchQuery = '';

  // ================= DOM Elements =================
  const groupSelect = document.getElementById('groupSelect');
  const countGreen = document.getElementById('countGreen');
  const countOrange = document.getElementById('countOrange');
  const countRed = document.getElementById('countRed');
  const countUnrated = document.getElementById('countUnrated');

  const btnToggleShuffle = document.getElementById('btnToggleShuffle');
  const btnToggleAutoAdvance = document.getElementById('btnToggleAutoAdvance');

  // View Flashcards
  const cardCounterText = document.getElementById('cardCounterText');
  const groupProgressPercent = document.getElementById('groupProgressPercent');
  const progSegGreen = document.getElementById('progSegGreen');
  const progSegOrange = document.getElementById('progSegOrange');
  const progSegRed = document.getElementById('progSegRed');
  const progSegUnrated = document.getElementById('progSegUnrated');

  const flashcard = document.getElementById('flashcard');
  const vocabWordFront = document.getElementById('vocabWordFront');
  const vocabWordBack = document.getElementById('vocabWordBack');
  const vocabDefinition = document.getElementById('vocabDefinition');
  const cardGroupTagFront = document.getElementById('cardGroupTagFront');
  const cardGroupTagBack = document.getElementById('cardGroupTagBack');
  const cardMultiDefBadgeFront = document.getElementById('cardMultiDefBadgeFront');
  const cardMultiDefBadgeBack = document.getElementById('cardMultiDefBadgeBack');
  const cardRatingBadgeFront = document.getElementById('cardRatingBadgeFront');
  const cardRatingBadgeBack = document.getElementById('cardRatingBadgeBack');
  const backSynonymChips = document.getElementById('backSynonymChips');

  const btnSpeak = document.getElementById('btnSpeak');
  const btnRate1 = document.getElementById('btnRate1');
  const btnRate2 = document.getElementById('btnRate2');
  const btnRate3 = document.getElementById('btnRate3');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnFlip = document.getElementById('btnFlip');

  // Navigation Tabs & Views
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const viewFlashcards = document.getElementById('viewFlashcards');
  const viewRatedPractice = document.getElementById('viewRatedPractice');
  const viewSimilarClusters = document.getElementById('viewSimilarClusters');
  const viewCustomWords = document.getElementById('viewCustomWords');
  const viewDirectory = document.getElementById('viewDirectory');

  // Rated Practice View Elements
  const ratedScopeSelect = document.getElementById('ratedScopeSelect');
  const ratedFilterBtns = document.querySelectorAll('.filter-tab-pill');
  const ratedWordsGrid = document.getElementById('ratedWordsGrid');
  const filterCount3 = document.getElementById('filterCount3');
  const filterCount2 = document.getElementById('filterCount2');
  const filterCount1 = document.getElementById('filterCount1');
  const filterCountHard = document.getElementById('filterCountHard');
  const filterCountAll = document.getElementById('filterCountAll');

  // Clusters View Elements
  const clustersGroupTitle = document.getElementById('clustersGroupTitle');
  const clustersHeroDesc = document.getElementById('clustersHeroDesc');
  const clustersGrid = document.getElementById('clustersGrid');
  const btnSynModeCross = document.getElementById('btnSynModeCross');
  const btnSynModeGroup = document.getElementById('btnSynModeGroup');
  const synSearchInput = document.getElementById('synSearchInput');

  // Custom Words View Elements
  const btnPracticeCustomDeck = document.getElementById('btnPracticeCustomDeck');
  const customWordsDeckCount = document.getElementById('customWordsDeckCount');
  const customListTotalCount = document.getElementById('customListTotalCount');
  const customWordForm = document.getElementById('customWordForm');
  const customInputWord = document.getElementById('customInputWord');
  const customInputDef = document.getElementById('customInputDef');
  const customInputNotes = document.getElementById('customInputNotes');
  const customSearchInput = document.getElementById('customSearchInput');
  const customWordsGrid = document.getElementById('customWordsGrid');

  // Directory Elements
  const dirSearchInput = document.getElementById('dirSearchInput');
  const dirRatingFilter = document.getElementById('dirRatingFilter');
  const directoryTableBody = document.getElementById('directoryTableBody');

  // Modals
  const gridModal = document.getElementById('gridModal');
  const btnOpenGridModal = document.getElementById('btnOpenGridModal');
  const btnCloseGridModal = document.getElementById('btnCloseGridModal');
  const modalCardNavGrid = document.getElementById('modalCardNavGrid');
  const modalDeckTitle = document.getElementById('modalDeckTitle');

  const settingsModal = document.getElementById('settingsModal');
  const btnResetModal = document.getElementById('btnResetModal');
  const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
  const globalCount1 = document.getElementById('globalCount1');
  const globalCount2 = document.getElementById('globalCount2');
  const globalCount3 = document.getElementById('globalCount3');
  const globalCount0 = document.getElementById('globalCount0');
  const btnResetCurrentGroup = document.getElementById('btnResetCurrentGroup');
  const btnResetAllGroups = document.getElementById('btnResetAllGroups');
  const btnExportRatings = document.getElementById('btnExportRatings');
  const btnImportRatings = document.getElementById('btnImportRatings');
  const importFileInput = document.getElementById('importFileInput');

  // Theme
  const btnThemeToggle = document.getElementById('btnThemeToggle');

  // Focus Mode
  const btnFocusModeToggle = document.getElementById('btnFocusModeToggle');
  const btnExitFocusMode = document.getElementById('btnExitFocusMode');

  // ================= Init =================
  function init() {
    loadRatings();
    loadCustomWords();
    loadTheme();
    loadSettings();
    populateGroupSelector();
    buildCurrentDeck();
    bindEvents();
    renderCurrentCard();
    updateGroupStats();
  }

  // ================= LocalStorage Management =================
  function loadRatings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RATINGS);
      if (saved) ratings = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load ratings:', e);
      ratings = {};
    }
  }

  function saveRatings() {
    try {
      localStorage.setItem(STORAGE_KEY_RATINGS, JSON.stringify(ratings));
    } catch (e) {
      console.error('Failed to save ratings:', e);
    }
  }

  function loadCustomWords() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS);
      if (saved) {
        customWords = JSON.parse(saved);
      } else {
        // Seed with 5 famous GRE Big Book high-frequency words
        customWords = [
          {
            id: 'custom_seed_1',
            word: 'prevaricate',
            definition: 'speak or act in an evasive way so as to avoid telling the truth; equivocate',
            notes: 'Big Book Classic • Syn: equivocate, hedge, quibble',
            group: 'Custom'
          },
          {
            id: 'custom_seed_2',
            word: 'perfidious',
            definition: 'deceitful and untrustworthy; guilty of treachery or breach of faith',
            notes: 'Big Book Test 2 • Syn: treacherous, traitorous, duplicitous',
            group: 'Custom'
          },
          {
            id: 'custom_seed_3',
            word: 'chary',
            definition: 'cautiously or suspiciously reluctant to do something; wary and cautious',
            notes: 'Big Book Analogies • Syn: circumspect, wary, hesitant',
            group: 'Custom'
          },
          {
            id: 'custom_seed_4',
            word: 'exculpate',
            definition: 'show or declare that someone is not guilty of wrongdoing; exonerate',
            notes: 'Big Book Sentence Equivalence • Syn: exonerate, absolve, vindicate',
            group: 'Custom'
          },
          {
            id: 'custom_seed_5',
            word: 'inchoate',
            definition: 'just begun and so not fully formed or developed; rudimentary or rudimentary',
            notes: 'Big Book Reading Comp • Syn: rudimentary, incipient, embryonic',
            group: 'Custom'
          }
        ];
        saveCustomWords();
      }
    } catch (e) {
      console.error('Failed to load custom words:', e);
      customWords = [];
    }
  }

  function saveCustomWords() {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWords));
      updateCustomDeckCounters();
    } catch (e) {
      console.error('Failed to save custom words:', e);
    }
  }

  function updateCustomDeckCounters() {
    if (customWordsDeckCount) customWordsDeckCount.textContent = customWords.length;
    if (customListTotalCount) customListTotalCount.textContent = customWords.length;
  }

  function updateThemeIcon() {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      btn.title = 'Switch to Light Theme';
      btn.setAttribute('aria-label', 'Switch to Light Theme');
      btn.innerHTML = `<svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    } else {
      btn.title = 'Switch to Dark Theme';
      btn.setAttribute('aria-label', 'Switch to Dark Theme');
      btn.innerHTML = `<svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    }
    updateThemeIcon();
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.autoAdvance !== undefined) {
          autoAdvance = s.autoAdvance;
          btnToggleAutoAdvance.classList.toggle('active', autoAdvance);
        }
        if (s.focusMode !== undefined) {
          focusMode = s.focusMode;
          applyFocusMode(false); // apply without animation on load
        }
      }
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ autoAdvance, focusMode }));
    } catch (e) {}
  }

  // ================= Focus Mode =================
  function toggleFocusMode() {
    focusMode = !focusMode;
    applyFocusMode(true);
    saveSettings();
    // Close settings modal if open so user immediately sees the effect
    settingsModal.classList.remove('open');
  }

  function applyFocusMode(animate) {
    document.body.classList.toggle('focus-mode', focusMode);
    if (btnFocusModeToggle) {
      btnFocusModeToggle.classList.toggle('active', focusMode);
      btnFocusModeToggle.setAttribute('aria-checked', focusMode ? 'true' : 'false');
    }
  }

  // ================= Group Selector Setup =================
  function populateGroupSelector() {
    groupSelect.innerHTML = '';
    
    // Groups 1 through 34
    VOCAB_DATA.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.group;
      opt.textContent = `${g.title} (30 words)`;
      groupSelect.appendChild(opt);
    });

    // Custom Words (Big Book) option
    const optCustom = document.createElement('option');
    optCustom.value = 'custom';
    optCustom.textContent = `📖 Custom Words (Big Book) [${customWords.length}]`;
    groupSelect.appendChild(optCustom);

    // All Groups combined option
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = '🌟 All 34 Groups (1,020 Words)';
    groupSelect.appendChild(optAll);

    groupSelect.value = activeGroup;
  }

  // ================= Deck Builder =================
  function buildCurrentDeck() {
    let rawCards = [];

    if (activeGroup === 'custom') {
      rawCards = customWords.map(cw => ({
        id: cw.id,
        word: cw.word,
        definition: cw.definition,
        notes: cw.notes || '',
        group: 'Big Book'
      }));
    } else if (activeGroup === 'all') {
      VOCAB_DATA.forEach(g => {
        rawCards = rawCards.concat(g.cards);
      });
    } else {
      const gObj = VOCAB_DATA.find(g => g.group === parseInt(activeGroup, 10));
      if (gObj) {
        rawCards = [...gObj.cards];
      }
    }

    if (rawCards.length === 0 && activeGroup === 'custom') {
      rawCards = [{
        id: 'empty_custom',
        word: 'No Custom Words Yet',
        definition: 'Click "Custom (Big Book)" tab above to add vocabulary words from the GRE Big Book.',
        group: 'Big Book'
      }];
    }

    if (isShuffled) {
      currentDeck = shuffleArray([...rawCards]);
    } else {
      currentDeck = [...rawCards];
    }

    currentIndex = 0;
    isFlipped = false;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ================= Multiple Meanings & Definition Formatting =================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseDefinitionMeanings(def) {
    if (!def || typeof def !== 'string') return [];
    const trimmed = def.trim();
    if (!trimmed) return [];

    // Check if definition contains numbered pattern like "1. ... 2. ..." or "1) ... 2) ..."
    const hasNumberedPattern = /(?:^|\s)1[\.\)]\s+/.test(trimmed) && /(?:^|\s)2[\.\)]\s+/.test(trimmed);

    if (hasNumberedPattern) {
      // Split before each number sequence like 1., 2., 3.
      const rawParts = trimmed.split(/(?:^|\s+)(?=[1-9]\d*[\.\)]\s+)/);
      const items = [];
      for (const part of rawParts) {
        const p = part.trim();
        if (!p) continue;
        const match = p.match(/^([1-9]\d*[\.\)])\s*(.*)$/s);
        if (match) {
          items.push({
            num: match[1].replace(/[\.\)]$/, ''),
            label: match[1].endsWith('.') ? match[1] : match[1].replace(/[\)]$/, '.'),
            text: match[2].trim()
          });
        } else {
          items.push({
            num: (items.length + 1).toString(),
            label: `${items.length + 1}.`,
            text: p
          });
        }
      }
      if (items.length > 1) {
        return items;
      }
    }

    // Check if newline separated definitions (e.g. from custom input or textareas)
    if (trimmed.includes('\n')) {
      const rawLines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      if (rawLines.length > 1) {
        return rawLines.map((line, idx) => {
          const match = line.match(/^([1-9]\d*[\.\)])\s*(.*)$/s);
          if (match) {
            return {
              num: match[1].replace(/[\.\)]$/, ''),
              label: match[1].endsWith('.') ? match[1] : match[1].replace(/[\)]$/, '.'),
              text: match[2].trim()
            };
          }
          return {
            num: (idx + 1).toString(),
            label: `${idx + 1}.`,
            text: line
          };
        });
      }
    }

    // Single definition
    return [{ num: '', label: '', text: trimmed }];
  }

  function formatDefinitionHtml(def, options = {}) {
    const meanings = parseDefinitionMeanings(def);
    if (meanings.length <= 1) {
      return escapeHtml(meanings[0]?.text || def || '');
    }

    const isCompact = options.compact || false;
    const containerClass = isCompact ? 'def-multiline def-multiline-compact' : 'def-multiline';
    
    const linesHtml = meanings.map(m => `
      <div class="def-line">
        <span class="def-num">${escapeHtml(m.label || m.num + '.')}</span>
        <span class="def-text">${escapeHtml(m.text)}</span>
      </div>
    `).join('');

    return `<div class="${containerClass}">${linesHtml}</div>`;
  }

  // ================= Render Flashcard =================
  function renderCurrentCard() {
    if (!currentDeck || currentDeck.length === 0) {
      vocabWordFront.textContent = 'No cards available';
      vocabWordBack.textContent = '';
      vocabDefinition.innerHTML = '';
      if (cardMultiDefBadgeFront) cardMultiDefBadgeFront.style.display = 'none';
      if (cardMultiDefBadgeBack) cardMultiDefBadgeBack.style.display = 'none';
      return;
    }

    const card = currentDeck[currentIndex];
    const rating = ratings[card.id] || 0; // 0 = unrated, 1 = green, 2 = orange, 3 = red

    // Unflip before changing content
    if (isFlipped) {
      flashcard.classList.remove('flipped');
      isFlipped = false;
    }

    // Set Words & Definitions (Multiple Meanings formatted on separate lines)
    vocabWordFront.textContent = card.word;
    vocabWordBack.textContent = card.word;
    vocabDefinition.innerHTML = formatDefinitionHtml(card.definition);

    const meanings = parseDefinitionMeanings(card.definition);
    if (meanings.length > 1) {
      const badgeText = `${meanings.length} Meanings`;
      if (cardMultiDefBadgeFront) {
        cardMultiDefBadgeFront.textContent = badgeText;
        cardMultiDefBadgeFront.style.display = 'inline-flex';
      }
      if (cardMultiDefBadgeBack) {
        cardMultiDefBadgeBack.textContent = badgeText;
        cardMultiDefBadgeBack.style.display = 'inline-flex';
      }
    } else {
      if (cardMultiDefBadgeFront) cardMultiDefBadgeFront.style.display = 'none';
      if (cardMultiDefBadgeBack) cardMultiDefBadgeBack.style.display = 'none';
    }

    const groupLabel = card.group === 'Big Book' ? '📖 Big Book' : `Group ${card.group}`;
    cardGroupTagFront.textContent = groupLabel;
    cardGroupTagBack.textContent = groupLabel;

    // Counter
    cardCounterText.textContent = `Card ${currentIndex + 1} of ${currentDeck.length}`;

    // Apply Rating Styles
    flashcard.classList.remove('rated-1', 'rated-2', 'rated-3');
    btnRate1.classList.remove('active');
    btnRate2.classList.remove('active');
    btnRate3.classList.remove('active');

    if (rating === 1) {
      flashcard.classList.add('rated-1');
      btnRate1.classList.add('active');
      setRatingBadge(cardRatingBadgeFront, '1 • Know It', 'badge-1');
      setRatingBadge(cardRatingBadgeBack, '1 • Know It', 'badge-1');
    } else if (rating === 2) {
      flashcard.classList.add('rated-2');
      btnRate2.classList.add('active');
      setRatingBadge(cardRatingBadgeFront, '2 • Review', 'badge-2');
      setRatingBadge(cardRatingBadgeBack, '2 • Review', 'badge-2');
    } else if (rating === 3) {
      flashcard.classList.add('rated-3');
      btnRate3.classList.add('active');
      setRatingBadge(cardRatingBadgeFront, '3 • Hard Word', 'badge-3');
      setRatingBadge(cardRatingBadgeBack, '3 • Hard Word', 'badge-3');
    } else {
      setRatingBadge(cardRatingBadgeFront, 'Unrated', 'badge-unrated');
      setRatingBadge(cardRatingBadgeBack, 'Unrated', 'badge-unrated');
    }

    // Navigation buttons state
    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === currentDeck.length - 1;

    // Render Back Side Similar Words / Thematic Chips
    renderBackSynonyms(card);

    // Update Progress bar
    updateGroupStats();
  }

  function setRatingBadge(el, text, badgeClass) {
    el.className = `card-rating-badge ${badgeClass}`;
    el.innerHTML = `<span>${text}</span>`;
  }

  function renderBackSynonyms(card) {
    backSynonymChips.innerHTML = '';

    if (card.group === 'Big Book') {
      if (card.notes) {
        const noteChip = document.createElement('span');
        noteChip.className = 'synonym-chip';
        noteChip.style.borderColor = 'var(--rating-1-border)';
        noteChip.style.color = 'var(--text-accent)';
        noteChip.textContent = card.notes;
        backSynonymChips.appendChild(noteChip);
      } else {
        backSynonymChips.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Custom Word</span>';
      }
      return;
    }

    // Check if this word belongs to any cross-group synonym cluster
    if (typeof CROSS_GROUP_SYNONYMS !== 'undefined') {
      const parentCluster = CROSS_GROUP_SYNONYMS.find(cl => 
        cl.words.some(cw => cw.word.toLowerCase() === card.word.toLowerCase())
      );
      if (parentCluster) {
        const themeChip = document.createElement('span');
        themeChip.className = 'synonym-chip';
        themeChip.style.borderColor = 'var(--brand-primary)';
        themeChip.style.color = 'var(--text-accent)';
        themeChip.textContent = `Theme: ${parentCluster.theme}`;
        backSynonymChips.appendChild(themeChip);

        parentCluster.words.forEach(cw => {
          if (cw.word.toLowerCase() !== card.word.toLowerCase()) {
            const chip = document.createElement('span');
            chip.className = 'synonym-chip';
            chip.textContent = `${cw.word} (G${cw.group})`;
            chip.title = `Click to practice ${cw.word}`;
            chip.style.cursor = 'pointer';
            chip.addEventListener('click', (e) => {
              e.stopPropagation();
              jumpToWordByName(cw.word);
            });
            backSynonymChips.appendChild(chip);
          }
        });
        return;
      }
    }

    // Fallback to in-group cluster
    const gObj = VOCAB_DATA.find(g => g.group === card.group);
    if (!gObj || !gObj.clusters || gObj.clusters.length === 0) {
      backSynonymChips.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Core GRE vocabulary</span>';
      return;
    }

    const cluster = gObj.clusters.find(cl => 
      cl.words.map(w => w.toLowerCase()).includes(card.word.toLowerCase())
    );

    if (cluster) {
      const themeChip = document.createElement('span');
      themeChip.className = 'synonym-chip';
      themeChip.style.borderColor = 'var(--brand-primary)';
      themeChip.style.color = 'var(--text-accent)';
      themeChip.textContent = `Theme: ${cluster.theme}`;
      backSynonymChips.appendChild(themeChip);

      cluster.words.forEach(w => {
        if (w.toLowerCase() !== card.word.toLowerCase()) {
          const chip = document.createElement('span');
          chip.className = 'synonym-chip';
          chip.textContent = w;
          chip.title = 'Click to find word';
          chip.style.cursor = 'pointer';
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            jumpToWordByName(w);
          });
          backSynonymChips.appendChild(chip);
        }
      });
    } else {
      backSynonymChips.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Core GRE vocabulary</span>';
    }
  }

  // ================= Rating Actions =================
  function setRating(ratingValue) {
    if (!currentDeck || currentDeck.length === 0) return;
    const card = currentDeck[currentIndex];
    
    // Toggle if same rating clicked
    if (ratings[card.id] === ratingValue) {
      delete ratings[card.id];
    } else {
      ratings[card.id] = ratingValue;
    }

    saveRatings();
    renderCurrentCard();
    updateGroupStats();

    // Auto-advance to next card if enabled
    if (autoAdvance && currentIndex < currentDeck.length - 1 && ratings[card.id] !== undefined) {
      setTimeout(() => {
        nextCard();
      }, 200);
    }
  }

  // ================= Navigation Controls =================
  function flipCard() {
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped', isFlipped);
  }

  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentCard();
    }
  }

  function nextCard() {
    if (currentIndex < currentDeck.length - 1) {
      currentIndex++;
      renderCurrentCard();
    }
  }

  function jumpToCardIndex(idx) {
    if (idx >= 0 && idx < currentDeck.length) {
      currentIndex = idx;
      renderCurrentCard();
    }
  }

  function jumpToWordByName(wordName) {
    // 1. Check current deck first
    const targetIdx = currentDeck.findIndex(c => c.word.toLowerCase() === wordName.toLowerCase());
    if (targetIdx !== -1) {
      jumpToCardIndex(targetIdx);
      if (activeTab !== 'flashcards') switchTab('flashcards');
      return;
    }

    // 2. Check Custom Words
    const customFound = customWords.find(cw => cw.word.toLowerCase() === wordName.toLowerCase());
    if (customFound) {
      activeGroup = 'custom';
      groupSelect.value = 'custom';
      buildCurrentDeck();
      const newIdx = currentDeck.findIndex(c => c.word.toLowerCase() === wordName.toLowerCase());
      jumpToCardIndex(newIdx !== -1 ? newIdx : 0);
      switchTab('flashcards');
      return;
    }

    // 3. Find which of the 34 groups has it
    for (const g of VOCAB_DATA) {
      const found = g.cards.find(c => c.word.toLowerCase() === wordName.toLowerCase());
      if (found) {
        activeGroup = g.group;
        groupSelect.value = activeGroup;
        buildCurrentDeck();
        const newIdx = currentDeck.findIndex(c => c.word.toLowerCase() === wordName.toLowerCase());
        jumpToCardIndex(newIdx !== -1 ? newIdx : 0);
        switchTab('flashcards');
        return;
      }
    }
  }

  // ================= Audio Speech Pronunciation =================
  function speakCurrentWord() {
    if (!currentDeck || currentDeck.length === 0) return;
    const card = currentDeck[currentIndex];
    if (!card || !card.word) return;

    // Visual pulse feedback on speak buttons
    const btns = [document.getElementById('btnSpeak'), document.getElementById('btnSpeakBack')].filter(Boolean);
    btns.forEach(b => {
      b.classList.add('speaking');
      setTimeout(() => b.classList.remove('speaking'), 450);
    });

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ================= Progress & Statistics =================
  function updateGroupStats() {
    let totalCards = currentDeck.length;
    let r1 = 0, r2 = 0, r3 = 0, unrated = 0;

    currentDeck.forEach(c => {
      const r = ratings[c.id];
      if (r === 1) r1++;
      else if (r === 2) r2++;
      else if (r === 3) r3++;
      else unrated++;
    });

    countGreen.textContent = r1;
    countOrange.textContent = r2;
    countRed.textContent = r3;
    countUnrated.textContent = unrated;

    if (totalCards > 0) {
      const pctGreen = ((r1 / totalCards) * 100).toFixed(0);
      const pctOrange = ((r2 / totalCards) * 100).toFixed(0);
      const pctRed = ((r3 / totalCards) * 100).toFixed(0);
      const pctUnrated = (100 - pctGreen - pctOrange - pctRed).toFixed(0);

      progSegGreen.style.width = `${pctGreen}%`;
      progSegOrange.style.width = `${pctOrange}%`;
      progSegRed.style.width = `${pctRed}%`;
      progSegUnrated.style.width = `${pctUnrated}%`;

      groupProgressPercent.textContent = `${pctGreen}% Mastered`;
    }

    updateGlobalStats();
  }

  function updateGlobalStats() {
    let g1 = 0, g2 = 0, g3 = 0, g0 = 0;
    
    // 34 groups
    VOCAB_DATA.forEach(g => {
      g.cards.forEach(c => {
        const r = ratings[c.id];
        if (r === 1) g1++;
        else if (r === 2) g2++;
        else if (r === 3) g3++;
        else g0++;
      });
    });

    // custom words
    customWords.forEach(cw => {
      const r = ratings[cw.id];
      if (r === 1) g1++;
      else if (r === 2) g2++;
      else if (r === 3) g3++;
      else g0++;
    });

    globalCount1.textContent = g1;
    globalCount2.textContent = g2;
    globalCount3.textContent = g3;
    globalCount0.textContent = g0;
  }

  // ================= View 2: Rated Words Practice Logic =================
  function renderRatedPracticeView() {
    let candidates = [];
    if (ratedScope === 'all') {
      VOCAB_DATA.forEach(g => candidates.push(...g.cards));
      customWords.forEach(cw => candidates.push({
        id: cw.id,
        word: cw.word,
        definition: cw.definition,
        group: 'Big Book'
      }));
    } else {
      if (activeGroup === 'custom') {
        customWords.forEach(cw => candidates.push({
          id: cw.id,
          word: cw.word,
          definition: cw.definition,
          group: 'Big Book'
        }));
      } else if (activeGroup === 'all') {
        VOCAB_DATA.forEach(g => candidates.push(...g.cards));
      } else {
        const gObj = VOCAB_DATA.find(g => g.group === parseInt(activeGroup, 10));
        if (gObj) candidates.push(...gObj.cards);
      }
    }

    // Counts
    let c3 = 0, c2 = 0, c1 = 0;
    candidates.forEach(c => {
      const r = ratings[c.id];
      if (r === 3) c3++;
      else if (r === 2) c2++;
      else if (r === 1) c1++;
    });

    filterCount3.textContent = c3;
    filterCount2.textContent = c2;
    filterCount1.textContent = c1;
    filterCountHard.textContent = c3 + c2;
    filterCountAll.textContent = c3 + c2 + c1;

    // Filter cards
    let filtered = [];
    if (ratedFilter === '3') {
      filtered = candidates.filter(c => ratings[c.id] === 3);
    } else if (ratedFilter === '2') {
      filtered = candidates.filter(c => ratings[c.id] === 2);
    } else if (ratedFilter === '1') {
      filtered = candidates.filter(c => ratings[c.id] === 1);
    } else if (ratedFilter === 'hard') {
      filtered = candidates.filter(c => ratings[c.id] === 3 || ratings[c.id] === 2);
    } else {
      filtered = candidates.filter(c => ratings[c.id] !== undefined);
    }

    ratedWordsGrid.innerHTML = '';
    if (filtered.length === 0) {
      ratedWordsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <h3>No words found for this rating filter</h3>
          <p style="margin-top: 0.5rem; font-size: 0.95rem;">Rate words during flashcards (using keys 1, 2, or 3) to practice them here.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(c => {
      const r = ratings[c.id];
      const cardEl = document.createElement('div');
      cardEl.className = `rated-word-card card-r${r}`;
      
      const badgeText = r === 1 ? 'Know (1)' : r === 2 ? 'Review (2)' : 'Hard (3)';
      const badgeClass = r === 1 ? 'badge-1' : r === 2 ? 'badge-2' : 'badge-3';

      const meanings = parseDefinitionMeanings(c.definition);
      const multiBadge = meanings.length > 1 ? `<span class="multi-meaning-badge">${meanings.length} Meanings</span>` : '';

      cardEl.innerHTML = `
        <div class="rated-word-card-top">
          <div class="card-tag-group">
            <span class="card-group-tag">${c.group === 'Big Book' ? '📖 Big Book' : 'Group ' + c.group}</span>
            ${multiBadge}
          </div>
          <span class="card-rating-badge ${badgeClass}">${badgeText}</span>
        </div>
        <h4 class="rated-card-word">${c.word}</h4>
        <div class="rated-card-def">${formatDefinitionHtml(c.definition, { compact: true })}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">Click to drill</span>
          <span class="rate-num-badge">Practice →</span>
        </div>
      `;

      cardEl.addEventListener('click', () => {
        jumpToWordByName(c.word);
      });

      ratedWordsGrid.appendChild(cardEl);
    });
  }

  // ================= View 3: Similar Words & Synonyms View =================
  function renderSimilarClustersView() {
    clustersGrid.innerHTML = '';

    // 1. Cross-Group Universal Synonyms Mode
    if (synMode === 'cross') {
      clustersGroupTitle.textContent = 'Cross-Group Universal Synonyms • All 34 Groups';
      clustersHeroDesc.textContent = 'Synonym clusters connecting words across multiple groups so you learn related terms together.';

      if (typeof CROSS_GROUP_SYNONYMS === 'undefined' || CROSS_GROUP_SYNONYMS.length === 0) {
        clustersGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">No cross-group synonyms loaded.</div>';
        return;
      }

      let clustersToDisplay = CROSS_GROUP_SYNONYMS;
      if (synSearchQuery.trim()) {
        const q = synSearchQuery.toLowerCase().trim();
        clustersToDisplay = CROSS_GROUP_SYNONYMS.filter(cl => 
          cl.theme.toLowerCase().includes(q) ||
          cl.summary.toLowerCase().includes(q) ||
          cl.words.some(w => w.word.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q))
        );
      }

      if (clustersToDisplay.length === 0) {
        clustersGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><h3>No synonym clusters found for "${synSearchQuery}"</h3></div>`;
        return;
      }

      clustersToDisplay.forEach(cl => {
        const clusterCard = document.createElement('div');
        clusterCard.className = 'cluster-card';

        let wordsHtml = '';
        cl.words.forEach(cw => {
          const r = ratings[cw.id] || 0;
          const badgeText = r === 1 ? '1 Know' : r === 2 ? '2 Review' : r === 3 ? '3 Hard' : 'Unrated';
          const badgeClass = r === 1 ? 'badge-1' : r === 2 ? 'badge-2' : r === 3 ? 'badge-3' : 'badge-unrated';

          wordsHtml += `
            <div class="cluster-word-item" data-word="${cw.word}">
              <div class="cluster-word-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="cluster-word-name">${cw.word}</span>
                  <span class="cluster-group-badge">Group ${cw.group}</span>
                </div>
                <span class="card-rating-badge ${badgeClass}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${badgeText}</span>
              </div>
              <div class="cluster-word-def">${formatDefinitionHtml(cw.definition, { compact: true })}</div>
            </div>
          `;
        });

        clusterCard.innerHTML = `
          <div class="cluster-header">
            <h3 class="cluster-theme-title">${cl.theme}</h3>
            <span class="card-group-tag">${cl.words.length} Synonyms</span>
          </div>
          <p class="cluster-notes">${cl.summary}</p>
          <div class="cluster-words-list">
            ${wordsHtml}
          </div>
        `;

        clusterCard.querySelectorAll('.cluster-word-item').forEach(item => {
          item.addEventListener('click', () => {
            const w = item.getAttribute('data-word');
            jumpToWordByName(w);
          });
        });

        clustersGrid.appendChild(clusterCard);
      });
      return;
    }

    // 2. In-Group Clusters Mode
    if (activeGroup === 'all') {
      clustersGroupTitle.textContent = 'All Groups • Within-Group Thematic Clusters';
    } else if (activeGroup === 'custom') {
      clustersGroupTitle.textContent = 'Big Book Custom Words • Notes';
    } else {
      clustersGroupTitle.textContent = `Group ${activeGroup} • Within-Group Clusters`;
    }
    clustersHeroDesc.textContent = 'Synonym clusters and thematic relationships within this group.';

    let targetGroups = [];
    if (activeGroup === 'all') {
      targetGroups = VOCAB_DATA;
    } else if (activeGroup === 'custom') {
      // Show custom words notes
      clustersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
          <p>Switch to <strong>"Cross-Group Synonyms"</strong> above to see universal GRE synonyms across all 34 groups.</p>
        </div>
      `;
      return;
    } else {
      const gObj = VOCAB_DATA.find(g => g.group === parseInt(activeGroup, 10));
      if (gObj) targetGroups = [gObj];
    }

    let totalRendered = 0;

    targetGroups.forEach(g => {
      if (!g.clusters || g.clusters.length === 0) return;

      g.clusters.forEach(cl => {
        totalRendered++;
        const clusterCard = document.createElement('div');
        clusterCard.className = 'cluster-card';

        let wordsHtml = '';
        cl.words.forEach(w => {
          const card = g.cards.find(c => c.word.toLowerCase() === w.toLowerCase());
          const def = card ? card.definition : '';
          const r = card ? ratings[card.id] || 0 : 0;
          const badgeText = r === 1 ? '1 Know' : r === 2 ? '2 Review' : r === 3 ? '3 Hard' : 'Unrated';
          const badgeClass = r === 1 ? 'badge-1' : r === 2 ? 'badge-2' : r === 3 ? 'badge-3' : 'badge-unrated';

          wordsHtml += `
            <div class="cluster-word-item" data-word="${w}">
              <div class="cluster-word-header">
                <span class="cluster-word-name">${w}</span>
                <span class="card-rating-badge ${badgeClass}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${badgeText}</span>
              </div>
              <div class="cluster-word-def">${formatDefinitionHtml(def, { compact: true })}</div>
            </div>
          `;
        });

        clusterCard.innerHTML = `
          <div class="cluster-header">
            <h3 class="cluster-theme-title">${cl.theme}</h3>
            <span class="card-group-tag">Group ${g.group}</span>
          </div>
          <p class="cluster-notes">${cl.notes}</p>
          <div class="cluster-words-list">
            ${wordsHtml}
          </div>
        `;

        clusterCard.querySelectorAll('.cluster-word-item').forEach(item => {
          item.addEventListener('click', () => {
            const word = item.getAttribute('data-word');
            jumpToWordByName(word);
          });
        });

        clustersGrid.appendChild(clusterCard);
      });
    });

    if (totalRendered === 0) {
      clustersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <h3>No within-group clusters available for this selection</h3>
          <p style="margin-top: 0.5rem;">Click "Cross-Group Synonyms" above to view universal synonym themes.</p>
        </div>
      `;
    }
  }

  // ================= View 5: Custom Words (Big Book) =================
  function renderCustomWordsView() {
    updateCustomDeckCounters();
    customWordsGrid.innerHTML = '';

    let list = customWords;
    if (customSearchQuery.trim()) {
      const q = customSearchQuery.toLowerCase().trim();
      list = customWords.filter(cw => 
        cw.word.toLowerCase().includes(q) || 
        cw.definition.toLowerCase().includes(q) ||
        (cw.notes && cw.notes.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      customWordsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <h3>No custom words found</h3>
          <p style="margin-top: 0.5rem; font-size: 0.95rem;">Use the form above to add vocabulary from the GRE Big Book.</p>
        </div>
      `;
      return;
    }

    list.forEach(cw => {
      const r = ratings[cw.id] || 0;
      const cardEl = document.createElement('div');
      cardEl.className = `custom-word-card card-r${r}`;

      const badgeText = r === 1 ? '1 Know' : r === 2 ? '2 Review' : r === 3 ? '3 Hard' : 'Unrated';
      const badgeClass = r === 1 ? 'badge-1' : r === 2 ? 'badge-2' : r === 3 ? 'badge-3' : 'badge-unrated';

      const meanings = parseDefinitionMeanings(cw.definition);
      const multiBadge = meanings.length > 1 ? `<span class="multi-meaning-badge">${meanings.length} Meanings</span>` : '';

      cardEl.innerHTML = `
        <div class="custom-card-header">
          <div class="card-tag-group">
            <span class="card-group-tag" style="background: var(--rating-1-bg); color: var(--rating-1); border-color: var(--rating-1-border);">Big Book</span>
            ${multiBadge}
          </div>
          <span class="card-rating-badge ${badgeClass}">${badgeText}</span>
        </div>

        <h4 class="custom-card-title">${cw.word}</h4>
        <div class="custom-card-def">${formatDefinitionHtml(cw.definition, { compact: true })}</div>
        ${cw.notes ? `<div class="custom-card-notes">${cw.notes}</div>` : ''}

        <div class="custom-card-actions">
          <div class="custom-card-rating-btns">
            <button class="btn-mini-rate ${r === 1 ? 'active-r1' : ''}" data-rate="1" title="Rate 1 (Green)">1</button>
            <button class="btn-mini-rate ${r === 2 ? 'active-r2' : ''}" data-rate="2" title="Rate 2 (Orange)">2</button>
            <button class="btn-mini-rate ${r === 3 ? 'active-r3' : ''}" data-rate="3" title="Rate 3 (Red)">3</button>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="toggle-btn btn-drill-cw" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">Practice →</button>
            <button class="btn-mini-del" title="Delete custom word">✕</button>
          </div>
        </div>
      `;

      // Mini rate buttons
      cardEl.querySelectorAll('.btn-mini-rate').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = parseInt(btn.getAttribute('data-rate'), 10);
          if (ratings[cw.id] === val) delete ratings[cw.id];
          else ratings[cw.id] = val;
          saveRatings();
          renderCustomWordsView();
          updateGroupStats();
        });
      });

      // Practice jump
      cardEl.querySelector('.btn-drill-cw').addEventListener('click', (e) => {
        e.stopPropagation();
        activeGroup = 'custom';
        groupSelect.value = 'custom';
        buildCurrentDeck();
        const targetIdx = currentDeck.findIndex(c => c.id === cw.id);
        jumpToCardIndex(targetIdx !== -1 ? targetIdx : 0);
        switchTab('flashcards');
      });

      // Delete button
      cardEl.querySelector('.btn-mini-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${cw.word}" from custom words?`)) {
          customWords = customWords.filter(item => item.id !== cw.id);
          delete ratings[cw.id];
          saveCustomWords();
          saveRatings();
          populateGroupSelector();
          renderCustomWordsView();
          updateGroupStats();
        }
      });

      customWordsGrid.appendChild(cardEl);
    });
  }

  function handleAddCustomWord() {
    const word = customInputWord.value.trim();
    const def = customInputDef.value.trim();
    const notes = customInputNotes.value.trim();

    if (!word || !def) {
      alert('Please provide both the word and definition.');
      return;
    }

    const newEntry = {
      id: `custom_${Date.now()}`,
      word: word,
      definition: def,
      notes: notes,
      group: 'Custom'
    };

    customWords.unshift(newEntry);
    saveCustomWords();
    populateGroupSelector();

    // Reset inputs
    customInputWord.value = '';
    customInputDef.value = '';
    customInputNotes.value = '';

    renderCustomWordsView();
    updateGroupStats();
  }

  // ================= View 4: Directory Search & List =================
  function renderDirectoryView() {
    directoryTableBody.innerHTML = '';

    let allWords = [];
    VOCAB_DATA.forEach(g => {
      g.cards.forEach(c => allWords.push(c));
    });
    customWords.forEach(cw => {
      allWords.push({
        id: cw.id,
        word: cw.word,
        definition: cw.definition,
        group: 'Big Book'
      });
    });

    let filtered = allWords;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.word.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q)
      );
    }

    if (searchRatingFilter !== 'all') {
      if (searchRatingFilter === 'multi') {
        filtered = filtered.filter(c => parseDefinitionMeanings(c.definition).length > 1);
      } else {
        const targetR = parseInt(searchRatingFilter, 10);
        if (targetR === 0) {
          filtered = filtered.filter(c => !ratings[c.id]);
        } else {
          filtered = filtered.filter(c => ratings[c.id] === targetR);
        }
      }
    }

    if (filtered.length === 0) {
      directoryTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No matching words found for "${searchQuery}"
          </td>
        </tr>
      `;
      return;
    }

    const toRender = filtered.slice(0, 150);

    toRender.forEach(c => {
      const r = ratings[c.id] || 0;
      const tr = document.createElement('tr');

      const badgeText = r === 1 ? '1 Know' : r === 2 ? '2 Review' : r === 3 ? '3 Hard' : 'Unrated';
      const badgeClass = r === 1 ? 'badge-1' : r === 2 ? 'badge-2' : r === 3 ? 'badge-3' : 'badge-unrated';
      const groupLabel = c.group === 'Big Book' ? '📖 Big Book' : `Group ${c.group}`;

      const meanings = parseDefinitionMeanings(c.definition);
      const multiBadge = meanings.length > 1 ? `<span class="multi-meaning-badge" style="font-size: 0.68rem; padding: 0.12rem 0.45rem;">${meanings.length} Meanings</span>` : '';

      tr.innerHTML = `
        <td><div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;"><strong style="font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary);">${c.word}</strong>${multiBadge}</div></td>
        <td><span class="card-group-tag">${groupLabel}</span></td>
        <td style="color: var(--text-secondary); max-width: 480px;">${formatDefinitionHtml(c.definition, { compact: true })}</td>
        <td><span class="card-rating-badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="toggle-btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">
            Practice
          </button>
        </td>
      `;

      tr.querySelector('button').addEventListener('click', () => {
        jumpToWordByName(c.word);
      });

      directoryTableBody.appendChild(tr);
    });
  }

  // ================= Modal: Jump to Card in Group =================
  function openGridModal() {
    modalDeckTitle.textContent = activeGroup === 'all' 
      ? 'Jump to Card (All Groups)' 
      : activeGroup === 'custom'
      ? 'Jump to Card (Big Book Custom Words)'
      : `Jump to Card in Group ${activeGroup}`;
    
    modalCardNavGrid.innerHTML = '';

    currentDeck.forEach((c, idx) => {
      const r = ratings[c.id] || 0;
      const item = document.createElement('div');
      item.className = `nav-grid-item ${idx === currentIndex ? 'current' : ''}`;
      if (r === 1) item.classList.add('item-r1');
      else if (r === 2) item.classList.add('item-r2');
      else if (r === 3) item.classList.add('item-r3');

      item.innerHTML = `
        <span>#${idx + 1}</span>
        <span style="font-size: 0.75rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.word}</span>
      `;

      item.addEventListener('click', () => {
        jumpToCardIndex(idx);
        closeGridModal();
      });

      modalCardNavGrid.appendChild(item);
    });

    gridModal.classList.add('open');
  }

  function closeGridModal() {
    gridModal.classList.remove('open');
  }

  // ================= Navigation Tabs =================
  function switchTab(tabId) {
    activeTab = tabId;
    navTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    viewFlashcards.style.display = tabId === 'flashcards' ? 'flex' : 'none';
    viewRatedPractice.style.display = tabId === 'rated-practice' ? 'flex' : 'none';
    viewSimilarClusters.style.display = tabId === 'similar-clusters' ? 'flex' : 'none';
    viewCustomWords.style.display = tabId === 'custom-words' ? 'flex' : 'none';
    viewDirectory.style.display = tabId === 'directory' ? 'flex' : 'none';

    if (tabId === 'rated-practice') {
      renderRatedPracticeView();
    } else if (tabId === 'similar-clusters') {
      renderSimilarClustersView();
    } else if (tabId === 'custom-words') {
      renderCustomWordsView();
    } else if (tabId === 'directory') {
      renderDirectoryView();
    }
  }

  // ================= Reset & Backup =================
  function resetCurrentGroupRatings() {
    if (confirm(`Are you sure you want to reset ratings for ${activeGroup === 'custom' ? 'Custom Words' : 'Group ' + activeGroup}?`)) {
      if (activeGroup === 'all') {
        ratings = {};
      } else if (activeGroup === 'custom') {
        customWords.forEach(cw => delete ratings[cw.id]);
      } else {
        const gObj = VOCAB_DATA.find(g => g.group === parseInt(activeGroup, 10));
        if (gObj) gObj.cards.forEach(c => delete ratings[c.id]);
      }
      saveRatings();
      renderCurrentCard();
      updateGroupStats();
      settingsModal.classList.remove('open');
    }
  }

  function resetAllRatings() {
    if (confirm('CAUTION: Are you sure you want to reset all ratings across all 34 groups and custom words?')) {
      ratings = {};
      saveRatings();
      renderCurrentCard();
      updateGroupStats();
      settingsModal.classList.remove('open');
    }
  }

  function exportRatings() {
    const exportData = {
      ratings: ratings,
      customWords: customWords,
      exportedAt: new Date().toISOString()
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `gre_vocab_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  }

  function importRatings(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.ratings) ratings = { ...ratings, ...parsed.ratings };
        else if (typeof parsed === 'object') ratings = { ...ratings, ...parsed };

        if (Array.isArray(parsed.customWords)) {
          customWords = parsed.customWords;
          saveCustomWords();
        }

        saveRatings();
        populateGroupSelector();
        buildCurrentDeck();
        renderCurrentCard();
        updateGroupStats();
        alert('Backup data imported successfully!');
        settingsModal.classList.remove('open');
      } catch (err) {
        alert('Invalid JSON file format!');
      }
    };
    reader.readAsText(file);
  }

  // ================= Event Listeners & Keyboard =================
  function bindEvents() {
    // Group select change
    groupSelect.addEventListener('change', (e) => {
      activeGroup = e.target.value;
      buildCurrentDeck();
      renderCurrentCard();
      if (activeTab === 'rated-practice') renderRatedPracticeView();
      if (activeTab === 'similar-clusters') renderSimilarClustersView();
    });

    // Tab buttons
    navTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Rating buttons (1, 2, 3)
    btnRate1.addEventListener('click', () => setRating(1));
    btnRate2.addEventListener('click', () => setRating(2));
    btnRate3.addEventListener('click', () => setRating(3));

    // Nav buttons
    btnPrev.addEventListener('click', prevCard);
    btnNext.addEventListener('click', nextCard);
    btnFlip.addEventListener('click', flipCard);
    flashcard.addEventListener('click', flipCard);
    btnSpeak.addEventListener('click', (e) => {
      e.stopPropagation();
      speakCurrentWord();
    });
    const btnSpeakBack = document.getElementById('btnSpeakBack');
    if (btnSpeakBack) {
      btnSpeakBack.addEventListener('click', (e) => {
        e.stopPropagation();
        speakCurrentWord();
      });
    }

    // Shuffle toggle
    btnToggleShuffle.addEventListener('click', () => {
      isShuffled = !isShuffled;
      btnToggleShuffle.classList.toggle('active', isShuffled);
      buildCurrentDeck();
      renderCurrentCard();
    });

    // Auto-advance toggle
    btnToggleAutoAdvance.addEventListener('click', () => {
      autoAdvance = !autoAdvance;
      btnToggleAutoAdvance.classList.toggle('active', autoAdvance);
      saveSettings();
    });

    // Focus Mode toggle (in settings modal)
    if (btnFocusModeToggle) {
      btnFocusModeToggle.addEventListener('click', toggleFocusMode);
    }
    // Exit Focus Mode floating pill
    if (btnExitFocusMode) {
      btnExitFocusMode.addEventListener('click', () => {
        if (focusMode) toggleFocusMode();
      });
    }

    // Stat Pills click to filter rated words
    document.getElementById('pillKnow').addEventListener('click', () => {
      ratedFilter = '1';
      switchTab('rated-practice');
      updateRatedFilterButtons();
      renderRatedPracticeView();
    });
    document.getElementById('pillReview').addEventListener('click', () => {
      ratedFilter = '2';
      switchTab('rated-practice');
      updateRatedFilterButtons();
      renderRatedPracticeView();
    });
    document.getElementById('pillHard').addEventListener('click', () => {
      ratedFilter = '3';
      switchTab('rated-practice');
      updateRatedFilterButtons();
      renderRatedPracticeView();
    });

    // Rated Practice Filter Tabs
    ratedFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        ratedFilter = btn.getAttribute('data-filter');
        updateRatedFilterButtons();
        renderRatedPracticeView();
      });
    });

    ratedScopeSelect.addEventListener('change', (e) => {
      ratedScope = e.target.value;
      renderRatedPracticeView();
    });

    // Similar Words Subnav toggles
    if (btnSynModeCross) {
      btnSynModeCross.addEventListener('click', () => {
        synMode = 'cross';
        btnSynModeCross.classList.add('active');
        btnSynModeGroup.classList.remove('active');
        renderSimilarClustersView();
      });
    }

    if (btnSynModeGroup) {
      btnSynModeGroup.addEventListener('click', () => {
        synMode = 'group';
        btnSynModeGroup.classList.add('active');
        btnSynModeCross.classList.remove('active');
        renderSimilarClustersView();
      });
    }

    if (synSearchInput) {
      synSearchInput.addEventListener('input', (e) => {
        synSearchQuery = e.target.value;
        renderSimilarClustersView();
      });
    }

    // Custom Words Actions
    if (customWordForm) {
      customWordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddCustomWord();
      });
    }
    const btnAddCustomWord = document.getElementById('btnAddCustomWord');
    if (btnAddCustomWord) {
      btnAddCustomWord.addEventListener('click', handleAddCustomWord);
    }

    if (btnPracticeCustomDeck) {
      btnPracticeCustomDeck.addEventListener('click', () => {
        activeGroup = 'custom';
        groupSelect.value = 'custom';
        buildCurrentDeck();
        renderCurrentCard();
        switchTab('flashcards');
      });
    }

    if (customSearchInput) {
      customSearchInput.addEventListener('input', (e) => {
        customSearchQuery = e.target.value;
        renderCustomWordsView();
      });
    }

    // Search and Directory inputs
    dirSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderDirectoryView();
    });

    dirRatingFilter.addEventListener('change', (e) => {
      searchRatingFilter = e.target.value;
      renderDirectoryView();
    });

    // Theme toggle
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Modal Jump
    btnOpenGridModal.addEventListener('click', openGridModal);
    btnCloseGridModal.addEventListener('click', closeGridModal);
    gridModal.addEventListener('click', (e) => {
      if (e.target === gridModal) closeGridModal();
    });

    // Settings Modal
    btnResetModal.addEventListener('click', () => {
      settingsModal.classList.add('open');
      updateGlobalStats();
    });
    btnCloseSettingsModal.addEventListener('click', () => {
      settingsModal.classList.remove('open');
    });
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.remove('open');
    });

    btnResetCurrentGroup.addEventListener('click', resetCurrentGroupRatings);
    btnResetAllGroups.addEventListener('click', resetAllRatings);
    btnExportRatings.addEventListener('click', exportRatings);
    btnImportRatings.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importRatings);

    // KEYBOARD LISTENER
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  function updateRatedFilterButtons() {
    ratedFilterBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === ratedFilter);
    });
  }

  function handleGlobalKeydown(e) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      if (e.key === 'Escape') activeEl.blur();
      return;
    }

    if (e.key === 'Escape') {
      closeGridModal();
      settingsModal.classList.remove('open');
      // Escape also exits focus mode
      if (focusMode) toggleFocusMode();
      return;
    }

    if (activeTab === 'flashcards') {
      // Left / Right / A / D
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        prevCard();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        nextCard();
      } 
      // Space / Enter / W / Up / Down -> Flip
      else if (e.code === 'Space' || e.key === 'Enter' || e.code === 'KeyW' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        flipCard();
      }
      // 1, 2, 3 Number keys -> Rate
      else if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        setRating(1);
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        setRating(2);
      } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        setRating(3);
      }
      // S or P key -> Pronounce word
      else if (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        speakCurrentWord();
      }
      // F key -> Toggle Focus Mode
      else if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFocusMode();
      }
    }
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
