// A way for whoever likes the game to support it: a cup of coffee, never in the way. It shows on
// the title, in the pause menu and once an ending has been read, never while playing. Whoever reads
// Spanish is sent to Cafecito, paid in pesos; anyone else to Ko-fi, once there is a page there.

const LINKS = {
  cafecito: 'https://cafecito.app/tomasllopez',
  kofi: '',
};

/** Where to send whoever wants to support the game, by the language of their browser. */
export function supportLink(): string {
  const spanish = (navigator.language ?? '').toLowerCase().startsWith('es');
  return !spanish && LINKS.kofi ? LINKS.kofi : LINKS.cafecito;
}

/** What it says, in their language. */
export function supportWords(): { short: string; long: string } {
  const spanish = (navigator.language ?? '').toLowerCase().startsWith('es') || !LINKS.kofi;
  return spanish
    ? { short: 'Invitame un cafecito', long: 'Si te gustó 1810: Argentina, invitame un cafecito: ayuda a que siga creciendo.' }
    : { short: 'Buy me a coffee', long: 'If you enjoyed 1810: Argentina, buy me a coffee: it helps the game keep growing.' };
}

/** A link styled as the game's own buttons, that opens the page in a new tab. */
export function supportButton(className = 'support'): HTMLAnchorElement {
  const a = Object.assign(document.createElement('a'), {
    className, href: supportLink(), target: '_blank', rel: 'noopener', textContent: `☕ ${supportWords().short}`,
  });
  // Keep the game's keys working and the click from reaching the game underneath.
  a.addEventListener('pointerdown', e => e.stopPropagation());
  a.addEventListener('mousedown', e => e.preventDefault());
  return a;
}

const STYLE = `
  .support {
    display: inline-block; padding: 7px 14px 8px; color: #f0e3c4; text-decoration: none; background: #2a2018;
    box-shadow: 0 0 0 2px #e2c478, 0 0 0 4px #0a0807; font: 21px/1 'Jacquard 12', Georgia, serif; letter-spacing: .02em; cursor: pointer;
  }
  .support:hover, .support:focus-visible { background: #3a2c20; }
  /* On the title, small, in the top corner, out of the way of the Cabildo and of what is said below it. */
  #support-title { position: fixed; left: 14px; top: 14px; z-index: 12; display: none; opacity: .85; font-size: 21px; }
  body.title #support-title { display: inline-block; }
`;

/** Puts the button on the title screen. */
export function mountSupport(): void {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const onTitle = supportButton('support');
  onTitle.id = 'support-title';
  // Touching it on the title is not a touch that starts the game.
  for (const kind of ['pointerup', 'click', 'touchend'] as const) onTitle.addEventListener(kind, e => e.stopPropagation());
  document.body.appendChild(onTitle);
  // And in the pause menu, under its way out.
  const pause = document.querySelector('#pause .panel');
  if (pause) {
    const row = Object.assign(document.createElement('div'), { className: 'support-row' });
    row.style.cssText = 'margin-top: 16px; text-align: center;';
    row.append(supportButton());
    pause.appendChild(row);
  }
}
