import { useEffect, useRef } from 'react';

const bassNotes = [110, 130.81, 146.83, 98];
const leadNotes = [220, 261.63, 293.66, 196];

export function useGameMusic(enabled: boolean) {
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      stopMusic(audioRef, timerRef);
      return undefined;
    }

    const audio = new AudioContext();
    audioRef.current = audio;
    playStep(audio, stepRef.current);
    timerRef.current = window.setInterval(() => {
      stepRef.current += 1;
      playStep(audio, stepRef.current);
    }, 260);

    return () => stopMusic(audioRef, timerRef);
  }, [enabled]);
}

function playStep(audio: AudioContext, step: number) {
  const time = audio.currentTime;
  playTone(audio, bassNotes[step % bassNotes.length], time, 0.12, 0.045, 'sawtooth');

  if (step % 2 === 0) {
    playTone(audio, leadNotes[(step / 2) % leadNotes.length], time + 0.04, 0.08, 0.025, 'square');
  }
}

function playTone(
  audio: AudioContext,
  frequency: number,
  time: number,
  duration: number,
  volume: number,
  type: OscillatorType,
) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function stopMusic(
  audioRef: React.MutableRefObject<AudioContext | null>,
  timerRef: React.MutableRefObject<number | null>,
) {
  if (timerRef.current !== null) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  audioRef.current?.close();
  audioRef.current = null;
}
