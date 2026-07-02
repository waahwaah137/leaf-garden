import { getDefaultVolume, setMasterVolume } from './audio/engine';
import {
  BANKS,
  MODE_NAMES,
  createLeafscape,
  updateLeafscape,
  getLeafscapeState,
  setBank,
  setMode,
  setTranspose,
  setTimbreBias,
  setSpace,
  setDensity,
  setTempo,
  startRecording,
  stopRecordingAndLoop,
  isRecording,
  getLastRecording,
} from './audio/leafscape';
import { LeafSensor } from './sensors/leafSensor';
import { MicSensor } from './sensors/micSensor';
import { OrientationSensor } from './sensors/orientationSensor';
import { loadOpenCv } from './vision/opencvLoader';
import { Knob } from './ui/knob';
import { initDashboard, render, setSensorStatus, hideControls, getKnobGrid } from './ui/dashboard';
import { attachStartButton, type StartFlowResult } from './ui/permissions';

const leaf = new LeafSensor();
// Mic + orientation are still acquired at start (the combined camera+mic getUserMedia keeps
// iOS output on the main speaker), but the sound is driven entirely by leaf shape now.
const mic = new MicSensor();
const orientation = new OrientationSensor();

const videoEl = document.getElementById('camera-preview') as HTMLVideoElement;
const switchCameraButton = document.getElementById('switch-camera-button') as HTMLButtonElement;
const randomizeButton = document.getElementById('randomize-button') as HTMLButtonElement;
const recordButton = document.getElementById('record-button') as HTMLButtonElement;
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;

// Start loading OpenCV immediately so contour tracking is ready by the time the user aims
// at a plant. If it fails/times out, the sensor silently uses its edge heuristic.
loadOpenCv().catch((err) => console.warn('OpenCV unavailable, using heuristic:', err));

initDashboard();

switchCameraButton.addEventListener('click', async () => {
  switchCameraButton.disabled = true;
  try {
    await leaf.switchCamera(videoEl);
    videoEl.classList.toggle('mirrored', leaf.getFacingMode() === 'user');
  } catch (err) {
    console.warn('Could not switch camera:', err);
  } finally {
    switchCameraButton.disabled = false;
  }
});

attachStartButton({ light: leaf, mic, orientation, videoEl }, onExperienceReady);

const knobs: Record<string, Knob> = {};

function onExperienceReady(result: StartFlowResult): void {
  setSensorStatus(result);
  switchCameraButton.disabled = !result.light;
  videoEl.classList.toggle('mirrored', leaf.getFacingMode() === 'user');

  createLeafscape();
  buildControls();
  wireActions();
  goImmersive();

  requestAnimationFrame(tick);
}

function pct(v: number): string {
  return `${Math.round(v * 100)}`;
}

function buildControls(): void {
  const grid = getKnobGrid();
  const state = getLeafscapeState();

  const add = (key: string, k: Knob) => {
    knobs[key] = k;
    grid.appendChild(k.el);
  };

  add(
    'bank',
    new Knob({
      label: 'bank', min: 0, max: BANKS.length - 1, step: 1, value: 0, color: 'var(--yellow)',
      format: (v) => BANKS[Math.round(v)].name,
      onChange: (v) => {
        setBank(BANKS[Math.round(v)].id);
        syncBankDependents();
      },
    }),
  );
  add(
    'mode',
    new Knob({
      label: 'mode', min: 0, max: MODE_NAMES.length - 1, step: 1, value: 0, color: 'var(--pink)',
      format: (v) => MODE_NAMES[Math.round(v)],
      onChange: (v) => setMode(MODE_NAMES[Math.round(v)]),
    }),
  );
  add(
    'pitch',
    new Knob({
      label: 'pitch', min: -12, max: 12, step: 1, value: 0, default: 0, color: 'var(--pink)',
      format: (v) => (v > 0 ? `+${v}` : `${v}`),
      onChange: (v) => setTranspose(v),
    }),
  );
  add(
    'freq',
    new Knob({
      label: 'freq', min: 0, max: 1, value: 0.5, default: 0.5, color: 'var(--pink)',
      format: pct, onChange: (v) => setTimbreBias(v),
    }),
  );
  add(
    'space',
    new Knob({
      label: 'space', min: 0, max: 1, value: 0.5, default: 0.5, color: 'var(--teal)',
      format: pct, onChange: (v) => setSpace(v),
    }),
  );
  add(
    'density',
    new Knob({
      label: 'density', min: 0, max: 1, value: 0.6, default: 0.6, color: 'var(--teal)',
      format: pct, onChange: (v) => setDensity(v),
    }),
  );
  add(
    'tempo',
    new Knob({
      label: 'tempo', min: 50, max: 140, step: 1, value: Math.round(state?.bpm ?? 74), color: 'var(--teal)',
      format: (v) => `${Math.round(v)}`,
      onChange: (v) => setTempo(v),
    }),
  );
  add(
    'sens',
    new Knob({
      label: 'sens', min: 0, max: 1, value: 0.6, default: 0.6, color: 'var(--pink)',
      format: pct, onChange: (v) => leaf.setSensitivity(v),
    }),
  );
  add(
    'volume',
    new Knob({
      label: 'volume', min: 0, max: 1, value: getDefaultVolume(), default: getDefaultVolume(), color: 'var(--teal)',
      format: pct, onChange: (v) => setMasterVolume(v),
    }),
  );

  // Apply initial values that the engine doesn't already default to.
  leaf.setSensitivity(0.6);
  setMasterVolume(getDefaultVolume());
}

/** Keep the mode + tempo dials in sync when a bank switch changes them under the hood. */
function syncBankDependents(): void {
  const state = getLeafscapeState();
  if (!state) return;
  const modeIdx = MODE_NAMES.indexOf(state.mode);
  if (modeIdx >= 0) knobs.mode?.setValue(modeIdx, false);
  knobs.tempo?.setValue(Math.round(state.bpm), false);
}

function wireActions(): void {
  randomizeButton.addEventListener('click', () => {
    knobs.bank?.setValue(Math.floor(Math.random() * BANKS.length)); // emits -> setBank + sync
    knobs.mode?.setValue(Math.floor(Math.random() * MODE_NAMES.length));
    knobs.pitch?.setValue(Math.round((Math.random() - 0.5) * 14));
    knobs.freq?.setValue(0.3 + Math.random() * 0.6);
    knobs.space?.setValue(0.3 + Math.random() * 0.6);
    knobs.density?.setValue(0.3 + Math.random() * 0.6);
  });

  recordButton.addEventListener('click', async () => {
    if (isRecording()) {
      recordButton.classList.remove('recording');
      recordButton.textContent = 'rec';
      await stopRecordingAndLoop();
      downloadButton.disabled = getLastRecording() === null;
    } else {
      startRecording();
      recordButton.classList.add('recording');
      recordButton.textContent = 'stop';
    }
  });

  downloadButton.addEventListener('click', () => {
    const blob = getLastRecording();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaf-garden-loop-${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wakeLock: any = null;

async function requestWakeLock(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wakeLock = await (navigator as any).wakeLock?.request('screen');
  } catch {
    /* best-effort; not supported everywhere */
  }
}

async function goImmersive(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    /* iOS Safari: PWA standalone provides fullscreen instead */
  }
  requestWakeLock();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wakeLock) requestWakeLock();
});

function tick(now: number): void {
  leaf.update(now);

  const spikiness = leaf.getSpikiness();
  const plantPresence = leaf.getPlantPresence();
  updateLeafscape(spikiness, plantPresence, leaf.getSpatial());

  render(
    {
      spikiness,
      roundness: leaf.getRoundness(),
      plantPresence,
      bankName: getLeafscapeState()?.bankName ?? '',
      usingCv: leaf.isUsingCv(),
    },
    leaf,
  );

  requestAnimationFrame(tick);
}

// Hide controls initially (start overlay covers everything until Start).
hideControls();
