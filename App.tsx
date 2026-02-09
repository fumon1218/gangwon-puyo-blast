import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateBackgroundImage } from './services/geminiService';
import { GameBoard } from './components/GameBoard';
import { PlayerState, PuyoColor, ROWS, COLS, HIDDEN_ROWS, PuyoPiece, Particle } from './types';
import { COLORS, KEY_MAPPINGS, getPuyoStyles } from './constants';
import { initAudio, playMoveSound, playPopSound, playLandSound } from './services/audioService';

const TICK_RATE = 800; // ms per gravity tick

// Default background: A nice seaside village illustration style
const DEFAULT_BG = "https://images.unsplash.com/photo-1594751509633-8994a504cb1f?q=80&w=2560&auto=format&fit=crop";

const createEmptyGrid = () => Array.from({ length: ROWS + HIDDEN_ROWS }, () => Array(COLS).fill(PuyoColor.EMPTY));

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const spawnPiece = (): { main: PuyoColor; sub: PuyoColor } => ({
  main: getRandomColor(),
  sub: getRandomColor(),
});

export default function App() {
  const [bgImage, setBgImage] = useState<string | null>(DEFAULT_BG);
  const [gameStatus, setGameStatus] = useState<'menu' | 'loading' | 'playing' | 'paused'>('menu');
  const [playerCount, setPlayerCount] = useState(1);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  
  // Game State Refs for the loop
  const playersRef = useRef<PlayerState[]>([]);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();
  const particleIdCounter = useRef<number>(0);

  // Load Background
  const handleGenerateBg = async () => {
    // Check for API Key if using Pro model (implied by guidelines for Veo/Pro Image)
    try {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          const success = await (window as any).aistudio.openSelectKey();
        }
      }
    } catch (e) {
      console.error("API Key selection error", e);
    }

    setGameStatus('loading');
    const bg = await generateBackgroundImage();
    if (bg) setBgImage(bg);
    setGameStatus('menu');
  };

  // Initialize Game
  const startGame = (count: number) => {
    // Initialize Audio Context on user gesture
    initAudio();

    setPlayerCount(count);
    const newPlayers: PlayerState[] = [];
    for (let i = 0; i < count; i++) {
      newPlayers.push({
        id: i,
        grid: createEmptyGrid(),
        activePiece: { x: 2, y: 0, mainColor: getRandomColor(), subColor: getRandomColor(), rotation: 0 },
        nextPiece: spawnPiece(),
        nextNextPiece: spawnPiece(),
        particles: [],
        score: 0,
        chainCount: 0,
        garbageQueue: 0,
        isGameOver: false,
        isAnimating: false,
      });
    }
    playersRef.current = newPlayers;
    setPlayers(newPlayers);
    setGameStatus('playing');
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Controls Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pause Toggle
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (gameStatus === 'playing') setGameStatus('paused');
        else if (gameStatus === 'paused') setGameStatus('playing');
        return;
      }

      if (gameStatus !== 'playing') return;
      if (KEY_MAPPINGS[e.key]) {
        e.preventDefault(); // Prevent scrolling
        handleInput(KEY_MAPPINGS[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);

  const handleInput = (cmd: { playerId: number, action: string }) => {
    const player = playersRef.current[cmd.playerId];
    if (!player || player.isGameOver || player.isAnimating || !player.activePiece) return;

    let { x, y, rotation } = player.activePiece;
    let newX = x;
    let newY = y;
    let newRot = rotation;

    switch (cmd.action) {
      case 'LEFT': newX -= 1; break;
      case 'RIGHT': newX += 1; break;
      case 'DOWN': newY += 1; break; // Soft drop
      case 'ROTATE_CW': newRot = (rotation + 1) % 4 as 0|1|2|3; break;
      case 'ROTATE_CCW': newRot = (rotation + 3) % 4 as 0|1|2|3; break;
    }

    if (isValidMove(player.grid, newX, newY, newRot)) {
      player.activePiece = { ...player.activePiece, x: newX, y: newY, rotation: newRot };
      // Play sound on move
      playMoveSound();
      setPlayers([...playersRef.current]);
    }
  };

  const isValidMove = (grid: PuyoColor[][], x: number, y: number, rot: number) => {
    // Check main
    if (x < 0 || x >= COLS || y >= ROWS + HIDDEN_ROWS) return false;
    if (y >= 0 && grid[y][x] !== PuyoColor.EMPTY) return false;

    // Check sub
    let sx = x, sy = y;
    if (rot === 0) sy -= 1;
    if (rot === 1) sx += 1;
    if (rot === 2) sy += 1;
    if (rot === 3) sx -= 1;

    if (sx < 0 || sx >= COLS || sy >= ROWS + HIDDEN_ROWS) return false;
    // Note: sy < 0 is allowed (above board)
    if (sy >= 0 && grid[sy][sx] !== PuyoColor.EMPTY) return false;

    return true;
  };

  // Core Game Loop
  const gameLoop = (time: number) => {
    // Check Pause
    if (gameStatus !== 'playing') {
       return; 
    }

    const deltaTime = time - lastTimeRef.current;
    
    // Always update particles for smooth animation
    updateParticles(deltaTime);
    
    // Apply Gravity periodically
    if (deltaTime > TICK_RATE || playersRef.current.some(p => p.isAnimating)) {
       // If animating, we might want faster updates, but for now we piggyback on the tick 
       // or run separate updates. Actually, updateGameState handles logic ticks.
       // Let's call updateGameState more frequently if animating to make it snappy?
       // For this implementation, we stick to logic updates on tick, except particles which are visual.
    }
    
    // We update logic based on tick rate, but particles run every frame?
    // To separate them:
    // Update logic only if enough time passed
    if (deltaTime > (playersRef.current.some(p => p.isAnimating) ? 100 : TICK_RATE)) {
      updateGameState();
      lastTimeRef.current = time;
    } else {
      // Force render for particles if no logic update
      setPlayers([...playersRef.current]);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Restart loop when unpausing
  useEffect(() => {
    if (gameStatus === 'playing') {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStatus]);

  const updateParticles = (dt: number) => {
    // dt is in ms
    const speedFactor = dt / 16; // normalize to ~60fps
    playersRef.current.forEach(player => {
      if (player.particles.length > 0) {
        player.particles = player.particles.filter(p => {
          p.x += p.vx * speedFactor;
          p.y += p.vy * speedFactor;
          p.life -= p.decay * speedFactor;
          return p.life > 0;
        });
      }
    });
  };

  const updateGameState = () => {
    let stateChanged = false;
    const currentPlayers = playersRef.current;

    currentPlayers.forEach(player => {
      if (player.isGameOver) return;

      // 1. If animating (resolving matches/gravity), continue that logic
      if (player.isAnimating) {
        // Simple tick-based animation/resolution for now
        const settled = applyGravityToGrid(player);
        if (settled) {
             stateChanged = true;
             return; 
        }

        // If nothing moved, check matches
        const { matchFound, scoreAdded } = checkMatches(player);
        
        if (matchFound) {
           // Play Pop Sound
           playPopSound(player.chainCount);

           player.score += scoreAdded * (player.chainCount + 1);
           player.chainCount += 1;
           
           // Attack Logic: Chain >= 2 sends garbage
           if (player.chainCount >= 2) {
             const garbageAmount = 1; // 1 hard block per chain step > 1
             sendGarbage(player.id, garbageAmount);
           }
           stateChanged = true;
        } else {
           // Animation done
           // Only stop animating if NO particles are left? No, logic animation is done.
           player.isAnimating = false;
           player.chainCount = 0; // Reset chain
           
           // Handle Garbage Queue arrival
           if (player.garbageQueue > 0) {
              dropGarbage(player);
              stateChanged = true;
              player.isAnimating = true; // Let garbage fall
           } else {
              spawnNewPiece(player);
              stateChanged = true;
           }
        }
        return;
      }

      // 2. If Active Piece exists, move it down
      if (player.activePiece) {
        const { x, y, rotation } = player.activePiece;
        if (isValidMove(player.grid, x, y + 1, rotation)) {
          player.activePiece.y += 1;
          stateChanged = true;
        } else {
          // Lock Piece
          lockPiece(player);
          playLandSound(); // Sound when piece hits bottom
          player.activePiece = null;
          player.isAnimating = true; // Start resolution phase
          stateChanged = true;
        }
      }
    });

    if (stateChanged) {
      setPlayers([...currentPlayers]);
    }
  };

  const lockPiece = (player: PlayerState) => {
    if (!player.activePiece) return;
    const { x, y, mainColor, subColor, rotation } = player.activePiece;
    
    // Main
    if (y >= 0 && y < ROWS + HIDDEN_ROWS) player.grid[y][x] = mainColor;
    
    // Sub
    let sx = x, sy = y;
    if (rotation === 0) sy -= 1;
    if (rotation === 1) sx += 1;
    if (rotation === 2) sy += 1;
    if (rotation === 3) sx -= 1;
    
    if (sy >= 0 && sy < ROWS + HIDDEN_ROWS) player.grid[sy][sx] = subColor;

    // Check death
    if (player.grid[0][2] !== PuyoColor.EMPTY) {
      player.isGameOver = true;
    }
  };

  const applyGravityToGrid = (player: PlayerState): boolean => {
    let moved = false;
    const grid = player.grid;
    // Iterate columns
    for (let c = 0; c < COLS; c++) {
      // Iterate from bottom up
      for (let r = ROWS + HIDDEN_ROWS - 1; r >= 0; r--) {
        if (grid[r][c] === PuyoColor.EMPTY) {
          // Look for a block above to pull down
          for (let k = r - 1; k >= 0; k--) {
            if (grid[k][c] !== PuyoColor.EMPTY) {
              grid[r][c] = grid[k][c];
              grid[k][c] = PuyoColor.EMPTY;
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  };

  const spawnParticles = (player: PlayerState, r: number, c: number, color: PuyoColor) => {
    // Generate dust/glow particles
    const particleCount = 8;
    const styles = getPuyoStyles(color);
    
    for (let i = 0; i < particleCount; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 0.15 + 0.05;
       
       player.particles.push({
         id: particleIdCounter.current++,
         x: c + 0.5, // Center of cell
         y: r + 0.5,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed,
         life: 1.0,
         decay: Math.random() * 0.03 + 0.02,
         color: styles.light || '#fff', // Use lighter tint for glow
         size: Math.random() * 0.6 + 0.4
       });
    }
    
    // Add a central flash
    player.particles.push({
        id: particleIdCounter.current++,
        x: c + 0.5,
        y: r + 0.5,
        vx: 0,
        vy: 0,
        life: 1.0,
        decay: 0.1,
        color: '#ffffff',
        size: 2.0 // Big flash
    });
  };

  const checkMatches = (player: PlayerState) => {
    const grid = player.grid;
    const visited = new Set<string>();
    const toRemove: {r: number, c: number}[] = [];
    let matchFound = false;

    const getNeighbors = (r: number, c: number, color: PuyoColor) => {
      const group: {r: number, c: number}[] = [];
      const queue = [{r, c}];
      visited.add(`${r},${c}`);
      group.push({r, c});

      let head = 0;
      while(head < queue.length){
        const curr = queue[head++];
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        for(const [dr, dc] of dirs){
           const nr = curr.r + dr;
           const nc = curr.c + dc;
           if(nr >= 0 && nr < ROWS + HIDDEN_ROWS && nc >= 0 && nc < COLS && 
              !visited.has(`${nr},${nc}`) && grid[nr][nc] === color) {
             visited.add(`${nr},${nc}`);
             queue.push({r: nr, c: nc});
             group.push({r: nr, c: nc});
           }
        }
      }
      return group;
    };

    for(let r = 0; r < ROWS + HIDDEN_ROWS; r++){
      for(let c = 0; c < COLS; c++){
        const color = grid[r][c];
        if(color !== PuyoColor.EMPTY && color !== PuyoColor.GARBAGE && !visited.has(`${r},${c}`)){
           const group = getNeighbors(r, c, color);
           if(group.length >= 4) {
             toRemove.push(...group);
             matchFound = true;
             
             // Check for adjacent garbage to clear
             group.forEach(block => {
                [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dr, dc]) => {
                   const nr = block.r + dr;
                   const nc = block.c + dc;
                   if (nr >=0 && nr < ROWS + HIDDEN_ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === PuyoColor.GARBAGE) {
                       toRemove.push({r: nr, c: nc});
                   }
                });
             });
           }
        }
      }
    }

    // Spawn visual effects before removing data
    toRemove.forEach(p => {
      const color = grid[p.r][p.c];
      if (color !== PuyoColor.EMPTY) {
         spawnParticles(player, p.r, p.c, color);
      }
      grid[p.r][p.c] = PuyoColor.EMPTY;
    });

    return { matchFound, scoreAdded: toRemove.length * 100 };
  };

  const sendGarbage = (senderId: number, amount: number) => {
    playersRef.current.forEach(p => {
      if (p.id !== senderId && !p.isGameOver) {
        p.garbageQueue += amount;
      }
    });
  };

  const dropGarbage = (player: PlayerState) => {
    // Drop up to 6 garbage blocks at a time (1 row)
    const amount = Math.min(player.garbageQueue, 6);
    if (amount <= 0) return;

    // Random columns
    const cols = Array.from({length: COLS}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < amount; i++) {
       const c = cols[i % COLS];
       if (player.grid[0][c] === PuyoColor.EMPTY) {
         player.grid[0][c] = PuyoColor.GARBAGE;
       }
    }
    player.garbageQueue -= amount;
  };

  const spawnNewPiece = (player: PlayerState) => {
    if (player.grid[1][2] !== PuyoColor.EMPTY) {
       player.isGameOver = true;
       return;
    }
    player.activePiece = {
      x: 2,
      y: 1, // Start a bit lower
      mainColor: player.nextPiece.main,
      subColor: player.nextPiece.sub,
      rotation: 0
    };
    player.nextPiece = player.nextNextPiece;
    player.nextNextPiece = spawnPiece();
  };

  // --- UI RENDER ---

  const backgroundImageStyle = bgImage 
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : { background: 'linear-gradient(to bottom, #87CEEB, #E0F7FA)' };

  return (
    <div className="w-full h-screen relative overflow-hidden flex flex-col items-center select-none" style={backgroundImageStyle}>
       {/* Background Overlay for better visibility */}
       <div className="absolute inset-0 bg-black/10 z-0"></div>

       {/* Top Bar */}
       <div className="w-full bg-white/20 text-white p-3 flex justify-between items-center px-6 backdrop-blur-md z-10 shadow-sm border-b border-white/20">
          <div className="flex flex-col">
             <h2 className="font-bold text-xl drop-shadow-md font-fredoka">Gangwon Puyo Blast</h2>
             <span className="text-xs opacity-80">ESC to Pause</span>
          </div>
          <button onClick={() => setGameStatus('menu')} className="bg-red-500/80 hover:bg-red-600 px-4 py-1 rounded-full text-sm font-bold shadow-lg transition-all">EXIT</button>
       </div>

       {/* Game Area */}
       <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 w-full px-4 overflow-x-auto z-10">
          {gameStatus === 'menu' && (
             <div className="bg-white/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl border-4 border-white text-center animate-fade-in-up">
                 <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 mb-8 drop-shadow-sm">GANGWON<br/>PUYO</h1>
                 <p className="text-gray-600 font-bold mb-4">Select Players</p>
                 <div className="flex gap-4 justify-center mb-8">
                    {[1, 2, 3, 4].map(n => (
                      <button 
                        key={n}
                        onClick={() => startGame(n)}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-black text-2xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center border-2 border-white/50"
                      >
                        {n}
                      </button>
                    ))}
                 </div>
                 {bgImage === DEFAULT_BG && (
                    <button 
                      onClick={handleGenerateBg}
                      className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-2 mx-auto"
                    >
                       <span>🎨 Create Unique Background (AI)</span>
                    </button>
                 )}
             </div>
          )}

          {gameStatus === 'loading' && (
              <div className="bg-white/80 p-8 rounded-2xl animate-pulse">
                 <div className="text-xl font-bold text-blue-500">Generating Scene...</div>
              </div>
          )}

          {(gameStatus === 'playing' || gameStatus === 'paused') && (
            <>
               {players.map(p => (
                 <GameBoard key={p.id} playerId={p.id} playerState={p} />
               ))}
            </>
          )}
       </div>
       
       {/* Pause Overlay */}
       {gameStatus === 'paused' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
             <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">PAUSED</h2>
                <div className="flex gap-4 justify-center">
                   <button onClick={() => setGameStatus('playing')} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold shadow hover:bg-blue-600">RESUME</button>
                   <button onClick={() => setGameStatus('menu')} className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold shadow hover:bg-gray-600">MENU</button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}