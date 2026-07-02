import type { LeafSensor } from '../sensors/leafSensor';
import { drawTrackingOverlay } from './overlay';

interface Elements {
  overlayCanvas: HTMLCanvasElement;
  overlayCtx: CanvasRenderingContext2D;
  hudMetric: HTMLElement;
  hudCv: HTMLElement;
  controls: HTMLElement;
  tapHint: HTMLElement;
  stage: HTMLElement;
}

let els: Elements | null = null;
let autoHideTimer: number | undefined;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

export function initDashboard(): void {
  const overlayCanvas = byId<HTMLCanvasElement>('leaf-overlay');
  const overlayCtx = overlayCanvas.getContext('2d');
  if (!overlayCtx) throw new Error('Could not acquire 2D context for the leaf overlay canvas');

  els = {
    overlayCanvas,
    overlayCtx,
    hudMetric: byId('hud-metric'),
    hudCv: byId('hud-cv'),
    controls: byId('controls'),
    tapHint: byId('tap-hint'),
    stage: byId('stage'),
  };

  // Tap anywhere on the stage (but not on the controls or the bank menu) to toggle the sheet.
  els.stage.addEventListener('click', (e) => {
    if (!els) return;
    const target = e.target as HTMLElement;
    if (target.closest('#bank-select')) return; // native dropdown handles itself
    if (target.closest('#controls')) {
      scheduleAutoHide(); // interacting keeps it open
      return;
    }
    toggleControls();
  });
}

function scheduleAutoHide(): void {
  window.clearTimeout(autoHideTimer);
  autoHideTimer = window.setTimeout(() => hideControls(), 5000);
}

export function toggleControls(): void {
  if (!els) return;
  if (els.controls.classList.contains('hidden')) showControls();
  else hideControls();
}

export function showControls(): void {
  if (!els) return;
  els.controls.classList.remove('hidden');
  els.tapHint.classList.add('hidden');
  scheduleAutoHide();
}

export function hideControls(): void {
  if (!els) return;
  els.controls.classList.add('hidden');
  window.clearTimeout(autoHideTimer);
}

export interface SensorAvailability {
  light: boolean;
  mic: boolean;
  orientation: boolean;
}

export function setSensorStatus(availability: SensorAvailability): void {
  if (!els) return;
  if (!availability.light) {
    els.hudCv.textContent = 'no camera';
  }
}

export interface DashboardState {
  spikiness: number;
  roundness: number;
  plantPresence: number;
  bankName: string;
  usingCv: boolean;
}

export function render(state: DashboardState, leaf: LeafSensor): void {
  if (!els) return;

  const shape = state.spikiness >= 0.5 ? 'sharp' : 'round';
  els.hudMetric.textContent = `${shape} ${state.spikiness.toFixed(2)} · ${Math.round(state.plantPresence * 100)}%`;
  els.hudCv.textContent = state.usingCv ? 'tracking' : 'heuristic';
  els.hudCv.classList.toggle('cv-on', state.usingCv);

  // Match the overlay backing store to its displayed size, then draw.
  const rect = els.overlayCanvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (els.overlayCanvas.width !== w || els.overlayCanvas.height !== h) {
    els.overlayCanvas.width = w;
    els.overlayCanvas.height = h;
  }
  drawTrackingOverlay(els.overlayCtx, w, h, leaf);
}

export function getKnobGrid(): HTMLElement {
  return byId('knob-grid');
}

export function hideStartOverlay(): void {
  document.getElementById('start-overlay')?.classList.add('hidden');
}
