import { ElementType, CardData, ArenaEffect, AbilityType } from './types';
import { Flame, Mountain, Zap, Wind, Droplets } from 'lucide-react';
import React from 'react';

export const ELEMENTS = [
  ElementType.FIRE,
  ElementType.EARTH,
  ElementType.LIGHTNING,
  ElementType.AIR,
  ElementType.WATER
];

// Flat Vector Style Interface
interface ElementStyle {
  bgColor: string;       // Main card background
  patternColor: string;  // For subtle vector pattern
  accentColor: string;   // For icons/details
  textColor: string;
}

export const ELEMENT_STYLES: Record<ElementType, ElementStyle> = {
  [ElementType.FIRE]: {
    bgColor: 'bg-[#ff6b6b]', // Flat Soft Red/Orange
    patternColor: 'text-[#ee5253]',
    accentColor: 'text-white',
    textColor: 'text-[#ff6b6b]'
  },
  [ElementType.EARTH]: {
    bgColor: 'bg-[#51cf66]', // Flat Lime/Green
    patternColor: 'text-[#40c057]',
    accentColor: 'text-white',
    textColor: 'text-[#51cf66]'
  },
  [ElementType.LIGHTNING]: {
    bgColor: 'bg-[#fcc419]', // Flat Yellow/Amber
    patternColor: 'text-[#fab005]',
    accentColor: 'text-[#212529]',
    textColor: 'text-[#fcc419]'
  },
  [ElementType.AIR]: {
    bgColor: 'bg-[#339af0]', // Flat Sky Blue
    patternColor: 'text-[#228be6]',
    accentColor: 'text-white',
    textColor: 'text-[#339af0]'
  },
  [ElementType.WATER]: {
    bgColor: 'bg-[#5c7cfa]', // Flat Indigo
    patternColor: 'text-[#4c6ef5]',
    accentColor: 'text-white',
    textColor: 'text-[#5c7cfa]'
  }
};

export const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  [ElementType.FIRE]: <Flame size={32} strokeWidth={3} />,
  [ElementType.EARTH]: <Mountain size={32} strokeWidth={3} />,
  [ElementType.LIGHTNING]: <Zap size={32} strokeWidth={3} />,
  [ElementType.AIR]: <Wind size={32} strokeWidth={3} />,
  [ElementType.WATER]: <Droplets size={32} strokeWidth={3} />
};

export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType> = {
  [ElementType.FIRE]: ElementType.EARTH,
  [ElementType.EARTH]: ElementType.LIGHTNING,
  [ElementType.LIGHTNING]: ElementType.AIR,
  [ElementType.AIR]: ElementType.WATER,
  [ElementType.WATER]: ElementType.FIRE
};

// Simplified Pool (Translated Full Names)
// Added Abilities to Tier 3/4 Cards
export const CARD_POOL: CardData[] = [
  // FOGO
  { id: 'f1', name: 'Chama Viva', element: ElementType.FIRE, power: 1, cost: 1 },
  { id: 'f2', name: 'Brasa Ardente', element: ElementType.FIRE, power: 3, cost: 2 },
  { id: 'f3', name: 'Labareda Furiosa', element: ElementType.FIRE, power: 5, cost: 3, ability: AbilityType.CHARGE },
  { id: 'f4', name: 'Magma Derretido', element: ElementType.FIRE, power: 6, cost: 4 },
  { id: 'f5', name: 'Inferno Solar', element: ElementType.FIRE, power: 9, cost: 6 },
  // TERRA
  { id: 'e1', name: 'Pedra Ancestral', element: ElementType.EARTH, power: 1, cost: 1 },
  { id: 'e2', name: 'Musgo Denso', element: ElementType.EARTH, power: 3, cost: 2 },
  { id: 'e3', name: 'Rocha Sólida', element: ElementType.EARTH, power: 5, cost: 3 },
  { id: 'e4', name: 'Titã de Terra', element: ElementType.EARTH, power: 6, cost: 4 },
  { id: 'e5', name: 'Gaia Mãe', element: ElementType.EARTH, power: 9, cost: 6 },
  // RAIO
  { id: 'l1', name: 'Faísca Veloz', element: ElementType.LIGHTNING, power: 1, cost: 1 },
  { id: 'l2', name: 'Raio Cortante', element: ElementType.LIGHTNING, power: 3, cost: 2, ability: AbilityType.CHARGE },
  { id: 'l3', name: 'Volts Mortais', element: ElementType.LIGHTNING, power: 5, cost: 3, ability: AbilityType.CHARGE },
  { id: 'l4', name: 'Trovão Real', element: ElementType.LIGHTNING, power: 8, cost: 6 }, 
  { id: 'l5', name: 'Tormenta Final', element: ElementType.LIGHTNING, power: 9, cost: 6 },
  // AR
  { id: 'a1', name: 'Sopro Suave', element: ElementType.AIR, power: 1, cost: 1 },
  { id: 'a2', name: 'Brisa Leve', element: ElementType.AIR, power: 3, cost: 2, ability: AbilityType.DRAW },
  { id: 'a3', name: 'Vendaval Forte', element: ElementType.AIR, power: 5, cost: 3, ability: AbilityType.DRAW },
  { id: 'a4', name: 'Ciclone Maior', element: ElementType.AIR, power: 6, cost: 4 },
  { id: 'a5', name: 'Zéfiro Divino', element: ElementType.AIR, power: 9, cost: 6 },
  // ÁGUA
  { id: 'w1', name: 'Gota Pura', element: ElementType.WATER, power: 1, cost: 1 },
  { id: 'w2', name: 'Névoa Densa', element: ElementType.WATER, power: 3, cost: 2, ability: AbilityType.DRAW },
  { id: 'w3', name: 'Maré Cheia', element: ElementType.WATER, power: 5, cost: 3, ability: AbilityType.DRAW },
  { id: 'w4', name: 'Onda Gigante', element: ElementType.WATER, power: 6, cost: 4 },
  { id: 'w5', name: 'Abismo Azul', element: ElementType.WATER, power: 9, cost: 6 },
];

export const COIN_CARD: CardData = {
  id: 'coin',
  name: 'Moeda da Sorte',
  element: ElementType.FIRE,
  power: 2,
  cost: 1,
  isToken: true
};

export const ARENA_EFFECTS: ArenaEffect[] = [
  { id: 'f1', name: 'Terra Arrasada', description: 'Cartas custo 5+ ganham +1 Poder.', element: ElementType.FIRE, apply: (s) => s },
  { id: 'e1', name: 'Fortaleza', description: 'Cartas custo 2- ganham +1 Poder.', element: ElementType.EARTH, apply: (s) => s },
  { id: 'l1', name: 'Sobrecarga', description: 'Comece com +2 de Energia.', element: ElementType.LIGHTNING, apply: (s) => s },
  { id: 'a1', name: 'Vento a Favor', description: 'Cartas custo 3- custam -1.', element: ElementType.AIR, apply: (s) => s },
  { id: 'w1', name: 'Maré Alta', description: 'Perdedor recupera +3 Energia.', element: ElementType.WATER, apply: (s) => s },
];