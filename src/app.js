import { chordCell, createGame, cycleMark, findSafeHint, revealCell, toggleFlag } from "./minesweeper.js";

const boardEl = document.querySelector("#board");
const mineCountEl = document.querySelector("#mineCount");
const timerEl = document.querySelector("#timer");
const statusTextEl = document.querySelector("#statusText");
const bestTimeEl = document.querySelector("#bestTime");
const restartBtn = document.querySelector("#restartBtn");
const newGameBtn = document.querySelector("#newGameBtn");
const flagModeEl = document.querySelector("#flagMode");
const hintBtn = document.querySelector("#hintBtn");
const rulesBtn = document.querySelector("#rulesBtn");
const rulesDialog = document.querySelector("#rulesDialog");
const difficultyButtons = [...document.querySelectorAll("[data-difficulty]")];
const recordEls = [...document.querySelectorAll("[data-record]")];

let game = createGame("easy");
let timerId = null;
let suppressNextContextMenu = false;

function startGame(difficulty = game.difficulty) {
  stopTimer();
  game = createGame(difficulty);
  timerEl.textContent = "000";
  restartBtn.textContent = "🙂";
  flagModeEl.checked = false;
  syncDifficultyButtons();
  render();
}

function render() {
  const { rows, cols, mines } = game.config;
  boardEl.style.setProperty("--rows", rows);
  boardEl.style.setProperty("--cols", cols);
  boardEl.className = `board board-${game.difficulty}`;
  boardEl.innerHTML = "";

  for (const cell of game.board.flat()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.dataset.row = cell.row;
    button.dataset.col = cell.col;
    button.setAttribute("aria-label", cellLabel(cell));
    if (cell.revealed) button.classList.add("revealed");
    if (cell.flagged) button.classList.add("flagged");
    if (cell.questioned) button.classList.add("questioned");
    if (cell.hinted) button.classList.add("hinted");
    if (cell.mine && cell.revealed) button.classList.add("mine");
    if (cell.revealed && cell.adjacent > 0 && !cell.mine) {
      button.classList.add(`n${cell.adjacent}`);
      button.textContent = cell.adjacent;
    } else if (cell.flagged) {
      button.textContent = "⚑";
    } else if (cell.questioned) {
      button.textContent = "?";
    } else if (cell.mine && cell.revealed) {
      button.textContent = "✹";
    }
    boardEl.append(button);
  }

  mineCountEl.textContent = String(Math.max(0, mines - game.flags)).padStart(3, "0");
  statusTextEl.textContent = statusText();
  restartBtn.textContent = game.status === "lost" ? "😵" : game.status === "won" ? "😎" : "🙂";
  bestTimeEl.textContent = getBestTime(game.difficulty);
  renderRecords();
  hintBtn.disabled = game.status === "lost" || game.status === "won" || !game.started;
  updateTimerState();
}

function reveal(row, col) {
  const cell = game.board[row]?.[col];
  if (!cell || cell.revealed || cell.flagged) return;
  const wasReady = !game.started;
  revealCell(game, row, col);
  if (wasReady && game.started) startTimer();
  finishIfNeeded();
  render();
}

function flag(row, col) {
  toggleFlag(game, row, col);
  finishIfNeeded();
  render();
}

function expandAround(row, col) {
  chordCell(game, row, col);
  finishIfNeeded();
  render();
}

function finishIfNeeded() {
  if (game.status === "won" || game.status === "lost") {
    stopTimer();
    if (game.status === "won") saveBestTime();
  }
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    game.elapsed += 1;
    timerEl.textContent = String(Math.min(999, game.elapsed)).padStart(3, "0");
  }, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function updateTimerState() {
  timerEl.textContent = String(Math.min(999, game.elapsed)).padStart(3, "0");
}

function statusText() {
  if (game.status === "won") return "完成，漂亮";
  if (game.status === "lost") return "踩雷了，再来";
  if (game.status === "playing") return "排雷中";
  return "找出所有地雷";
}

function saveBestTime() {
  const key = bestKey(game.difficulty);
  const current = Number(localStorage.getItem(key) || Infinity);
  if (game.elapsed < current) localStorage.setItem(key, String(game.elapsed));
}

function getBestTime(difficulty) {
  const value = localStorage.getItem(bestKey(difficulty));
  return value ? formatTime(Number(value)) : "--";
}

function bestKey(difficulty) {
  return `minesweeper-best-${difficulty}`;
}

function renderRecords() {
  for (const el of recordEls) {
    el.textContent = getBestTime(el.dataset.record);
    el.classList.toggle("active", el.dataset.record === game.difficulty);
  }
}

function formatTime(seconds) {
  const capped = Math.max(0, Math.min(999, seconds));
  return `${String(capped).padStart(3, "0")}s`;
}

function syncDifficultyButtons() {
  for (const button of difficultyButtons) {
    button.classList.toggle("active", button.dataset.difficulty === game.difficulty);
  }
}

function cellLabel(cell) {
  if (cell.flagged) return `第 ${cell.row + 1} 行第 ${cell.col + 1} 列，已插旗`;
  if (cell.questioned) return `第 ${cell.row + 1} 行第 ${cell.col + 1} 列，已标记问号`;
  if (!cell.revealed) return `第 ${cell.row + 1} 行第 ${cell.col + 1} 列，未揭开`;
  if (cell.mine) return "地雷";
  return cell.adjacent ? `${cell.adjacent} 个相邻地雷` : "空白安全格";
}

boardEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (flagModeEl.checked) flag(row, col);
  else reveal(row, col);
});

boardEl.addEventListener("mousedown", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const bothButtonsPressed = (event.buttons & 3) === 3;
  if (!bothButtonsPressed) return;
  event.preventDefault();
  suppressNextContextMenu = true;
  expandAround(Number(cell.dataset.row), Number(cell.dataset.col));
});

boardEl.addEventListener("contextmenu", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  if (suppressNextContextMenu) {
    suppressNextContextMenu = false;
    return;
  }
  cycleMark(game, Number(cell.dataset.row), Number(cell.dataset.col));
  finishIfNeeded();
  render();
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.difficulty));
});

restartBtn.addEventListener("click", () => startGame());
newGameBtn.addEventListener("click", () => startGame());
hintBtn.addEventListener("click", () => {
  findSafeHint(game);
  render();
});
rulesBtn.addEventListener("click", () => rulesDialog.showModal());

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f") flagModeEl.checked = !flagModeEl.checked;
  if (event.key.toLowerCase() === "r") startGame();
});

startGame();
