import { PuyoColor } from './types';

export const COLORS = [PuyoColor.RED, PuyoColor.GREEN, PuyoColor.BLUE, PuyoColor.YELLOW, PuyoColor.PURPLE];

export const getPuyoStyles = (color: PuyoColor) => {
  switch (color) {
    case PuyoColor.RED: 
      return { 
        base: 'bg-[#ef4444]', // Red-500
        dark: '#991b1b', // Red-800 (Pupil)
        light: '#fca5a5'
      };
    case PuyoColor.GREEN: 
      return { 
        base: 'bg-[#22c55e]', // Green-500
        dark: '#14532d', // Green-900
        light: '#86efac'
      };
    case PuyoColor.BLUE: 
      return { 
        base: 'bg-[#3b82f6]', // Blue-500
        dark: '#1e3a8a', // Blue-900
        light: '#93c5fd'
      };
    case PuyoColor.YELLOW: 
      return { 
        base: 'bg-[#eab308]', // Yellow-500
        dark: '#713f12', // Yellow-900
        light: '#fde047'
      };
    case PuyoColor.PURPLE: 
      return { 
        base: 'bg-[#a855f7]', // Purple-500
        dark: '#581c87', // Purple-900
        light: '#d8b4fe'
      };
    case PuyoColor.GARBAGE: 
      return { 
        base: 'bg-gray-400',
        dark: '#374151',
        light: '#9ca3af'
      };
    default: 
      return { base: 'bg-transparent', dark: '', light: '' };
  }
};

export const KEY_MAPPINGS: Record<string, { playerId: number, action: string }> = {
  // Player 1 (Arrows)
  'ArrowLeft': { playerId: 0, action: 'LEFT' },
  'ArrowRight': { playerId: 0, action: 'RIGHT' },
  'ArrowDown': { playerId: 0, action: 'DOWN' },
  'ArrowUp': { playerId: 0, action: 'ROTATE_CW' },
  '/': { playerId: 0, action: 'ROTATE_CCW' },

  // Player 2 (WASD)
  'a': { playerId: 1, action: 'LEFT' },
  'd': { playerId: 1, action: 'RIGHT' },
  's': { playerId: 1, action: 'DOWN' },
  'w': { playerId: 1, action: 'ROTATE_CW' },
  'q': { playerId: 1, action: 'ROTATE_CCW' },

  // Player 3 (TFGH)
  'f': { playerId: 2, action: 'LEFT' },
  'h': { playerId: 2, action: 'RIGHT' },
  'g': { playerId: 2, action: 'DOWN' },
  't': { playerId: 2, action: 'ROTATE_CW' },
  'r': { playerId: 2, action: 'ROTATE_CCW' },

  // Player 4 (IJKL)
  'j': { playerId: 3, action: 'LEFT' },
  'l': { playerId: 3, action: 'RIGHT' },
  'k': { playerId: 3, action: 'DOWN' },
  'i': { playerId: 3, action: 'ROTATE_CW' },
  'u': { playerId: 3, action: 'ROTATE_CCW' },
};