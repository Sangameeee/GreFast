/**
 * GRE Verbal Mastery Suite - Home Portal Logic
 * Automatically reads live study statistics from LocalStorage for both
 * Text Completion (TC) and Vocabulary Master (Misc) modules.
 */

(function () {
  'use strict';

  const TC_STORAGE_KEY = 'GRE_BIGBOOK_TC_STORAGE_V1';
  const VOCAB_RATINGS_KEY = 'gre_vocab_ratings_v1';
  const VOCAB_CUSTOM_KEY = 'gre_vocab_custom_words_v1';
  const RC_STORAGE_KEY = 'gre_rc_mastery_stats_v1';

  function safeParse(jsonString, fallback) {
    if (!jsonString) return fallback;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn('JSON parse error:', e);
      return fallback;
    }
  }

  function loadRCStats() {
    const raw = localStorage.getItem(RC_STORAGE_KEY);
    const data = safeParse(raw, {});
    const completed = data.completedPassages || {};
    const compKeys = Object.keys(completed);

    let totalScore = 0;
    let totalGraded = 0;
    let shortDone = 0;
    let longDone = 0;

    compKeys.forEach(pId => {
      const rec = completed[pId];
      if (rec) {
        totalScore += (rec.score || 0);
        totalGraded += (rec.total || 0);
        if (pId.endsWith('_p1') || pId.includes('_p1')) {
          // Check if short or long from id or record
          if (rec.total <= 4) shortDone++;
          else longDone++;
        } else {
          if (rec.total <= 4) shortDone++;
          else longDone++;
        }
      }
    });

    const accuracy = totalGraded > 0 ? Math.round((totalScore / totalGraded) * 100) : 0;

    const elPassages = document.getElementById('stat-rc-passages');
    const elAcc = document.getElementById('stat-rc-accuracy');
    const elShort = document.getElementById('stat-rc-short');
    const elLong = document.getElementById('stat-rc-long');
    const elHeroRC = document.getElementById('hero-rc-completed');

    if (elPassages) elPassages.textContent = `${compKeys.length}/108`;
    if (elAcc) elAcc.textContent = `${accuracy}%`;
    if (elShort) elShort.textContent = `${shortDone}/54`;
    if (elLong) elLong.textContent = `${longDone}/54`;
    if (elHeroRC) elHeroRC.textContent = `${compKeys.length} / 108 passages completed`;
  }

  function loadTCStats() {
    const raw = localStorage.getItem(TC_STORAGE_KEY);
    const data = safeParse(raw, null);

    let completedSectionsCount = 0;
    let questionsSolved = 0;
    let totalScore = 0;
    let totalQuestionsGraded = 0;
    let completedTestsCount = 0;

    if (data && data.completedSections) {
      const sections = data.completedSections;
      const sectionKeys = Object.keys(sections);
      completedSectionsCount = sectionKeys.length;

      // Group by test number to find completed tests (both sec 1 and sec 2)
      const testMap = {};

      sectionKeys.forEach((key) => {
        const secData = sections[key];
        if (secData) {
          const score = typeof secData.score === 'number' ? secData.score : 0;
          const total = typeof secData.total === 'number' ? secData.total : 7;
          totalScore += score;
          totalQuestionsGraded += total;

          if (secData.answers) {
            questionsSolved += Object.keys(secData.answers).length;
          } else {
            questionsSolved += total;
          }

          // e.g., "1_1" or "test_1_sec_1"
          const match = key.match(/(?:test_)?(\d+)[_sec]+(\d+)/i);
          if (match) {
            const testNum = match[1];
            if (!testMap[testNum]) testMap[testNum] = new Set();
            testMap[testNum].add(match[2]);
          }
        }
      });

      // A test is finished if it has both sections (section 1 and section 2)
      Object.keys(testMap).forEach((tNum) => {
        if (testMap[tNum].size >= 2) {
          completedTestsCount++;
        }
      });
    }

    const accuracy = totalQuestionsGraded > 0
      ? Math.round((totalScore / totalQuestionsGraded) * 100)
      : 0;

    // Update DOM elements
    const elTests = document.getElementById('stat-tc-tests');
    const elSections = document.getElementById('stat-tc-sections');
    const elQuestions = document.getElementById('stat-tc-questions');
    const elAccuracy = document.getElementById('stat-tc-accuracy');
    const elHeroSolved = document.getElementById('hero-tc-solved');

    if (elTests) elTests.textContent = `${completedTestsCount}/27`;
    if (elSections) elSections.textContent = `${completedSectionsCount}/54`;
    if (elQuestions) elQuestions.textContent = `${questionsSolved}/378`;
    if (elAccuracy) elAccuracy.textContent = `${accuracy}%`;
    if (elHeroSolved) elHeroSolved.textContent = `${questionsSolved} / 378 questions solved`;
  }

  function loadVocabStats() {
    const rawRatings = localStorage.getItem(VOCAB_RATINGS_KEY);
    const ratings = safeParse(rawRatings, {});

    const rawCustom = localStorage.getItem(VOCAB_CUSTOM_KEY);
    const customWords = safeParse(rawCustom, []);

    let mastered = 0; // Rating 1
    let review = 0;   // Rating 2
    let hard = 0;     // Rating 3

    if (ratings && typeof ratings === 'object') {
      Object.values(ratings).forEach((val) => {
        const num = Number(val);
        if (num === 1) mastered++;
        else if (num === 2) review++;
        else if (num === 3) hard++;
      });
    }

    const customCount = Array.isArray(customWords) ? customWords.length : 0;
    const totalRated = mastered + review + hard;

    const elMastered = document.getElementById('stat-vocab-mastered');
    const elReview = document.getElementById('stat-vocab-review');
    const elHard = document.getElementById('stat-vocab-hard');
    const elCustom = document.getElementById('stat-vocab-custom');
    const elHeroVocab = document.getElementById('hero-vocab-mastered');

    if (elMastered) elMastered.textContent = mastered;
    if (elReview) elReview.textContent = review;
    if (elHard) elHard.textContent = hard;
    if (elCustom) elCustom.textContent = customCount;
    if (elHeroVocab) elHeroVocab.textContent = `${mastered} / 1,020+ words mastered`;
  }

  // Quick reset progress helper with confirmation
  function setupResetHelper() {
    const resetBtn = document.getElementById('btn-reset-all-stats');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all saved progress for Text Completion, Reading Comprehension, and Vocabulary? This action cannot be undone.')) {
          localStorage.removeItem(TC_STORAGE_KEY);
          localStorage.removeItem(VOCAB_RATINGS_KEY);
          localStorage.removeItem(VOCAB_CUSTOM_KEY);
          localStorage.removeItem(RC_STORAGE_KEY);
          loadTCStats();
          loadRCStats();
          loadVocabStats();
          alert('Study progress has been reset.');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadTCStats();
    loadRCStats();
    loadVocabStats();
    setupResetHelper();
  });
})();

