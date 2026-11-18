/**
 * GRE Big Book Text Completion Quiz Application
 * Handles Rapid Timed Mode & Practice Prediction Mode
 * Full Persistent Storage in LocalStorage
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'GRE_BIGBOOK_TC_STORAGE_V1';
  const DEFAULT_TIMER_SECONDS = 60;

  // --- App State ---
  let state = {
    allQuestions: [],
    testsMap: {},      // test_no -> { section_no -> [questions] }
    sectionsList: [],  // list of { test_no, section_no, id, questions }
    
    // Active session
    currentTestNo: 1,
    currentSectionNo: 1,
    currentQIndex: 0,  // 0 to 6
    activeMode: 'rapid', // 'rapid' or 'practice'
    
    // User responses for active section: questionId -> { choice, correct, guesses: [g1, g2], revealed: bool }
    activeAnswers: {},
    
    // Rapid timer state
    timerSecondsPerQ: DEFAULT_TIMER_SECONDS,
    timerRemaining: DEFAULT_TIMER_SECONDS,
    timerInterval: null,
    isTimerRunning: false,
    
    // Persistent profile
    storedData: {
      completedSections: {}, // sectionId -> { score, total: 7, date, mode, answers: {} }
      bookmarks: [],         // list of question ids
      settings: {
        timerSeconds: DEFAULT_TIMER_SECONDS,
        lastMode: 'rapid'
      }
    }
  };

  // --- Storage Helper Functions ---
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = jsonSafeParse(raw);
        if (parsed) {
          state.storedData = Object.assign(state.storedData, parsed);
          if (state.storedData.settings && state.storedData.settings.timerSeconds) {
            state.timerSecondsPerQ = state.storedData.settings.timerSeconds;
          }
          if (state.storedData.settings && state.storedData.settings.lastMode) {
            state.activeMode = state.storedData.settings.lastMode;
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage error or unavailable:', e);
    }
  }

  function saveToStorage() {
    try {
      state.storedData.settings.timerSeconds = state.timerSecondsPerQ;
      state.storedData.settings.lastMode = state.activeMode;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storedData));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  function jsonSafeParse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  // --- Initialization ---
  async function initApp() {
    loadFromStorage();

    // 1. Load Question Data
    if (Array.isArray(window.TC_DATA)) {
      state.allQuestions = window.TC_DATA;
    }

    if (!state.allQuestions || state.allQuestions.length === 0) {
      alert('Error: Could not load questions data.');
      return;
    }

    // Organize into structure
    organizeQuestions();

    // Set initial mode UI
    updateModeSwitcherUI();

    // Render Home / Tests Grid
    renderHomeView();
    updateGlobalStats();

    // Setup Event Listeners
    setupEventListeners();
  }

  // Organize 378 questions into tests & sections
  function organizeQuestions() {
    state.testsMap = {};
    state.sectionsList = [];

    state.allQuestions.forEach(q => {
      const t = q.test_no;
      const s = q.section_no;
      if (!state.testsMap[t]) state.testsMap[t] = {};
      if (!state.testsMap[t][s]) state.testsMap[t][s] = [];
      state.testsMap[t][s].push(q);
    });

    // Sort questions by question_no in each section
    for (const t in state.testsMap) {
      for (const s in state.testsMap[t]) {
        state.testsMap[t][s].sort((a, b) => a.question_no - b.question_no);
        state.sectionsList.push({
          id: `t${t}_s${s}`,
          test_no: parseInt(t),
          section_no: parseInt(s),
          questions: state.testsMap[t][s]
        });
      }
    }

    // Sort sections chronologically
    state.sectionsList.sort((a, b) => {
      if (a.test_no !== b.test_no) return a.test_no - b.test_no;
      return a.section_no - b.section_no;
    });
  }

  // --- View Switching ---
  function showView(viewId) {
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- Mode Switching ---
  function setQuizMode(mode) {
    state.activeMode = mode;
    saveToStorage();
    updateModeSwitcherUI();

    // If currently on quiz view, re-render question to apply mode changes
    const quizView = document.getElementById('view-quiz');
    if (quizView && quizView.classList.contains('active')) {
      renderCurrentQuestion();
    }
  }

  function updateModeSwitcherUI() {
    const btnRapid = document.getElementById('btn-mode-rapid');
    const btnPractice = document.getElementById('btn-mode-practice');
    if (state.activeMode === 'rapid') {
      btnRapid.classList.add('active');
      btnPractice.classList.remove('active');
    } else {
      btnPractice.classList.add('active');
      btnRapid.classList.remove('active');
    }
  }

  // --- Stats Calculations ---
  function calculateStats() {
    const completed = state.storedData.completedSections;
    const completedKeys = Object.keys(completed);
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;

    completedKeys.forEach(secId => {
      const data = completed[secId];
      if (data && typeof data.score === 'number') {
        totalCorrect += data.score;
        totalQuestionsAnswered += (data.total || 7);
      }
    });

    const acc = totalQuestionsAnswered > 0 ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : 0;
    
    // Count distinct tests finished
    const finishedTests = new Set();
    completedKeys.forEach(secId => {
      const parts = secId.match(/t(\d+)_s(\d+)/);
      if (parts) {
        finishedTests.add(parts[1]);
      }
    });

    return {
      completedSectionsCount: completedKeys.length,
      finishedTestsCount: finishedTests.size,
      totalQuestionsAnswered,
      totalCorrect,
      accuracyRate: acc
    };
  }

  function updateGlobalStats() {
    const stats = calculateStats();
    
    // Header
    const solvedEl = document.getElementById('header-solved-count');
    const accEl = document.getElementById('header-acc-rate');
    if (solvedEl) solvedEl.textContent = stats.totalQuestionsAnswered;
    if (accEl) accEl.textContent = `${stats.accuracyRate}%`;

    // Dashboard Banner
    const dashTests = document.getElementById('dash-tests-done');
    const dashAcc = document.getElementById('dash-accuracy');
    const dashStreak = document.getElementById('dash-streak');
    if (dashTests) dashTests.textContent = `${stats.finishedTestsCount}/27`;
    if (dashAcc) dashAcc.textContent = `${stats.accuracyRate}%`;
    if (dashStreak) dashStreak.textContent = `${stats.completedSectionsCount}`;

    // Modal
    const mTotal = document.getElementById('modal-stat-total');
    const mAcc = document.getElementById('modal-stat-accuracy');
    const mSecs = document.getElementById('modal-stat-sections');
    if (mTotal) mTotal.textContent = stats.totalQuestionsAnswered;
    if (mAcc) mAcc.textContent = `${stats.accuracyRate}%`;
    if (mSecs) mSecs.textContent = `${stats.completedSectionsCount}/54`;
  }

  // --- Home / Tests Grid View ---
  function renderHomeView() {
    const container = document.getElementById('tests-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const searchTerm = (document.getElementById('test-search-input')?.value || '').toLowerCase().trim();

    // Iterate through all 27 tests
    for (let t = 1; t <= 27; t++) {
      const secMap = state.testsMap[t];
      if (!secMap) continue;

      const secNums = Object.keys(secMap).map(n => parseInt(n)).sort((a, b) => a - b);
      
      // Filter test card if searchTerm
      if (searchTerm) {
        const matchesTest = `test ${t}`.includes(searchTerm) || `test${t}`.includes(searchTerm);
        let matchesQuestions = false;
        secNums.forEach(s => {
          secMap[s].forEach(q => {
            if (q.prompt.toLowerCase().includes(searchTerm) || Object.values(q.choices).some(c => c.toLowerCase().includes(searchTerm))) {
              matchesQuestions = true;
            }
          });
        });
        if (!matchesTest && !matchesQuestions) continue;
      }

      const card = document.createElement('div');
      card.className = 'test-card';

      // Header
      const header = document.createElement('div');
      header.className = 'test-card-top';
      header.innerHTML = `
        <span class="test-number">Test ${t}</span>
        <span class="test-q-count">14 Questions</span>
      `;
      card.appendChild(header);

      // Sections List
      const sectionsDiv = document.createElement('div');
      sectionsDiv.className = 'sections-list';

      secNums.forEach(s => {
        const secId = `t${t}_s${s}`;
        const compData = state.storedData.completedSections[secId];
        const isDone = !!compData;

        const row = document.createElement('div');
        row.className = 'section-row';

        let badgeHtml = '';
        if (isDone) {
          badgeHtml = `<span class="section-status-badge status-completed">${compData.score}/7 (${compData.mode || 'done'})</span>`;
        } else {
          badgeHtml = `<span class="section-status-badge status-not-started">7 Qs</span>`;
        }

        row.innerHTML = `
          <div class="section-title-wrap">
            <span class="section-name">Section ${s}</span>
            ${badgeHtml}
          </div>
          <div class="section-actions">
            <button class="btn btn-sm btn-start-rapid" data-test="${t}" data-sec="${s}" title="Start Rapid Timed Quiz">
              ⚡ Rapid
            </button>
            <button class="btn btn-sm btn-start-practice" data-test="${t}" data-sec="${s}" title="Start Practice Guess Mode">
              📝 Practice
            </button>
          </div>
        `;

        sectionsDiv.appendChild(row);
      });

      card.appendChild(sectionsDiv);
      container.appendChild(card);
    }
  }

  // --- Start Quiz Section ---
  function startQuiz(testNo, secNo, mode) {
    state.currentTestNo = testNo;
    state.currentSectionNo = secNo;
    state.currentQIndex = 0;
    if (mode) state.activeMode = mode;
    updateModeSwitcherUI();

    // Reset active answers for this fresh attempt
    state.activeAnswers = {};

    showView('view-quiz');
    renderCurrentQuestion();
  }

  // --- Quiz Render Logic ---
  function getActiveSectionQuestions() {
    if (!state.testsMap[state.currentTestNo] || !state.testsMap[state.currentTestNo][state.currentSectionNo]) {
      return [];
    }
    return state.testsMap[state.currentTestNo][state.currentSectionNo];
  }

  function renderCurrentQuestion() {
    const questions = getActiveSectionQuestions();
    if (!questions || questions.length === 0) return;

    const q = questions[state.currentQIndex];
    if (!q) return;

    // 1. Update Quiz Header Meta
    const titleEl = document.getElementById('quiz-section-title');
    const modePill = document.getElementById('quiz-mode-pill');
    if (titleEl) titleEl.textContent = `Test ${state.currentTestNo} • Section ${state.currentSectionNo}`;
    
    if (modePill) {
      if (state.activeMode === 'rapid') {
        modePill.className = 'quiz-mode-pill rapid';
        modePill.textContent = '⚡ Rapid Mode';
      } else {
        modePill.className = 'quiz-mode-pill practice';
        modePill.textContent = '📝 Practice Mode';
      }
    }

    // 2. Timer Setup for Rapid Mode
    const timerWidget = document.getElementById('quiz-timer-widget');
    if (timerWidget) {
      if (state.activeMode === 'rapid' && state.timerSecondsPerQ > 0) {
        timerWidget.style.display = 'flex';
        resetQuestionTimer();
      } else {
        timerWidget.style.display = 'none';
        stopTimer();
      }
    }

    // 3. Render Question Nav Pills (1 to 7)
    renderNavPills(questions);

    // 4. Question Meta Badge
    const counterBadge = document.getElementById('q-counter-badge');
    const blankTypeBadge = document.getElementById('q-blank-type-badge');
    if (counterBadge) counterBadge.textContent = `Question ${state.currentQIndex + 1} of ${questions.length}`;
    if (blankTypeBadge) blankTypeBadge.textContent = q.blanks === 2 ? '2 Blanks' : '1 Blank';

    // 5. Prompt with styled blanks
    const promptEl = document.getElementById('q-sentence-prompt');
    if (promptEl) {
      promptEl.innerHTML = formatSentenceWithBlanks(q.prompt, q.id);
    }

    // 6. Practice Mode Guesses Area vs Options
    const practiceBox = document.getElementById('practice-guessing-box');
    const guessesBanner = document.getElementById('user-guesses-banner');
    const choicesContainer = document.getElementById('choices-container');
    const guessGroup2 = document.getElementById('guess-group-2');
    
    // Existing response for this question
    const existing = state.activeAnswers[q.id] || {};
    const isRevealed = state.activeMode === 'rapid' || existing.revealed;

    if (state.activeMode === 'practice') {
      if (!isRevealed) {
        // Show guessing area
        practiceBox.style.display = 'flex';
        guessesBanner.style.display = 'none';
        choicesContainer.style.display = 'none';

        // Pre-fill guesses if any
        const g1Input = document.getElementById('input-guess-1');
        const g2Input = document.getElementById('input-guess-2');
        if (g1Input) {
          g1Input.value = (existing.guesses && existing.guesses[0]) || '';
          updateWordCount('input-guess-1', 'word-count-1');
        }
        if (g2Input) {
          g2Input.value = (existing.guesses && existing.guesses[1]) || '';
          updateWordCount('input-guess-2', 'word-count-2');
        }

        // Show/hide 2nd blank guess box
        if (guessGroup2) {
          guessGroup2.style.display = q.blanks === 2 ? 'flex' : 'none';
        }
      } else {
        // Options revealed
        practiceBox.style.display = 'none';
        guessesBanner.style.display = 'flex';
        choicesContainer.style.display = 'flex';
        renderGuessesBanner(existing.guesses, q.blanks);
      }
    } else {
      // Rapid Mode
      practiceBox.style.display = 'none';
      guessesBanner.style.display = 'none';
      choicesContainer.style.display = 'flex';
    }

    // 7. Render Choices (A, B, C, D, E)
    renderChoices(q, existing);

    // 8. Explanation Card
    const explCard = document.getElementById('explanation-card');
    if (existing.choice) {
      explCard.classList.add('active');
      const solutionEl = document.getElementById('full-solution-sentence');
      if (solutionEl) {
        solutionEl.innerHTML = createFullSolutionText(q.prompt, q.choices[q.answer]);
      }
    } else {
      explCard.classList.remove('active');
    }

    // 9. Footer Nav Buttons
    const btnPrev = document.getElementById('btn-prev-q');
    const btnNext = document.getElementById('btn-next-q');
    const btnFinish = document.getElementById('btn-finish-section');

    if (btnPrev) btnPrev.disabled = state.currentQIndex === 0;

    const isLastQ = state.currentQIndex === questions.length - 1;
    if (isLastQ) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnFinish) btnFinish.style.display = 'inline-flex';
    } else {
      if (btnNext) btnNext.style.display = 'inline-flex';
      if (btnFinish) btnFinish.style.display = 'none';
    }

    // 10. Bookmark Star
    updateBookmarkButton(q.id);
  }

  // Format prompt sentence replacing '________' with highlighted span
  function formatSentenceWithBlanks(promptText, qId) {
    let blankIdx = 0;
    const existing = state.activeAnswers[qId] || {};
    const guesses = existing.guesses || [];

    // Replace ________ with a customized span
    return promptText.replace(/_{3,}/g, () => {
      blankIdx++;
      const userWord = guesses[blankIdx - 1];
      const textToDisplay = userWord ? `[ ${userWord} ]` : `[ Blank ${blankIdx} ]`;
      return `<span class="sentence-blank-highlight blank-${blankIdx}">${escapeHtml(textToDisplay)}</span>`;
    });
  }

  function renderNavPills(questions) {
    const container = document.getElementById('question-nav-pills');
    if (!container) return;
    container.innerHTML = '';

    questions.forEach((q, idx) => {
      const pill = document.createElement('button');
      pill.className = 'q-nav-pill';
      pill.textContent = idx + 1;
      pill.title = `Go to Question ${idx + 1}`;

      const res = state.activeAnswers[q.id];
      if (res && res.choice) {
        if (res.correct) {
          pill.classList.add('answered-correct');
        } else {
          pill.classList.add('answered-incorrect');
        }
      }

      if (idx === state.currentQIndex) {
        pill.classList.add('active');
      }

      pill.addEventListener('click', () => {
        state.currentQIndex = idx;
        renderCurrentQuestion();
      });

      container.appendChild(pill);
    });
  }

  function renderGuessesBanner(guesses, blanksCount) {
    const container = document.getElementById('guesses-chips-container');
    if (!container) return;
    container.innerHTML = '';

    const g1 = (guesses && guesses[0]) ? guesses[0] : '(no guess)';
    const chip1 = document.createElement('span');
    chip1.className = 'guess-chip';
    chip1.textContent = `Blank 1: ${g1}`;
    container.appendChild(chip1);

    if (blanksCount === 2) {
      const g2 = (guesses && guesses[1]) ? guesses[1] : '(no guess)';
      const chip2 = document.createElement('span');
      chip2.className = 'guess-chip';
      chip2.textContent = `Blank 2: ${g2}`;
      container.appendChild(chip2);
    }
  }

  function renderChoices(q, existing) {
    const container = document.getElementById('choices-container');
    if (!container) return;
    container.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const hasAnswered = !!existing.choice;

    letters.forEach(letter => {
      const choiceText = q.choices[letter] || '';
      const item = document.createElement('div');
      item.className = 'choice-item';

      if (hasAnswered) {
        item.classList.add('disabled');
        if (letter === q.answer) {
          item.classList.add('correct');
        } else if (letter === existing.choice && !existing.correct) {
          item.classList.add('incorrect');
        }
      }

      // Format words: if double blank (has '..'), format as separate word chips
      let contentHtml = '';
      if (choiceText.includes('..')) {
        const parts = choiceText.split('..').map(p => p.trim());
        contentHtml = `
          <span class="word-chip">${escapeHtml(parts[0])}</span>
          <span class="word-separator">/</span>
          <span class="word-chip">${escapeHtml(parts[1] || '')}</span>
        `;
      } else {
        contentHtml = `<span class="word-chip">${escapeHtml(choiceText)}</span>`;
      }

      item.innerHTML = `
        <div class="choice-letter">${letter}</div>
        <div class="choice-content">${contentHtml}</div>
      `;

      if (!hasAnswered) {
        item.addEventListener('click', () => {
          handleSelectChoice(q, letter);
        });
      }

      container.appendChild(item);
    });
  }

  // Handle Choice Selection
  function handleSelectChoice(q, letter) {
    stopTimer();
    const isCorrect = (letter === q.answer);

    // Save answer
    if (!state.activeAnswers[q.id]) {
      state.activeAnswers[q.id] = {};
    }
    state.activeAnswers[q.id].choice = letter;
    state.activeAnswers[q.id].correct = isCorrect;
    state.activeAnswers[q.id].revealed = true;

    // Immediately persist active session progress
    persistActiveSectionProgress();

    // Re-render question to show correct/incorrect & explanation
    renderCurrentQuestion();
  }

  function createFullSolutionText(prompt, correctChoiceText) {
    if (!correctChoiceText) return prompt;

    if (correctChoiceText.includes('..')) {
      const parts = correctChoiceText.split('..').map(p => p.trim());
      let idx = 0;
      return prompt.replace(/_{3,}/g, () => {
        const word = parts[idx] || '';
        idx++;
        return `<strong>${escapeHtml(word)}</strong>`;
      });
    } else {
      return prompt.replace(/_{3,}/g, `<strong>${escapeHtml(correctChoiceText.trim())}</strong>`);
    }
  }

  // Save progress of active section to localStorage
  function persistActiveSectionProgress() {
    const secId = `t${state.currentTestNo}_s${state.currentSectionNo}`;
    const questions = getActiveSectionQuestions();
    
    // Count correct answers
    let correctCount = 0;
    let answeredCount = 0;
    questions.forEach(q => {
      const ans = state.activeAnswers[q.id];
      if (ans && ans.choice) {
        answeredCount++;
        if (ans.correct) correctCount++;
      }
    });

    if (answeredCount === questions.length) {
      // Completed!
      state.storedData.completedSections[secId] = {
        test_no: state.currentTestNo,
        section_no: state.currentSectionNo,
        score: correctCount,
        total: questions.length,
        mode: state.activeMode,
        date: new Date().toISOString()
      };
      saveToStorage();
      updateGlobalStats();
    }
  }

  // --- Rapid Mode Timer ---
  function resetQuestionTimer() {
    stopTimer();
    if (state.timerSecondsPerQ <= 0) return;

    state.timerRemaining = state.timerSecondsPerQ;
    updateTimerDisplay();

    state.isTimerRunning = true;
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      updateTimerDisplay();

      if (state.timerRemaining <= 0) {
        stopTimer();
        handleTimerExpired();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.isTimerRunning = false;
  }

  function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const widget = document.getElementById('quiz-timer-widget');
    if (!display || !widget) return;

    const m = Math.floor(state.timerRemaining / 60);
    const s = state.timerRemaining % 60;
    display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    if (state.timerRemaining <= 10 && state.timerRemaining > 0) {
      widget.classList.add('warning');
    } else {
      widget.classList.remove('warning');
    }
  }

  function handleTimerExpired() {
    const display = document.getElementById('timer-display');
    if (display) display.textContent = "TIME UP!";
  }

  // --- Finish Section & Show Results ---
  function finishCurrentSection() {
    stopTimer();
    persistActiveSectionProgress();

    const questions = getActiveSectionQuestions();
    let score = 0;
    questions.forEach(q => {
      const ans = state.activeAnswers[q.id];
      if (ans && ans.correct) score++;
    });

    showView('view-results');

    // Score Circle
    const scoreNum = document.getElementById('res-score-num');
    const resTitle = document.getElementById('res-title');
    const resSubtitle = document.getElementById('res-subtitle');

    if (scoreNum) scoreNum.textContent = score;

    const pct = Math.round((score / questions.length) * 100);
    if (resTitle) {
      resTitle.textContent = pct >= 80 ? 'Mastery Achieved! 🏆' : (pct >= 50 ? 'Good Effort! Keep Pushing 💪' : 'Practice Makes Perfect! 📚');
    }
    if (resSubtitle) {
      resSubtitle.textContent = `Test ${state.currentTestNo} • Section ${state.currentSectionNo} • Score: ${score}/7 (${pct}%) in ${state.activeMode.toUpperCase()} mode.`;
    }

    // Breakdown Table
    const tbody = document.getElementById('results-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      questions.forEach((q, idx) => {
        const ans = state.activeAnswers[q.id] || {};
        const tr = document.createElement('tr');

        const userChoice = ans.choice ? `${ans.choice}: ${q.choices[ans.choice]}` : '<span style="color:var(--text-faint)">(Not answered)</span>';
        const correctChoice = `${q.answer}: ${q.choices[q.answer]}`;

        let guessesHtml = '-';
        if (ans.guesses && ans.guesses.length > 0 && ans.guesses.some(g => g)) {
          guessesHtml = ans.guesses.map((g, i) => `B${i+1}: <em>"${escapeHtml(g || '-')}"</em>`).join('<br>');
        }

        const statusBadge = ans.correct 
          ? `<span class="section-status-badge status-completed">Correct ✓</span>`
          : `<span class="section-status-badge" style="background:var(--danger-subtle);color:var(--danger);border:1px solid var(--danger-border)">Incorrect ✗</span>`;

        tr.innerHTML = `
          <td><strong>Q${idx + 1}</strong></td>
          <td><span class="blank-type-tag">${q.blanks} Blank</span></td>
          <td><small>${guessesHtml}</small></td>
          <td><small>${userChoice}</small></td>
          <td><small><strong>${correctChoice}</strong></small></td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-review-q" data-qindex="${idx}">Review</button>
          </td>
        `;

        tr.querySelector('.btn-review-q').addEventListener('click', () => {
          state.currentQIndex = idx;
          showView('view-quiz');
          renderCurrentQuestion();
        });

        tbody.appendChild(tr);
      });
    }

    updateGlobalStats();
  }

  // --- Bookmarking System ---
  function toggleBookmark(qId) {
    const idx = state.storedData.bookmarks.indexOf(qId);
    if (idx >= 0) {
      state.storedData.bookmarks.splice(idx, 1);
    } else {
      state.storedData.bookmarks.push(qId);
    }
    saveToStorage();
    updateBookmarkButton(qId);
  }

  function updateBookmarkButton(qId) {
    const btn = document.getElementById('btn-quiz-bookmark');
    if (!btn) return;
    const isBookmarked = state.storedData.bookmarks.includes(qId);
    btn.textContent = isBookmarked ? '★' : '☆';
    btn.style.color = isBookmarked ? '#f59e0b' : 'var(--text-light)';
  }

  // --- Word Counter for Guesses ---
  function updateWordCount(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (!input || !label) return;
    const val = input.value.trim();
    const count = val ? val.split(/\s+/).length : 0;
    label.textContent = `${count} word${count === 1 ? '' : 's'}`;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Header navigation
    document.getElementById('btn-home-logo')?.addEventListener('click', () => {
      stopTimer();
      renderHomeView();
      showView('view-home');
    });

    document.getElementById('btn-quiz-back')?.addEventListener('click', () => {
      stopTimer();
      renderHomeView();
      showView('view-home');
    });

    // Mode Toggle
    document.getElementById('btn-mode-rapid')?.addEventListener('click', () => setQuizMode('rapid'));
    document.getElementById('btn-mode-practice')?.addEventListener('click', () => setQuizMode('practice'));

    // Quick Starts on Home Banner
    document.getElementById('btn-quick-rapid-start')?.addEventListener('click', () => {
      startNextIncompleteSection('rapid');
    });
    document.getElementById('btn-quick-practice-start')?.addEventListener('click', () => {
      startNextIncompleteSection('practice');
    });

    // Tests Grid Search & Filter
    document.getElementById('test-search-input')?.addEventListener('input', () => {
      renderHomeView();
    });

    document.getElementById('btn-filter-all')?.addEventListener('click', () => {
      const input = document.getElementById('test-search-input');
      if (input) input.value = '';
      renderHomeView();
    });

    // Section Launch Buttons on Test Cards (Event Delegation)
    document.getElementById('tests-grid-container')?.addEventListener('click', (e) => {
      const btnRapid = e.target.closest('.btn-start-rapid');
      const btnPractice = e.target.closest('.btn-start-practice');
      if (btnRapid) {
        const t = parseInt(btnRapid.dataset.test);
        const s = parseInt(btnRapid.dataset.sec);
        startQuiz(t, s, 'rapid');
      } else if (btnPractice) {
        const t = parseInt(btnPractice.dataset.test);
        const s = parseInt(btnPractice.dataset.sec);
        startQuiz(t, s, 'practice');
      }
    });

    // Practice Mode: Input Listeners for live word count
    const inG1 = document.getElementById('input-guess-1');
    const inG2 = document.getElementById('input-guess-2');
    inG1?.addEventListener('input', () => {
      updateWordCount('input-guess-1', 'word-count-1');
      saveActiveGuesses();
    });
    inG2?.addEventListener('input', () => {
      updateWordCount('input-guess-2', 'word-count-2');
      saveActiveGuesses();
    });

    // Practice Mode: Reveal Options Button
    document.getElementById('btn-reveal-options')?.addEventListener('click', () => {
      revealPracticeOptions();
    });

    // Edit Guesses Button
    document.getElementById('btn-edit-guesses')?.addEventListener('click', () => {
      const q = getActiveSectionQuestions()[state.currentQIndex];
      if (q && state.activeAnswers[q.id]) {
        state.activeAnswers[q.id].revealed = false;
        renderCurrentQuestion();
      }
    });

    // Question Navigation
    document.getElementById('btn-prev-q')?.addEventListener('click', () => {
      if (state.currentQIndex > 0) {
        state.currentQIndex--;
        renderCurrentQuestion();
      }
    });

    document.getElementById('btn-next-q')?.addEventListener('click', () => {
      const questions = getActiveSectionQuestions();
      if (state.currentQIndex < questions.length - 1) {
        state.currentQIndex++;
        renderCurrentQuestion();
      }
    });

    document.getElementById('btn-finish-section')?.addEventListener('click', () => {
      finishCurrentSection();
    });

    // Bookmark Click
    document.getElementById('btn-quiz-bookmark')?.addEventListener('click', () => {
      const q = getActiveSectionQuestions()[state.currentQIndex];
      if (q) toggleBookmark(q.id);
    });

    // Results Actions
    document.getElementById('btn-res-home')?.addEventListener('click', () => {
      renderHomeView();
      showView('view-home');
    });

    document.getElementById('btn-res-retake')?.addEventListener('click', () => {
      startQuiz(state.currentTestNo, state.currentSectionNo, state.activeMode);
    });

    document.getElementById('btn-res-next-section')?.addEventListener('click', () => {
      advanceToNextSection();
    });

    // Modals: Timer Modal
    document.getElementById('btn-timer-settings')?.addEventListener('click', () => {
      openModal('modal-timer');
    });
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      openModal('modal-timer');
    });
    document.getElementById('btn-close-timer-modal')?.addEventListener('click', () => {
      closeModal('modal-timer');
    });
    document.querySelectorAll('.timer-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sec = parseInt(btn.dataset.seconds);
        const input = document.getElementById('input-custom-timer');
        if (input) input.value = sec > 0 ? sec : 60;
      });
    });
    document.getElementById('btn-save-timer')?.addEventListener('click', () => {
      const activePreset = document.querySelector('.timer-preset-btn.active');
      const input = document.getElementById('input-custom-timer');
      let sec = activePreset ? parseInt(activePreset.dataset.seconds) : 60;
      if (input && activePreset && activePreset.dataset.seconds !== '0') {
        sec = parseInt(input.value) || 60;
      }
      state.timerSecondsPerQ = sec;
      saveToStorage();
      closeModal('modal-timer');
      if (state.activeMode === 'rapid') {
        resetQuestionTimer();
      }
    });

    // Modals: Analytics Modal
    const handleOpenAnalytics = () => {
      updateGlobalStats();
      openModal('modal-analytics');
    };
    document.getElementById('btn-open-analytics')?.addEventListener('click', handleOpenAnalytics);
    document.getElementById('global-stats-pill')?.addEventListener('click', handleOpenAnalytics);
    document.getElementById('btn-close-analytics-modal')?.addEventListener('click', () => {
      closeModal('modal-analytics');
    });
    document.getElementById('btn-close-analytics-footer')?.addEventListener('click', () => {
      closeModal('modal-analytics');
    });

    // Reset All Storage Data
    document.getElementById('btn-reset-storage')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your recorded quiz scores and attempts? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        state.storedData = {
          completedSections: {},
          bookmarks: [],
          settings: { timerSeconds: DEFAULT_TIMER_SECONDS, lastMode: 'rapid' }
        };
        updateGlobalStats();
        renderHomeView();
        closeModal('modal-analytics');
        alert('All saved progress has been successfully cleared.');
      }
    });

    // Keyboard Shortcuts (1-5 for options, Enter for Reveal)
    window.addEventListener('keydown', (e) => {
      const quizView = document.getElementById('view-quiz');
      if (!quizView || !quizView.classList.contains('active')) return;

      // Ignore if user is typing in guess inputs
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        if (e.key === 'Enter' && e.ctrlKey) {
          revealPracticeOptions();
        }
        return;
      }

      const q = getActiveSectionQuestions()[state.currentQIndex];
      if (!q) return;

      const existing = state.activeAnswers[q.id] || {};
      const isRevealed = state.activeMode === 'rapid' || existing.revealed;

      // Space or Enter to reveal options in practice mode
      if (!isRevealed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        revealPracticeOptions();
        return;
      }

      // Keys A-E or 1-5 to select option
      if (isRevealed && !existing.choice) {
        const key = e.key.toUpperCase();
        let letter = null;
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
          letter = key;
        } else if (['1', '2', '3', '4', '5'].includes(key)) {
          const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
          letter = map[key];
        }
        if (letter) {
          handleSelectChoice(q, letter);
        }
      }

      // Right arrow: next question
      if (e.key === 'ArrowRight') {
        const questions = getActiveSectionQuestions();
        if (state.currentQIndex < questions.length - 1) {
          state.currentQIndex++;
          renderCurrentQuestion();
        }
      }
      // Left arrow: previous question
      if (e.key === 'ArrowLeft') {
        if (state.currentQIndex > 0) {
          state.currentQIndex--;
          renderCurrentQuestion();
        }
      }
    });
  }

  function saveActiveGuesses() {
    const q = getActiveSectionQuestions()[state.currentQIndex];
    if (!q) return;
    const g1 = (document.getElementById('input-guess-1')?.value || '').trim();
    const g2 = (document.getElementById('input-guess-2')?.value || '').trim();

    if (!state.activeAnswers[q.id]) {
      state.activeAnswers[q.id] = {};
    }
    state.activeAnswers[q.id].guesses = [g1, g2];
  }

  function revealPracticeOptions() {
    const q = getActiveSectionQuestions()[state.currentQIndex];
    if (!q) return;
    saveActiveGuesses();
    state.activeAnswers[q.id].revealed = true;
    renderCurrentQuestion();
  }

  function startNextIncompleteSection(mode) {
    for (const sec of state.sectionsList) {
      if (!state.storedData.completedSections[sec.id]) {
        startQuiz(sec.test_no, sec.section_no, mode);
        return;
      }
    }
    // All done! Start section 1
    startQuiz(1, 1, mode);
  }

  function advanceToNextSection() {
    const currentIdx = state.sectionsList.findIndex(s => s.test_no === state.currentTestNo && s.section_no === state.currentSectionNo);
    if (currentIdx >= 0 && currentIdx + 1 < state.sectionsList.length) {
      const next = state.sectionsList[currentIdx + 1];
      startQuiz(next.test_no, next.section_no, state.activeMode);
    } else {
      alert('Congratulations! You have completed all 54 sections of the GRE Big Book!');
      renderHomeView();
      showView('view-home');
    }
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
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

  // Run on DOM load
  document.addEventListener('DOMContentLoaded', initApp);

})();
