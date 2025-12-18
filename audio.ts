// Simple Web Audio API Synthesizer for retro game sounds
let audioCtx: AudioContext | null = null;
let isMuted = false;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const toggleMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) => {
  if (isMuted || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
};

export const playSound = {
  click: () => {
    // Sharp high tick
    playTone(800, 'square', 0.05, 0.05);
  },
  hover: () => {
    // Subtle blip
    playTone(400, 'sine', 0.05, 0.02);
  },
  draw: () => {
    // Swoosh effect (white noise simulation via rapid random frequencies or sliding sine)
    if (isMuted || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  },
  clash: () => {
    // Low impact thud
    playTone(100, 'sawtooth', 0.2, 0.2);
    playTone(80, 'square', 0.2, 0.2, 0.05);
  },
  winRound: () => {
    // Major arpeggio
    playTone(440, 'sine', 0.2, 0.1); // A4
    playTone(554, 'sine', 0.2, 0.1, 0.1); // C#5
    playTone(659, 'sine', 0.4, 0.1, 0.2); // E5
  },
  loseRound: () => {
    // Dissonant/Descending
    playTone(300, 'sawtooth', 0.3, 0.1);
    playTone(250, 'sawtooth', 0.4, 0.1, 0.1);
  },
  tie: () => {
    // Neutral metal sound
    playTone(200, 'triangle', 0.2, 0.1);
    playTone(205, 'triangle', 0.2, 0.1);
  },
  bgmStart: () => {
     // Placeholder for start jingle
     playTone(440, 'square', 0.1, 0.05);
     playTone(880, 'square', 0.4, 0.05, 0.1);
  }
};