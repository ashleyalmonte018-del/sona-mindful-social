import { describe, expect, it } from "vitest";

import { dotsScore, newDots, oddsEvensWinner, playDots, rpsResult, tttBestMove, tttWinner, type Mark } from "./games";

describe("tic tac toe", () => {
  it("detects a row win", () => {
    const b: Mark[] = ["X", "X", "X", null, "O", "O", null, null, null];
    expect(tttWinner(b).winner).toBe("X");
  });
  it("blocks an immediate loss", () => {
    const b: Mark[] = ["X", "X", null, null, "O", null, null, null, null];
    expect(tttBestMove(b, "O")).toBe(2);
  });
});

describe("rock paper scissors", () => {
  it("rock beats scissors, loses to paper", () => {
    expect(rpsResult("rock", "scissors")).toBe("win");
    expect(rpsResult("rock", "paper")).toBe("lose");
    expect(rpsResult("paper", "paper")).toBe("draw");
  });
});

describe("odds and evens", () => {
  it("evens caller wins when the sum is even", () => {
    expect(oddsEvensWinner("evens", 2, 4)).toBe("caller");
    expect(oddsEvensWinner("evens", 2, 3)).toBe("other");
  });
});

describe("dots and boxes", () => {
  it("completing a box scores it and keeps the turn", () => {
    let s = newDots(1, 1);
    s = playDots(s, { kind: "h", r: 0, c: 0 }).state; // p1
    s = playDots(s, { kind: "h", r: 1, c: 0 }).state; // p2
    s = playDots(s, { kind: "v", r: 0, c: 0 }).state; // p1
    const res = playDots(s, { kind: "v", r: 0, c: 1 }); // p2 closes
    expect(res.completed).toBe(1);
    expect(res.state.turn).toBe(2);
    expect(dotsScore(res.state)).toEqual({ p1: 0, p2: 1, done: true });
  });
});
