import React from 'react';
import { CardData, ElementType } from '../types';
import { ELEMENT_COLORS, ELEMENT_ICONS } from '../constants';

interface CardProps {
  card: CardData;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  hidden?: boolean;
  mini?: boolean;
  // Animation states
  isClashing?: boolean;
  isWinning?: boolean;
  isLosing?: boolean;
  reveal?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  card, onClick, disabled, selected, hidden, mini,
  isClashing, isWinning, isLosing, reveal 
}) => {
  const colorClass = ELEMENT_COLORS[card.element];

  // Calculate Tier based on Cost
  const tier = card.cost >= 7 ? 'high' : card.cost >= 4 ? 'mid' : 'low';
  
  // Base classes
  const tierAnimClass = !mini && !hidden && !disabled && !selected && !isClashing && !isWinning && !isLosing 
    ? `anim-tier-${tier} element-anim-${card.element}` 
    : '';

  // Combat classes
  let combatAnimClass = '';
  if (reveal) combatAnimClass = 'anim-enter';
  if (isClashing) combatAnimClass = 'anim-clash';
  // Use specific elemental victory animation if winning
  if (isWinning) combatAnimClass = `anim-win-${card.element}`; 
  if (isLosing) combatAnimClass = 'anim-lose';

  // Responsive Dimensions
  const sizeClass = mini 
    ? 'w-12 h-16 md:w-16 md:h-24 text-[10px] md:text-xs' 
    : 'w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40 text-xs sm:text-sm md:text-base';

  if (hidden) {
    return (
      <div className={`
        ${sizeClass}
        rounded-lg border-2 border-slate-700 bg-slate-800 
        flex items-center justify-center shadow-lg
        transition-all duration-300
        shrink-0
      `}>
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative
        ${sizeClass}
        ${colorClass}
        ${tierAnimClass}
        ${combatAnimClass}
        rounded-lg border-2 shadow-lg
        flex flex-col justify-between
        transition-all duration-200
        shrink-0
        ${!disabled && !selected && !isClashing && !isWinning && !isLosing ? 'hover:-translate-y-2 cursor-pointer' : ''}
        ${selected ? 'ring-4 ring-white translate-y-[-10px] z-10' : ''}
        ${disabled && !isWinning && !isLosing ? 'opacity-50 grayscale cursor-not-allowed' : ''}
      `}
    >
      {/* High Tier Special Effect Overlay */}
      {tier === 'high' && !hidden && !mini && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-lg" />
      )}

      {/* Header: Cost & Icon */}
      <div className="flex justify-between items-center p-1 bg-black/20 rounded-t-md z-10">
        <div className={`font-bold flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full border text-white shadow-md ${tier === 'high' ? 'bg-yellow-600 border-yellow-300' : 'bg-blue-900 border-blue-400'}`}>
          {card.cost}
        </div>
        <div className="text-white/90 scale-75 sm:scale-100">
            {ELEMENT_ICONS[card.element]}
        </div>
      </div>

      {/* Body: Name */}
      <div className="flex-1 flex items-center justify-center text-center p-0.5 leading-[0.9] font-semibold uppercase tracking-tighter z-10 line-clamp-3">
        {card.name}
      </div>

      {/* Footer: Power */}
      <div className="p-1 sm:p-2 bg-black/30 rounded-b-md flex justify-center items-center z-10">
        <span className="text-[8px] sm:text-[10px] mr-1 uppercase opacity-75">Poder</span>
        <span className={`text-lg sm:text-xl font-bold drop-shadow-md ${tier === 'high' ? 'text-yellow-200' : ''}`}>
          {card.power}
        </span>
      </div>
    </div>
  );
};