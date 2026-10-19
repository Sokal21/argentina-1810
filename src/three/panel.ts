import GUI from 'lil-gui';
import { CLEAN, HARSH, LOOK, type Look } from './look';
import type { View } from './view';

// A panel for tuning the look by hand: every number in it, grouped, put into effect as it is
// moved. What is tuned is kept in this browser, and "Copiar config" copies it as JSON, to be
// pasted to Claude and made the game's own. P shows and hides it (L in the game, where P shows
// the collision boxes).

// A new name whenever the game's own look changes, so what was kept from before does not hide it.
const KEPT = '1810.3d.look.8';

/** Values kept from before that were the game's own then and have changed since: taken as unset. */
const STALE: Partial<Record<keyof Look, unknown[]>> = { rollTime: [0.8, 1.0, 1.4], rollDistance: [170, 190, 220] };

function kept(): Partial<Look> {
  try {
    const was = JSON.parse(localStorage.getItem(KEPT) ?? '{}') as Partial<Look>;
    for (const [key, old] of Object.entries(STALE) as [keyof Look, unknown[]][]) {
      if (old.includes(was[key])) delete was[key];
    }
    return was;
  } catch {
    return {};
  }
}

export function mountPanel(view: View, { key = 'KeyP', hidden = false } = {}): GUI {
  const look: Look = { ...LOOK, ...kept() };
  const gui = new GUI({ title: `Look (${key.slice(3)})`, width: 300 });
  if (hidden) gui.hide();
  const changed = () => {
    view.apply(look);
    try { localStorage.setItem(KEPT, JSON.stringify(look)); } catch { /* kept for this sitting only */ }
  };
  gui.onChange(changed);
  // The keys go back to the game as soon as a control has been set: held by a slider or a
  // checkbox, they never reached it, and the canvas had to be clicked to play on. A number being
  // typed keeps them until Enter, or until it is left.
  const release = () => {
    const held = document.activeElement as HTMLElement | null;
    if (held && gui.domElement.contains(held)) held.blur();
  };
  gui.onFinishChange(release);
  gui.domElement.addEventListener('pointerup', e => {
    const target = e.target as HTMLInputElement;
    if (!(target.tagName === 'INPUT' && target.type === 'text')) setTimeout(release, 0);
  });

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

  // The harder look, or the one before it, to compare (19 October 2026).
  const harsh = { dura: Object.entries(HARSH).every(([key, value]) => look[key as keyof Look] === value) };
  gui.add(harsh, 'dura').name('estética dura').onChange((on: boolean) => {
    Object.assign(look, on ? HARSH : CLEAN);
    gui.controllersRecursive().forEach(c => c.updateDisplay());
    changed();
  });

  const colour = gui.addFolder('Color');
  colour.add(look, 'brightness', -0.5, 0.5, 0.01).name('brillo');
  colour.add(look, 'contrast', 0.3, 2, 0.01).name('contraste');
  colour.add(look, 'saturation', 0, 2, 0.01).name('saturación');
  colour.add(look, 'gamma', 0.4, 2.5, 0.01).name('gamma');
  colour.addColor(look, 'shadeColour').name('tinte en sombras');
  colour.add(look, 'shade', 0, 1, 0.01).name('tinte en sombras: cuánto');
  colour.addColor(look, 'lightColour').name('tinte en luces');
  colour.add(look, 'light', 0, 1, 0.01).name('tinte en luces: cuánto');
  colour.add(look, 'crush', 0, 1, 0.01).name('negros aplastados');
  colour.addColor(look, 'murkColour').name('velo: color');
  colour.add(look, 'murk', 0, 1, 0.01).name('velo: cuánto');
  colour.addColor(look, 'grimeColour').name('mugre: color');
  colour.add(look, 'grime', 0, 1.5, 0.01).name('mugre: cuánto');
  colour.add(look, 'reds', 0, 1, 0.01).name('rojos que resaltan');

  const air = gui.addFolder('Aire');
  air.add(look, 'clouds', 0, 1, 0.01).name('sombras de nubes');
  air.add(look, 'cloudSize', 200, 3000, 10).name('nubes: tamaño');
  air.add(look, 'cloudSpeed', 0, 80, 1).name('nubes: velocidad');
  air.add(look, 'haze', 0, 0.6, 0.01).name('bruma');
  air.addColor(look, 'hazeColour').name('bruma: color');
  air.add(look, 'bloom', 0, 3, 0.01).name('brillo de lo que quema');
  air.add(look, 'bloomFrom', 0, 2, 0.01).name('brillo: desde qué luz');

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

  const moving = gui.addFolder('Movimiento');
  moving.add(look, 'speed', 40, 260, 1).name('velocidad');

  const roll = gui.addFolder('Rodada');
  roll.add(look, 'rollTime', 0.3, 1.6, 0.05).name('duración (s)');
  roll.add(look, 'rollDistance', 40, 320, 5).name('distancia');

  const impact = gui.addFolder('Impacto');
  impact.add(look, 'impactFacesStriker').name('mira a quien golpea');
  impact.add(look, 'impactFrom', 0, 20, 0.5).name('tamaño inicial');
  impact.add(look, 'impactTo', 2, 60, 0.5).name('tamaño final');
  impact.add(look, 'impactBand', 0.02, 0.9, 0.01).name('grosor');
  impact.add(look, 'impactLife', 0.05, 1, 0.01).name('duración (s)');
  impact.addColor(look, 'impactColour').name('color');
  impact.addColor(look, 'impactGlowColour').name('brillo: color');
  impact.add(look, 'impactGlow', 0, 1.5, 0.01).name('brillo: fuerza');
  impact.add(look, 'impactGlowWider', 1, 2.5, 0.01).name('brillo: ancho');
  impact.add(look, 'impactGlowBand', 0.05, 1, 0.01).name('brillo: grosor');

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
    if (e.code === key && !e.repeat && (e.target as { tagName?: string } | null)?.tagName !== 'INPUT') gui.show(gui._hidden);
  });
  return gui;
}
