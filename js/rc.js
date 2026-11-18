/**
 * GRE Big Book Reading Comprehension (RC) Master Controller
 * Split-screen desktop (Passage Left, Questions Right) & stacked mobile (Passage Top, Questions Bottom)
 * Supports 108 passages (54 short, 54 long), 594 questions, practice and test modes, line numbers, and persistence.
 */

(function () {
  'use strict';

  // --- STATE ---
  let passages = [];
  let currentPassage = null;
  let currentQuestionIdx = 0;
  let currentPassageIdx = 0;

  // Mode: 'practice' (instant check) or 'test' (timed exam)
  let quizMode = 'practice';

  // Answers & UI state for current passage
  let selectedAnswers = {}; // qId -> choice letter
  let revealedAnswers = {}; // qId -> boolean (checked)
  let flaggedQuestions = new Set(); // qId

  // Filters
  let activeTypeFilter = 'all'; // 'all', 'short', 'long'
  let activeTestFilter = 'all';
  let activeStatusFilter = 'all';
  let activeSearch = '';

  // Reader typography preferences
  let readerFontSize = 'normal'; // 'sm', 'normal', 'lg'
  let readerFontFamily = 'serif'; // 'serif', 'sans'
  let showLineNumbers = true;

  // Timer
  let timerInterval = null;
  let elapsedSeconds = 0;

  // LocalStorage Key
  const STORAGE_KEY = 'gre_rc_mastery_stats_v1';
  let userStats = {
    completedPassages: {}, // passageId -> { score, total, time, date }
    bookmarkedPassages: {}, // passageId -> boolean
    questionHistory: {} // qId -> { correct: bool }
  };

  // --- INITIALIZATION ---
  function init() {
    loadUserStats();

    // Load data from global RC_DATA (data/rc_data.js)
    if (window.RC_DATA && window.RC_DATA.passages) {
      passages = window.RC_DATA.passages;
      setupApp();
    } else {
      console.error('Failed to load RC questions: RC_DATA missing');
    }
  }

  function loadUserStats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        userStats = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse saved RC stats:', e);
    }
  }

  function saveUserStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userStats));
    } catch (e) {
      console.warn('Could not save RC stats:', e);
    }
  }

  function setupApp() {
    populateTestFilterDropdown();
    updateDashboardStats();
    renderPassagesGrid();
    setupEventListeners();

    // Check URL parameters for direct link e.g. ?p=t1_s1_p1 or ?type=short
    const urlParams = new URLSearchParams(window.location.search);
    const pParam = urlParams.get('p');
    const typeParam = urlParams.get('type');

    if (pParam) {
      const targetIdx = passages.findIndex(p => p.id === pParam);
      if (targetIdx !== -1) {
        launchQuiz(targetIdx);
        return;
      }
    }

    if (typeParam === 'short' || typeParam === 'long') {
      setTypeFilter(typeParam);
    }
  }

  // --- DASHBOARD & FILTERING ---
  function populateTestFilterDropdown() {
    const select = document.getElementById('select-test-filter');
    if (!select) return;

    select.innerHTML = '<option value="all">All 27 Tests</option>';
    for (let t = 1; t <= 27; t++) {
      const opt = document.createElement('option');
      opt.value = t.toString();
      opt.textContent = `Test ${t}`;
      select.appendChild(opt);
    }
  }

  function updateDashboardStats() {
    const totalP = passages.length;
    const shortP = passages.filter(p => p.type === 'short').length;
    const longP = passages.filter(p => p.type === 'long').length;
    const totalQ = passages.reduce((acc, p) => acc + (p.questions ? p.questions.length : 0), 0);

    const completedIds = Object.keys(userStats.completedPassages || {});
    const completedCount = completedIds.length;

    let totalScore = 0;
    let totalPossible = 0;
    completedIds.forEach(id => {
      const record = userStats.completedPassages[id];
      if (record) {
        totalScore += (record.score || 0);
        totalPossible += (record.total || 0);
      }
    });

    const accuracy = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    const elTotalP = document.getElementById('stat-total-passages');
    const elShortP = document.getElementById('stat-short-passages');
    const elLongP = document.getElementById('stat-long-passages');
    const elTotalQ = document.getElementById('stat-total-questions');
    const elUserCompleted = document.getElementById('stat-user-completed');
    const elUserAccuracy = document.getElementById('stat-user-accuracy');

    if (elTotalP) elTotalP.textContent = totalP;
    if (elShortP) elShortP.textContent = shortP;
    if (elLongP) elLongP.textContent = longP;
    if (elTotalQ) elTotalQ.textContent = totalQ;
    if (elUserCompleted) elUserCompleted.textContent = `${completedCount} / ${totalP}`;
    if (elUserAccuracy) elUserAccuracy.textContent = totalPossible > 0 ? `${accuracy}%` : '--%';
  }

  function getFilteredPassages() {
    return passages.filter(p => {
      // Type filter
      if (activeTypeFilter !== 'all' && p.type !== activeTypeFilter) {
        return false;
      }
      // Test filter
      if (activeTestFilter !== 'all' && p.test_no.toString() !== activeTestFilter) {
        return false;
      }
      // Status filter
      const isCompleted = !!userStats.completedPassages[p.id];
      const isBookmarked = !!userStats.bookmarkedPassages[p.id];
      if (activeStatusFilter === 'completed' && !isCompleted) return false;
      if (activeStatusFilter === 'unattempted' && isCompleted) return false;
      if (activeStatusFilter === 'bookmarked' && !isBookmarked) return false;

      // Search query
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        const inTitle = p.title && p.title.toLowerCase().includes(q);
        const inText = p.text && p.text.toLowerCase().includes(q);
        const inId = p.id && p.id.toLowerCase().includes(q);
        if (!inTitle && !inText && !inId) return false;
      }

      return true;
    });
  }

  function renderPassagesGrid() {
    const container = document.getElementById('passages-container');
    if (!container) return;

    const filtered = getFilteredPassages();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-light);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.35rem;">No passages match your filters</h3>
          <p style="font-size: 0.85rem;">Try clearing your search term or switching to "All Passages".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((p) => {
      const realIdx = passages.findIndex(item => item.id === p.id);
      const isShort = p.type === 'short';
      const qCount = p.questions ? p.questions.length : 0;
      const wordCount = p.text ? p.text.split(/\s+/).length : 0;
      const estLines = isShort ? '15–25 lines' : '55–75 lines';

      // Completion badge
      const compInfo = userStats.completedPassages[p.id];
      let statusBadge = '<span class="passage-score-badge unattempted">Not Started</span>';
      if (compInfo) {
        const pct = Math.round((compInfo.score / compInfo.total) * 100);
        statusBadge = `<span class="passage-score-badge completed">Score: ${compInfo.score}/${compInfo.total} (${pct}%)</span>`;
      }

      // Calculate average difficulty p+
      let avgP = null;
      if (p.questions && p.questions.length > 0) {
        const pVals = p.questions.map(q => q.p_plus).filter(val => typeof val === 'number');
        if (pVals.length > 0) {
          avgP = Math.round(pVals.reduce((a, b) => a + b, 0) / pVals.length);
        }
      }

      return `
        <div class="passage-card ${isShort ? 'card-short' : 'card-long'}" data-index="${realIdx}">
          <div class="passage-card-top">
            <span class="passage-sec-tag">Test ${p.test_no} • Section ${p.section_no}</span>
            <span class="passage-type-badge ${isShort ? 'short' : 'long'}">
              ${isShort ? '⚡ Short Passage' : '📜 Long Passage'} (${qCount} Qs)
            </span>
          </div>

          <h3 class="passage-card-title">${escapeHtml(p.title || 'Reading Passage')}</h3>
          <p class="passage-card-snippet">${escapeHtml(p.text ? p.text.substring(0, 180) + '...' : '')}</p>

          <div class="passage-card-meta">
            <span>Range: <strong>${p.question_range || 'Q17–Q27'}</strong></span>
            <span>•</span>
            <span>${wordCount} words</span>
            <span>•</span>
            <span>${estLines}</span>
            ${avgP !== null ? `<span>•</span><span>Avg p+: <strong>${avgP}%</strong></span>` : ''}
          </div>

          <div class="passage-card-bottom">
            ${statusBadge}
            <span class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.775rem;">
              Take Quiz →
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.passage-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        launchQuiz(idx);
      });
    });
  }

  function setTypeFilter(type) {
    activeTypeFilter = type;
    document.querySelectorAll('#filter-type-pills .filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    renderPassagesGrid();
  }

  // --- QUIZ LAUNCH & CONTROLS ---
  function launchQuiz(passageIdx) {
    if (passageIdx < 0 || passageIdx >= passages.length) return;

    currentPassageIdx = passageIdx;
    currentPassage = passages[passageIdx];
    currentQuestionIdx = 0;

    selectedAnswers = {};
    revealedAnswers = {};
    flaggedQuestions.clear();

    // Start Timer
    startTimer();

    // Switch views
    const dashView = document.getElementById('rc-dashboard-view');
    const quizView = document.getElementById('rc-quiz-view');
    if (dashView) dashView.style.display = 'none';
    if (quizView) quizView.classList.add('active');

    // Update Header
    updateQuizHeader();

    // Render Passage Content
    renderPassageText();

    // Render Question Navigation Pills
    renderQuestionPills();

    // Render Current Question
    renderCurrentQuestion();

    // Scroll to top of both panes
    const panePassage = document.getElementById('pane-passage');
    const paneQuestions = document.getElementById('pane-questions');
    if (panePassage) panePassage.scrollTop = 0;
    if (paneQuestions) paneQuestions.scrollTop = 0;
  }

  function backToHub() {
    stopTimer();

    const dashView = document.getElementById('rc-dashboard-view');
    const quizView = document.getElementById('rc-quiz-view');
    if (dashView) dashView.style.display = 'block';
    if (quizView) quizView.classList.remove('active');

    updateDashboardStats();
    renderPassagesGrid();
  }

  function updateQuizHeader() {
    if (!currentPassage) return;

    const elTag = document.getElementById('quiz-passage-tag');
    const elBadge = document.getElementById('quiz-passage-badge');

    if (elTag) {
      elTag.textContent = `Test ${currentPassage.test_no} • Section ${currentPassage.section_no}`;
    }

    if (elBadge) {
      const isShort = currentPassage.type === 'short';
      const qCount = currentPassage.questions ? currentPassage.questions.length : 0;
      elBadge.textContent = `${isShort ? 'Short Passage' : 'Long Passage'} (${qCount} Qs)`;
      elBadge.className = `quiz-passage-badge ${isShort ? 'short' : 'long'}`;
      if (isShort) {
        elBadge.style.background = 'var(--accent-short-subtle)';
        elBadge.style.color = 'var(--accent-short)';
        elBadge.style.border = '1px solid var(--accent-short-border)';
      } else {
        elBadge.style.background = 'var(--accent-long-subtle)';
        elBadge.style.color = 'var(--accent-long)';
        elBadge.style.border = '1px solid var(--accent-long-border)';
      }
    }
  }

  // --- PASSAGE RENDERING ---
  function renderPassageText() {
    if (!currentPassage) return;

    const elHeadline = document.getElementById('passage-headline');
    const elRange = document.getElementById('passage-meta-range');
    const elWordCount = document.getElementById('passage-meta-wordcount');
    const elReadTime = document.getElementById('passage-meta-readtime');
    const elBody = document.getElementById('passage-text-body');
    const elRuler = document.getElementById('passage-line-ruler');
    const proseContainer = document.getElementById('passage-prose-content');

    if (elHeadline) elHeadline.textContent = currentPassage.title || 'Reading Passage';
    if (elRange) elRange.textContent = currentPassage.question_range || `Q17–Q${17 + (currentPassage.questions ? currentPassage.questions.length - 1 : 6)}`;

    const text = currentPassage.text || '';
    const words = text.split(/\s+/).filter(Boolean).length;
    if (elWordCount) elWordCount.textContent = `~${words} words`;

    const estMinutes = Math.max(1, Math.ceil(words / 200));
    if (elReadTime) elReadTime.textContent = `~${estMinutes} min read`;

    // Render Paragraphs
    const paragraphs = text.split(/\n\s*\n+/).filter(Boolean);
    if (elBody) {
      elBody.innerHTML = paragraphs.map(p => `
        <p class="passage-paragraph">${escapeHtml(p.trim())}</p>
      `).join('');
    }

    // Apply Typography Preferences
    if (proseContainer) {
      proseContainer.classList.toggle('font-sans', readerFontFamily === 'sans');
      proseContainer.classList.remove('size-sm', 'size-lg');
      if (readerFontSize === 'sm') proseContainer.classList.add('size-sm');
      if (readerFontSize === 'lg') proseContainer.classList.add('size-lg');
      proseContainer.classList.toggle('show-line-numbers', showLineNumbers);
    }

    // Generate Line Markers
    if (elRuler) {
      elRuler.style.display = showLineNumbers ? 'flex' : 'none';
      if (showLineNumbers) {
        // Approx 1 line per 12 words
        const totalEstimatedLines = Math.max(15, Math.ceil(words / 11));
        const markers = [];
        for (let l = 5; l <= totalEstimatedLines; l += 5) {
          markers.push(`<div class="passage-line-marker">${l}</div>`);
        }
        elRuler.innerHTML = markers.join('');
      } else {
        elRuler.innerHTML = '';
      }
    }
  }

  // --- QUESTIONS & CHOICES RENDERING ---
  function renderQuestionPills() {
    const list = document.getElementById('question-pills-list');
    if (!list || !currentPassage || !currentPassage.questions) return;

    list.innerHTML = currentPassage.questions.map((q, idx) => {
      const qNum = idx + 1;
      const isCurrent = idx === currentQuestionIdx;
      const hasAnswer = selectedAnswers[q.id] !== undefined;
      const isRevealed = revealedAnswers[q.id];
      const isFlagged = flaggedQuestions.has(q.id);

      let classes = ['q-pill'];
      if (isCurrent) classes.push('active');
      if (hasAnswer) classes.push('answered');
      if (isFlagged) classes.push('flagged');

      if (isRevealed && hasAnswer) {
        if (selectedAnswers[q.id] === q.answer) {
          classes.push('correct');
        } else {
          classes.push('incorrect');
        }
      }

      return `
        <button class="${classes.join(' ')}" data-qidx="${idx}" title="Jump to Question ${qNum}">
          ${qNum}
        </button>
      `;
    }).join('');

    list.querySelectorAll('.q-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.qidx, 10);
        goToQuestion(idx);
      });
    });
  }

  function renderCurrentQuestion() {
    if (!currentPassage || !currentPassage.questions) return;
    const questions = currentPassage.questions;
    if (currentQuestionIdx < 0 || currentQuestionIdx >= questions.length) return;

    const q = questions[currentQuestionIdx];
    const totalQ = questions.length;
    const qNum = currentQuestionIdx + 1;

    // Header info
    const elTag = document.getElementById('question-num-tag');
    const elDiff = document.getElementById('question-difficulty-tag');
    const elFlag = document.getElementById('btn-flag-current');

    if (elTag) {
      elTag.textContent = `Question ${qNum} of ${totalQ} • ETS Q${q.question_no}`;
    }

    if (elDiff) {
      if (typeof q.p_plus === 'number') {
        const rating = q.p_plus >= 70 ? 'Easy' : (q.p_plus >= 45 ? 'Medium' : 'Hard');
        elDiff.textContent = `Examinee Accuracy: ${q.p_plus}% (${rating})`;
        elDiff.style.display = 'inline-block';
      } else {
        elDiff.style.display = 'none';
      }
    }

    if (elFlag) {
      const isFlagged = flaggedQuestions.has(q.id);
      elFlag.classList.toggle('active', isFlagged);
      elFlag.innerHTML = isFlagged ? '🚩 Flagged' : '🚩 Flag';
    }

    // Prompt
    const elPrompt = document.getElementById('question-prompt');
    if (elPrompt) {
      elPrompt.textContent = q.prompt || '';
    }

    // Choices
    const elChoices = document.getElementById('choices-list');
    if (elChoices) {
      const choices = q.choices || {};
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const selected = selectedAnswers[q.id];
      const isRevealed = revealedAnswers[q.id];

      elChoices.innerHTML = letters.map(letter => {
        const text = choices[letter] || '';
        const isSelected = selected === letter;
        let choiceClasses = ['choice-item'];

        if (isSelected) choiceClasses.push('selected');

        if (isRevealed) {
          if (letter === q.answer) {
            choiceClasses.push('correct-choice');
          } else if (isSelected && letter !== q.answer) {
            choiceClasses.push('wrong-choice');
          }
        }

        return `
          <div class="${choiceClasses.join(' ')}" data-letter="${letter}" role="radio" aria-checked="${isSelected}">
            <span class="choice-letter">${letter}</span>
            <span class="choice-text">${escapeHtml(text)}</span>
          </div>
        `;
      }).join('');

      elChoices.querySelectorAll('.choice-item').forEach(item => {
        item.addEventListener('click', () => {
          selectChoice(item.dataset.letter);
        });
      });
    }

    // Feedback Box
    const elFeedbackBox = document.getElementById('question-feedback-box');
    const elFeedbackTitle = document.getElementById('feedback-status-title');
    const elFeedbackDiff = document.getElementById('feedback-difficulty-badge');
    const elOfficialAns = document.getElementById('feedback-official-ans');

    if (elFeedbackBox) {
      const isRevealed = revealedAnswers[q.id];
      if (isRevealed) {
        elFeedbackBox.classList.add('active');
        const isCorrect = selectedAnswers[q.id] === q.answer;

        if (elFeedbackTitle) {
          elFeedbackTitle.className = `feedback-status-title ${isCorrect ? 'correct' : 'incorrect'}`;
          elFeedbackTitle.textContent = isCorrect ? '✓ Correct Answer!' : '✗ Incorrect Choice';
        }

        if (elFeedbackDiff) {
          if (typeof q.p_plus === 'number') {
            elFeedbackDiff.textContent = `ETS Examinee Accuracy: ${q.p_plus}%`;
            elFeedbackDiff.style.display = 'inline-block';
          } else {
            elFeedbackDiff.style.display = 'none';
          }
        }

        if (elOfficialAns) {
          elOfficialAns.textContent = `${q.answer}`;
        }
      } else {
        elFeedbackBox.classList.remove('active');
      }
    }

    // Action Buttons
    updateActionButtons();
  }

  function selectChoice(letter) {
    if (!currentPassage || !currentPassage.questions) return;
    const q = currentPassage.questions[currentQuestionIdx];

    selectedAnswers[q.id] = letter;

    // If Practice mode and already checked, clicking choice re-renders
    renderCurrentQuestion();
    renderQuestionPills();
  }

  function checkCurrentAnswer() {
    if (!currentPassage || !currentPassage.questions) return;
    const q = currentPassage.questions[currentQuestionIdx];

    if (!selectedAnswers[q.id]) {
      alert('Please select an answer choice (A–E) first.');
      return;
    }

    revealedAnswers[q.id] = true;
    renderCurrentQuestion();
    renderQuestionPills();
  }

  function updateActionButtons() {
    if (!currentPassage || !currentPassage.questions) return;
    const totalQ = currentPassage.questions.length;
    const q = currentPassage.questions[currentQuestionIdx];

    const btnPrev = document.getElementById('btn-prev-question');
    const btnNext = document.getElementById('btn-next-question');
    const btnCheckOrNext = document.getElementById('btn-check-or-next');

    if (btnPrev) {
      btnPrev.disabled = currentQuestionIdx === 0;
      btnPrev.style.opacity = currentQuestionIdx === 0 ? '0.5' : '1';
    }

    if (btnNext) {
      const isLast = currentQuestionIdx === totalQ - 1;
      btnNext.textContent = isLast ? 'Review Summary' : 'Next →';
    }

    if (btnCheckOrNext) {
      if (quizMode === 'practice') {
        const isRevealed = revealedAnswers[q.id];
        if (!isRevealed) {
          btnCheckOrNext.textContent = 'Check Answer';
          btnCheckOrNext.style.display = 'inline-flex';
        } else {
          const isLast = currentQuestionIdx === totalQ - 1;
          btnCheckOrNext.textContent = isLast ? 'Finish Passage' : 'Next Question →';
          btnCheckOrNext.style.display = 'inline-flex';
        }
      } else {
        // In test mode, hide instant check button; use Next / Finish
        const isLast = currentQuestionIdx === totalQ - 1;
        btnCheckOrNext.textContent = isLast ? 'Submit Passage' : 'Next Question →';
      }
    }
  }

  function goToQuestion(idx) {
    if (!currentPassage || !currentPassage.questions) return;
    if (idx < 0 || idx >= currentPassage.questions.length) return;

    currentQuestionIdx = idx;
    renderCurrentQuestion();
    renderQuestionPills();
  }

  function handleCheckOrNextAction() {
    if (!currentPassage || !currentPassage.questions) return;
    const totalQ = currentPassage.questions.length;
    const q = currentPassage.questions[currentQuestionIdx];

    if (quizMode === 'practice') {
      const isRevealed = revealedAnswers[q.id];
      if (!isRevealed) {
        checkCurrentAnswer();
      } else {
        if (currentQuestionIdx < totalQ - 1) {
          goToQuestion(currentQuestionIdx + 1);
        } else {
          finishPassageQuiz();
        }
      }
    } else {
      // Test Mode
      if (currentQuestionIdx < totalQ - 1) {
        goToQuestion(currentQuestionIdx + 1);
      } else {
        finishPassageQuiz();
      }
    }
  }

  // --- QUIZ COMPLETION & SUMMARY ---
  function finishPassageQuiz() {
    stopTimer();

    if (!currentPassage || !currentPassage.questions) return;
    const questions = currentPassage.questions;
    const total = questions.length;

    let score = 0;
    let totalPVal = 0;
    let pCount = 0;

    questions.forEach(q => {
      // In test mode, reveal all answers upon submission
      revealedAnswers[q.id] = true;
      if (selectedAnswers[q.id] === q.answer) {
        score++;
      }
      if (typeof q.p_plus === 'number') {
        totalPVal += q.p_plus;
        pCount++;
      }
    });

    const accuracy = Math.round((score / total) * 100);
    const avgP = pCount > 0 ? Math.round(totalPVal / pCount) : 55;

    // Save in userStats
    userStats.completedPassages[currentPassage.id] = {
      score: score,
      total: total,
      time: elapsedSeconds,
      date: new Date().toISOString()
    };
    saveUserStats();

    // Show Summary Modal
    const elModal = document.getElementById('summary-modal-overlay');
    const elScoreNum = document.getElementById('modal-score-num');
    const elTotalNum = document.getElementById('modal-total-num');
    const elScoreSub = document.getElementById('modal-score-subtitle');
    const elStatTime = document.getElementById('modal-stat-time');
    const elStatAcc = document.getElementById('modal-stat-accuracy');
    const elStatAvgP = document.getElementById('modal-stat-avg-p');
    const elBreakdown = document.getElementById('modal-breakdown-list');

    if (elScoreNum) elScoreNum.textContent = score;
    if (elTotalNum) elTotalNum.textContent = total;
    if (elStatTime) elStatTime.textContent = formatTime(elapsedSeconds);
    if (elStatAcc) elStatAcc.textContent = `${accuracy}%`;
    if (elStatAvgP) elStatAvgP.textContent = `${avgP}%`;

    if (elScoreSub) {
      if (score === total) {
        elScoreSub.textContent = '🌟 Flawless Mastery! 100% Score';
      } else if (score >= total * 0.7) {
        elScoreSub.textContent = '👏 Strong Comprehension! Well Done';
      } else {
        elScoreSub.textContent = '📚 Keep Practicing! Review Errors Below';
      }
    }

    if (elBreakdown) {
      elBreakdown.innerHTML = questions.map((q, idx) => {
        const userChoice = selectedAnswers[q.id] || 'None';
        const isCorrect = userChoice === q.answer;
        const pStr = typeof q.p_plus === 'number' ? `p+: ${q.p_plus}%` : '';

        return `
          <div class="summary-q-row">
            <div>
              <strong>Q${idx + 1} (ETS Q${q.question_no})</strong>: 
              <span style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
                ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </span>
              <span style="color: var(--text-light); margin-left: 0.5rem;">
                (Your Choice: <strong>${userChoice}</strong> | Answer: <strong>${q.answer}</strong>)
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-light);">${pStr}</div>
          </div>
        `;
      }).join('');
    }

    if (elModal) elModal.classList.add('active');
  }

  function launchNextPassage() {
    closeSummaryModal();
    const nextIdx = (currentPassageIdx + 1) % passages.length;
    launchQuiz(nextIdx);
  }

  function closeSummaryModal() {
    const elModal = document.getElementById('summary-modal-overlay');
    if (elModal) elModal.classList.remove('active');
    renderQuestionPills();
    renderCurrentQuestion();
  }

  // --- TIMER ---
  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const elTimer = document.getElementById('timer-text');
    if (elTimer) {
      elTimer.textContent = formatTime(elapsedSeconds);
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // --- EVENT LISTENERS & SHORTCUTS ---
  function setupEventListeners() {
    // Nav Logo
    const btnNavLogo = document.getElementById('btn-nav-logo');
    if (btnNavLogo) {
      btnNavLogo.addEventListener('click', backToHub);
    }

    // Back to Hub Button in Quiz
    const btnBack = document.getElementById('btn-back-to-hub');
    if (btnBack) {
      btnBack.addEventListener('click', backToHub);
    }

    // Random Quiz Button
    const btnRandom = document.getElementById('btn-random-quiz');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        const randIdx = Math.floor(Math.random() * passages.length);
        launchQuiz(randIdx);
      });
    }

    // Reset Stats
    const btnResetStats = document.getElementById('btn-reset-stats');
    if (btnResetStats) {
      btnResetStats.addEventListener('click', () => {
        if (confirm('Reset your Reading Comprehension quiz history and statistics?')) {
          userStats = { completedPassages: {}, bookmarkedPassages: {}, questionHistory: {} };
          saveUserStats();
          updateDashboardStats();
          renderPassagesGrid();
        }
      });
    }

    // Quick Launch Cards on Dashboard
    const cardShort = document.getElementById('card-launch-short');
    if (cardShort) {
      cardShort.addEventListener('click', () => {
        const shortPassages = passages.filter(p => p.type === 'short');
        if (shortPassages.length > 0) {
          const rand = shortPassages[Math.floor(Math.random() * shortPassages.length)];
          const idx = passages.findIndex(p => p.id === rand.id);
          launchQuiz(idx);
        }
      });
    }

    const cardLong = document.getElementById('card-launch-long');
    if (cardLong) {
      cardLong.addEventListener('click', () => {
        const longPassages = passages.filter(p => p.type === 'long');
        if (longPassages.length > 0) {
          const rand = longPassages[Math.floor(Math.random() * longPassages.length)];
          const idx = passages.findIndex(p => p.id === rand.id);
          launchQuiz(idx);
        }
      });
    }

    const cardSection = document.getElementById('card-launch-section');
    if (cardSection) {
      cardSection.addEventListener('click', () => {
        // Pick random test and start with passage 1
        const randTest = Math.floor(Math.random() * 27) + 1;
        const testPassages = passages.filter(p => p.test_no === randTest);
        if (testPassages.length > 0) {
          const idx = passages.findIndex(p => p.id === testPassages[0].id);
          launchQuiz(idx);
        }
      });
    }

    // Type Filter Pills
    document.querySelectorAll('#filter-type-pills .filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        setTypeFilter(btn.dataset.type);
      });
    });

    // Test Dropdown
    const selectTest = document.getElementById('select-test-filter');
    if (selectTest) {
      selectTest.addEventListener('change', (e) => {
        activeTestFilter = e.target.value;
        renderPassagesGrid();
      });
    }

    // Status Dropdown
    const selectStatus = document.getElementById('select-status-filter');
    if (selectStatus) {
      selectStatus.addEventListener('change', (e) => {
        activeStatusFilter = e.target.value;
        renderPassagesGrid();
      });
    }

    // Search input
    const inputSearch = document.getElementById('input-search-passages');
    if (inputSearch) {
      inputSearch.addEventListener('input', (e) => {
        activeSearch = e.target.value;
        renderPassagesGrid();
      });
    }

    // Quiz Mode Switcher
    const btnModePractice = document.getElementById('btn-mode-practice');
    const btnModeTest = document.getElementById('btn-mode-test');

    if (btnModePractice && btnModeTest) {
      btnModePractice.addEventListener('click', () => {
        quizMode = 'practice';
        btnModePractice.classList.add('active');
        btnModeTest.classList.remove('active');
        renderCurrentQuestion();
      });

      btnModeTest.addEventListener('click', () => {
        quizMode = 'test';
        btnModeTest.classList.add('active');
        btnModePractice.classList.remove('active');
        renderCurrentQuestion();
      });
    }

    // Reader Typography Controls
    const btnFontSmaller = document.getElementById('btn-font-smaller');
    const btnFontLarger = document.getElementById('btn-font-larger');
    const btnFontFamily = document.getElementById('btn-font-family');
    const btnLineNumbers = document.getElementById('btn-line-numbers');

    if (btnFontSmaller) {
      btnFontSmaller.addEventListener('click', () => {
        if (readerFontSize === 'lg') readerFontSize = 'normal';
        else if (readerFontSize === 'normal') readerFontSize = 'sm';
        renderPassageText();
      });
    }

    if (btnFontLarger) {
      btnFontLarger.addEventListener('click', () => {
        if (readerFontSize === 'sm') readerFontSize = 'normal';
        else if (readerFontSize === 'normal') readerFontSize = 'lg';
        renderPassageText();
      });
    }

    if (btnFontFamily) {
      btnFontFamily.addEventListener('click', () => {
        readerFontFamily = readerFontFamily === 'serif' ? 'sans' : 'serif';
        btnFontFamily.textContent = readerFontFamily === 'serif' ? 'Font: Times New Roman' : 'Font: Arial';
        renderPassageText();
      });
    }

    if (btnLineNumbers) {
      btnLineNumbers.addEventListener('click', () => {
        showLineNumbers = !showLineNumbers;
        btnLineNumbers.textContent = showLineNumbers ? 'Lines: On' : 'Lines: Off';
        btnLineNumbers.classList.toggle('active', showLineNumbers);
        renderPassageText();
      });
    }

    // Flag Question Button
    const btnFlag = document.getElementById('btn-flag-current');
    if (btnFlag) {
      btnFlag.addEventListener('click', () => {
        if (!currentPassage || !currentPassage.questions) return;
        const q = currentPassage.questions[currentQuestionIdx];
        if (flaggedQuestions.has(q.id)) {
          flaggedQuestions.delete(q.id);
        } else {
          flaggedQuestions.add(q.id);
        }
        renderCurrentQuestion();
        renderQuestionPills();
      });
    }

    // Question Navigation Buttons
    const btnPrev = document.getElementById('btn-prev-question');
    const btnNext = document.getElementById('btn-next-question');
    const btnCheckOrNext = document.getElementById('btn-check-or-next');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentQuestionIdx > 0) goToQuestion(currentQuestionIdx - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (!currentPassage || !currentPassage.questions) return;
        if (currentQuestionIdx < currentPassage.questions.length - 1) {
          goToQuestion(currentQuestionIdx + 1);
        } else {
          finishPassageQuiz();
        }
      });
    }

    if (btnCheckOrNext) {
      btnCheckOrNext.addEventListener('click', handleCheckOrNextAction);
    }

    // Summary Modal Buttons
    const btnModalReview = document.getElementById('btn-modal-review');
    const btnModalDash = document.getElementById('btn-modal-dashboard');
    const btnModalNext = document.getElementById('btn-modal-next-passage');

    if (btnModalReview) btnModalReview.addEventListener('click', closeSummaryModal);
    if (btnModalDash) {
      btnModalDash.addEventListener('click', () => {
        closeSummaryModal();
        backToHub();
      });
    }
    if (btnModalNext) btnModalNext.addEventListener('click', launchNextPassage);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger if inside search input
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      const quizView = document.getElementById('rc-quiz-view');
      if (!quizView || !quizView.classList.contains('active')) return;

      // Close modal on Escape
      const modal = document.getElementById('summary-modal-overlay');
      if (modal && modal.classList.contains('active')) {
        if (e.key === 'Escape') closeSummaryModal();
        return;
      }

      const key = e.key.toUpperCase();

      // Choice A-E
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        e.preventDefault();
        selectChoice(key);
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
        selectChoice(map[key]);
      } else if (e.key === 'ArrowRight' || key === 'K') {
        e.preventDefault();
        if (currentPassage && currentPassage.questions && currentQuestionIdx < currentPassage.questions.length - 1) {
          goToQuestion(currentQuestionIdx + 1);
        }
      } else if (e.key === 'ArrowLeft' || key === 'J') {
        e.preventDefault();
        if (currentQuestionIdx > 0) {
          goToQuestion(currentQuestionIdx - 1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCheckOrNextAction();
      } else if (key === 'F') {
        e.preventDefault();
        if (btnFlag) btnFlag.click();
      }
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

