import assert from "node:assert/strict";
import { chordCell, createGame, cycleMark, findSafeHint, placeMines, revealCell, toggleFlag } from "../src/minesweeper.js";

const stableRandom = () => 0;

{
  const game = createGame("easy");
  revealCell(game, 4, 4, stableRandom);
  assert.equal(game.board[4][4].mine, false, "first click cell must be safe");
  assert.equal(game.board[4][4].revealed, true, "first click reveals a cell");
  assert.equal(game.started, true);
}

{
  const game = createGame("easy");
  placeMines(game, 0, 0, stableRandom);
  const protectedCells = [
    game.board[0][0],
    game.board[0][1],
    game.board[1][0],
    game.board[1][1]
  ];
  assert.equal(protectedCells.some((cell) => cell.mine), false, "first click neighborhood is protected");
}

{
  const game = createGame("easy");
  toggleFlag(game, 2, 2);
  assert.equal(game.board[2][2].flagged, true);
  assert.equal(game.flags, 1);
  revealCell(game, 2, 2, stableRandom);
  assert.equal(game.board[2][2].revealed, false, "flagged cells cannot be revealed");
  toggleFlag(game, 2, 2);
  assert.equal(game.flags, 0);
}

{
  const game = createGame("easy");
  cycleMark(game, 1, 1);
  assert.equal(game.board[1][1].flagged, true);
  assert.equal(game.flags, 1);
  cycleMark(game, 1, 1);
  assert.equal(game.board[1][1].flagged, false);
  assert.equal(game.board[1][1].questioned, true);
  assert.equal(game.flags, 0);
  cycleMark(game, 1, 1);
  assert.equal(game.board[1][1].questioned, false);
}

{
  const game = createGame("easy");
  game.started = true;
  game.status = "playing";
  game.config.mines = 1;
  game.board[8][8].mine = true;
  for (const row of game.board) {
    for (const cell of row) {
      if (!cell.mine) revealCell(game, cell.row, cell.col, stableRandom);
    }
  }
  assert.equal(game.status, "won", "revealing all safe cells wins");
}

{
  const game = createGame("easy");
  game.started = true;
  game.status = "playing";
  game.config = { label: "test", rows: 3, cols: 3, mines: 2 };
  game.board = game.board.slice(0, 3).map((row) => row.slice(0, 3));
  game.board[0][0].mine = true;
  for (const row of game.board) {
    for (const cell of row) {
      cell.adjacent = 1;
    }
  }
  for (const cell of [game.board[0][1], game.board[1][0], game.board[1][1]]) {
    cell.adjacent = 1;
  }
  game.board[0][1].revealed = true;
  game.revealed = 1;
  game.board[0][0].flagged = true;
  game.flags = 1;
  chordCell(game, 0, 1);
  assert.equal(game.board[1][0].revealed, true, "left-right chord opens matching unflagged neighbor");
  assert.equal(game.board[1][1].revealed, true, "left-right chord opens all matching unflagged neighbors");
  assert.equal(game.status, "playing");
}

{
  const game = createGame("easy");
  placeMines(game, 3, 3, stableRandom);
  const hint = findSafeHint(game);
  assert.ok(hint, "hint finds a safe unrevealed cell");
  assert.equal(hint.mine, false);
  assert.equal(hint.hinted, true);
}

console.log("Minesweeper rules passed");
