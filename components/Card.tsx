import React from 'react';
import { CardData } from '../types';
import { ELEMENT_STYLES, ELEMENT_ICONS } from '../constants';
import { Shield, Coins } from 'lucide-react';

interface CardProps {
  card: CardData;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  hidden?: boolean;
  mini?: boolean;
  isClashing?: boolean;
  isWinning?: boolean;
  isLosing?: boolean;
  reveal?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  card, onClick, disabled, selected, hidden, mini,
  isClashing, isWinning, isLosing, reveal 
}) => {
  const isCoin = card.id.startsWith('coin') || card.isToken;
  
  // Custom Style for Coin or Standard Element Style
  const style = isCoin ? {
    bgColor: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500',
    patternColor: 'text-yellow-600',
    accentColor: 'text-yellow-900', // Darker text for visibility on gold
    textColor: 'text-amber-700'
  } : ELEMENT_STYLES[card.element];
  
  // Animation Classes
  let animClass = '';
  if (reveal) animClass = isCoin ? 'anim-coin-flip' : 'anim-enter'; // Special entrance for coin
  if (isClashing) animClass = 'anim-clash'; 
  if (isWinning) animClass = 'z-50 scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]';
  if (isLosing) animClass = 'grayscale brightness-50 scale-95';

  // Sizing
  const widthClass = mini ? 'w-14' : 'w-24 sm:w-28';
  const heightClass = mini ? 'h-20' : 'h-36 sm:h-40';
  const iconScale = mini ? 'scale-50' : 'scale-100';

  // --- HIDDEN STATE (Card Back) ---
  if (hidden) {
    return (
      <div className={`
        ${widthClass} ${heightClass}
        rounded-xl border-[3px] border-[#3b4657] bg-[#262c3a]
        flex items-center justify-center shadow-lg
        transition-all duration-300 shrink-0 relative overflow-hidden
      `}>
         {/* CSS Pattern instead of external image */}
         <div className="absolute inset-0 opacity-10" 
              style={{
                backgroundImage: 'radial-gradient(#4cc9f0 1px, transparent 1px)', 
                backgroundSize: '10px 10px'
              }}
         ></div>
         <div className="w-8 h-8 rounded-full border-2 border-[#3b4657] bg-[#31394a] flex items-center justify-center relative z-10">
            <div className="w-3 h-3 rounded-full bg-[#4cc9f0] animate-pulse"></div>
         </div>
      </div>
    );
  }

  // --- VISIBLE STATE ---
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative group
        ${widthClass} ${heightClass}
        transition-all duration-200 ease-out shrink-0 select-none
        ${!disabled && !selected && !isClashing ? 'hover:-translate-y-3 hover:scale-105 cursor-pointer' : ''}
        ${selected ? 'ring-4 ring-[#4cc9f0] translate-y-[-12px] z-20' : ''}
        
        ${/* Intensified Disabled Effect */ ''}
        ${disabled && !isWinning && !isLosing ? 'grayscale brightness-[0.4] opacity-60 cursor-not-allowed border border-red-500/30' : ''}
        
        ${animClass}
      `}
    >
        {/* --- Card Container (Thick White Border) --- */}
        <div className={`
            w-full h-full rounded-2xl 
            bg-white border-[4px] border-white
            shadow-xl overflow-hidden
            flex flex-col relative
        `}>
            
            {/* Top Section: Art / Icon */}
            <div className={`
                h-[72%] ${style.bgColor} 
                flex items-center justify-center relative
                overflow-hidden rounded-t-lg
            `}>
                {/* Special Shine for Coin */}
                {isCoin && <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] pointer-events-none skew-x-12 -translate-x-full"></div>}

                {/* Vector Pattern Background (SVG Inline) */}
                <div className={`absolute -right-6 -top-6 opacity-20 ${style.patternColor}`}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="currentColor"/>
                    </svg>
                </div>
                <div className={`absolute -left-4 bottom-8 opacity-20 ${style.patternColor}`}>
                    <svg width="50" height="50" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="currentColor"/>
                    </svg>
                </div>

                {/* Coin Badge Indicator (Top Right) */}
                {isCoin && (
                    <div className="absolute top-1 right-1 bg-yellow-600/20 rounded-full p-1 z-10">
                        <Coins size={12} className="text-yellow-900 opacity-60" />
                    </div>
                )}

                {/* Main Icon - ALWAYS SHOW THE ELEMENT ICON */}
                <div className={`${style.accentColor} drop-shadow-md transform transition-transform group-hover:scale-110 duration-300 ${iconScale}`}>
                    {ELEMENT_ICONS[card.element]}
                </div>
            </div>

            {/* Bottom Section: Nameplate (Dark & distinct) */}
            <div className="h-[28%] bg-[#1e2330] flex flex-col items-center justify-center relative z-10 border-t-2 border-white/10">
                {/* Decorative curve at the top of the nameplate */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-[120%] h-4 ${style.bgColor} rounded-b-[100%] z-0`}></div>
                
                <div className="relative z-10 w-full px-1 flex flex-col items-center justify-center h-full pt-1">
                    <p className={`
                        ${mini ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'} 
                        font-black uppercase tracking-wider text-white text-center leading-tight
                        line-clamp-2 w-full
                    `}>
                        {card.name}
                    </p>
                </div>
            </div>
        </div>

        {/* --- Floating Stats Badges (Re-styled to match reference) --- */}
        
        {/* COST (Top Left - Diamond/Square) */}
        {!mini && (
          <div className="absolute top-2 -left-3 z-30 filter drop-shadow-md">
              <div className="flex items-center justify-center w-7 h-7 bg-white border-[3px] border-[#1e2330] rounded-lg rotate-[-10deg] group-hover:rotate-0 transition-transform">
                  <span className={`text-base font-black ${style.textColor}`}>{card.cost}</span>
              </div>
          </div>
        )}

        {/* POWER (Bottom Left - Shield/Badge) */}
        {!mini && (
          <div className="absolute bottom-9 -left-3 z-30 filter drop-shadow-md">
              <div className="flex flex-col items-center justify-center w-7 h-9 bg-[#1e2330] border-[2px] border-white rounded-b-xl rounded-t-md">
                  <Shield size={8} className="text-white/50 -mb-1 mt-0.5" />
                  <span className="text-white font-bold text-base leading-none mb-1">{card.power}</span>
              </div>
          </div>
        )}
    </div>
  );
};