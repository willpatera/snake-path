import type { GeneratorConfig } from './types';
import { DEFAULT_CONFIG } from './config';
import type { RenderOptions } from './renderer';
import { DEFAULT_RENDER_OPTIONS } from './renderer';

export type UICallbacks = {
  onStart: (config: GeneratorConfig) => void;
  onPauseResume: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (stepsPerSecond: number) => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onRenderOptionsChange: () => void;
};

export type UIRefs = {
  updateStats: (pieces: number, crossings: number, length: number, alive: boolean, reason: string) => void;
  setPlayState: (playing: boolean) => void;
  getRenderOptions: () => RenderOptions;
};

export function buildUI(
  container: HTMLElement,
  callbacks: UICallbacks,
): UIRefs {
  container.innerHTML = '';
  const panel = el('div', 'controls-panel');

  // Title
  const title = el('h2', 'controls-title');
  title.textContent = 'Snake Path Generator';
  panel.appendChild(title);

  // Seed
  const seedGroup = el('div', 'control-group');
  seedGroup.appendChild(label('Seed'));
  const seedInput = input('text', DEFAULT_CONFIG.seed);
  seedInput.id = 'seed-input';
  const randomBtn = button('Randomize', () => {
    seedInput.value = 'seed-' + Math.random().toString(36).slice(2, 10);
  });
  randomBtn.className = 'btn btn-small';
  seedGroup.appendChild(seedInput);
  seedGroup.appendChild(randomBtn);
  panel.appendChild(seedGroup);

  // Config sliders
  const strokeSlider = makeSlider('Stroke Width', 2, 16, 1, DEFAULT_CONFIG.strokeWidth);
  const radiusSlider = makeSlider('Turn Radius', 16, 80, 2, DEFAULT_CONFIG.turnRadius);
  const straightSlider = makeSlider('Straight Length', 20, 120, 4, DEFAULT_CONFIG.straightLength);
  const crossingSlider = makeSlider('Crossing Bias', 0, 1, 0.05, DEFAULT_CONFIG.crossingBias);
  const maxPiecesSlider = makeSlider('Max Pieces', 50, 10000, 50, DEFAULT_CONFIG.maxPieces);

  panel.appendChild(strokeSlider.group);
  panel.appendChild(radiusSlider.group);
  panel.appendChild(straightSlider.group);
  panel.appendChild(crossingSlider.group);
  panel.appendChild(maxPiecesSlider.group);

  // Speed slider
  const speedSlider = makeSlider('Speed (steps/sec)', 1, 120, 1, DEFAULT_CONFIG.stepsPerSecond);
  speedSlider.inp.addEventListener('input', () => {
    callbacks.onSpeedChange(speedSlider.value());
  });
  panel.appendChild(speedSlider.group);

  // Playback buttons
  const btnGroup = el('div', 'btn-group');

  const startBtn = button('Start', () => {
    const config = readConfig(seedInput, strokeSlider, radiusSlider, straightSlider, crossingSlider, maxPiecesSlider, speedSlider);
    callbacks.onStart(config);
  });
  startBtn.className = 'btn btn-primary';
  btnGroup.appendChild(startBtn);

  const pauseBtn = button('Pause', () => callbacks.onPauseResume());
  pauseBtn.className = 'btn';
  pauseBtn.id = 'pause-btn';
  btnGroup.appendChild(pauseBtn);

  const stepBtn = button('Step', () => callbacks.onStep());
  stepBtn.className = 'btn';
  btnGroup.appendChild(stepBtn);

  const resetBtn = button('Reset', () => callbacks.onReset());
  resetBtn.className = 'btn';
  btnGroup.appendChild(resetBtn);

  panel.appendChild(btnGroup);

  // Export buttons
  const exportGroup = el('div', 'btn-group');
  const svgBtn = button('Export SVG', callbacks.onExportSVG);
  svgBtn.className = 'btn';
  exportGroup.appendChild(svgBtn);
  const pngBtn = button('Export PNG', callbacks.onExportPNG);
  pngBtn.className = 'btn';
  exportGroup.appendChild(pngBtn);
  panel.appendChild(exportGroup);

  // Gradient controls
  const gradSection = el('div', 'control-group');
  const gradLabel = document.createElement('label');
  gradLabel.className = 'control-label';
  gradLabel.textContent = 'Gradient';
  gradSection.appendChild(gradLabel);

  const gradToggle = document.createElement('input');
  gradToggle.type = 'checkbox';
  gradToggle.checked = DEFAULT_RENDER_OPTIONS.gradient;
  gradToggle.addEventListener('change', () => callbacks.onRenderOptionsChange());
  const gradToggleLabel = document.createElement('label');
  gradToggleLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer';
  gradToggleLabel.appendChild(gradToggle);
  gradToggleLabel.appendChild(document.createTextNode('Enable gradient'));
  gradSection.appendChild(gradToggleLabel);

  const colorRow = el('div');
  colorRow.style.cssText = 'display:flex;gap:12px;align-items:center;margin-top:4px';

  const startColorInput = document.createElement('input');
  startColorInput.type = 'color';
  startColorInput.value = DEFAULT_RENDER_OPTIONS.gradientStart;
  startColorInput.addEventListener('input', () => callbacks.onRenderOptionsChange());
  const startLbl = document.createElement('label');
  startLbl.style.cssText = 'font-size:12px;display:flex;align-items:center;gap:4px';
  startLbl.textContent = 'Start ';
  startLbl.appendChild(startColorInput);

  const endColorInput = document.createElement('input');
  endColorInput.type = 'color';
  endColorInput.value = DEFAULT_RENDER_OPTIONS.gradientEnd;
  endColorInput.addEventListener('input', () => callbacks.onRenderOptionsChange());
  const endLbl = document.createElement('label');
  endLbl.style.cssText = 'font-size:12px;display:flex;align-items:center;gap:4px';
  endLbl.textContent = 'End ';
  endLbl.appendChild(endColorInput);

  colorRow.appendChild(startLbl);
  colorRow.appendChild(endLbl);
  gradSection.appendChild(colorRow);
  panel.appendChild(gradSection);

  // Rendering toggles
  const renderSection = el('div', 'control-group');
  const renderLabel = document.createElement('label');
  renderLabel.className = 'control-label';
  renderLabel.textContent = 'Rendering';
  renderSection.appendChild(renderLabel);

  const hideCapToggle = document.createElement('input');
  hideCapToggle.type = 'checkbox';
  hideCapToggle.checked = DEFAULT_RENDER_OPTIONS.hideEndCap;
  hideCapToggle.addEventListener('change', () => callbacks.onRenderOptionsChange());
  const hideCapLabel = document.createElement('label');
  hideCapLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer';
  hideCapLabel.appendChild(hideCapToggle);
  hideCapLabel.appendChild(document.createTextNode('Hide end caps'));
  renderSection.appendChild(hideCapLabel);

  const weaveToggle = document.createElement('input');
  weaveToggle.type = 'checkbox';
  weaveToggle.checked = DEFAULT_RENDER_OPTIONS.weave;
  weaveToggle.addEventListener('change', () => callbacks.onRenderOptionsChange());
  const weaveLabel = document.createElement('label');
  weaveLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-top:4px';
  weaveLabel.appendChild(weaveToggle);
  weaveLabel.appendChild(document.createTextNode('Alternating weave'));
  renderSection.appendChild(weaveLabel);

  panel.appendChild(renderSection);

  // Stats
  const statsEl = el('div', 'stats');
  statsEl.textContent = 'Press Start to begin.';
  panel.appendChild(statsEl);

  container.appendChild(panel);

  return {
    updateStats(pieces, crossings, length, alive, reason) {
      statsEl.innerHTML = [
        `<strong>Pieces:</strong> ${pieces}`,
        `<strong>Crossings:</strong> ${crossings}`,
        `<strong>Length:</strong> ${Math.round(length)} px`,
        `<strong>Status:</strong> ${alive ? 'running' : reason === 'maxPieces' ? 'done (max pieces)' : 'dead (trapped)'}`,
      ].join('<br>');
    },
    setPlayState(playing: boolean) {
      const btn = document.getElementById('pause-btn');
      if (btn) btn.textContent = playing ? 'Pause' : 'Resume';
    },
    getRenderOptions(): RenderOptions {
      return {
        gradient: gradToggle.checked,
        gradientStart: startColorInput.value,
        gradientEnd: endColorInput.value,
        hideEndCap: hideCapToggle.checked,
        weave: weaveToggle.checked,
      };
    },
  };
}

function readConfig(
  seedInput: HTMLInputElement,
  strokeSlider: SliderRef,
  radiusSlider: SliderRef,
  straightSlider: SliderRef,
  crossingSlider: SliderRef,
  maxPiecesSlider: SliderRef,
  speedSlider: SliderRef,
): GeneratorConfig {
  return {
    ...DEFAULT_CONFIG,
    seed: seedInput.value,
    strokeWidth: strokeSlider.value(),
    turnRadius: radiusSlider.value(),
    straightLength: straightSlider.value(),
    crossingBias: crossingSlider.value(),
    maxPieces: maxPiecesSlider.value(),
    stepsPerSecond: speedSlider.value(),
    boundaryPadding: strokeSlider.value() * 3,
  };
}

// --- DOM helpers ---

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function label(text: string): HTMLLabelElement {
  const lbl = document.createElement('label');
  lbl.className = 'control-label';
  lbl.textContent = text;
  return lbl;
}

function input(type: string, value: string): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value;
  inp.className = 'input';
  return inp;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

type SliderRef = { group: HTMLElement; value: () => number; inp: HTMLInputElement };

function makeSlider(
  labelText: string, min: number, max: number, step: number, defaultValue: number,
): SliderRef {
  const group = el('div', 'control-group');
  const lbl = document.createElement('label');
  lbl.className = 'control-label';
  const valSpan = document.createElement('span');
  valSpan.className = 'slider-value';
  valSpan.textContent = String(defaultValue);
  lbl.textContent = labelText + ': ';
  lbl.appendChild(valSpan);
  group.appendChild(lbl);

  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = String(min);
  inp.max = String(max);
  inp.step = String(step);
  inp.value = String(defaultValue);
  inp.className = 'slider';
  inp.addEventListener('input', () => { valSpan.textContent = inp.value; });
  group.appendChild(inp);

  return { group, value: () => Number(inp.value), inp };
}
