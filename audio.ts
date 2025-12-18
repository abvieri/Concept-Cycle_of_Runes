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

// Basic Tone Generator
const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0, rampTo?: number) => {
  if (isMuted || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  if (rampTo) {
      osc.frequency.exponentialRampToValueAtTime(rampTo, audioCtx.currentTime + delay + duration);
  }
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
};

// Noise Generator (Good for Fire, Air, Impacts)
const playNoise = (duration: number, vol: number, filterType: BiquadFilterType = 'lowpass', filterFreq: number = 1000) => {
    if (isMuted || !audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, audioCtx.currentTime);
    // Sweep filter for dynamic effect
    filter.frequency.exponentialRampToValueAtTime(filterFreq / 4, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
};

export const playSound = {
  click: () => {
    playTone(1200, 'sine', 0.05, 0.1);
    playTone(2000, 'triangle', 0.02, 0.05, 0.01); 
  },
  hover: () => {
    playTone(400, 'sine', 0.05, 0.02);
  },
  draw: () => {
    if (isMuted || !audioCtx) return;
    playTone(300, 'sine', 0.15, 0.05, 0, 800);
    playNoise(0.1, 0.05, 'highpass', 3000); 
  },
  clash: () => {
    // Tension building sound
    playTone(100, 'sawtooth', 0.4, 0.1, 0, 50); 
    playTone(150, 'square', 0.4, 0.05, 0.1);
  },
  winRound: () => {
    playTone(440, 'sine', 0.2, 0.1); 
    playTone(554, 'sine', 0.2, 0.1, 0.1); 
    playTone(659, 'sine', 0.4, 0.1, 0.2); 
  },
  loseRound: () => {
    playTone(300, 'sawtooth', 0.3, 0.1);
    playTone(250, 'sawtooth', 0.4, 0.1, 0.1);
  },
  tie: () => {
    playTone(200, 'triangle', 0.2, 0.1);
    playTone(205, 'triangle', 0.2, 0.1);
  },
  bgmStart: () => {
     playTone(440, 'square', 0.1, 0.05);
     playTone(880, 'square', 0.4, 0.05, 0.1);
  },
  
  // --- ABILITY SFX ---
  ability: (type: string) => {
      if (isMuted || !audioCtx) return;
      if (type === 'DRAW') {
          // Magical swirl - Sine sweep up
          playTone(400, 'sine', 0.4, 0.2, 0, 1200);
          playNoise(0.4, 0.1, 'bandpass', 1500);
      } else if (type === 'CHARGE') {
          // Power up - Sawtooth zap
          playTone(200, 'sawtooth', 0.1, 0.2, 0, 600);
          playTone(300, 'square', 0.2, 0.1, 0.1, 800);
          playNoise(0.2, 0.1, 'highpass', 4000);
      }
  },
  
  // --- ELEMENTAL SFX ---
  elementImpact: (element: string, power: number) => {
    if (isMuted || !audioCtx) return;
    
    // Scale intensity based on power (1-9)
    const intensity = Math.min(1.5, 0.5 + (power / 10)); 
    const duration = 0.3 + (power * 0.05);

    switch (element) {
        case 'FIRE':
            // Crackling Explosion
            playNoise(duration, 0.3 * intensity, 'lowpass', 800);
            playTone(150, 'sawtooth', duration, 0.2 * intensity, 0, 50); // Low growl
            break;
        case 'LIGHTNING':
            // High Pitch Zap
            playTone(800 + (power * 100), 'sawtooth', 0.1, 0.2 * intensity, 0, 200); // Zap down
            playNoise(0.2, 0.1 * intensity, 'highpass', 5000); // Static
            break;
        case 'WATER':
            // Splash / Bubble
            playNoise(duration, 0.3 * intensity, 'lowpass', 600);
            playTone(400, 'sine', duration, 0.2 * intensity, 0, 100); // Drop
            break;
        case 'EARTH':
            // Deep Thud
            playTone(80, 'square', duration * 1.5, 0.4 * intensity, 0, 20);
            playNoise(0.2, 0.2, 'lowpass', 200);
            break;
        case 'AIR':
            // Whoosh
            playNoise(duration, 0.2 * intensity, 'bandpass', 1500);
            break;
        case 'COIN':
            // Metallic Ding
            playTone(1200, 'sine', 0.5, 0.2, 0);
            playTone(2400, 'sine', 0.5, 0.1, 0.05);
            break;
    }
  }
};