export enum PuyoColor {
  EMPTY = 0,
  RED = 1,
  GREEN = 2,
  BLUE = 3,
  YELLOW = 4,
  PURPLE = 5,
  GARBAGE = 9,
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface PuyoPiece {
  x: number;
  y: number;
  mainColor: PuyoColor;
  subColor: PuyoColor;
  rotation: 0 | 1 | 2 | 3; // 0: sub is up, 1: sub is right, 2: sub is down, 3: sub is left
}

export interface Particle {
  id: number;
  x: number; // Grid coordinates (float)
  y: number;
  vx: number; // Velocity x
  vy: number; // Velocity y
  life: number; // Life remaining (0-1)
  decay: number; // How fast life decreases
  color: string; // Hex or rgba
  size: number; // Scale multiplier
}

export interface PlayerState {
  id: number;
  grid: PuyoColor[][];
  activePiece: PuyoPiece | null;
  nextPiece: { main: PuyoColor; sub: PuyoColor };
  nextNextPiece: { main: PuyoColor; sub: PuyoColor };
  particles: Particle[]; // Visual effects
  score: number;
  chainCount: number;
  garbageQueue: number; // Number of garbage blocks pending
  isGameOver: boolean;
  isAnimating: boolean; // True if blocks are falling or popping
}

export const ROWS = 12;
export const COLS = 6;
export const HIDDEN_ROWS = 1; // Extra row at top for spawning logic