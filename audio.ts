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

const playNoise = (duration: number, vol: number) => {
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
    
    // Bandpass filter to make it sound like a hit
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
};

export const playSound = {
  click: () => {
    // Crisper, high-pitched mechanical click
    playTone(1200, 'sine', 0.05, 0.1);
    playTone(2000, 'triangle', 0.02, 0.05, 0.01); 
  },
  hover: () => {
    // Subtle blip
    playTone(400, 'sine', 0.05, 0.02);
  },
  draw: () => {
    // Smoother swoosh
    if (isMuted || !audioCtx) return;
    playTone(300, 'sine', 0.15, 0.05, 0, 800);
    playNoise(0.1, 0.05); // Subtle friction noise
  },
  clash: () => {
    // Impactful thud + crash
    playTone(150, 'square', 0.2, 0.3, 0, 50); // Punchy low end drop
    playNoise(0.2, 0.2); // Impact noise
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
     // Start jingle
     playTone(440, 'square', 0.1, 0.05);
     playTone(880, 'square', 0.4, 0.05, 0.1);
  }
};