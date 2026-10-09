import Phaser from 'phaser';
import { drawGround } from '../world/ground';
import { bosquePatagonico } from '../world/maps/bosque';
import { drawTrees, loadScenery } from '../world/scenery';
import { extent, faults, letterAt, middle, PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../world/zones';

// A page for looking at maps while they are being made. It paints the ground
// with the game's own code, and nothing of the game runs here.

const GAME_ZOOM = 2;               // screen pixels per sprite pixel, as the game is played
const NEAR = 6, FAR = 0.08;        // how close and how far the map can be seen from
const PAN = 900;                   // screen pixels a second, on the keys
const LINE = 0xf0e3c4;

const map: WorldMap = bosquePatagonico;
const wrong = faults(map);
const info = document.getElementById('info')!;
const labels = document.getElementById('labels')!;

/** A name pinned to a spot on the map. */
interface Label { el: HTMLElement; x: number; y: number }

class MapScene extends Phaser.Scene {
  private lines!: Phaser.GameObjects.Graphics;
  private pinned: Label[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private grid = false;
  private frame = true;
  private shaded = true;
  private trees: Phaser.GameObjects.Image[] = [];
  private shadows: Phaser.GameObjects.Image[] = [];

  preload(): void {
    loadScenery(this);
  }

  create(): void {
    drawGround(this, map);
    ({ trees: this.trees, shadows: this.shadows } = drawTrees(this, map));
    this.lines = this.add.graphics().setDepth(1e6);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.keys;
    this.pin();
    this.fit();

    const cam = this.cameras.main;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      this.zoomAt(p.x, p.y, cam.zoom * Math.exp(-dy * 0.0015));
    });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyF') this.fit();
      if (e.code === 'KeyG') this.grid = !this.grid;
      if (e.code === 'KeyV') this.frame = !this.frame;
      if (e.code === 'KeyT') {
        const shown = !this.trees[0]?.visible;
        for (const tree of this.trees) tree.setVisible(shown);
        for (const shadow of this.shadows) shadow.setVisible(shown && this.shaded);
      }
      if (e.code === 'KeyO') {
        this.shaded = !this.shaded;
        for (const shadow of this.shadows) shadow.setVisible(this.shaded && !!this.trees[0]?.visible);
      }
      if (e.code === 'Digit2') {
        const p = this.input.activePointer;
        this.zoomAt(p.x, p.y, GAME_ZOOM);
      }
    });
  }

  update(_time: number, delta: number): void {
    const cam = this.cameras.main, step = PAN * delta / 1000 / cam.zoom;
    cam.scrollX += (Number(this.keys.D.isDown) - Number(this.keys.A.isDown)) * step;
    cam.scrollY += (Number(this.keys.S.isDown) - Number(this.keys.W.isDown)) * step;

    const p = this.input.activePointer, at = this.spot(p.x, p.y);
    this.draw(at);
    for (const { el, x, y } of this.pinned) {
      const sx = (x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
      const sy = (y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
    }
    this.report(at);
  }

  /** The spot on the map under a point of the screen. */
  private spot(sx: number, sy: number): { x: number; y: number } {
    const cam = this.cameras.main;
    return {
      x: cam.scrollX + cam.width / 2 + (sx - cam.width / 2) / cam.zoom,
      y: cam.scrollY + cam.height / 2 + (sy - cam.height / 2) / cam.zoom,
    };
  }

  // Changes how close the map is seen from, keeping still what is under a point of the screen.
  private zoomAt(sx: number, sy: number, zoom: number): void {
    const cam = this.cameras.main, held = this.spot(sx, sy);
    cam.setZoom(Phaser.Math.Clamp(zoom, FAR, NEAR));
    cam.scrollX = held.x - cam.width / 2 - (sx - cam.width / 2) / cam.zoom;
    cam.scrollY = held.y - cam.height / 2 - (sy - cam.height / 2) / cam.zoom;
  }

  /** Stands back until the whole map is in view. */
  private fit(): void {
    const cam = this.cameras.main, { width, height } = extent(map);
    cam.setZoom(Math.min(cam.width / width, cam.height / height) * 0.92);
    cam.centerOn(width / 2, height / 2);
  }

  // Names each zone over the middle of its plots, and each thing marked on the map.
  private pin(): void {
    const name = (text: string, kind: string, x: number, y: number) => {
      const el = document.createElement('span');
      el.textContent = text;
      el.className = kind;
      labels.appendChild(el);
      this.pinned.push({ el, x, y });
    };
    for (const [letter, zone] of Object.entries(map.zones)) {
      let x = 0, y = 0, n = 0;
      map.plots.forEach((line, row) => [...line].forEach((l, col) => {
        if (l !== letter) return;
        const at = middle([col, row]);
        x += at.x; y += at.y; n++;
      }));
      if (n) name(zone.name, zone.safe ? 'zone safe' : 'zone', x / n, y / n - (zone.safe ? PLOT_H : 0));
    }
    const home = middle(map.start);
    name('Llegada', 'mark', home.x, home.y + 14);
    for (const { name: what, plot } of map.objectives) {
      const at = middle(plot);
      name(what, 'mark', at.x, at.y + 14);
    }
  }

  private draw(pointer: { x: number; y: number }): void {
    const g = this.lines, cam = this.cameras.main, px = 1 / cam.zoom; // one screen pixel
    const cols = map.plots[0].length, rows = map.plots.length;
    g.clear();

    if (this.grid) {
      g.lineStyle(px, LINE, 0.12);
      for (let c = 0; c <= cols; c++) g.lineBetween(c * PLOT_W, 0, c * PLOT_W, rows * PLOT_H);
      for (let r = 0; r <= rows; r++) g.lineBetween(0, r * PLOT_H, cols * PLOT_W, r * PLOT_H);
    }

    // Where one zone gives way to another, or to country nobody crosses.
    g.lineStyle(px * 1.5, LINE, 0.45);
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const here = letterAt(map, c, r);
        if (here !== letterAt(map, c - 1, r)) g.lineBetween(c * PLOT_W, r * PLOT_H, c * PLOT_W, (r + 1) * PLOT_H);
        if (here !== letterAt(map, c, r - 1)) g.lineBetween(c * PLOT_W, r * PLOT_H, (c + 1) * PLOT_W, r * PLOT_H);
      }
    }

    const mark = (plot: [number, number], colour: number) => {
      const { x, y } = middle(plot), r = 5 * px;
      g.fillStyle(colour, 1);
      g.fillPoints([{ x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y }], true);
    };
    mark(map.start, 0xe8c874);
    for (const { plot } of map.objectives) mark(plot, 0x9fe3ee);

    // How much of the map the game shows at once, around the pointer.
    if (this.frame && cam.zoom < GAME_ZOOM) {
      const w = cam.width / GAME_ZOOM, h = cam.height / GAME_ZOOM;
      g.lineStyle(px, 0xffffff, 0.6);
      g.strokeRect(pointer.x - w / 2, pointer.y - h / 2, w, h);
    }
  }

  private report({ x, y }: { x: number; y: number }): void {
    const { width, height } = extent(map), zone = zoneAt(map, x, y);
    const col = Math.floor(x / PLOT_W), row = Math.floor(y / PLOT_H);
    const inside = x >= 0 && y >= 0 && x < width && y < height;
    const under = !inside ? '' : `${zone ? zone.name + (zone.safe ? ' (segura)' : '') : 'Espesura'} · parcela ${col},${row} · ${Math.round(x)},${Math.round(y)}`;
    const html = `<b>${map.name}</b> · ${map.plots[0].length}×${map.plots.length} parcelas · ${width}×${height} px · ×${this.cameras.main.zoom.toFixed(2)}`
      + `<br>${under}`
      + wrong.map(fault => `<br><span class="fault">${fault}</span>`).join('');
    if (info.innerHTML !== html) info.innerHTML = html;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14110f',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [MapScene],
});
