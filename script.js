const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_W = COLS * BLOCK;
const BOARD_H = ROWS * BLOCK;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const nextCanvas = document.querySelector("#nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const linesEl = document.querySelector("#lines");
const levelEl = document.querySelector("#level");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const mobileStartButton = document.querySelector("#mobileStartButton");
const mobilePauseButton = document.querySelector("#mobilePauseButton");
const soundToggle = document.querySelector("#soundToggle");
const pauseCard = document.querySelector("#pauseCard");
const pauseTitle = document.querySelector("#pauseTitle");
const pauseText = document.querySelector("#pauseText");

const PIECES = [
  { name: "I", color: "#57c7ff", matrix: [[1, 1, 1, 1]] },
  { name: "J", color: "#6e8bff", matrix: [[1, 0, 0], [1, 1, 1]] },
  { name: "L", color: "#ff9d4d", matrix: [[0, 0, 1], [1, 1, 1]] },
  { name: "O", color: "#f4d35e", matrix: [[1, 1], [1, 1]] },
  { name: "S", color: "#53df83", matrix: [[0, 1, 1], [1, 1, 0]] },
  { name: "T", color: "#c77dff", matrix: [[0, 1, 0], [1, 1, 1]] },
  { name: "Z", color: "#ff6b7a", matrix: [[1, 1, 0], [0, 1, 1]] },
];

let board;
let active;
let next;
let score;
let lines;
let level;
let best = Number(localStorage.getItem("blockfall-best") || 0);
let dropCounter = 0;
let lastTime = 0;
let animationId = null;
let running = false;
let paused = false;
let gameOver = false;
let muted = false;

const startButtons = [startButton, mobileStartButton].filter(Boolean);
const pauseButtons = [pauseButton, mobilePauseButton].filter(Boolean);

bestEl.textContent = best.toLocaleString();
scaleCanvas(canvas, ctx, BOARD_W, BOARD_H);
scaleCanvas(nextCanvas, nextCtx, 120, 120);
resetState();
draw();

function scaleCanvas(target, context, width, height) {
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  target.width = width * ratio;
  target.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function resetState() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  active = createPiece();
  next = createPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  lastTime = 0;
  gameOver = false;
  paused = false;
  updateStats();
  updateOverlay("Press Start", "Stack blocks, clear rows, chase the high score.");
}

function createPiece() {
  const template = PIECES[Math.floor(Math.random() * PIECES.length)];
  const matrix = template.matrix.map((row) => [...row]);
  return {
    name: template.name,
    matrix,
    color: template.color,
    x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
    y: 0,
  };
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  resetState();
  running = true;
  hideOverlay();
  setStartLabel("Restart");
  setPauseLabel("Pause");
  animationId = requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running) {
    animationId = null;
    return;
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval()) {
      moveDown();
    }
    draw();
  }

  animationId = requestAnimationFrame(update);
}

function dropInterval() {
  return Math.max(120, 840 - (level - 1) * 68);
}

function draw() {
  drawBoardBackground();
  drawMatrix(board, 0, 0, ctx);
  if (active) {
    drawGhost();
    drawMatrix(active.matrix, active.x, active.y, ctx, active.color);
  }
  drawNext();
}

function drawBoardBackground() {
  const gradient = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  gradient.addColorStop(0, "#0b0e14");
  gradient.addColorStop(1, "#131821");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK + 0.5, 0);
    ctx.lineTo(x * BLOCK + 0.5, BOARD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK + 0.5);
    ctx.lineTo(BOARD_W, y * BLOCK + 0.5);
    ctx.stroke();
  }
}

function drawMatrix(matrix, offsetX, offsetY, context, forcedColor = null, alpha = 1) {
  matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      const color = forcedColor || cell;
      if (!color) {
        return;
      }
      drawBlock(context, (x + offsetX) * BLOCK, (y + offsetY) * BLOCK, BLOCK, color, alpha);
    });
  });
}

function drawBlock(context, x, y, size, color, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  roundRect(context, x + 2, y + 2, size - 4, size - 4, 6);
  context.fill();

  const shine = context.createLinearGradient(x, y, x + size, y + size);
  shine.addColorStop(0, "rgba(255,255,255,0.42)");
  shine.addColorStop(0.35, "rgba(255,255,255,0.08)");
  shine.addColorStop(1, "rgba(0,0,0,0.26)");
  context.fillStyle = shine;
  roundRect(context, x + 2, y + 2, size - 4, size - 4, 6);
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.24)";
  context.lineWidth = 1;
  roundRect(context, x + 2.5, y + 2.5, size - 5, size - 5, 6);
  context.stroke();
  context.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawGhost() {
  const ghost = {
    ...active,
    matrix: active.matrix.map((row) => [...row]),
  };
  while (!collides(board, ghost)) {
    ghost.y += 1;
  }
  ghost.y -= 1;
  drawMatrix(ghost.matrix, ghost.x, ghost.y, ctx, active.color, 0.2);
}

function drawNext() {
  nextCtx.clearRect(0, 0, 120, 120);
  nextCtx.fillStyle = "rgba(255,255,255,0.035)";
  nextCtx.fillRect(0, 0, 120, 120);

  const mini = 22;
  const matrix = next.matrix;
  const width = matrix[0].length * mini;
  const height = matrix.length * mini;
  const offsetX = (120 - width) / 2;
  const offsetY = (120 - height) / 2;

  matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) {
        return;
      }
      drawMiniBlock(nextCtx, offsetX + x * mini, offsetY + y * mini, mini, next.color);
    });
  });
}

function drawMiniBlock(context, x, y, size, color) {
  context.fillStyle = color;
  roundRect(context, x + 2, y + 2, size - 4, size - 4, 5);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.22)";
  roundRect(context, x + 4, y + 4, size - 8, 5, 3);
  context.fill();
}

function collides(field, piece) {
  return piece.matrix.some((row, y) =>
    row.some((cell, x) => {
      if (!cell) {
        return false;
      }
      const px = piece.x + x;
      const py = piece.y + y;
      return px < 0 || px >= COLS || py >= ROWS || (py >= 0 && field[py][px]);
    })
  );
}

function mergePiece() {
  active.matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const by = active.y + y;
        const bx = active.x + x;
        if (by >= 0) {
          board[by][bx] = active.color;
        }
      }
    });
  });
}

function sweepRows() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    beep(cleared === 4 ? 740 : 520, 0.09);
    updateStats();
  }
}

function nextPiece() {
  active = next;
  active.x = Math.floor(COLS / 2) - Math.ceil(active.matrix[0].length / 2);
  active.y = 0;
  next = createPiece();

  if (collides(board, active)) {
    finishGame();
  }
}

function moveDown() {
  active.y += 1;
  if (collides(board, active)) {
    active.y -= 1;
    mergePiece();
    sweepRows();
    nextPiece();
  } else {
    score += 1;
    updateStats();
  }
  dropCounter = 0;
}

function moveHorizontal(direction) {
  active.x += direction;
  if (collides(board, active)) {
    active.x -= direction;
  } else {
    beep(260, 0.025);
  }
}

function rotateActive() {
  const original = active.matrix;
  active.matrix = rotateMatrix(active.matrix);

  const startX = active.x;
  let offset = 1;
  while (collides(board, active)) {
    active.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > active.matrix[0].length + 1) {
      active.matrix = original;
      active.x = startX;
      return;
    }
  }
  beep(380, 0.035);
}

function rotateMatrix(matrix) {
  const rotated = [];
  for (let x = 0; x < matrix[0].length; x += 1) {
    const row = [];
    for (let y = matrix.length - 1; y >= 0; y -= 1) {
      row.push(matrix[y][x]);
    }
    rotated.push(row);
  }
  return rotated;
}

function hardDrop() {
  let distance = 0;
  while (!collides(board, active)) {
    active.y += 1;
    distance += 1;
  }
  active.y -= 1;
  score += Math.max(0, distance - 1) * 2;
  mergePiece();
  sweepRows();
  nextPiece();
  updateStats();
  dropCounter = 0;
  beep(150, 0.06);
}

function finishGame() {
  running = false;
  gameOver = true;
  animationId = null;
  best = Math.max(best, score);
  localStorage.setItem("blockfall-best", String(best));
  updateStats();
  setStartLabel("Restart");
  updateOverlay("Game Over", "Nice run. Press Restart and build it higher.");
}

function togglePause() {
  if (!running || gameOver) {
    return;
  }
  paused = !paused;
  setPauseLabel(paused ? "Resume" : "Pause");
  if (paused) {
    updateOverlay("Paused", "Take a breath. Resume when ready.");
  } else {
    hideOverlay();
    lastTime = 0;
  }
}

function updateStats() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines.toLocaleString();
  levelEl.textContent = level.toLocaleString();
  bestEl.textContent = best.toLocaleString();
}

function setStartLabel(text) {
  startButtons.forEach((button) => {
    button.textContent = text;
  });
}

function setPauseLabel(text) {
  pauseButtons.forEach((button) => {
    button.textContent = text;
  });
}

function updateOverlay(title, text) {
  pauseTitle.textContent = title;
  pauseText.textContent = text;
  pauseCard.classList.remove("hidden");
}

function hideOverlay() {
  pauseCard.classList.add("hidden");
}

function handleAction(action) {
  if (!running || paused || gameOver) {
    return;
  }

  if (action === "left") {
    moveHorizontal(-1);
  }
  if (action === "right") {
    moveHorizontal(1);
  }
  if (action === "down") {
    moveDown();
  }
  if (action === "rotate") {
    rotateActive();
  }
  if (action === "drop") {
    hardDrop();
  }
  draw();
}

function beep(frequency, duration) {
  if (muted) {
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }
  const audio = beep.audio || new AudioContext();
  beep.audio = audio;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "triangle";
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.07, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration + 0.02);
}

startButtons.forEach((button) => button.addEventListener("click", startGame));
pauseButtons.forEach((button) => button.addEventListener("click", togglePause));

soundToggle.addEventListener("click", () => {
  muted = !muted;
  soundToggle.style.color = muted ? "var(--muted)" : "var(--accent-2)";
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    " ": "drop",
  };

  if (event.key === "Enter") {
    startGame();
    return;
  }
  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }
  if (keyMap[event.key]) {
    event.preventDefault();
    handleAction(keyMap[event.key]);
  }
});

window.addEventListener("resize", () => {
  scaleCanvas(canvas, ctx, BOARD_W, BOARD_H);
  scaleCanvas(nextCanvas, nextCtx, 120, 120);
  draw();
});
