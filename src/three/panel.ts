import GUI from 'lil-gui';
import { LOOK, type Look } from './look';
import type { View } from './view';

// A panel for tuning the look by hand: every number in it, grouped, put into effect as it is
// moved. What is tuned is kept in this browser, and "Copiar config" copies it as JSON, to be
// pasted to Claude and made the game's own. P shows and hides it.

// A new name whenever the game's own look changes, so what was kept from before does not hide it.
const KEPT = '1810.3d.look.2';

function kept(): Partial<Look> {
  try {
    return JSON.parse(localStorage.getItem(KEPT) ?? '{}') as Partial<Look>;
  } catch {
    return {};
  }
}

export function mountPanel(view: View): GUI {
  const look: Look = { ...LOOK, ...kept() };
  const gui = new GUI({ title: 'Look (P)', width: 300 });
  const changed = () => {
    view.apply(look);
    try { localStorage.setItem(KEPT, JSON.stringify(look)); } catch { /* kept for this sitting only */ }
  };
  gui.onChange(changed);

  const pixels = gui.addFolder('Píxel y bordes');
  pixels.add(look, 'pixel', 1, 8, 1).name('tamaño del píxel');
  pixels.add(look, 'far', 0.5, 4, 0.05).name('alejamiento de la cámara');
  pixels.add(look, 'creases', 0, 2, 0.01).name('bordes: pliegues');
  pixels.add(look, 'outlines', 0, 2, 0.01).name('bordes: contorno');

  const light = gui.addFolder('Luz');
  light.add(look, 'sunStrength', 0, 6, 0.05).name('sol: fuerza');
  light.addColor(look, 'sunColour').name('sol: color');
  light.add(look, 'sunRound', -180, 180, 1).name('sol: giro (°)');
  light.add(look, 'sunHigh', 5, 90, 1).name('sol: altura (°)');
  light.add(look, 'shadows').name('sombras');
  light.add(look, 'skyStrength', 0, 4, 0.05).name('cielo: fuerza');
  light.addColor(look, 'skyColour').name('cielo: color');
  light.addColor(look, 'groundColour').name('rebote del suelo');
  light.add(look, 'steps', 1, 8, 1).name('escalones de luz');
  light.add(look, 'darkest', 0, 1, 0.01).name('escalón más oscuro');

  const colour = gui.addFolder('Color');
  colour.add(look, 'brightness', -0.5, 0.5, 0.01).name('brillo');
  colour.add(look, 'contrast', 0.3, 2, 0.01).name('contraste');
  colour.add(look, 'saturation', 0, 2, 0.01).name('saturación');
  colour.add(look, 'gamma', 0.4, 2.5, 0.01).name('gamma');
  colour.addColor(look, 'shadeColour').name('tinte en sombras');
  colour.add(look, 'shade', 0, 1, 0.01).name('tinte en sombras: cuánto');
  colour.addColor(look, 'lightColour').name('tinte en luces');
  colour.add(look, 'light', 0, 1, 0.01).name('tinte en luces: cuánto');

  const palette = gui.addFolder('Paleta y tramado');
  palette.add(look, 'levels', 0, 32, 1).name('niveles por canal (0: sin)');
  palette.add(look, 'dither', 0, 2, 0.01).name('tramado');

  const lens = gui.addFolder('Grano y lente');
  lens.add(look, 'grain', 0, 0.5, 0.005).name('grano');
  lens.add(look, 'grainMoves').name('grano animado');
  lens.add(look, 'vignette', 0, 2, 0.01).name('viñeta');
  lens.add(look, 'aberration', 0, 6, 0.05).name('aberración cromática');
  lens.add(look, 'bulge', 0, 0.5, 0.005).name('curvatura (CRT)');
  lens.add(look, 'scanlines', 0, 1, 0.01).name('líneas de barrido');

  const effects = gui.addFolder('Efectos');
  effects.add(look, 'trail').name('estela del sable');

  const actions = {
    copiar: async () => {
      const text = JSON.stringify(look, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        copy.name('¡Copiada!');
      } catch {
        // Without the clipboard: shown to be copied by hand.
        prompt('Copiá esta config:', text);
      }
      setTimeout(() => copy.name('Copiar config'), 1500);
    },
    restablecer: () => {
      Object.assign(look, LOOK);
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      changed();
    },
  };
  const copy = gui.add(actions, 'copiar').name('Copiar config');
  gui.add(actions, 'restablecer').name('Volver a lo de antes');

  changed();
  addEventListener('keydown', e => {
    if (e.code === 'KeyP' && !e.repeat && (e.target as { tagName?: string } | null)?.tagName !== 'INPUT') gui.show(gui._hidden);
  });
  return gui;
}
