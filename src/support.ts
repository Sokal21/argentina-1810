// A way for whoever likes the game to support it: a cup of coffee, never in the way. It is always
// in the top left corner, small, and it is offered again once an ending has been read. Whoever reads
// Argentina is sent to Cafecito, paid in pesos; anyone else to Ko-fi.

const LINKS = {
  cafecito: 'https://cafecito.app/tomasllopez',
  kofi: 'https://ko-fi.com/tomasllopez',
};

// Whoever is in Argentina pays in pesos, through Cafecito; anyone else through Ko-fi. Where they are
// is told by the browser's time zone, which comes from the machine's own settings, or else by a
// language of theirs marked as Argentina's (es-AR). Nothing is asked of anyone, nor sent anywhere.
function inArgentina(): boolean {
  let zone = '';
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { /* none to be had */ }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
  return zone.startsWith('America/Argentina') || zone === 'America/Buenos_Aires' || languages.some(l => /-ar$/i.test(l));
}
const spanish = () => (navigator.language ?? '').toLowerCase().startsWith('es');

/** Where to send whoever wants to support the game. */
export function supportLink(): string {
  return inArgentina() || !LINKS.kofi ? LINKS.cafecito : LINKS.kofi;
}

/** What it says: a cafecito in Argentina, a coffee in Spanish elsewhere, and in English for the rest. */
export function supportWords(): { short: string; long: string } {
  if (inArgentina() || !LINKS.kofi) return { short: 'Invitame un cafecito', long: 'Si te gustó 1810: Argentina, invitame un cafecito: ayuda a que siga creciendo.' };
  if (spanish()) return { short: 'Invitame un café', long: 'Si te gustó 1810: Argentina, invitame un café: ayuda a que siga creciendo.' };
  return { short: 'Buy me a coffee', long: 'If you enjoyed 1810: Argentina, buy me a coffee: it helps the game keep growing.' };
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
  /* Always in the top left corner, small, over the title and over the game alike: what there is to
     do is written just under it. */
  #support-title { position: fixed; left: 14px; top: 12px; z-index: 16; display: inline-block; opacity: .85; padding: 5px 11px 6px; }
  body:not(.title) #quests { top: 58px; }
  body.talking #support-title { display: none; }
`;

/** Puts the button in its corner. */
export function mountSupport(): void {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const onTitle = supportButton('support');
  onTitle.id = 'support-title';
  // Touching it is not a touch that starts the game, nor one that attacks.
  for (const kind of ['pointerup', 'click', 'touchend'] as const) onTitle.addEventListener(kind, e => e.stopPropagation());
  document.body.appendChild(onTitle);
}
