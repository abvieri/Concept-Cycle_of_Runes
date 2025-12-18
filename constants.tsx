import { ElementType, CardData, ArenaEffect } from './types';
import { Flame, Mountain, Zap, Wind, Droplets } from 'lucide-react';
import React from 'react';

export const ELEMENTS = [
  ElementType.FIRE,
  ElementType.EARTH,
  ElementType.LIGHTNING,
  ElementType.AIR,
  ElementType.WATER
];

export const ELEMENT_COLORS: Record<ElementType, string> = {
  [ElementType.FIRE]: 'bg-red-600 border-red-800 text-red-100',
  [ElementType.EARTH]: 'bg-emerald-700 border-emerald-900 text-emerald-100',
  [ElementType.LIGHTNING]: 'bg-yellow-500 border-yellow-700 text-yellow-950',
  [ElementType.AIR]: 'bg-sky-400 border-sky-600 text-sky-950',
  [ElementType.WATER]: 'bg-blue-600 border-blue-800 text-blue-100'
};

export const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  [ElementType.FIRE]: <Flame size={16} fill="currentColor" />,
  [ElementType.EARTH]: <Mountain size={16} fill="currentColor" />,
  [ElementType.LIGHTNING]: <Zap size={16} fill="currentColor" />,
  [ElementType.AIR]: <Wind size={16} fill="currentColor" />,
  [ElementType.WATER]: <Droplets size={16} fill="currentColor" />
};

export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType> = {
  [ElementType.FIRE]: ElementType.EARTH,
  [ElementType.EARTH]: ElementType.LIGHTNING,
  [ElementType.LIGHTNING]: ElementType.AIR,
  [ElementType.AIR]: ElementType.WATER,
  [ElementType.WATER]: ElementType.FIRE
};

// Simplified Pool (Subset of GDD for demo purposes, but balanced)
export const CARD_POOL: CardData[] = [
  // FIRE
  { id: 'f1', name: 'Canhão Abrasador', element: ElementType.FIRE, power: 1, cost: 1 },
  { id: 'f2', name: 'Esquadrão Incendiário', element: ElementType.FIRE, power: 3, cost: 2 },
  { id: 'f3', name: 'Campo em Chamas', element: ElementType.FIRE, power: 5, cost: 3 },
  { id: 'f4', name: 'Catapulta Ígnea', element: ElementType.FIRE, power: 6, cost: 4 },
  { id: 'f5', name: 'Avatar da Fornalha', element: ElementType.FIRE, power: 10, cost: 8 },
  // EARTH
  { id: 'e1', name: 'Sentinela de Pedra', element: ElementType.EARTH, power: 1, cost: 1 },
  { id: 'e2', name: 'Patrulha Rochosa', element: ElementType.EARTH, power: 3, cost: 2 },
  { id: 'e3', name: 'Linha de Defesa', element: ElementType.EARTH, power: 5, cost: 3 },
  { id: 'e4', name: 'Colosso Blindado', element: ElementType.EARTH, power: 6, cost: 4 },
  { id: 'e5', name: 'Avatar do Monólito', element: ElementType.EARTH, power: 10, cost: 8 },
  // LIGHTNING
  { id: 'l1', name: 'Faísca Instável', element: ElementType.LIGHTNING, power: 1, cost: 1 },
  { id: 'l2', name: 'Tropas Energizadas', element: ElementType.LIGHTNING, power: 3, cost: 2 },
  { id: 'l3', name: 'Sobrecarga Total', element: ElementType.LIGHTNING, power: 5, cost: 3 },
  { id: 'l4', name: 'Unidade Relâmpago', element: ElementType.LIGHTNING, power: 8, cost: 6 }, // High risk high reward curve adj
  { id: 'l5', name: 'Avatar da Tempestade', element: ElementType.LIGHTNING, power: 10, cost: 8 },
  // AIR
  { id: 'a1', name: 'Batedores do Vento', element: ElementType.AIR, power: 1, cost: 1 },
  { id: 'a2', name: 'Tropas Aéreas', element: ElementType.AIR, power: 3, cost: 2 },
  { id: 'a3', name: 'Redemoinho Tático', element: ElementType.AIR, power: 5, cost: 3 },
  { id: 'a4', name: 'Vendaval Coordenado', element: ElementType.AIR, power: 6, cost: 4 },
  { id: 'a5', name: 'Avatar dos Céus', element: ElementType.AIR, power: 10, cost: 8 },
  // WATER
  { id: 'w1', name: 'Navio Encalhado', element: ElementType.WATER, power: 1, cost: 1 },
  { id: 'w2', name: 'Maré Avançando', element: ElementType.WATER, power: 3, cost: 2 },
  { id: 'w3', name: 'Correnteza Violenta', element: ElementType.WATER, power: 5, cost: 3 },
  { id: 'w4', name: 'Frota Submersa', element: ElementType.WATER, power: 6, cost: 4 },
  { id: 'w5', name: 'Avatar do Abismo', element: ElementType.WATER, power: 10, cost: 8 },
];

export const COIN_CARD: CardData = {
  id: 'coin',
  name: 'Moeda da Sorte',
  element: ElementType.FIRE, // Placeholder, random in logic
  power: 2,
  cost: 1,
  isToken: true
};

export const ARENA_EFFECTS: ArenaEffect[] = [
  { id: 'f1', name: 'Chão em Chamas', description: 'Cartas custo 5+ recebem +1 Poder.', element: ElementType.FIRE, apply: (s) => s },
  { id: 'e1', name: 'Solo Fortificado', description: 'Cartas custo 2- recebem +1 Poder.', element: ElementType.EARTH, apply: (s) => s },
  { id: 'l1', name: 'Descarga Inicial', description: 'Ambos começam com +2 Energia.', element: ElementType.LIGHTNING, apply: (s) => s },
  { id: 'a1', name: 'Céu Aberto', description: 'Cartas custo 3- custam -1 (min 1).', element: ElementType.AIR, apply: (s) => s },
  { id: 'w1', name: 'Maré Favorável', description: 'Perdedor da rodada recupera +3 Energia total.', element: ElementType.WATER, apply: (s) => s },
];
