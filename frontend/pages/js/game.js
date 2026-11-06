const mode = sessionStorage.getItem('mode');

if (!mode) window.location.href = 'select-mode.html';

let sessionId = null;
let questions = [];
let currentIndex = 0;
let score = 0;
let questionStartTime = null;
let timerInterval = null;
let elapsedSeconds = 0;
let timedSecondsLeft = 60;
let answered = false;

const isTimed = mode === 'timed';
const TOTAL_TIME = 60;

// DOM
const progressLabel = document.getElementById('progressLabel');
const timerEl       = document.getElementById('timer');
const scoreLabel    = document.getElementById('scoreLabel');
const questionText  = document.getElementById('questionText');
const questionImage = document.getElementById('questionImage');
const optionsGrid   = document.getElementById('optionsGrid');
const feedback      = document.getElementById('feedback');
const penaltyToast  = document.getElementById('penaltyToast');
const timedBarWrap  = document.getElementById('timedBarWrap');
const timedBar      = document.getElementById('timedBar');

async function init() {
  const res = await api.startGame(mode);
  if (res.error) {
    alert('Error al iniciar el juego: ' + res.error);
    window.location.href = 'select-mode.html';
    return;
  }

  sessionId = res.sessionId;
  questions = res.questions;

  if (isTimed) {
    timedBarWrap.style.display = 'block';
    progressLabel.textContent = '⏱️ Contra el Reloj';
    startTimedCountdown();
  } else {
    startStopwatch();
  }

  showQuestion();
}

function startStopwatch() {
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function startTimedCountdown() {
  updateTimedBar();
  timerInterval = setInterval(() => {
    timedSecondsLeft--;
    const m = Math.floor(timedSecondsLeft / 60);
    const s = timedSecondsLeft % 60;
    timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    updateTimedBar();

    if (timedSecondsLeft <= 10) {
      timerEl.classList.add('danger');
      timedBar.classList.add('danger');
    } else if (timedSecondsLeft <= 20) {
      timerEl.classList.add('warning');
      timedBar.classList.add('warning');
    }

    if (timedSecondsLeft <= 0) {
      clearInterval(timerInterval);
      finishGame();
    }
  }, 1000);
}

function updateTimedBar() {
  const pct = (timedSecondsLeft / TOTAL_TIME) * 100;
  timedBar.style.width = pct + '%';
}

function showQuestion() {
  if (!isTimed && currentIndex >= questions.length) {
    finishGame();
    return;
  }
  if (isTimed && currentIndex >= questions.length) {
    // Sin más preguntas en timed — terminó
    finishGame();
    return;
  }

  answered = false;
  feedback.textContent = '';
  feedback.className = 'feedback';

  const q = questions[currentIndex];
  questionText.textContent = q.questionText;
  questionImage.src = q.imageUrl || '';
  questionImage.style.display = q.imageUrl ? 'block' : 'none';
  questionImage.className = q.questionType === 'players' ? 'question-image player-img' : 'question-image';

  if (!isTimed) {
    progressLabel.textContent = `${currentIndex + 1} / ${questions.length}`;
  }

  // Renderizar opciones
  optionsGrid.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.name;
    btn.onclick = () => submitAnswer(opt, q);
    optionsGrid.appendChild(btn);
  });

  questionStartTime = Date.now();
}

async function submitAnswer(selectedOpt, q) {
  if (answered) return;
  answered = true;

  const responseTimeMs = Date.now() - questionStartTime;
  const buttons = optionsGrid.querySelectorAll('.option-btn');

  const res = await api.submitAnswer(
    sessionId,
    q.questionRefId,
    q.questionType,
    selectedOpt.id,
    responseTimeMs
  );

  if (res.error) {
    answered = false;
    questionStartTime = Date.now();
    feedback.textContent = 'No se pudo guardar la respuesta. Revisá tu conexión y elegí una opción para reintentar.';
    feedback.className = 'feedback wrong';
    return;
  }

  // Colorear opciones
  buttons.forEach(btn => {
    btn.disabled = true;
    const name = btn.querySelector('span')?.textContent || btn.textContent;
    const opt = q.options.find(o => o.name === name);
    if (!opt) return;
    if (opt.id === selectedOpt.id && !res.isCorrect) btn.classList.add('wrong');
    if (opt.id === res.correctAnswerId) btn.classList.add(opt.id === selectedOpt.id ? 'correct' : 'reveal');
  });

  if (res.isCorrect) {
    score++;
    scoreLabel.textContent = score;
    feedback.textContent = '¡Gooool! ⚽';
    feedback.className = 'feedback correct';
  } else {
    feedback.textContent = '¡Fuera! ❌';
    feedback.className = 'feedback wrong';
    showPenalty(res.penaltyMs);
  }

  currentIndex++;
  setTimeout(showQuestion, isTimed ? 800 : 1200);
}

function showPenalty(ms) {
  if (!ms) return;
  const secs = ms / 1000;
  penaltyToast.textContent = `-${secs} seg`;
  penaltyToast.classList.add('show');
  setTimeout(() => penaltyToast.classList.remove('show'), 1500);
}

async function finishGame() {
  clearInterval(timerInterval);
  const rawTimeMs = isTimed ? (TOTAL_TIME - timedSecondsLeft) * 1000 : elapsedSeconds * 1000;

  const res = await api.finishGame(sessionId, rawTimeMs);
  if (res.error) {
    alert('Error al terminar la partida: ' + res.error);
    window.location.href = 'index.html';
    return;
  }

  sessionStorage.setItem('lastResult', JSON.stringify({ ...res, mode }));
  window.location.href = 'results.html';
}

init();
