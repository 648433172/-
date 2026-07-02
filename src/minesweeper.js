export const DIFFICULTIES = {
  easy: { label: "简单", rows: 9, cols: 9, mines: 10 },
  medium: { label: "中度", rows: 16, cols: 16, mines: 40 },
  hard: { label: "困难", rows: 16, cols: 30, mines: 99 }
};

export function createGame(difficulty = "easy") {
  const config = DIFFICULTIES[difficulty] ?? DIFFICULTIES.easy;
  return {
    difficulty,
    config,
    status: "ready",
    started: false,
    elapsed: 0,
    flags: 0,
    revealed: 0,
    board: makeBoard(config.rows, config.cols)
  };
}

export function makeBoard(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      mine: false,
      revealed: false,
      flagged: false,
      questioned: false,
      adjacent: 0,
      hinted: false
    }))
  );
}

export function neighbors(board, row, col) {
  const cells = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const next = board[row + dr]?.[col + dc];
      if (next) cells.push(next);
    }
  }
  return cells;
}

export function placeMines(game, safeRow, safeCol, random = Math.random) {
  const protectedCells = new Set([
    key(safeRow, safeCol),
    ...neighbors(game.board, safeRow, safeCol).map((cell) => key(cell.row, cell.col))
  ]);
  const candidates = game.board.flat().filter((cell) => !protectedCells.has(key(cell.row, cell.col)));

  for (let placed = 0; placed < game.config.mines; placed += 1) {
    const index = Math.floor(random() * candidates.length);
    const [cell] = candidates.splice(index, 1);
    cell.mine = true;
  }

  for (const cell of game.board.flat()) {
    cell.adjacent = neighbors(game.board, cell.row, cell.col).filter((item) => item.mine).length;
  }
}

export function revealCell(game, row, col, random = Math.random) {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.board[row]?.[col];
  if (!cell || cell.flagged || cell.revealed) return game;

  if (!game.started) {
    game.started = true;
    game.status = "playing";
    placeMines(game, row, col, random);
  }

  if (cell.mine) {
    cell.revealed = true;
    game.status = "lost";
    revealMines(game);
    return game;
  }

  floodReveal(game, cell);
  checkWin(game);
  return game;
}

export function toggleFlag(game, row, col) {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.board[row]?.[col];
  if (!cell || cell.revealed) return game;
  cell.flagged = !cell.flagged;
  if (cell.flagged) cell.questioned = false;
  game.flags += cell.flagged ? 1 : -1;
  checkWin(game);
  return game;
}

export function cycleMark(game, row, col) {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.board[row]?.[col];
  if (!cell || cell.revealed) return game;
  if (!cell.flagged && !cell.questioned) {
    cell.flagged = true;
    game.flags += 1;
  } else if (cell.flagged) {
    cell.flagged = false;
    cell.questioned = true;
    game.flags -= 1;
  } else {
    cell.questioned = false;
  }
  checkWin(game);
  return game;
}

export function chordCell(game, row, col) {
  const cell = game.board[row]?.[col];
  if (!cell?.revealed || cell.adjacent === 0 || game.status !== "playing") return game;
  const around = neighbors(game.board, row, col);
  const flagCount = around.filter((item) => item.flagged).length;
  if (flagCount !== cell.adjacent) return game;
  for (const next of around) {
    if (!next.flagged && !next.revealed) revealCell(game, next.row, next.col);
  }
  return game;
}

export function findSafeHint(game) {
  const cell = game.board.flat().find((item) => !item.revealed && !item.flagged && !item.mine);
  if (cell) cell.hinted = true;
  return cell ?? null;
}

function floodReveal(game, start) {
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    cell.hinted = false;
    game.revealed += 1;
    if (cell.adjacent === 0) {
      for (const next of neighbors(game.board, cell.row, cell.col)) {
        if (!next.revealed && !next.flagged && !next.mine) queue.push(next);
      }
    }
  }
}

function revealMines(game) {
  for (const cell of game.board.flat()) {
    if (cell.mine) cell.revealed = true;
  }
}

function checkWin(game) {
  const totalSafe = game.config.rows * game.config.cols - game.config.mines;
  const allSafeOpen = game.revealed === totalSafe;
  const allMinesFlagged =
    game.started &&
    game.flags === game.config.mines &&
    game.board.flat().every((cell) => (cell.mine && cell.flagged) || (!cell.mine && !cell.flagged));
  if (allSafeOpen || allMinesFlagged) {
    game.status = "won";
    for (const cell of game.board.flat()) {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        game.flags += 1;
      }
    }
  }
}

function key(row, col) {
  return `${row}:${col}`;
}
