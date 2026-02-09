import React, { useState, useEffect } from 'react';
import { PuyoColor } from '../types';
import { getPuyoStyles } from '../constants';

interface PuyoBlockProps {
  color: PuyoColor;
  isGhost?: boolean;
  connections?: { up: boolean; down: boolean; left: boolean; right: boolean };
}

type Expression = 'NORMAL' | 'ANGRY' | 'HAPPY' | 'SURPRISED' | 'SAD' | 'SLEEPY';
const EXPRESSIONS: Expression[] = ['NORMAL', 'ANGRY', 'HAPPY', 'SURPRISED', 'SAD', 'SLEEPY'];

// Move EyeContainer outside and make children optional to avoid TS errors
const EyeContainer = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`relative w-[28%] h-[42%] bg-white rounded-full shadow-inner overflow-hidden flex items-center justify-center ${className}`}>
    {children}
  </div>
);

export const PuyoBlock: React.FC<PuyoBlockProps> = ({ color, isGhost = false, connections }) => {
  if (color === PuyoColor.EMPTY) return <div className="w-full h-full" />;

  const styles = getPuyoStyles(color);
  
  // Initialize with a random expression to desynchronize the grid
  const [expression, setExpression] = useState<Expression>(() => 
    EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)]
  );

  useEffect(() => {
    // Garbage and Ghosts don't need animated expressions
    if (color === PuyoColor.GARBAGE || isGhost) return;

    // Change expression at random intervals (between 1.5s and 4.5s)
    const delay = 1500 + Math.random() * 3000;
    
    const timeoutId = setTimeout(() => {
      setExpression(prev => {
        // Pick a new expression different from current one
        const options = EXPRESSIONS.filter(e => e !== prev);
        return options[Math.floor(Math.random() * options.length)];
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [expression, color, isGhost]);

  // Connection logic for blob shape
  const isUp = connections?.up;
  const isDown = connections?.down;
  const isLeft = connections?.left;
  const isRight = connections?.right;

  const radius = '50%';
  const noRadius = '0';

  const borderRadius = {
    borderTopLeftRadius: (isUp || isLeft) ? noRadius : radius,
    borderTopRightRadius: (isUp || isRight) ? noRadius : radius,
    borderBottomLeftRadius: (isDown || isLeft) ? noRadius : radius,
    borderBottomRightRadius: (isDown || isRight) ? noRadius : radius,
  };

  const scale = (isUp || isDown || isLeft || isRight) ? 'scale-[1.05]' : 'scale-100';

  // --- Face Rendering Helpers ---
  
  const Pupil = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => (
    <div className={`w-[50%] h-[50%] bg-black rounded-full flex items-center justify-center ${className}`} style={{backgroundColor: styles.dark, ...style}}>
        <div className="w-[35%] h-[35%] bg-white rounded-full -mt-[30%] -ml-[30%] shadow-[0_0_2px_white]" />
    </div>
  );

  const renderFace = () => {
    switch (expression) {
      case 'ANGRY':
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[6%] pt-[8%]">
             <EyeContainer>
                <div className={`absolute top-0 w-full h-[45%] ${styles.base} rotate-12 z-10 -ml-1 border-b border-black/10`} />
                <Pupil className="mt-2" />
             </EyeContainer>
             <EyeContainer>
                <div className={`absolute top-0 w-full h-[45%] ${styles.base} -rotate-12 z-10 -mr-1 border-b border-black/10`} />
                <Pupil className="mt-2" />
             </EyeContainer>
          </div>
        );
      case 'HAPPY':
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[15%] pt-[5%]">
             {/* Arched Eyes */}
             <div className="w-[28%] h-[25%] border-t-[3px] rounded-full" style={{borderColor: styles.dark}} />
             <div className="w-[28%] h-[25%] border-t-[3px] rounded-full" style={{borderColor: styles.dark}} />
             {/* Open Mouth */}
             <div className="absolute bottom-[25%] w-[20%] h-[15%] bg-red-400 rounded-b-full opacity-80" />
          </div>
        );
      case 'SURPRISED':
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[4%] pt-[0%]">
             <EyeContainer className="!w-[32%] !h-[48%]">
                <Pupil className="scale-75" />
             </EyeContainer>
             <EyeContainer className="!w-[32%] !h-[48%]">
                <Pupil className="scale-75" />
             </EyeContainer>
             <div className="absolute bottom-[20%] w-[12%] h-[12%] bg-black/40 rounded-full" />
          </div>
        );
      case 'SAD':
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[8%] pt-[10%]">
             <EyeContainer>
                 <div className={`absolute top-0 w-full h-[55%] ${styles.base} z-10 opacity-50 rounded-b-xl translate-y-[-20%]`} />
                 <Pupil className="mt-3" />
             </EyeContainer>
             <EyeContainer>
                 <div className={`absolute top-0 w-full h-[55%] ${styles.base} z-10 opacity-50 rounded-b-xl translate-y-[-20%]`} />
                 <Pupil className="mt-3" />
             </EyeContainer>
             <div className="absolute bottom-[25%] w-[15%] h-[5%] bg-black/20 rounded-full" />
          </div>
        );
      case 'SLEEPY':
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[10%] pt-[5%]">
             <EyeContainer>
                 <div className={`absolute top-0 w-full h-[55%] ${styles.base} z-10 border-b border-black/10`} />
                 <Pupil className="mt-2" />
             </EyeContainer>
             <EyeContainer>
                 <div className={`absolute top-0 w-full h-[55%] ${styles.base} z-10 border-b border-black/10`} />
                 <Pupil className="mt-2" />
             </EyeContainer>
             {/* Snot bubble */}
             <div className="absolute bottom-[30%] right-[20%] w-[12%] h-[12%] bg-blue-100 rounded-full opacity-60 animate-pulse border border-white/50" /> 
          </div>
        );
      case 'NORMAL':
      default:
        return (
          <div className="absolute inset-0 flex items-center justify-center gap-[10%] pt-[5%]">
             <EyeContainer>
                 <Pupil />
             </EyeContainer>
             <EyeContainer>
                 <Pupil />
             </EyeContainer>
          </div>
        );
    }
  };

  return (
    <div className={`w-full h-full relative flex items-center justify-center z-10`}> 
      <div 
        className={`
          absolute inset-0
          ${styles.base}
          ${scale}
          transition-all duration-100
        `}
        style={{
          ...borderRadius,
          // Deep Jelly Shadow and Highlight
          boxShadow: `
            inset -2px -4px 8px rgba(0,0,0,0.3), 
            inset 2px 4px 8px rgba(255,255,255,0.4),
            0 2px 4px rgba(0,0,0,0.1)
          `
        }}
      >
        {/* Additional Gloss/Highlight Layer */}
        {color !== PuyoColor.GARBAGE && !isGhost && (
          <>
             {/* Top Gloss */}
             <div 
               className="absolute top-[5%] left-[10%] w-[40%] h-[25%] bg-gradient-to-br from-white to-transparent rounded-full opacity-80 pointer-events-none filter blur-[1px]"
             />
             
             {/* Bottom Bounce Light */}
             <div 
               className="absolute bottom-[5%] right-[10%] w-[40%] h-[20%] bg-gradient-to-tl from-white to-transparent rounded-full opacity-30 pointer-events-none"
             />

             {/* RENDER THE FACE */}
             {renderFace()}
          </>
        )}

        {/* Garbage Block Style */}
        {color === PuyoColor.GARBAGE && (
           <div className="w-full h-full flex items-center justify-center">
              <div className="w-[80%] h-[80%] rounded-full bg-transparent flex items-center justify-center shadow-inner relative">
                 {/* Rock texture */}
                 <div className="absolute w-full h-full rounded-full border-[3px] border-white/30 opacity-80" />
                 <div className="text-white/60 text-[12px] font-bold">X</div>
                 <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-black/20 rounded-full blur-[1px]" />
              </div>
           </div>
        )}
      </div>
      
      {/* Ghost Opacity Override */}
      {isGhost && <div className="absolute inset-0 bg-white/60 rounded-full" />}
    </div>
  );
};