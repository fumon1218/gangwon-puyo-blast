import React from 'react';
import { PlayerState, ROWS, COLS, PuyoColor, HIDDEN_ROWS } from '../types';
import { PuyoBlock } from './PuyoBlock';

interface GameBoardProps {
  playerState: PlayerState;
  playerId: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({ playerState, playerId }) => {
  const { grid, activePiece, score, isGameOver, particles } = playerState;

  // Helper to check connections for visual merging
  const getConnections = (r: number, c: number, color: PuyoColor) => {
    if (color === PuyoColor.EMPTY || color === PuyoColor.GARBAGE) return undefined;
    
    // Check grid neighbors
    const check = (nr: number, nc: number) => {
      // Check boundaries
      if (nr < 0 || nr >= ROWS + HIDDEN_ROWS || nc < 0 || nc >= COLS) return false;
      return grid[nr][nc] === color;
    };

    return {
      up: check(r - 1, c),
      down: check(r + 1, c),
      left: check(r, c - 1),
      right: check(r, c + 1),
    };
  };

  // Construct display grid including active piece
  const renderCell = (r: number, c: number) => {
    let color = grid[r][c];
    let isGhost = false;
    let connections = undefined;

    // Active Piece Overlay
    if (activePiece) {
      const { x, y, mainColor, subColor, rotation } = activePiece;
      
      let isMain = (x === c && y === r);
      let isSub = false;

      let sx = x;
      let sy = y;
      if (rotation === 0) sy -= 1;
      if (rotation === 1) sx += 1;
      if (rotation === 2) sy += 1;
      if (rotation === 3) sx -= 1;

      if (sx === c && sy === r) isSub = true;

      if (isMain) {
        color = mainColor;
        connections = undefined; 
      } else if (isSub) {
        color = subColor;
        connections = undefined;
      }
    }

    if (!activePiece || (grid[r][c] !== PuyoColor.EMPTY && color === grid[r][c] && !((activePiece.x === c && activePiece.y === r) || (activePiece.x === c && activePiece.y === r)))) {
       if (grid[r][c] === color && grid[r][c] !== PuyoColor.EMPTY) {
         const isActive = activePiece && ( (activePiece.x === c && activePiece.y === r) || (activePiece.rotation===0?activePiece.y-1:activePiece.rotation===2?activePiece.y+1:activePiece.y) === r && (activePiece.rotation===1?activePiece.x+1:activePiece.rotation===3?activePiece.x-1:activePiece.x) === c );
         
         if (!isActive) {
            connections = getConnections(r, c, color);
         }
       }
    }

    if (r < HIDDEN_ROWS) return null;

    return (
      <div key={`${r}-${c}`} className="w-8 h-8 md:w-9 md:h-9 relative z-0">
        <PuyoBlock 
          color={color} 
          isGhost={isGhost} 
          connections={connections} 
        />
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center">
       {/* Glassmorphism Container */}
      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white/30 relative overflow-hidden">
        
        {isGameOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
            <div className="text-white text-4xl font-black tracking-widest animate-bounce drop-shadow-lg text-center">
              GAME<br/>OVER
            </div>
          </div>
        )}
        
        {/* Next Queue Preview */}
        <div className="absolute -right-12 top-4 flex flex-col gap-2">
           <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-lg">
              <div className="text-[10px] text-white font-bold text-center mb-1 drop-shadow">NEXT</div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6"><PuyoBlock color={playerState.nextPiece.sub} /></div>
                <div className="w-6 h-6"><PuyoBlock color={playerState.nextPiece.main} /></div>
              </div>
           </div>
           <div className="bg-white/5 backdrop-blur-sm p-2 rounded-xl scale-75 opacity-60 border border-white/10">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6"><PuyoBlock color={playerState.nextNextPiece.sub} /></div>
                <div className="w-6 h-6"><PuyoBlock color={playerState.nextNextPiece.main} /></div>
              </div>
           </div>
        </div>

        {/* Garbage Queue */}
        {playerState.garbageQueue > 0 && (
            <div className="absolute top-0 left-0 w-full flex justify-center -mt-4 z-20">
                <div className="bg-gray-100/90 backdrop-blur text-red-600 px-3 py-1 rounded-full text-xs font-black border-2 border-red-500 shadow-lg flex items-center gap-2 animate-pulse">
                    ⚠️ GARBAGE: {playerState.garbageQueue}
                </div>
            </div>
        )}

        {/* Main Grid Area */}
        <div className="bg-black/20 border border-white/10 p-1 rounded-xl backdrop-blur-sm shadow-inner relative">
          {grid.map((row, r) => {
            if (r < HIDDEN_ROWS) return null;
            return (
              <div key={r} className="flex">
                {row.map((_, c) => renderCell(r, c))}
              </div>
            );
          })}
          
          {/* Particles Layer */}
          {particles.map(p => {
             // Adjust y to account for HIDDEN_ROWS not being rendered in the main loop
             // The grid rendering skips rows < HIDDEN_ROWS.
             // If particle is at y=1.5 (hidden row), we shouldn't render it relative to the visible container 0,0?
             // Actually, the container `bg-black/20` contains only visible rows.
             // So we need to subtract HIDDEN_ROWS from p.y.
             const visibleY = p.y - HIDDEN_ROWS;
             if (visibleY < 0) return null;

             return (
               <div
                 key={p.id}
                 className="absolute rounded-full pointer-events-none z-50"
                 style={{
                   left: `${p.x * 100 / COLS}%`,
                   top: `${visibleY * 100 / ROWS}%`, 
                   width: '10%', // Base size relative to cell width (approx)
                   height: '5%', // Adjusted for aspect ratio
                   // We actually want pixel sizes or ems.
                   // Simpler: use the cell size.
                   // Let's rely on transform translate.
                   transform: `translate(-50%, -50%) scale(${p.size})`,
                   backgroundColor: p.color,
                   opacity: p.life,
                   boxShadow: `0 0 ${10 * p.size}px ${p.color}, 0 0 ${20 * p.size}px white`
                 }}
               >
                 {/* Inner bright core */}
                 <div className="w-full h-full rounded-full bg-white opacity-80 blur-[1px]" />
               </div>
             );
          })}
        </div>
      </div>

      {/* Score Panel */}
      <div className="mt-3 bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full border border-white/40 shadow-lg">
        <div className="font-mono text-xl font-bold tracking-widest drop-shadow-sm">
          {score.toString().padStart(7, '0')}
        </div>
      </div>
      <div className="mt-1 text-xs font-bold text-white/80 bg-black/20 px-2 py-0.5 rounded-full">P{playerId + 1}</div>
    </div>
  );
};