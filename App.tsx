import React, { useState, useEffect, useCallback } from 'react';
import { ElementType, GamePhase, PlayerState, CardData, CombatPhase, ArenaEffect } from './types';
import { ELEMENTS, CARD_POOL, ELEMENT_ADVANTAGE, ELEMENT_STYLES, ELEMENT_ICONS, ARENA_EFFECTS, COIN_CARD } from './constants';
import { Card } from './components/Card';
import { initAudio, playSound, toggleMute } from './audio';
import { RotateCw, Trophy, Skull, Coins, Zap, Volume2, VolumeX, SkipForward, Swords, Gem, Shield, HelpCircle, X, Info, ArrowRight } from 'lucide-react';

// --- Utils ---
const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const getRandomDeck = (): CardData[] => {
  const deck: CardData[] = [];
  for (let i = 0; i < 15; i++) {
    const template = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    deck.push({
        ...template,
        id: `${template.id}-${i}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
  return shuffle(deck);
};

const createPlayer = (id: string, name: string, deck?: CardData[]): PlayerState => ({
  id, 
  name, 
  health: 100, 
  energy: 6, 
  maxEnergy: 10, 
  // IMPORTANT: Clone the deck array to ensure we don't mutate the draft options
  deck: deck ? [...deck] : getRandomDeck(), 
  hand: [], 
  discard: [], 
  runes: [],
});

// Helper to analyze a deck and find the dominant rune
const getDominantRune = (deck: CardData[]): { rune: ElementType, count: number } => {
    const counts: Record<string, number> = {};
    deck.forEach(c => {
        counts[c.element] = (counts[c.element] || 0) + 1;
    });
    let max = 0;
    let dominant = ElementType.FIRE; // fallback
    Object.entries(counts).forEach(([key, val]) => {
        if (val > max) {
            max = val;
            dominant = key as ElementType;
        }
    });
    return { rune: dominant, count: max };
};

// --- Sub Components ---

const RuneTracker = ({ runes, alignRight = false }: { runes: ElementType[], alignRight?: boolean }) => {
    return (
        <div className={`flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-teal-500/30 backdrop-blur-md shadow-lg ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
            {ELEMENTS.map((elem) => {
                const count = runes.filter(r => r === elem).length;
                const style = ELEMENT_STYLES[elem];
                const isFull = count >= 3;
                
                return (
                    <div key={elem} className="flex flex-col items-center justify-between h-full group relative">
                        {/* Dots Counter */}
                        <div className="flex space-x-[1px] mb-1 h-1 items-end justify-center">
                            {[1, 2, 3].map(i => (
                                <div 
                                    key={i} 
                                    className={`
                                        w-1 h-1 rounded-full transition-all duration-300
                                        ${i <= count 
                                            ? style.bgColor 
                                            : 'bg-slate-700/50'}
                                        ${i === count && count > 0 ? 'scale-125 shadow-[0_0_4px_currentColor]' : ''}
                                    `} 
                                />
                            ))}
                        </div>
                        
                        {/* Element Icon Badge */}
                        <div className={`
                            w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300
                            ${count > 0 ? `${style.bgColor} text-white shadow-md` : 'bg-slate-800 text-slate-600 grayscale opacity-50'}
                            ${isFull ? 'ring-2 ring-white scale-110' : ''}
                        `}>
                            {React.cloneElement(ELEMENT_ICONS[elem] as React.ReactElement<any>, { size: 10 })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Modals ---

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
            <h3 className="text-xl font-black text-teal-100 mb-4">{title}</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                {children}
            </div>
        </div>
    </div>
);

// --- Main App ---

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  const [muted, setMuted] = useState(false);
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);

  const [player, setPlayer] = useState<PlayerState>(createPlayer('p1', 'Herói'));
  const [enemy, setEnemy] = useState<PlayerState>(createPlayer('cpu', 'Rival'));
  const [draftOptions, setDraftOptions] = useState<CardData[][]>([]);
  
  const [combatPhase, setCombatPhase] = useState<CombatPhase>(CombatPhase.PLANNING);
  const [playerCard, setPlayerCard] = useState<CardData | null>(null);
  const [enemyCard, setEnemyCard] = useState<CardData | null>(null);
  
  const [lastRoundResult, setLastRoundResult] = useState<string>('');
  const [winner, setWinner] = useState<PlayerState | null>(null);
  const [animState, setAnimState] = useState<'idle' | 'reveal' | 'clash' | 'impact' | 'finished'>('idle');
  const [roundWinner, setRoundWinner] = useState<'player' | 'enemy' | 'tie' | null>(null);
  const [shake, setShake] = useState(false);

  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [showArenaInfo, setShowArenaInfo] = useState(false);
  // Roulette
  const [rouletteIndex, setRouletteIndex] = useState(0);

  // --- Logic ---
  const calculateModifiedCost = useCallback((card: CardData): number => {
    let cost = card.cost;
    if (arenaEffect?.id === 'a1' && cost <= 3) cost = Math.max(1, cost - 1);
    return cost;
  }, [arenaEffect]);

  const calculateModifiedPower = useCallback((card: CardData): number => {
    let power = card.power;
    if (arenaEffect?.id === 'f1' && card.cost >= 5) power += 1;
    if (arenaEffect?.id === 'e1' && card.cost <= 2) power += 1;
    return power;
  }, [arenaEffect]);

  const checkVictory = (p: PlayerState): boolean => {
    const unique = new Set(p.runes).size;
    for (const elem of ELEMENTS) {
        if (p.runes.filter(r => r === elem).length >= 3) return true;
    }
    return unique >= 5;
  };

  const calculateRoundOutcome = (pCard: CardData, eCard: CardData) => {
    const pPower = calculateModifiedPower(pCard);
    const ePower = calculateModifiedPower(eCard);
    const pAdv = ELEMENT_ADVANTAGE[pCard.element] === eCard.element;
    const eAdv = ELEMENT_ADVANTAGE[eCard.element] === pCard.element;

    if (pAdv) return ePower >= pPower * 2 ? 'enemy' : 'player';
    if (eAdv) return pPower >= ePower * 2 ? 'player' : 'enemy';
    return pPower > ePower ? 'player' : ePower > pPower ? 'enemy' : 'tie';
  };

  const applyResults = (result: 'player' | 'enemy' | 'tie') => {
      if(!playerCard || !enemyCard) return;
      
      const updateState = (p: PlayerState, card: CardData, isWinner: boolean) => {
          let energy = p.energy + 2;
          if (!isWinner && arenaEffect?.id === 'w1') energy += 1;
          const runes = (isWinner && card.power >= 0) ? [...p.runes, card.element] : p.runes;
          return { ...p, energy: Math.min(p.maxEnergy, energy), runes };
      };

      if (result === 'player') {
          setPlayer(p => updateState(p, playerCard, true));
          setEnemy(p => updateState(p, enemyCard, false));
          setLastRoundResult('VITÓRIA');
          playSound.winRound();
      } else if (result === 'enemy') {
          setPlayer(p => updateState(p, playerCard, false));
          setEnemy(p => updateState(p, enemyCard, true));
          setLastRoundResult('DERROTA');
          playSound.loseRound();
      } else {
          setPlayer(p => ({...p, energy: Math.min(p.maxEnergy, p.energy + 2)}));
          setEnemy(p => ({...p, energy: Math.min(p.maxEnergy, p.energy + 2)}));
          setLastRoundResult('EMPATE');
          playSound.tie();
      }
  };

  // --- Effects ---
  useEffect(() => {
    if (playerCard && enemyCard && combatPhase === CombatPhase.PLANNING) {
        setCombatPhase(CombatPhase.RESOLUTION);
        setAnimState('reveal');
        playSound.draw();
        
        const result = calculateRoundOutcome(playerCard, enemyCard);
        
        // SLOWED DOWN TIMINGS FOR BETTER UX
        setTimeout(() => { setAnimState('clash'); playSound.clash(); }, 800);  // Slight pause before clash
        
        setTimeout(() => { 
            setRoundWinner(result); 
            setAnimState('impact'); 
            setShake(true); 
            setTimeout(() => setShake(false), 300);
        }, 1600); // 1.6s for impact
        
        // Long pause to read "VICTORY" or "DEFEAT"
        setTimeout(() => { applyResults(result); setAnimState('finished'); }, 3500); // 3.5s to see result text
        
        // Final cleanup
        setTimeout(() => { 
            setCombatPhase(CombatPhase.CLEANUP); 
            setAnimState('idle'); 
            setRoundWinner(null); 
        }, 5000); // 5s total -> 1.5s exposure (5000 - 3500)
    }
  }, [playerCard, enemyCard]);

  useEffect(() => {
      if (combatPhase === CombatPhase.CLEANUP) {
          if (checkVictory(player)) { setWinner(player); setPhase(GamePhase.GAME_OVER); }
          else if (checkVictory(enemy)) { setWinner(enemy); setPhase(GamePhase.GAME_OVER); }
          else {
              // GENERATE COIN WITH RANDOM ELEMENT
              const draw = (p: PlayerState) => {
                  const deck = [...p.deck];
                  const hand = [...p.hand];
                  if(deck.length > 0) {
                      hand.push(deck.pop()!);
                  } else {
                      // Recycle logic ensures deck is rarely empty, but as a fallback:
                      const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
                      hand.push({
                          ...COIN_CARD, 
                          id: `coin-${Math.random()}`, 
                          element: randomElement 
                      });
                  }
                  return {...p, deck, hand};
              };
              setPlayer(draw); setEnemy(draw);
              setPlayerCard(null); setEnemyCard(null);
              setCombatPhase(CombatPhase.PLANNING);
          }
      }
  }, [combatPhase]);

  // Roulette Animation Effect
  useEffect(() => {
    if (phase === GamePhase.ROULETTE) {
        const interval = setInterval(() => {
            setRouletteIndex(prev => (prev + 1) % ARENA_EFFECTS.length);
        }, 100);
        
        // Stop roulette after 2 seconds
        const timeout = setTimeout(() => {
            clearInterval(interval);
            const selected = ARENA_EFFECTS[Math.floor(Math.random() * ARENA_EFFECTS.length)];
            setArenaEffect(selected);
            setRouletteIndex(ARENA_EFFECTS.findIndex(e => e.id === selected.id));
            
            // Prepare draft decks
            setDraftOptions([getRandomDeck(), getRandomDeck(), getRandomDeck()]);
            
            setTimeout(() => {
                setPhase(GamePhase.DECK_SELECTION);
            }, 1000);
        }, 2000);
        
        return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [phase]);


  // --- Interactions ---
  const startGame = () => {
      initAudio(); playSound.bgmStart();
      setPhase(GamePhase.ROULETTE);
  };

  const selectDeck = (deck: CardData[]) => {
      // RESET COMBAT STATE
      setPlayerCard(null);
      setEnemyCard(null);
      setCombatPhase(CombatPhase.PLANNING);
      setAnimState('idle');
      setLastRoundResult('');
      setRoundWinner(null);
      
      const p1 = createPlayer('p1', 'Herói', deck);
      const cpu = createPlayer('cpu', 'Rival'); // CPU gets random
      // Draw 5
      for(let i=0; i<5; i++) { 
          if(p1.deck.length > 0) p1.hand.push(p1.deck.pop()!); 
          if(cpu.deck.length > 0) cpu.hand.push(cpu.deck.pop()!); 
      }
      setPlayer(p1); setEnemy(cpu);
      setPhase(GamePhase.COMBAT);
  };

  const playPlayerCard = (card: CardData) => {
      if (combatPhase !== CombatPhase.PLANNING || player.energy < calculateModifiedCost(card)) return;
      
      playSound.click();
      
      // AI Logic
      const valid = enemy.hand.filter(c => calculateModifiedCost(c) <= enemy.energy);
      
      // Enemy logic for Coin with random element
      let aiCard: CardData;
      if (valid.length > 0) {
          aiCard = valid[Math.floor(Math.random() * valid.length)];
      } else {
           const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
           aiCard = { ...COIN_CARD, id: `coin-cpu-${Math.random()}`, element: randomElement };
      }
      
      // UPDATE ENEMY
      setEnemy(p => {
          const h = [...p.hand];
          const d = [...p.deck]; // Clone deck to modify it
          
          // Remove card from hand
          if (!aiCard.id.startsWith('coin')) {
             const idx = h.findIndex(c => c.id === aiCard.id);
             if (idx > -1) h.splice(idx, 1);
             
             // RECYCLE LOGIC: Add to bottom of deck (index 0 for a stack where pop() is used)
             d.unshift(aiCard);
          }
          
          return {
              ...p, 
              hand: h, 
              deck: d,
              energy: p.energy - (aiCard.id.startsWith('coin') ? 1 : calculateModifiedCost(aiCard))
          };
      });
      setEnemyCard(aiCard);

      // UPDATE PLAYER
      setPlayer(p => {
          const h = [...p.hand];
          const d = [...p.deck]; // Clone deck
          
          if (!card.id.startsWith('coin')) {
             const idx = h.findIndex(c => c.id === card.id);
             if (idx > -1) h.splice(idx, 1);
             
             // RECYCLE LOGIC: Add to bottom of deck (index 0 for a stack where pop() is used)
             d.unshift(card);
          }
          
          return {
              ...p, 
              hand: h, 
              deck: d,
              energy: p.energy - (card.id.startsWith('coin') ? 1 : calculateModifiedCost(card))
          };
      });
      setPlayerCard(card);
  };

  // --- Magical Background shared style ---
  const bgStyle = "bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/40 via-slate-900 to-slate-950";

  // Help Visual Data Structure
  const helpChain = [
      { w: ElementType.FIRE, l: ElementType.EARTH, wName: 'FOGO', lName: 'TERRA' },
      { w: ElementType.EARTH, l: ElementType.LIGHTNING, wName: 'TERRA', lName: 'RAIO' },
      { w: ElementType.LIGHTNING, l: ElementType.AIR, wName: 'RAIO', lName: 'AR' },
      { w: ElementType.AIR, l: ElementType.WATER, wName: 'AR', lName: 'ÁGUA' },
      { w: ElementType.WATER, l: ElementType.FIRE, wName: 'ÁGUA', lName: 'FOGO' },
  ];

  // --- Screens ---

  if (phase === GamePhase.MENU) return (
      <div className={`flex flex-col items-center justify-center h-screen text-white p-6 relative overflow-hidden ${bgStyle}`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="z-10 text-center space-y-6 flex flex-col items-center">
              <div className="mb-4 inline-block p-4 bg-white/10 backdrop-blur-md rounded-3xl shadow-[0_0_30px_rgba(20,184,166,0.2)] border border-teal-500/30 transform rotate-3">
                  <Swords size={64} className="text-teal-400" />
              </div>
              <h1 className="text-5xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-br from-teal-200 to-emerald-400 drop-shadow-md">Cycle of Runes</h1>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button onClick={startGame} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-xl shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:scale-105 hover:bg-teal-500 transition-all border border-teal-400/50">
                      INICIAR BATALHA
                  </button>
                  <button onClick={() => setShowMenuTutorial(true)} className="w-full bg-slate-800/50 text-teal-200/80 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 hover:text-white transition-all border border-white/5 hover:border-teal-500/30">
                      COMO JOGAR
                  </button>
              </div>
          </div>

          {/* Menu Tutorial Modal */}
          {showMenuTutorial && (
              <Modal title="Como Jogar" onClose={() => setShowMenuTutorial(false)}>
                  <div className="space-y-2 mb-4">
                       {helpChain.map((pair, i) => (
                           <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2 border border-white/5">
                               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${ELEMENT_STYLES[pair.w].bgColor} w-28 shadow-md`}>
                                   {React.cloneElement(ELEMENT_ICONS[pair.w] as React.ReactElement<any>, { size: 14 })}
                                   <span className="text-xs font-black uppercase text-white drop-shadow-sm">{pair.wName}</span>
                               </div>
                               <div className="flex flex-col items-center px-2">
                                   <span className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Vence</span>
                                   <ArrowRight size={14} className="text-slate-400" />
                               </div>
                               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${ELEMENT_STYLES[pair.l].bgColor} w-28 shadow-md`}>
                                   {React.cloneElement(ELEMENT_ICONS[pair.l] as React.ReactElement<any>, { size: 14 })}
                                   <span className="text-xs font-black uppercase text-white drop-shadow-sm">{pair.lName}</span>
                               </div>
                           </div>
                       ))}
                  </div>
                  <div className="text-xs space-y-3 text-slate-300 border-t border-white/10 pt-3">
                      <div className="flex gap-2 items-start">
                          <div className="bg-white text-slate-900 font-bold px-1.5 rounded h-fit shrink-0">1</div>
                          <p><strong>Custo de Energia:</strong> Número no topo esquerdo da carta. Você precisa ter essa energia para jogá-la.</p>
                      </div>
                      <div className="flex gap-2 items-start">
                          <div className="bg-slate-700 text-white font-bold px-1.5 rounded h-fit shrink-0">5</div>
                          <p><strong>Poder:</strong> Número no canto inferior. Define o vencedor em caso de empate elemental.</p>
                      </div>
                      <p>⚡ <strong>Recuperação:</strong> Ambos jogadores ganham <strong>+2 Energia</strong> ao fim de cada rodada (Máximo 10).</p>
                      <p>⚔️ <strong>Combate:</strong> Elemento forte vence. Se o inimigo tiver vantagem, você só ganha se tiver o <strong>dobro</strong> de poder.</p>
                      <p>💎 <strong>Vitória:</strong> Colete 3 runas iguais ou 5 diferentes.</p>
                  </div>
              </Modal>
          )}
      </div>
  );

  if (phase === GamePhase.ROULETTE) return (
      <div className={`flex flex-col items-center justify-center h-screen text-white ${bgStyle}`}>
          <div className="relative mb-8">
              <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full"></div>
              {/* Roulette Visual */}
              <div className="w-32 h-32 relative flex items-center justify-center bg-slate-800 rounded-full border-4 border-slate-600 shadow-2xl overflow-hidden">
                   {ARENA_EFFECTS.map((effect, idx) => (
                       <div 
                         key={effect.id} 
                         className={`absolute w-full h-full flex items-center justify-center transition-opacity duration-100 ${rouletteIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                       >
                           <div className={`w-full h-full ${ELEMENT_STYLES[effect.element].bgColor} flex items-center justify-center`}>
                               {ELEMENT_ICONS[effect.element]}
                           </div>
                       </div>
                   ))}
              </div>
          </div>
          <h2 className="text-xl font-bold tracking-widest opacity-70 animate-pulse">CONJURANDO ARENA...</h2>
          {arenaEffect && phase !== GamePhase.ROULETTE && <p className="mt-2 text-teal-300">{arenaEffect.name}</p>}
      </div>
  );

  if (phase === GamePhase.DECK_SELECTION) return (
      <div className={`flex flex-col items-center justify-center h-screen w-full px-4 text-white ${bgStyle}`}>
          <div className="flex flex-col items-center gap-2 mb-6 w-full max-w-4xl">
              <h2 className="text-2xl font-black text-teal-100 mb-2">ESCOLHA SEU GRIMÓRIO</h2>
              {/* Active Arena Banner */}
              {arenaEffect && (
                  <div className="flex items-center gap-3 bg-slate-900/80 border border-teal-500/30 px-4 py-2 rounded-xl backdrop-blur-md animate-in slide-in-from-top-4 shadow-lg w-full max-w-md justify-start sm:justify-center">
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${ELEMENT_STYLES[arenaEffect.element].bgColor} text-white shadow-md`}>
                          {ELEMENT_ICONS[arenaEffect.element]}
                      </div>
                       <div className="text-left">
                          <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">Efeito de Arena Ativo</div>
                          <div className="text-sm font-bold text-white leading-tight">{arenaEffect.name}: <span className="font-normal opacity-80">{arenaEffect.description}</span></div>
                      </div>
                  </div>
              )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl overflow-y-auto max-h-[60vh] pb-4 px-2 no-scrollbar">
              {draftOptions.map((deck, i) => {
                  const dom = getDominantRune(deck);
                  const style = ELEMENT_STYLES[dom.rune];
                  return (
                      <button 
                        key={i} 
                        onClick={() => selectDeck(deck)}
                        className={`
                            relative flex flex-col items-center p-4 sm:p-6 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95
                            ${style.bgColor} bg-opacity-10 border-white/20 hover:border-white hover:bg-opacity-20
                            min-h-[180px] justify-between group
                        `}
                      >
                          <div className="flex flex-col items-center">
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${style.bgColor} flex items-center justify-center mb-4 shadow-lg ring-4 ring-black/20 group-hover:scale-110 transition-transform`}>
                                {React.cloneElement(ELEMENT_ICONS[dom.rune] as React.ReactElement<any>, { size: 28 })}
                            </div>
                            <h3 className="text-lg font-bold mb-1 leading-tight">Deck {i+1}</h3>
                            <div className="text-xs opacity-80 mb-3 text-center px-1">
                                Foco em <span className="font-bold uppercase text-white tracking-wide">{dom.rune}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 flex-wrap justify-center opacity-60 bg-black/20 p-2 rounded-lg w-full">
                              {/* Mini pills for runes in deck */}
                              {Object.entries(deck.reduce((acc, c) => { acc[c.element] = (acc[c.element]||0)+1; return acc; }, {} as Record<string,number>))
                                .sort((a,b) => (b[1] as number) - (a[1] as number))
                                .slice(0,3)
                                .map(([el, count]) => (
                                  <div key={el} className="flex items-center gap-1">
                                      <div className={`w-2 h-2 rounded-full ${ELEMENT_STYLES[el as ElementType].bgColor}`} />
                                      <span className="text-[10px]">{count}</span>
                                  </div>
                                ))
                              }
                          </div>
                      </button>
                  );
              })}
          </div>
      </div>
  );
  
  if (phase === GamePhase.GAME_OVER) return (
      <div className={`flex flex-col items-center justify-center h-screen text-white p-6 text-center ${bgStyle}`}>
          {winner?.id === player.id ? <Trophy size={80} className="text-yellow-400 mb-4 drop-shadow-lg" /> : <Skull size={80} className="text-red-500 mb-4 drop-shadow-lg" />}
          <h1 className="text-4xl font-black mb-2">{winner?.id === player.id ? 'VITÓRIA' : 'DERROTA'}</h1>
          <button onClick={() => setPhase(GamePhase.MENU)} className="mt-8 bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20">Menu Principal</button>
      </div>
  );

  // --- BATTLE SCREEN ---
  return (
      <div className={`h-[100dvh] w-full max-w-md mx-auto flex flex-col relative overflow-hidden ${shake ? 'shake-impact' : ''} ${bgStyle}`}>
          
          {/* Header */}
          <div className="p-3 flex justify-between items-center z-10 shrink-0">
              <button 
                onClick={() => setShowArenaInfo(true)}
                className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-teal-500/30 shadow-lg active:scale-95 transition-transform"
              >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${ELEMENT_STYLES[arenaEffect!.element].bgColor} text-white`}>
                      {ELEMENT_ICONS[arenaEffect!.element]}
                  </div>
                  <span className="text-xs font-bold text-teal-100 flex items-center gap-1">
                      {arenaEffect?.name} <Info size={10} className="opacity-50"/>
                  </span>
              </button>
              
              <div className="flex gap-2">
                <button onClick={() => setShowHelp(true)} className="p-2 bg-slate-900/80 rounded-full text-teal-200 border border-teal-500/30">
                    <HelpCircle size={16}/>
                </button>
                <button onClick={() => setMuted(toggleMute())} className="p-2 bg-slate-900/80 rounded-full text-teal-200 border border-teal-500/30">
                    {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                </button>
              </div>
          </div>

          {/* Enemy Zone */}
          <div className="px-4 pt-1 pb-2 flex flex-col items-center gap-1 z-10 shrink-0">
               <div className="w-full flex justify-between items-end">
                   <div className="flex items-center gap-2">
                        {/* ENEMY ICON: SKULL */}
                        <div className="w-10 h-10 rounded-xl border-2 border-red-500/50 bg-slate-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                            <Skull className="text-red-400" size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-red-200 leading-none text-sm shadow-black drop-shadow-md">{enemy.name}</span>
                            <div className="flex items-center mt-1 bg-black/40 rounded-md px-1.5 py-0.5 border border-white/10 w-fit">
                                <Zap size={10} className="text-yellow-400 mr-1" fill="currentColor" />
                                <span className="text-[10px] font-mono font-bold text-yellow-100">{enemy.energy}/{enemy.maxEnergy}</span>
                            </div>
                        </div>
                   </div>

                   <RuneTracker runes={enemy.runes} alignRight />
               </div>
               
               {/* Enemy Hand */}
               <div className="flex justify-center -space-x-2 opacity-80 scale-75 origin-top h-8">
                   {enemy.hand.map((_, i) => (
                       <div key={i} className="w-8 h-12 rounded bg-slate-700 border border-slate-500 shadow-md" style={{transform: `rotate(${(i-2)*5}deg) translateY(${Math.abs(i-2)*2}px)`}}></div>
                   ))}
               </div>
          </div>

          {/* Battle Center (Table) - FLEX 1 to fill space */}
          <div className="flex-1 relative flex items-center justify-center shrink-0 min-h-[200px]">
              {/* Magic Glow behind table */}
              <div className="absolute w-56 h-56 bg-teal-500/10 rounded-full blur-3xl"></div>

              <div className="relative flex flex-col items-center gap-4 sm:gap-6 z-10 w-full px-8">
                  
                  {/* Enemy Slot (Socket) */}
                  <div className={`
                      w-24 h-36 sm:w-28 sm:h-40 rounded-2xl bg-black/20 border-2 border-white/5 
                      shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative
                      transition-transform duration-500
                      ${animState === 'clash' ? 'anim-clash-enemy' : ''}
                  `}>
                      {/* Empty Socket Glow */}
                      {!enemyCard && <div className="absolute inset-0 flex items-center justify-center opacity-10"><Gem size={32} /></div>}
                      
                      {enemyCard ? (
                          <div className="relative z-10">
                            <Card 
                                card={enemyCard} 
                                disabled 
                                reveal={animState === 'reveal'} 
                                isWinning={animState === 'impact' && roundWinner === 'enemy'}
                                isLosing={animState === 'impact' && roundWinner === 'player'}
                            />
                          </div>
                      ) : null}
                  </div>

                  {/* Player Slot (Socket) */}
                  <div className={`
                      w-24 h-36 sm:w-28 sm:h-40 rounded-2xl bg-black/20 border-2 border-white/5 
                      shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative
                      transition-transform duration-500
                      ${animState === 'clash' ? 'anim-clash-player' : ''}
                  `}>
                       {!playerCard && <div className="absolute inset-0 flex items-center justify-center opacity-10"><Gem size={32} /></div>}
                       
                       {playerCard ? (
                          <div className="relative z-10">
                              <Card 
                                card={playerCard} 
                                disabled 
                                isWinning={animState === 'impact' && roundWinner === 'player'}
                                isLosing={animState === 'impact' && roundWinner === 'enemy'}
                              />
                          </div>
                      ) : null}
                  </div>

                  {/* Result Popover */}
                  {animState === 'finished' && (
                      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                          <div className="bg-slate-900/90 text-teal-200 border border-teal-500/50 backdrop-blur-xl px-6 py-3 rounded-2xl font-black text-xl shadow-2xl animate-in zoom-in-90 fade-in duration-300">
                              {lastRoundResult}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* Player Zone - Fixed height area */}
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-t-[2rem] border-t border-teal-500/20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-4 pt-2 z-20 shrink-0">
              <div className="px-6 py-2 flex justify-between items-center mb-1">
                   <div className="flex items-center gap-2">
                        {/* PLAYER ICON: SWORD & SHIELD */}
                        <div className="w-10 h-10 rounded-xl border-2 border-teal-400 bg-slate-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center relative">
                            <Shield className="text-teal-500 absolute" size={20} fill="currentColor" fillOpacity={0.2} />
                            <Swords className="text-teal-100 relative z-10" size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-white leading-none text-lg">{player.name}</span>
                            <div className="flex items-center mt-1 bg-black/40 rounded-md px-2 py-0.5 border border-white/10 w-fit">
                                <Zap size={10} className="text-yellow-400 mr-1" fill="currentColor" />
                                <span className="text-xs font-mono font-bold text-yellow-100">{player.energy}/{player.maxEnergy}</span>
                            </div>
                        </div>
                   </div>
                  <RuneTracker runes={player.runes} />
              </div>

              {/* Hand Scroller */}
              <div className="relative w-full h-48 sm:h-56">
                   <div className="absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none"></div>
                   <div className="absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none"></div>
                   
                   <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar px-6 items-end h-full pb-4">
                       {player.hand.map(card => {
                           const cost = calculateModifiedCost(card);
                           const affordable = player.energy >= cost;
                           return (
                               <Card 
                                   key={card.id} 
                                   card={{...card, cost}} 
                                   onClick={() => playPlayerCard(card)}
                                   disabled={combatPhase !== CombatPhase.PLANNING || !affordable}
                                   selected={playerCard?.id === card.id}
                               />
                           );
                       })}
                       {/* Coin Button */}
                       {player.energy >= 1 && combatPhase === CombatPhase.PLANNING && (
                           <button 
                                onClick={() => playPlayerCard({...COIN_CARD, id: `coin-gen-${Math.random()}`, element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]})}
                                className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-lg flex items-center justify-center shrink-0 hover:scale-110 transition-transform group ml-2 relative overflow-hidden mb-6 sm:mb-8"
                           >
                               <div className="absolute inset-0 bg-white/30 skew-x-12 -translate-x-full group-hover:animate-[shimmer_1s_infinite] pointer-events-none"></div>
                               <Coins className="text-white drop-shadow-md group-hover:rotate-12 transition-transform relative z-10" size={24} />
                           </button>
                       )}
                       {player.energy < 1 && combatPhase === CombatPhase.PLANNING && (
                            <button className="w-14 h-14 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center shrink-0 ml-2 mb-6 sm:mb-8">
                                <SkipForward className="text-slate-500" />
                            </button>
                       )}
                   </div>
              </div>
          </div>

          {/* HELP MODAL */}
          {showHelp && (
              <Modal title="Ciclo Elemental" onClose={() => setShowHelp(false)}>
                  <div className="space-y-2 mb-4">
                       {helpChain.map((pair, i) => (
                           <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2 border border-white/5">
                               {/* Winner */}
                               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${ELEMENT_STYLES[pair.w].bgColor} w-28 shadow-md`}>
                                   {React.cloneElement(ELEMENT_ICONS[pair.w] as React.ReactElement<any>, { size: 14 })}
                                   <span className="text-xs font-black uppercase text-white drop-shadow-sm">{pair.wName}</span>
                               </div>
                               
                               {/* Arrow */}
                               <div className="flex flex-col items-center px-2">
                                   <span className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Vence</span>
                                   <ArrowRight size={14} className="text-slate-400" />
                               </div>

                               {/* Loser */}
                               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${ELEMENT_STYLES[pair.l].bgColor} w-28 shadow-md`}>
                                   {React.cloneElement(ELEMENT_ICONS[pair.l] as React.ReactElement<any>, { size: 14 })}
                                   <span className="text-xs font-black uppercase text-white drop-shadow-sm">{pair.lName}</span>
                               </div>
                           </div>
                       ))}
                  </div>
                  <p className="text-slate-400 mt-4 border-t border-white/10 pt-4"><strong>Regras Extras:</strong></p>
                  <p>1. <strong>Energia:</strong> Recupera +2 por rodada (Máx 10).</p>
                  <p>2. <strong>Empate:</strong> Se não houver vantagem, vence a carta com maior Poder total.</p>
                  <p>3. <strong>Vantagem:</strong> Se você tiver vantagem elemental, você só perde se o inimigo tiver o <strong>dobro</strong> do seu poder.</p>
                  <p>4. <strong>Vitória:</strong> Colete 3 runas iguais ou 5 diferentes para vencer a partida.</p>
              </Modal>
          )}

          {/* ARENA MODAL */}
          {showArenaInfo && arenaEffect && (
              <Modal title="Efeito da Arena" onClose={() => setShowArenaInfo(false)}>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ELEMENT_STYLES[arenaEffect.element].bgColor} text-white`}>
                          {ELEMENT_ICONS[arenaEffect.element]}
                      </div>
                      <div className="font-bold text-lg">{arenaEffect.name}</div>
                  </div>
                  <p className="text-center font-medium text-teal-200 text-lg">
                      {arenaEffect.description}
                  </p>
              </Modal>
          )}
      </div>
  );
}