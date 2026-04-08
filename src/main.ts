import './style.css';
import { Generator } from './generator';
import { renderToSVG } from './renderer';
import { exportSVG, exportPNG } from './export';
import { buildUI } from './ui';
import type { GeneratorConfig } from './types';

const app = document.getElementById('app')!;

const canvasContainer = document.createElement('div');
canvasContainer.id = 'canvas-container';

const controlsContainer = document.createElement('div');
controlsContainer.id = 'controls';

app.appendChild(canvasContainer);
app.appendChild(controlsContainer);

let generator: Generator | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let playing = false;
let currentSVG: SVGSVGElement | null = null;

function render() {
  if (!generator) return;
  const svg = renderToSVG(
    generator.state.pieces,
    generator.state.crossings,
    generator.state.alive ? generator.state.position : null,
    generator.config,
    ui.getRenderOptions(),
  );
  currentSVG = svg;
  canvasContainer.innerHTML = '';
  canvasContainer.appendChild(svg);
  ui.updateStats(
    generator.state.pieces.length,
    generator.state.crossings.length,
    generator.state.totalLength,
    generator.state.alive,
    generator.state.reason,
  );
}

function stopTimer() {
  if (timer !== null) { clearInterval(timer); timer = null; }
  playing = false;
  ui.setPlayState(false);
}

function startTimer(config: GeneratorConfig) {
  stopTimer();
  playing = true;
  ui.setPlayState(true);
  const interval = Math.max(1, Math.round(1000 / config.stepsPerSecond));
  timer = setInterval(() => {
    if (!generator) { stopTimer(); return; }
    const alive = generator.step();
    render();
    if (!alive) stopTimer();
  }, interval);
}

const ui = buildUI(controlsContainer, {
  onStart(config: GeneratorConfig) {
    stopTimer();
    generator = new Generator(config);
    render();
    startTimer(config);
  },
  onPauseResume() {
    if (!generator) return;
    if (playing) {
      stopTimer();
    } else {
      startTimer(generator.config);
    }
  },
  onStep() {
    if (!generator) return;
    stopTimer();
    generator.step();
    render();
  },
  onReset() {
    stopTimer();
    generator = null;
    canvasContainer.innerHTML = '';
    currentSVG = null;
  },
  onSpeedChange(stepsPerSecond: number) {
    if (generator && playing) {
      generator.config.stepsPerSecond = stepsPerSecond;
      startTimer(generator.config);
    }
  },
  onExportSVG() {
    if (currentSVG) exportSVG(currentSVG);
  },
  onExportPNG() {
    if (currentSVG) exportPNG(currentSVG);
  },
  onRenderOptionsChange() {
    render();
  },
});
