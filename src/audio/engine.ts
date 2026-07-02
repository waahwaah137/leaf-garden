import * as Tone from 'tone';
import { clamp } from '../utils/math';

const BASE_BPM = 74;
const DEFAULT_VOLUME = 0.8;
const VOLUME_RAMP_SECONDS = 0.05;

export let masterBus: Tone.Gain;

let started = false;

/** Must be called from within a user-gesture handler (the Start button click). */
export async function initEngine(): Promise<void> {
  if (started) return;
  await Tone.start();

  masterBus = new Tone.Gain(DEFAULT_VOLUME);
  const compressor = new Tone.Compressor({ threshold: -12, ratio: 3, attack: 0.01, release: 0.2 });
  masterBus.connect(compressor);

  // iOS Safari routes plain Web Audio output (Tone.Destination) to the quiet
  // earpiece speaker instead of the main loudspeaker as soon as the mic is
  // captured via getUserMedia (it flips the audio session into a
  // recording-oriented mode). Actual <audio>/<video> element playback gets
  // the "defaultToSpeaker" routing instead, so we pipe the master output
  // through a hidden <audio> element fed by a MediaStreamDestination rather
  // than connecting straight to Tone.Destination.
  const rawContext = Tone.getContext().rawContext as AudioContext;
  const streamDestination = rawContext.createMediaStreamDestination();
  compressor.connect(streamDestination);

  const outputEl = document.createElement('audio');
  outputEl.autoplay = true;
  outputEl.setAttribute('playsinline', '');
  outputEl.srcObject = streamDestination.stream;
  document.body.appendChild(outputEl);
  await outputEl.play();

  Tone.Transport.bpm.value = BASE_BPM;
  Tone.Transport.start();

  started = true;
}

export function isEngineStarted(): boolean {
  return started;
}

export function getCommandedBpm(): number {
  return BASE_BPM;
}

/** Manual master volume control (0-1), driven by the dashboard slider. */
export function setMasterVolume(normalized: number): void {
  if (!masterBus) return;
  masterBus.gain.rampTo(clamp(normalized, 0, 1), VOLUME_RAMP_SECONDS);
}

export function getDefaultVolume(): number {
  return DEFAULT_VOLUME;
}
