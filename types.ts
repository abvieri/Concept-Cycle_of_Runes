export enum ElementType {
  FIRE = 'FIRE',
  EARTH = 'EARTH',
  LIGHTNING = 'LIGHTNING',
  AIR = 'AIR',
  WATER = 'WATER'
}

export enum AbilityType {
  DRAW = 'DRAW',   // Swirling vortex effect
  CHARGE = 'CHARGE' // Crackling energy effect
}

export interface CardData {
  id: string;
  name: string;
  element: ElementType;
  power: number;
  cost: number;
  isToken?: boolean; // For the "Coin" card
  ability?: AbilityType;
}

export interface ArenaEffect {
  id: string;
  name: string;
  description: string;
  element: ElementType;
  apply: (state: any) => any; // Simplified for typing
}

export interface PlayerState {
  id: string;
  name: string;
  health: number; // Not used in this GDD, but good for structure
  energy: number;
  maxEnergy: number;
  deck: CardData[];
  hand: CardData[];
  discard: CardData[];
  runes: ElementType[];
}

export enum GamePhase {
  MENU = 'MENU',
  ROULETTE = 'ROULETTE',
  DECK_SELECTION = 'DECK_SELECTION',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER'
}

export enum CombatPhase {
  DRAW = 'DRAW',
  PLANNING = 'PLANNING', // Player chooses card
  RESOLUTION = 'RESOLUTION', // Cards revealed, winner decided
  CLEANUP = 'CLEANUP'
}