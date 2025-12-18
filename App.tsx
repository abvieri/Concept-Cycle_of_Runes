import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ElementType, GamePhase, PlayerState, CardData, CombatPhase, ArenaEffect } from './types';
import { ELEMENTS, CARD_POOL, ELEMENT_ADVANTAGE, ELEMENT_COLORS, ELEMENT_ICONS, ARENA_EFFECTS, COIN_CARD } from './constants';
import { Card } from './components/Card';
import { initAudio, playSound, toggleMute } from './audio';
import { Sword, RotateCw, Trophy, Skull, Shield, Coins, AlertCircle, Zap, HelpCircle, X, ChevronDown, Info, ArrowRight, Volume2, VolumeX, SkipForward } from 'lucide-react';

// --- Utils ---

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const getRandomDeck = (): CardData[] => {
  // Create a balanced deck of 15 cards from the pool
  const deck: CardData[] = [];
  for (let i = 0; i < 15; i++) {
    const template = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    // IMPORTANT: Generate unique IDs for each card instance to prevent React key collisions
    deck.push({
        ...template,
        id: `${template.id}-${i}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
  return shuffle(deck);
};

const createPlayer = (id: string, name: string): PlayerState => ({
  id,
  name,
  health: 100,
  energy: 6,
  maxEnergy: 10,
  deck: getRandomDeck(),
  hand: [],
  discard: [],
  runes: [],
});

// --- Sub-Components ---

const RuneTracker = ({ runes, alignRight = false }: { runes: ElementType[], alignRight?: boolean }) => {
    return (
        <div className={`flex items-center gap-1 sm:gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
            {ELEMENTS.map((elem) => {
                const count = runes.filter(r => r === elem).length;
                const isFull = count >= 3;
                
                return (
                    <div key={elem} className="flex flex-col items-center justify-between h-full group">
                        {/* Dots Counter - Always 3 dots shown to indicate goal */}
                        <div className="flex space-x-[2px] mb-1 h-2 items-end">
                            {[1, 2, 3].map(i => (
                                <div 
                                    key={i} 
                                    className={`
                                        w-1.5 h-1.5 rounded-full transition-all duration-300
                                        ${i <= count 
                                            ? `${ELEMENT_COLORS[elem].split(' ')[0]} shadow-[0_0_5px_currentColor]` 
                                            : 'bg-slate-700/50'}
                                        ${i === count && count > 0 ? 'scale-125 brightness-125' : ''}
                                    `} 
                                />
                            ))}
                        </div>
                        
                        {/* Element Icon */}
                        <div className={`
                            p-1 rounded-md transition-all duration-300 relative
                            ${count > 0 ? 'bg-slate-800 border border-slate-600 opacity-100' : 'opacity-30 grayscale'}
                            ${isFull ? `ring-2 ring-white ${ELEMENT_COLORS[elem].split(' ')[0]} shadow-lg` : ''}
                        `}>
                            {/* Make icon smaller on mobile */}
                            {React.cloneElement(ELEMENT_ICONS[elem] as React.ReactElement<any>, { size: 14 })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Component ---

export default function App() {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  
  // UI State
  const [showHelp, setShowHelp] = useState(false);
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [muted, setMuted] = useState(false);

  // Combat State
  const [player, setPlayer] = useState<PlayerState>(createPlayer('p1', 'Hero'));
  const [enemy, setEnemy] = useState<PlayerState>(createPlayer('cpu', 'Rival'));
  const [combatPhase, setCombatPhase] = useState<CombatPhase>(CombatPhase.PLANNING);
  
  const [playerCard, setPlayerCard] = useState<CardData | null>(null);
  const [enemyCard, setEnemyCard] = useState<CardData | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<string>('');
  
  const [winner, setWinner] = useState<PlayerState | null>(null);

  // Animation State
  const [animState, setAnimState] = useState<'idle' | 'reveal' | 'clash' | 'impact' | 'finished'>('idle');
  const [roundWinner, setRoundWinner] = useState<'player' | 'enemy' | 'tie' | null>(null);
  const [shake, setShake] = useState(false);

  // --- Logic Helpers ---

  const handleMute = () => {
    const isMuted = toggleMute();
    setMuted(isMuted);
  };

  const checkVictory = (p: PlayerState): boolean => {
    // 3 of same kind
    for (const elem of ELEMENTS) {
      if (p.runes.filter(r => r === elem).length >= 3) return true;
    }
    // 5 unique
    const unique = new Set(p.runes);
    if (unique.size >= 5) return true;
    
    return false;
  };

  const calculateModifiedPower = useCallback((card: CardData): number => {
    let power = card.power;
    // Apply Arena Effects
    if (arenaEffect?.id === 'f1' && card.cost >= 5) power += 1;
    if (arenaEffect?.id === 'e1' && card.cost <= 2) power += 1;
    return power;
  }, [arenaEffect]);

  const calculateModifiedCost = useCallback((card: CardData): number => {
    let cost = card.cost;
    if (arenaEffect?.id === 'a1' && cost <= 3) cost = Math.max(1, cost - 1);
    return cost;
  }, [arenaEffect]);

  const calculateRoundOutcome = useCallback((pCard: CardData, eCard: CardData) => {
    const pPower = calculateModifiedPower(pCard);
    const ePower = calculateModifiedPower(eCard);
    
    const pAdvantage = ELEMENT_ADVANTAGE[pCard.element] === eCard.element;
    const eAdvantage = ELEMENT_ADVANTAGE[eCard.element] === pCard.element;

    let result: 'player' | 'enemy' | 'tie' = 'tie';

    if (pAdvantage) {
        if (ePower >= pPower * 2) result = 'enemy';
        else result = 'player';
    } else if (eAdvantage) {
        if (pPower >= ePower * 2) result = 'player';
        else result = 'enemy';
    } else {
        if (pPower > ePower) result = 'player';
        else if (ePower > pPower) result = 'enemy';
        else result = 'tie';
    }
    return result;
  }, [calculateModifiedPower]);

  const applyRoundResults = useCallback((result: 'player' | 'enemy' | 'tie') => {
    if (!playerCard || !enemyCard) return;

    // Apply Results
    setPlayer(prev => {
        // Only valid cards grant runes
        const newRunes = (result === 'player' && playerCard.power >= 0) ? [...prev.runes, playerCard.element] : prev.runes;
        let energyRec = 2;
        if (result === 'enemy') {
            energyRec += (arenaEffect?.id === 'w1' ? 2 : 1);
        }
        
        // Return card to discard only if it wasn't a token or skip
        const newDiscard = (!playerCard.isToken && playerCard.power >= 0) ? [...prev.discard, playerCard] : prev.discard;

        return {
            ...prev,
            runes: newRunes,
            energy: Math.min(prev.maxEnergy, prev.energy + energyRec),
            discard: newDiscard
        };
    });

    setEnemy(prev => {
        const newRunes = (result === 'enemy' && enemyCard.power >= 0) ? [...prev.runes, enemyCard.element] : prev.runes;
        let energyRec = 2;
        if (result === 'player') {
             energyRec += (arenaEffect?.id === 'w1' ? 2 : 1);
        }
        
        const newDiscard = (!enemyCard.isToken && enemyCard.power >= 0) ? [...prev.discard, enemyCard] : prev.discard;

        return {
            ...prev,
            runes: newRunes,
            energy: Math.min(prev.maxEnergy, prev.energy + energyRec),
            discard: newDiscard
        };
    });

    if (result === 'player') {
        setLastRoundResult(`Vitória! ${playerCard.name} supera ${enemyCard.name}`);
        playSound.winRound();
    }
    else if (result === 'enemy') {
        setLastRoundResult(`Derrota! ${enemyCard.name} supera ${playerCard.name}`);
        playSound.loseRound();
    }
    else {
        setLastRoundResult("Empate! Nenhum progresso.");
        playSound.tie();
    }
  }, [playerCard, enemyCard, arenaEffect]);

  // --- Effects & Loops ---

  // Trigger Resolution Phase
  useEffect(() => {
    if (playerCard && enemyCard && combatPhase === CombatPhase.PLANNING) {
        setCombatPhase(CombatPhase.RESOLUTION);
    }
  }, [playerCard, enemyCard, combatPhase]);

  // Combat Sequence Execution
  useEffect(() => {
    if (combatPhase === CombatPhase.RESOLUTION && playerCard && enemyCard) {
        setAnimState('reveal');
        playSound.draw(); 
        
        const result = calculateRoundOutcome(playerCard, enemyCard);
        
        // 1. Reveal (0ms) -> Clash Start (600ms)
        const clashTimer = setTimeout(() => {
            setAnimState('clash');
            playSound.clash();
        }, 600);

        // 2. Impact point (approx 50% of clash anim) - trigger shake
        const shakeTimer = setTimeout(() => {
            setShake(true);
            setTimeout(() => setShake(false), 400);
            setRoundWinner(result);
            setAnimState('impact');
        }, 1100);

        // 3. Show Result text/Process stats (1800ms)
        const applyTimer = setTimeout(() => {
            applyRoundResults(result);
            setAnimState('finished');
        }, 1800);

        // 4. Cleanup / Next Phase (3500ms) - giving time to read
        const cleanupTimer = setTimeout(() => {
            setCombatPhase(CombatPhase.CLEANUP);
            setAnimState('idle');
            setRoundWinner(null);
        }, 3500);

        return () => {
            clearTimeout(clashTimer);
            clearTimeout(shakeTimer);
            clearTimeout(applyTimer);
            clearTimeout(cleanupTimer);
        };
    }
  }, [combatPhase, playerCard, enemyCard, applyRoundResults, calculateRoundOutcome]); 

  // Phase Transition: Cleanup -> Draw -> Planning
  useEffect(() => {
    if (combatPhase === CombatPhase.CLEANUP) {
        if (checkVictory(player)) {
            setWinner(player);
            setPhase(GamePhase.GAME_OVER);
            playSound.winRound(); 
        } else if (checkVictory(enemy)) {
            setWinner(enemy);
            setPhase(GamePhase.GAME_OVER);
            playSound.loseRound(); 
        } else {
            // Reset table
            setPlayerCard(null);
            setEnemyCard(null);
            setCombatPhase(CombatPhase.DRAW);
        }
    }
  }, [combatPhase, player, enemy]);

  // Draw Phase Logic
  useEffect(() => {
    if (combatPhase === CombatPhase.DRAW) {
        const drawCard = (p: PlayerState): PlayerState => {
            const newDeck = [...p.deck];
            const newHand = [...p.hand];
            const newDiscard = [...p.discard];

            if (newDeck.length > 0) {
                newHand.push(newDeck.pop()!);
            } else {
                if (newDiscard.length > 0) {
                    // Recycle discard into deck
                    const reshuffled = shuffle([...newDiscard]);
                    const drawn = reshuffled.pop()!;
                    newHand.push(drawn);
                    return { ...p, deck: reshuffled, hand: newHand, discard: [] };
                } else {
                    // Fatigue mechanism
                    newHand.push({...COIN_CARD, id: `fatigue-${Date.now()}`});
                }
            }
            return { ...p, deck: newDeck, hand: newHand, discard: newDiscard };
        };

        setPlayer(p => drawCard(p));
        setEnemy(p => drawCard(p));
        setCombatPhase(CombatPhase.PLANNING);
        playSound.draw();
    }
  }, [combatPhase]);

  // --- Actions ---

  const startGame = () => {
    initAudio(); 
    playSound.bgmStart();
    setPhase(GamePhase.ROULETTE);
    setTimeout(() => {
        const effect = ARENA_EFFECTS[Math.floor(Math.random() * ARENA_EFFECTS.length)];
        setArenaEffect(effect);
        
        const p1 = createPlayer('p1', 'Player');
        const cpu = createPlayer('cpu', 'Opponent');

        for(let i=0; i<5; i++) {
            if(p1.deck.length > 0) p1.hand.push(p1.deck.pop()!);
            if(cpu.deck.length > 0) cpu.hand.push(cpu.deck.pop()!);
        }

        if (effect.id === 'l1') {
            p1.energy += 2;
            cpu.energy += 2;
        }

        setPlayer(p1);
        setEnemy(cpu);
        setPhase(GamePhase.DECK_SELECTION); 
    }, 2000);
  };

  const selectDeck = () => {
    playSound.click();
    setPhase(GamePhase.COMBAT);
    setCombatPhase(CombatPhase.PLANNING);
  };

  // AI Logic
  const getAiMove = (currentState: PlayerState): { card: CardData, newState: PlayerState } => {
    // 1. Try to play a card
    const validCards = currentState.hand.filter(c => calculateModifiedCost(c) <= currentState.energy);
    
    if (validCards.length > 0) {
        const idx = Math.floor(Math.random() * validCards.length);
        const card = validCards[idx];
        const newHand = [...currentState.hand];
        const realIdx = newHand.findIndex(c => c.id === card.id);
        newHand.splice(realIdx, 1);
        
        return { 
            card, 
            newState: { 
                ...currentState, 
                hand: newHand, 
                energy: currentState.energy - calculateModifiedCost(card) 
            } 
        };
    } 
    
    // 2. Try to use Coin
    if (currentState.energy >= 1) {
         const coin = { 
            ...COIN_CARD, 
            element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
            id: `coin-ai-${Date.now()}`
        };
        return {
            card: coin,
            newState: { ...currentState, energy: currentState.energy - 1 }
        };
    }

    // 3. Skip Turn
    const skip: CardData = { 
        id: `skip-ai-${Date.now()}`, 
        name: 'Passou a Vez', 
        element: ElementType.FIRE, // Placeholder
        power: -1, 
        cost: 0 
    };
    return {
        card: skip,
        newState: currentState
    };
  };

  const playCard = (card: CardData) => {
    if (combatPhase !== CombatPhase.PLANNING) return;
    
    const cost = calculateModifiedCost(card);
    if (player.energy < cost) return;

    playSound.click();

    // AI Decision
    const { card: aiCard, newState: newEnemyState } = getAiMove(enemy);
    setEnemy(newEnemyState);
    setEnemyCard(aiCard);

    // Player Execution
    if (card.isToken) {
         const actualCoin = { 
            ...COIN_CARD, 
            element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
            id: `coin-p-${Date.now()}` 
         };
         setPlayerCard(actualCoin);
         setPlayer(prev => ({ ...prev, energy: prev.energy - 1 }));
    } else {
        const newHand = [...player.hand];
        const idx = newHand.findIndex(c => c.id === card.id);
        newHand.splice(idx, 1);
        setPlayerCard(card);
        setPlayer(prev => ({ ...prev, hand: newHand, energy: prev.energy - cost }));
    }
  };

  const useCoin = () => {
      playCard(COIN_CARD);
  };

  const skipTurn = () => {
    if (combatPhase !== CombatPhase.PLANNING) return;
    playSound.click();

    // AI Decision
    const { card: aiCard, newState: newEnemyState } = getAiMove(enemy);
    setEnemy(newEnemyState);
    setEnemyCard(aiCard);

    // Player Skip
    const skipAction: CardData = { 
        id: `skip-p-${Date.now()}`, 
        name: 'Passou a Vez', 
        element: ElementType.FIRE, 
        power: -1, 
        cost: 0 
    };
    setPlayerCard(skipAction);
  };

  // --- Renders ---

  // Check valid moves for UI
  const canPlayAnyCard = player.hand.some(c => calculateModifiedCost(c) <= player.energy);
  const canAffordCoin = player.energy >= 1;

  if (phase === GamePhase.MENU) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-900 text-white p-4">
        <h1 className="text-6xl font-bold mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600">
          CYCLE OF RUNES
        </h1>
        <button 
          onClick={startGame}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-[0_0_20px_rgba(234,88,12,0.5)] transition-all transform hover:scale-105"
        >
          JOGAR
        </button>
        <p className="mt-8 text-slate-500">v0.1.7 • New Title</p>
      </div>
    );
  }

  if (phase === GamePhase.ROULETTE) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-900 text-white">
        <div className="animate-spin text-orange-500 mb-8">
            <RotateCw size={120} />
        </div>
        <h2 className="text-3xl font-bold">SORTEANDO ARENA...</h2>
      </div>
    );
  }

  if (phase === GamePhase.DECK_SELECTION) {
    return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-900 text-white p-6 text-center">
            <h2 className="text-3xl font-bold mb-2">ARENA DEFINIDA</h2>
            <div className={`p-4 rounded-xl border-2 mb-8 bg-black/40 ${ELEMENT_COLORS[arenaEffect!.element].split(' ')[1]}`}>
                <h3 className="text-2xl font-bold text-orange-400">{arenaEffect?.name}</h3>
                <p className="text-lg text-slate-300">{arenaEffect?.description}</p>
            </div>
            
            <p className="mb-4">Selecione seu Deck Inicial</p>
            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                {[1, 2, 3].map(n => (
                    <button 
                        key={n}
                        onClick={selectDeck}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 p-4 rounded-lg flex justify-between items-center transition-all"
                    >
                        <span className="font-bold">Deck {n}</span>
                        <div className="flex space-x-1">
                            {ELEMENTS.slice(0,3).map(e => <span key={e} className="text-slate-500">{ELEMENT_ICONS[e]}</span>)}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
  }

  if (phase === GamePhase.GAME_OVER) {
    return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-900 text-white p-4 text-center">
            {winner?.id === player.id ? (
                <div className="text-yellow-400 mb-4 animate-bounce">
                    <Trophy size={80} />
                </div>
            ) : (
                <div className="text-red-500 mb-4">
                    <Skull size={80} />
                </div>
            )}
            <h1 className="text-5xl font-bold mb-4">
                {winner?.id === player.id ? 'VITÓRIA!' : 'DERROTA'}
            </h1>
            <p className="text-xl text-slate-400 mb-8">
                {winner?.id === player.id ? 'Você dominou os elementos.' : 'O ciclo elemental te rejeitou.'}
            </p>
            <button 
                onClick={() => setPhase(GamePhase.MENU)}
                className="bg-white text-slate-900 font-bold py-3 px-8 rounded-full hover:bg-slate-200"
            >
                Voltar ao Menu
            </button>
        </div>
    );
  }

  // --- COMBAT UI ---

  return (
    <div className={`h-[100dvh] w-full max-w-md mx-auto bg-slate-950 text-white flex flex-col relative ${shake ? 'shake-impact' : ''}`}>
      
      {/* Top Bar: Arena Info & Help */}
      <div className="absolute top-0 w-full p-2 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent z-40 pointer-events-none">
        
        {/* Arena Info Button */}
        <div className="flex flex-col pointer-events-auto gap-2">
            <div 
                onClick={() => setShowArenaModal(true)}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors"
            >
                <div className={`p-1 rounded bg-slate-800 border ${ELEMENT_COLORS[arenaEffect!.element].split(' ')[1]}`}>
                    {ELEMENT_ICONS[arenaEffect!.element]}
                </div>
                <div className="flex items-center">
                    <span className="text-xs font-bold opacity-90 mr-1 shadow-black drop-shadow-md">{arenaEffect?.name}</span>
                    <Info size={14} className="opacity-70 text-blue-300" />
                </div>
            </div>
        </div>

        {/* Turn & Help & Audio */}
        <div className="flex items-center space-x-2 pointer-events-auto">
            <button 
                onClick={handleMute}
                className="bg-slate-800/80 p-1.5 rounded-full border border-slate-600 hover:bg-slate-700 backdrop-blur-sm"
            >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button 
                onClick={() => setShowHelp(true)}
                className="bg-slate-800/80 p-1.5 rounded-full border border-slate-600 hover:bg-slate-700 backdrop-blur-sm"
            >
                <HelpCircle size={16} />
            </button>
            <div className="text-xs font-mono opacity-80 bg-black/60 px-2 py-1 rounded border border-slate-700">
                T {player.runes.length + enemy.runes.length + 1}
            </div>
        </div>
      </div>

      {/* ARENA INFO MODAL */}
      {showArenaModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
              <div className={`w-full max-w-sm bg-slate-900 border-2 rounded-xl flex flex-col max-h-[85vh] shadow-2xl ${ELEMENT_COLORS[arenaEffect!.element].split(' ')[1]}`}>
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {React.cloneElement(ELEMENT_ICONS[arenaEffect!.element] as React.ReactElement<any>, { size: 20 })}
                        Arena
                    </h3>
                    <button 
                        onClick={() => setShowArenaModal(false)}
                        className="p-1 hover:bg-white/10 rounded-full"
                    >
                        <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center text-center">
                       <h3 className="text-2xl font-bold text-white mb-1">{arenaEffect?.name}</h3>
                       <span className="text-xs uppercase tracking-widest opacity-75 mb-4">Efeito Global</span>
                       
                       <div className="bg-black/40 p-4 rounded-lg border border-white/10 w-full">
                          <p className="text-lg leading-relaxed text-slate-100">{arenaEffect?.description}</p>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
              <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-xl flex flex-col max-h-[85vh] shadow-2xl">
                   {/* Header */}
                   <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10 rounded-t-xl">
                       <h3 className="text-xl font-bold text-blue-400">Ciclo Elemental</h3>
                       <button 
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-slate-800 rounded-full"
                       >
                            <X size={24} />
                       </button>
                   </div>

                   {/* Scrollable Content */}
                   <div className="p-4 overflow-y-auto flex-1">
                      
                      {/* Compact Grid Layout for Elements */}
                      <div className="grid grid-cols-1 gap-2 mb-6">
                          {[
                            { w: ElementType.FIRE, l: ElementType.EARTH },
                            { w: ElementType.EARTH, l: ElementType.LIGHTNING },
                            { w: ElementType.LIGHTNING, l: ElementType.AIR },
                            { w: ElementType.AIR, l: ElementType.WATER },
                            { w: ElementType.WATER, l: ElementType.FIRE },
                          ].map((pair, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                  <div className={`flex items-center space-x-2 px-2 py-1 rounded w-24 justify-center ${ELEMENT_COLORS[pair.w]}`}>
                                      {React.cloneElement(ELEMENT_ICONS[pair.w] as React.ReactElement<any>, { size: 14 })}
                                      <span className="text-xs font-bold">{pair.w}</span>
                                  </div>
                                  <div className="text-slate-500 flex flex-col items-center px-1">
                                      <span className="text-[10px] uppercase">Vence</span>
                                      <ArrowRight size={14} />
                                  </div>
                                  <div className={`flex items-center space-x-2 px-2 py-1 rounded w-24 justify-center ${ELEMENT_COLORS[pair.l]}`}>
                                      {React.cloneElement(ELEMENT_ICONS[pair.l] as React.ReactElement<any>, { size: 14 })}
                                      <span className="text-xs font-bold">{pair.l}</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="bg-slate-800 p-4 rounded-lg text-sm text-slate-300 border border-slate-700">
                          <h4 className="font-bold text-white mb-2 border-b border-slate-600 pb-1">Regras de Combate</h4>
                          <p className="mb-2 flex items-start"><span className="mr-2">⚔️</span> <span><strong className="text-white">Vantagem:</strong> Vence automaticamente qualquer poder menor.</span></p>
                          <p className="mb-2 flex items-start"><span className="mr-2">🛡️</span> <span><strong className="text-white">Sem Vantagem:</strong> Maior Poder vence.</span></p>
                          <p className="flex items-start"><span className="mr-2">⚠️</span> <span><strong className="text-white">Counter:</strong> Carta em desvantagem só vence se tiver <strong className="text-yellow-400">2x o Poder</strong>.</span></p>
                      </div>
                   </div>
              </div>
          </div>
      )}

      {/* ENEMY AREA */}
      <div className="flex-1 bg-slate-900/50 flex flex-col p-2 pt-12 border-b border-slate-800">
        <div className="flex justify-between items-end mb-2">
             <div className="flex items-center space-x-2">
                <span className="font-bold text-red-400 text-sm">{enemy.name}</span>
                <div className="flex bg-slate-800 px-2 py-0.5 rounded-full text-xs items-center">
                    <span className="text-yellow-400 mr-1">⚡</span>{enemy.energy}/{enemy.maxEnergy}
                </div>
             </div>
             
             {/* New Rune Tracker */}
             <RuneTracker runes={enemy.runes} alignRight />
        </div>

        {/* Enemy Hand (Visual Only) */}
        <div className="flex justify-center space-x-[-20px] overflow-visible scale-90 origin-top">
            {enemy.hand.map((c, i) => (
                <div key={i} style={{ transform: `rotate(${(i - enemy.hand.length/2) * 5}deg) translateY(${i%2===0?0:5}px)`}}>
                    <Card card={c} hidden mini />
                </div>
            ))}
        </div>
      </div>

      {/* BATTLE AREA */}
      <div className="flex-[1.5] relative flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-visible">
        
        {/* Battle Slots */}
        <div className="relative w-full h-full">
            
            {/* Enemy Card Slot - Anchor Top */}
            <div className={`
                absolute top-6 left-1/2 -translate-x-1/2 z-10 transition-all duration-300
                ${animState === 'clash' ? 'anim-clash-enemy' : ''}
                ${animState === 'impact' && roundWinner === 'enemy' ? 'anim-win-' + enemyCard?.element : ''} 
                ${animState === 'impact' && roundWinner === 'player' ? 'anim-lose' : ''}
            `}>
                {enemyCard ? (
                    <Card 
                        card={enemyCard} 
                        disabled 
                        reveal={animState === 'reveal'}
                        // We handle clash/win/lose in the wrapper div for movement, 
                        // but can pass props for internal effects if needed
                        isWinning={animState === 'impact' && roundWinner === 'enemy'}
                    />
                ) : (
                    <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                        <span className="text-white/20 font-bold text-3xl">?</span>
                    </div>
                )}
            </div>

            {/* VS Badge - Hidden during Clash/Impact to avoid clutter */}
            {animState !== 'clash' && animState !== 'impact' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
                    <div className="bg-slate-800 p-2 rounded-full border border-slate-600">
                        <Sword size={20} className="text-slate-400" />
                    </div>
                </div>
            )}

            {/* Player Card Slot - Anchor Bottom */}
            <div className={`
                absolute bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-300
                ${animState === 'clash' ? 'anim-clash-player' : ''}
                ${animState === 'impact' && roundWinner === 'player' ? 'anim-win-' + playerCard?.element : ''}
                ${animState === 'impact' && roundWinner === 'enemy' ? 'anim-lose' : ''}
            `}>
                {playerCard ? (
                     <Card 
                        card={playerCard} 
                        disabled 
                        reveal={animState === 'reveal'}
                        isWinning={animState === 'impact' && roundWinner === 'player'}
                    />
                ) : (
                    <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <span className="text-white/20 text-xs text-center px-2">Selecione uma Carta</span>
                    </div>
                )}
            </div>
        </div>

        {/* Result Text Overlay */}
        {animState === 'finished' && (
            <div className="absolute bottom-4 left-0 right-0 text-center animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
                <div className="inline-block bg-black/80 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-xl">
                    <span className="font-bold text-sm text-yellow-300">{lastRoundResult}</span>
                </div>
            </div>
        )}
      </div>

      {/* PLAYER AREA */}
      <div className="flex-1 bg-slate-900 flex flex-col justify-end p-2 sm:p-4 border-t border-slate-800">
         {/* Stats */}
         <div className="flex justify-between items-start mb-2">
             {/* Runes */}
             <RuneTracker runes={player.runes} />

             <div className="flex items-center space-x-2 mt-auto">
                <div className="flex bg-slate-800 px-3 py-1 rounded-full text-xs sm:text-sm font-bold items-center border border-slate-700">
                    <span className="text-yellow-400 mr-1"><Zap size={14} fill="currentColor"/></span>
                    {player.energy} / {player.maxEnergy}
                </div>
                <span className="font-bold text-blue-400 text-sm">{player.name}</span>
             </div>
        </div>

        {/* Hand - Fixed responsive container with INCREASED HEIGHT and PADDING to prevent clipping */}
        <div className="relative h-48 sm:h-52 md:h-56 flex items-end w-full">
            {/* Cards Container */}
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2 pt-12 px-2 items-end h-full w-full justify-start md:justify-center">
                {player.hand.map((card) => {
                    const cost = calculateModifiedCost(card);
                    const canAfford = player.energy >= cost;
                    return (
                        <Card 
                            key={card.id} 
                            card={card} 
                            onClick={() => {
                                if(canAfford) {
                                    playCard(card);
                                }
                            }}
                            disabled={combatPhase !== CombatPhase.PLANNING || !canAfford}
                            selected={playerCard?.id === card.id}
                        />
                    )
                })}
            </div>

            {/* Special Actions: Coin OR Skip */}
            {combatPhase === CombatPhase.PLANNING && !canPlayAnyCard && (
                canAffordCoin ? (
                    <button 
                        onClick={useCoin}
                        className="absolute bottom-20 right-4 bg-yellow-600 hover:bg-yellow-500 text-white p-2 sm:p-3 rounded-full shadow-lg border-2 border-yellow-300 animate-bounce z-50 flex items-center justify-center group"
                        title="Usar Moeda (1 Energia -> 2 Poder)"
                    >
                        <Coins size={20} className="group-hover:rotate-12 transition-transform" />
                        <span className="hidden sm:inline ml-2 font-bold text-xs">USAR MOEDA</span>
                    </button>
                ) : (
                    <button 
                        onClick={skipTurn}
                        className="absolute bottom-20 right-4 bg-slate-700 hover:bg-slate-600 text-white p-2 sm:p-3 rounded-full shadow-lg border-2 border-slate-500 animate-pulse z-50 flex items-center justify-center group"
                        title="Sem energia - Passar a Vez"
                    >
                        <SkipForward size={20} className="text-slate-300" />
                        <span className="hidden sm:inline ml-2 font-bold text-xs">PASSAR VEZ</span>
                    </button>
                )
            )}
        </div>
      </div>
    </div>
  );
}