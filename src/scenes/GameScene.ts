import Phaser from 'phaser';
import { BALL, Bolts, EMBER, SHOT } from '../bolts';
import { Realista } from '../realista/Realista';
import { Trooper } from '../tropa/Trooper';
import { KINDS, type KindName } from '../tropa/brain';
import { cheats, tune } from '../tuning';
import { Charge, ULTIMATE } from '../machi/ultimate';
import { RAGE, Rage } from '../machi/rage';
import { NAHUEL } from '../nahuel/brain';
import { Nahuel } from '../nahuel/Nahuel';
import { closedTo, openDialog } from '../npc/dialog';
import type { Idle, Npc } from '../npc/npc';
import { BYSTANDERS } from '../npc/bystanders';
import { BRAULIO, PEOPLE } from '../npc/people';
import { Chonchon } from '../chonchon/Chonchon';
import { Enemy } from '../enemies';
import { FIRE_TALL, fireShader } from '../fx/fire';
import { HitFX } from '../fx/HitFX';
import { Lightning } from '../fx/lightning';
import { LookFX } from '../fx/LookFX';
import { controls, fx } from '../fx/settings';
import { Keys } from '../input';
import { Abilities, ground, HEAL, MANA, REGEN, STRIKE, type Ability } from '../machi/abilities';
import { lands, MachiController, STEER, type Arm, type MachiInput, type Strike, type Vec } from '../machi/controller';
import { BOLT_RANGE, FRAME, ISO_Y, KITS, type Hero } from '../machi/data';
import { BLOW, FURY, Fury, WOUND } from '../machi/fury';
import { Burning } from '../machi/burning';
import { GRENADE } from '../machi/grenade';
import { MUSKET } from '../machi/musket';
import { overlaps, pushOut, type Footprint } from '../world/footprint';
import { drawGround as layGround } from '../world/ground';
import { Meadow } from '../fx/meadow';
import { Silhouettes } from '../fx/silhouette';
import { playMusic } from '../music';
import { RUN, Stamina } from '../machi/stamina';
import { Water } from '../fx/water';
import { Country, loadCountry, loadFences, raiseBuildings, raiseFences } from '../world/country';
import { bosquePatagonico } from '../world/maps/bosque';
import { vadoDeLasVizcachas } from '../world/maps/vado';
import { Forest, loadScenery } from '../world/scenery';
import { garrison, type Post } from '../world/garrison';
import { DRAUGHTS, DRINKING, Flask, FLASKS } from '../machi/flask';
import { GROWTHS, toNext, WORTH, type Growth, type Stat } from '../machi/growth';
import { ITEMS, PACKS, SPOILS, type Pack } from '../machi/pack';
import { MEND, Mending } from '../fx/mend';
import { Sight } from '../world/sight';
import { trail } from '../world/trail';
import { Waves } from '../world/waves';
import { Escort } from '../world/escort';
import { showEnding } from '../story/ending';
import { prompt, touch } from '../touch';
import { glyphs, pad, rumble } from '../pad';
import { Indoors, ROOMS, type Entering } from '../world/inside';
import { Road, Route } from '../world/route';
import { leaning, markup, shut, standing, told as moved, type Standing } from '../story/standing';
import { grownOf, keep, load, ownedOf, regrow, repack, type Saved } from '../save';
import { keptTalks, restoreTalks } from '../npc/dialog';
import { mountBoard } from '../story/board';
import { Story } from '../story/story';
import { THINGS } from '../story/things';
import { FACTS, RULES, VADO } from '../story/vado';
import { Vitals } from '../world/vitals';
import { DRAW, SHOT as SLING, SIP } from '../three/cabral';
import { sunCursor } from '../three/cursor';
import { MODELS } from '../three/buildings';
import { World3D } from '../three/world3d';
import { heightAt, PITCH } from '../three/space';
import { extent, letterAt, middle, PLOT_H, PLOT_W, walk, zoneAt, type Charge as Cargo, type Spot, type WorldMap } from '../world/zones';

// Screen pixels per sprite pixel: drawn a little smaller than twice, so more of the country is seen
// round the hero, as in Diablo.
const ZOOM = 1.5;
/** Inti's pace in 3D, in world units a second: Cabral's is 126 (three/look.ts). */
const INTI_3D_SPEED = 115;
/** Inti's lock: how far off (along the ground) she can lock onto someone, and how far before she lets go. */
const LOCK = { reach: BOLT_RANGE, keep: BOLT_RANGE * 1.4 };
// By touch: how near an enemy the sabre goes for by itself, how far off a musket dragged all
// the way points, and how long an arm let go is kept up waiting to go off.
const SABRE_SEEKS = 110, MUSKET_AIMS = 220, LOOSE = 1.2;
/** The kinds of the king's men that have a model in 3D (three/realista.ts, LOOKS). */
const IN_3D = new Set(['sargento', 'sableador', 'tirador', 'capitan']);
/** With the gamepad a grenade lands this share of its reach straight ahead: all of it, as the musket aims. */
const PAD_THROW = 1;
/** With the gamepad, how fast the stick moves where a grenade held ready is to land, world units a second. */
const PAD_AIM = 260;
// Soldiers are kept this far apart on the ground, easing apart at this many of it a second: a squad
// does not stand in one knot where a single swing takes them all. And the turn from one soldier's side
// of the hero to the next, so that sides never repeat.
const SPACE = 34, PARTING = 90, GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** How high over the ground the life bar of what is brought along stands, in 3D: over a cart's hide, over a man's head. */
const LIFE_OVER = { cart: 135, walker: 100 };
/** The ground what a place is made of by hand takes up, in 3D (three/errands.ts). */
const MADE = { pozo: { hw: 23, hh: 10 }, canon: { hw: 28, hh: 10 } };
/** A captain's men come in from out of sight, so far past the edge of what is seen; and from no further than this from the hero. */
const CALLED_PAST = 40, CALLED_MOST = 700;
/** How far along the ground a wave looks for somewhere out of sight to come in from, when straight on there is none. */
/** How far straight on a wave looks for somewhere out of sight: across the ford, the far bank is out of sight past 850. */
const WAVE_FROM = 1400;
const OFFSTAGE_ALONG = 2400, OFFSTAGE_BACK = 320, OFFSTAGE_MORE = 160;
const KEEP = 4;
// A soldier struck comes after the hero for this many seconds, and so does any of his own this near.
const PROVOKED = 12, ALARM = 260;
// How near whatever is being brought along the hero must be to tell it to wait, or to come on.
const ORDER = 60;
// How far past a cart's edge the hero can tell it what to do.
const PAST = 34;
type Carried = { at: Cargo; body: Vec; wide: number };
/** The ground a cart and its oxen take up, which nobody walks through; nothing for someone led on foot.
 *  It is reckoned from the cart's own drawing (its width as shown), never from the frame it is drawn in. */
const footOf = (c: Carried): Footprint | null =>
  c.at.drives ? { x: c.body.x, y: c.body.y - 9 * (c.at.scale ?? 1), hw: c.wide * 0.42, hh: 11 * (c.at.scale ?? 1) } : null;
/** Where the hero can tell it to wait or come on (or set it off): a ring on the ground round it, the very
 *  ring that is drawn. For a cart, round its footprint and a little past it, so wherever the cart stops
 *  the hero, they are inside; for someone led on foot, round where they stand. */
const zoneOf = (c: Carried) => {
  const f = footOf(c);
  return f ? { x: f.x, y: f.y, rx: f.hw + PAST, ry: f.hh + PAST * ISO_Y } : { x: c.body.x, y: c.body.y, rx: ORDER, ry: ORDER * ISO_Y };
};
/** How far inside the ring a spot is: under 1 inside, 1 on the line. */
const inZone = (c: Carried, p: Vec) => { const z = zoneOf(c); return Math.hypot((p.x - z.x) / z.rx, (p.y - z.y) / z.ry); };
const RING_FADE = 6;       // how quickly the ring and its words ease in and out, a second            // seconds between one keeping of the game and the next
const FIELD = { width: 1280, height: 800 }; // the bare field, in sprite pixels
// The map each hero walks; one who has none fights on the bare field.
const MAPS: Partial<Record<Hero, WorldMap>> = { inti: bosquePatagonico, cabral: vadoDeLasVizcachas };
// Where a map's enemies wait, in plots from where the hero arrives: out of the camp.
const HUNT: [number, number] = [11, 0];
const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
const CHEST = 45;          // height of her chest above her feet, where the light sits
const ARRIVE = 5;          // she stops this close to the pointer instead of jittering on it
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground she stands on
// The part of her an ember has to be seen to touch: her torso and head, a
// little narrower than drawn so a near miss is a miss.
const TORSO = { up: 40, w: 14, h: 52 };
const LIFE = 5;            // embers she can take
const GRACE = 0.7;         // seconds she cannot be hurt again after a hit
const RECOVER = 3.4;       // seconds from her death until she is back: the fall, and a while lying there
const FLASH = 0.25;        // seconds her red flash takes to fade
// The flash of a blade: how long it lasts, how far above the ground it is
// drawn, the colour around its white core and how many pieces its curve is made of.
const CUT = { time: 0.2, up: 24, glow: 0xffb45a, steps: 16 };
// A musket ball's blast: how long it lasts and how far above the ground its fire sits.
const BLAST = { time: 0.3, up: 14 };
// Embers shed each second: by something that is burning, and by a patch of burning ground.
const EMBERS = { shed: 26, patch: 34 };
// What his musket and his grenade cost, and how long each takes to be ready again.
const ARMS: Record<Arm, { cost: number; cooldown: number }> = { musket: MUSKET, grenade: GRENADE };

/** A grenade in the air: where from and to, how long it takes and how high it climbs. */
interface Grenade {
  from: Vec;
  to: Vec;
  t: number;
  time: number;
  arc: number;
  ball: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

/** A patch of burning ground, and how long it has burned. */
interface Fire extends Vec {
  t: number;
  shader?: Phaser.GameObjects.Shader;
}

// The echoes she leaves behind while dashing: how often one is dropped, how
// long it lingers, how solid it starts and the colour it is washed with: the pale blue of her
// spells for Inti, the orange of his fury for Cabral.
const ECHO = { every: 0.03, fade: 260, alpha: 0.55, tint: { inti: 0x8fdcf0, cabral: 0xffa64d } };
// Stand-in enemies, as offsets from where she starts.
const CUBES: [number, number][] = [[-150, -40], [160, 70]];
// A sturdy one among them: where it stands and how much it takes.
const STURDY = { at: [60, -120] as [number, number], life: 40 };
// Where the chonchones start, likewise.
const CHONCHONES: [number, number][] = [[110, -70], [-90, 80]];
// And the royalist soldiers, who are all Cabral meets.
const REALISTAS: [number, number][] = [[190, 50], [-170, -60], [40, 150]];
// How far from the hero a soldier at a post is still seen to and drawn: well past the edge of the screen.
const AWAKE = { x: 760, y: 460 };

// An orb left by something Inti killed.
const ORB = { height: 12, reach: 22, warning: 1.2 };
interface Orb extends Vec { t: number; glow: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse }

// Those who can be talked to: how near one has to be, where the innkeeper stands from the
// start on a map that names nobody, and the drawing that stands in for whoever has none
// yet. Published, what is said to them is chosen; while developing it is written, and a model answers.
// Those who only say their one thing are heard from a little further off.
const TALK = { near: 52, heard: 84, across: 110, trial: [-140, -80] as [number, number], standIn: 'pulpero/sprite.png' };
/** Someone standing on the map: one to talk to (`npc`), or one who only says what the sign over them shows. */
interface Talker { name: string; npc?: Npc; x: number; y: number; /** For one who only says a thing: what they say as things stand now. */ says?: () => string; hint: Phaser.GameObjects.Text; /** Something lying there to be picked up: what, and its drawing. */ take?: { what: string; drawn: Phaser.GameObjects.Image }; /** Somewhere something can be done, and the mark on the ground that says so. */ spot?: { at: Spot; mark: Phaser.GameObjects.Image }; /** Something waiting there to be led off. */ charge?: Led; /** Whoever stands there, to be hidden with them. */ figure?: Phaser.GameObjects.GameObject[]; /** How near one has to come, if not as near as usual. */ reach?: number; /** Whether it is there to be dealt with at all just now; always, if unsaid. */ there?: () => boolean }
/** Something being brought somewhere: what, where it is, its drawing and the bar of what it can still take, and whether it is on its way. */
interface Led { /** How wide its drawing is as shown, which its footprint and its ring are reckoned from. */ wide: number; /** Seen from the side just now, and for how long the other view has been wanted. */ sideways?: boolean; turning?: number; at: Cargo; body: Escort; drawn: Phaser.GameObjects.Sprite; bar: Phaser.GameObjects.Rectangle; going: boolean; /** Told to wait where it is, while the hero clears the way. */ halted?: boolean; /** What F does to it, over it while the hero is near enough to say. */ order?: Phaser.GameObjects.Text; /** How far its ring is shown, and lit, each easing in and out. */ ring?: { seen: number; lit: number }; /** For one that drives on by itself: the road to where it is going. */ road?: Road }
// How near a named place counts as having come to it, in plots; and how many blows of life a bandage gives back.
const ARRIVED = 1, MENDS = 2;
// The sign over them comes up and goes out over this long, in seconds.
const HINT_FADE = { in: 0.35, out: 0.6 };

/** Anything that can be fought. */
/** Any of the king's men: the fusilier, or one of the other kinds. */
type Soldier = Realista | Trooper;
type Foe = Enemy | Chonchon | Soldier;

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  /** Who is being played. The controller is theirs; much else is still Inti's alone. */
  private hero: Hero = 'inti';
  private machi!: MachiController;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private bolts!: Bolts;
  private embers!: Bolts;
  /** Musket balls in flight. */
  private balls!: Bolts;
  /** Seconds until the musket can be fired again, and whether its key was down last step. */
  private armWait: Record<Arm, number> = { musket: 0, grenade: 0 };
  /** Which of them he has readied, and which the shot now going off is. */
  private readying: Arm | null = null;
  private loosed: Arm = 'musket';
  /** Grenades in the air, and the patches of ground left burning. */
  private grenades: Grenade[] = [];
  private fires: Fire[] = [];
  /** Enemies on fire: how much longer each burns, and when it next hurts. */
  private alight = new Burning<Foe>();
  /** Embers drifting up from whatever is burning. */
  private embersUp!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** The attack went down this step; it was down last step; it has fired the musket and must be let go before it cuts. */
  private trigger = false;
  /** By touch: the way the hero last walked, where they last pointed, and the arm let go that is going off. */
  private heading: Vec = { x: 0, y: 1 };
  private pointed: Vec = { x: 0, y: 0 };
  private loosing: Arm | null = null;
  /** With the gamepad, where a grenade held ready is to land, from the hero (on the 2D ground); moved by the stick. */
  private padAim: Vec | null = null;
  /** With the gamepad, where her lightning would fall, from her along the ground, while it is held. */
  private strikeAim: Vec | null = null;
  /** With the gamepad, whether the trigger was pressed this step to loose her lightning, and whether it was down the step before. */
  private strikeConfirm = false;
  private triggerWas = false;
  /** With the gamepad, whom Inti is locked onto (R3), if anyone, and the ring under them. */
  private locked: Foe | null = null;
  private lockRing?: Phaser.GameObjects.Ellipse;
  /** Where the hero last stood on their feet, which is where a game left is taken up; and seconds until it is next kept. */
  private stood?: Vec;
  private keeping = 0;
  private loosingFor = 0;
  private armWas: Record<Arm, boolean> = { musket: false, grenade: false };
  private attackWas = false;
  private spentAttack = false;
  /** The spot on screen the shot under way is aimed through. */
  private shotAt: Vec = { x: 0, y: 0 };
  /** Blasts that have just gone off, for the burst drawn at each. */
  private blasts: { x: number; y: number; r: number; t: number }[] = [];
  private vitals = new Vitals(LIFE, GRACE, RECOVER);
  /** How near their greatest power is. */
  private charge = new Charge();
  /** Cabral's, once he lets it go. */
  private wrath = new Rage();
  /** Inti's: the spirit jaguar she calls up. */
  private nahuel!: Nahuel;
  /** Seconds until it answers her drum, or null when she is not calling. */
  private calling: number | null = null;
  /** Those who can be talked to, each with the sign shown over them when one is near enough. */
  private talkers: Talker[] = [];
  /** Whichever of them the hero is near enough to talk to or to hear, if any. */
  private beside?: Talker;
  /** What has happened in this game, on a map that has a story; and what shows it. */
  private story?: Story;
  private board?: ReturnType<typeof mountBoard>;
  /** Everything on the map that is to be brought somewhere. */
  private led: Led[] = [];
  /** A stand being made: where, the waves still to come, and those who have. */
  private battle?: { at: Spot; waves: Waves; sent: Soldier[]; leader?: Soldier; enlisted: number };
  /** The plot the hero was last seen in, so the story is told only when it changes. */
  private plotWas = '';
  /** The orbs Inti's kills leave on the ground for a while. */
  private orbs: Orb[] = [];
  /** Which enemies stood at the last step, to tell when one falls. */
  private standing = new Set<Foe>();
  private hurtbox!: Phaser.GameObjects.Zone;
  private flash = 0;
  private hitFx?: HitFX;
  /** The map being walked, if the hero has one, and the trees on it. */
  private map?: WorldMap;
  private forest?: Forest;
  /** Or, in open country, its plants. */
  private country?: Country;
  /** And the long grass all over it. */
  private meadow?: Meadow;
  /** Shadows cast from each one's own shape, and grass over their feet. */
  private silhouettes?: Silhouettes;
  /** Their breath, for running and dodging. */
  private stamina = new Stamina();
  private water?: Water;
  /** What of the map's scenery is near enough the camera to be drawn. */
  private sight = new Sight();
  /** The ground taken up by what is built on the map. */
  private built: Footprint[] = [];
  /** The way round what is in the way to wherever the hero stands, for the enemy; on a map. */
  private route?: Route;
  /** Where soldiers can walk: on the map's ground, and not where a house stands. */
  private walkable = (x: number, y: number): boolean => !!this.map && zoneAt(this.map, x, y) !== undefined && !this.indoors?.blocked({ x, y }) && !this.three?.housed({ x, y });
  /** The rings round whatever is being brought along, drawn afresh each step. */
  private orders?: Phaser.GameObjects.Graphics;
  /** Those who go for whatever is being brought along rather than the hero. */
  private raiders = new WeakSet<Soldier>();
  /** How many soldiers have been stood on the map, to give each a side of his own. */
  private enlisted = 0;
  /** Those each captain has called up, to keep their count. */
  private readonly called = new Map<Trooper, Soldier[]>();
  /** The buildings that are drawn, and going into them. */
  private indoors?: Indoors;
  /** How far the world reaches, in sprite pixels. */
  private size = FIELD;
  private start = { x: FIELD.width / 2, y: FIELD.height / 2 };
  private echoIn = 0;
  private enemies: Enemy[] = [];
  private chonchones: Chonchon[] = [];
  private realistas: Soldier[] = [];
  /** The post each soldier who holds one stands at. */
  private posts = new Map<Soldier, Post>();
  /**
   * The fallen to be up again (or, of a wave, taken off the field) once out of sight: the field is
   * set as it was each time the hero comes somewhere safe. Till then they lie where they fell.
   */
  private readonly due = new Set<Soldier>();
  private safeWas = false;
  /** What the royalists fire. */
  private shots!: Bolts;
  private abilities = new Abilities();
  /** Cabral's fury. It never ebbs: what he earns is kept until he spends it or falls. */
  private fury = new Fury();
  /** What the hero drinks from when things go badly. */
  private flask = new Flask();
  /** The light of life or mana coming back. */
  private mending?: Mending;
  private lightning!: Lightning;
  /** Where a strike would fall and where ones already cast are about to. */
  private marks!: Phaser.GameObjects.Graphics;
  private motes!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Blows that have just landed, for the flash drawn where each swept. */
  private cuts: (Strike & { t: number })[] = [];
  private slashes!: Phaser.GameObjects.Graphics;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private marker!: Phaser.GameObjects.Ellipse;
  private look?: LookFX;
  private label = '';
  /**
   * The map drawn wholly in 3D, under this scene's canvas, where it has been made in 3D (the vado):
   * its country and buildings, those standing about, Cabral, the royalists. This scene still runs
   * the game but draws none of the world; its camera is turned off, and only the HUD is drawn over.
   * Nobody is talked to and every soldier is a fusilier.
   */
  private three?: World3D;

  constructor() {
    super('game');
  }

  /** Who is played is chosen before the game starts. */
  init(data: { hero?: Hero }): void {
    this.hero = data.hero ?? 'cabral';
  }

  preload(): void {
    // Several animations share a sheet, so textures are keyed by file.
    const sheets = Object.values(KITS).flatMap(kit => Object.values(kit.sheets));
    for (const { src, w, h } of new Map(sheets.map(s => [s.src, s])).values()) {
      this.load.spritesheet(src, src, { frameWidth: w ?? FRAME, frameHeight: h ?? FRAME });
    }
    Chonchon.preload(this);
    Realista.preload(this);
    Trooper.preload(this);
    Nahuel.preload(this);
    loadScenery(this);
    loadCountry(this);
    loadFences(this);
    const everyone = [...Object.values(PEOPLE), ...Object.values(BYSTANDERS)];
    for (const src of new Set([TALK.standIn, ...everyone.flatMap(p => p.sprite ?? [])])) this.load.image(src, src);
    for (const { idle } of everyone) if (idle) this.load.spritesheet(idle.sheet, idle.sheet, { frameWidth: idle.size, frameHeight: idle.size });
    for (const { sprite } of Object.values(THINGS)) this.load.image(sprite, sprite);
    for (const sprite of new Set(Object.values(MAPS).flatMap(map => map?.charges ?? []).map(c => c.sprite))) this.load.image(sprite, sprite);
    // The buildings that are drawn, and the rooms inside them.
    for (const b of Object.values(MAPS).flatMap(map => map?.buildings ?? [])) {
      if (b.sprite) this.load.image(b.sprite, b.sprite);
      if (b.inside) this.load.image(b.inside.sprite, b.inside.sprite);
    }
    for (const { walk, idle, side } of Object.values(MAPS).flatMap(map => map?.charges ?? [])) {
      for (const sheet of [walk, idle, side?.walk, side?.idle]) if (sheet) this.load.spritesheet(sheet.sheet, sheet.sheet, { frameWidth: sheet.size, frameHeight: sheet.size });
      if (side) this.load.image(side.sprite, side.sprite);
    }
    for (const sprite of new Set(Object.values(MAPS).flatMap(map => map?.spots ?? []).flatMap(spot => spot.sprite ?? []))) this.load.image(sprite, sprite);
  }

  create(): void {
    // Whoever has a tune of their own plays to it; anyone else, to silence.
    playMusic(this.hero === 'cabral' ? 'cabral' : null);
    this.map = MAPS[this.hero];
    this.size = this.map ? extent(this.map) : FIELD;
    this.start = this.map ? middle(this.map.start) : { x: FIELD.width / 2, y: FIELD.height / 2 };
    // Open country has no forest: what cannot be crossed is shaded, and what is built stands as blocks.
    this.sight = new Sight();
    this.three = this.map ? World3D.of(this.map, document.getElementById('world')!, this.hero) : undefined;
    // In 3D all this is still laid out, for the ground it takes up, though none of it is drawn.
    this.forest = this.map && !this.map.bare ? new Forest(this, this.map, this.three ? undefined : this.sight, !this.three) : undefined;
    if (this.map && !this.three) layGround(this, this.map);
    else if (!this.three) this.drawGround();
    this.built = this.map ? raiseBuildings(this, this.map) : [];
    // In 3D what a place is made of by hand (a well, a cannon: three/errands.ts) is in the way as well.
    if (this.three) for (const { plot, thing } of this.map?.objectives ?? []) if (thing) this.built.push({ ...middle(plot), ...MADE[thing] });
    // How one goes into a building is still being tried: ?entrar=directo, or by default through a fade.
    const entering = new URLSearchParams(location.search).get('entrar') === 'directo' ? 'directo' : 'fundido';
    this.indoors = this.map ? new Indoors(this, this.map, entering as Entering) : undefined;
    // In 3D the houses with rooms of their own are gone into without a cut (three/house.ts).
    if (this.indoors && this.three) this.indoors.open = new Set(Object.entries(MODELS).filter(([, m]) => m.inside).map(([name]) => name));
    if (this.indoors && this.map) this.indoors.bounds = extent(this.map);
    // A side that will not see him shuts its door.
    if (this.indoors) {
      this.indoors.locked = b => !b.side || !shut(b.side, this.stands, h => !!this.story?.has(h)) ? undefined
        : b.side === 'pueblo' ? 'La puerta está trancada. Don Braulio no quiere verte.' : 'La capilla está cerrada. Los frailes se fueron.';
      this.indoors.refused = says => this.board?.say(says);
    }
    this.route = this.map ? new Route(this.walkable) : undefined;
    // The plants first: the fences are drawn from their picture.
    this.country = this.map?.bare ? new Country(this, this.map, this.sight) : undefined;
    if (this.map?.bare) raiseFences(this, this.map, this.sight);
    // The grass and the water are only seen: the 3D world has its own.
    this.meadow = this.map?.bare && !this.three ? new Meadow(this, this.map.ground) : undefined;
    this.water = this.map?.bare && !this.three ? new Water(this, this.map) : undefined;
    // In 3D, the plants as they stand there: an ombú stands round its middle.
    this.built.push(...(this.three?.plants ?? this.country?.feet ?? []));

    this.machi = this.enter(this.hero, this.start);
    this.keys = new Keys();

    this.shadow = this.add.ellipse(0, 0, 22, 8, 0x000000, 0.28);
    this.sprite = this.add.sprite(0, 0, KITS[this.hero].sheets.idle_front.src, 0);
    this.bolts = new Bolts(this, this.size.width, this.size.height);

    this.hitFx = HitFX.on(this.sprite);
    Enemy.setup(this);
    // Each of them has enemies of their own: Cabral the king's soldiers,
    // Inti the stone blocks and the chonchones.
    const his = this.hero === 'cabral';
    // On a map they wait out in the forest: nothing hunts in the camp.
    const field = this.map ? middle([this.map.start[0] + HUNT[0], this.map.start[1] + HUNT[1]]) : this.start;
    const at = <T>(spots: [number, number][], make: (x: number, y: number) => T): T[] =>
      spots.map(([dx, dy]) => make(field.x + dx, field.y + dy));
    this.enemies = his ? [] : at(CUBES, (x, y) => new Enemy(this, x, y));
    // One that takes a great deal of killing, to try things out on.
    if (!his) this.enemies.push(new Enemy(this, field.x + STURDY.at[0], field.y + STURDY.at[1], STURDY.life));
    // The physics engine reports a bolt's spot on the ground entering an
    // enemy's; the bolt ends there and the enemy takes the hit.
    const bounds = { minX: 0, maxX: this.size.width, minY: 0, maxY: this.size.height };
    this.chonchones = his ? [] : at(CHONCHONES, (x, y) => new Chonchon(this, x, y, bounds));
    // A map that says who holds it is held by them, each at his post; otherwise a few to try things on.
    const map = this.map, held = his && map ? garrison(map) : [];
    this.posts.clear();
    this.realistas = !his ? [] : held.length && map
      ? held.map(post => {
        const soldier = this.enlist(post.kind, post.x, post.y, bounds).hold(this.walkable);
        this.posts.set(soldier, post);
        return soldier;
      })
      : at(REALISTAS, (x, y) => new Realista(this, x, y, bounds));
    for (const foe of this.foes) this.physics.add.overlap(this.bolts.bodies, foe.zone, this.struck);
    this.balls = new Bolts(this, this.size.width, this.size.height, BALL);
    this.balls.seen = !this.three;
    // Inti's are drawn in 3D (three/orbs.ts).
    this.bolts.seen = !this.overlaid;
    if (this.three) {
      // The 3D ball stops at whoever it is seen to reach along the ground, as the 2D ball bursts on them.
      this.three.strikes = (from, to) => {
        const t = (p: Vec) => ({ x: p.x, y: p.y / ISO_Y });
        const a = t(from), b = t(to), ab = { x: b.x - a.x, y: b.y - a.y }, len = ab.x * ab.x + ab.y * ab.y || 1;
        let first: { k: number; at: Vec } | null = null;
        for (const foe of this.foes) {
          if (!foe.alive) continue;
          const d = t(foe.ground), k = Math.max(0, Math.min(1, ((d.x - a.x) * ab.x + (d.y - a.y) * ab.y) / len));
          const near = { x: a.x + ab.x * k, y: a.y + ab.y * k };
          if (Math.hypot(d.x - near.x, d.y - near.y) <= foe.girth + MUSKET.girth && (!first || k < first.k)) first = { k, at: { x: near.x, y: near.y * ISO_Y } };
        }
        return first?.at ?? null;
      };
      this.three.shown = true;
      // The pointer is a Sol de Mayo, aimed at its middle.
      this.input.setDefaultCursor(sunCursor());
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (this.three) this.three.shown = false;
        this.input.setDefaultCursor('');
      });
    }
    // What the enemies throw, and the part of her it can hit.
    this.embers = new Bolts(this, this.size.width, this.size.height, EMBER);
    this.hurtbox = this.add.zone(this.machi.x, this.machi.y - TORSO.up, TORSO.w, TORSO.h);
    this.physics.add.existing(this.hurtbox);
    this.hurtbox.setData('machi', true);
    this.physics.add.overlap(this.embers.bodies, this.hurtbox, (a, b) => {
      const spot = ([a, b] as Phaser.GameObjects.GameObject[]).find(o => o.getData('bolt'));
      // An ember that does not hurt her flies on.
      if (spot && this.hurt()) this.embers.strike(spot);
    });

    this.shots = new Bolts(this, this.size.width, this.size.height, SHOT);
    // What the royalists fire is tested along its path each step (see update): it flies too fast for the physics engine.

    this.lightning = new Lightning(this);
    this.lightning.hidden = this.overlaid;
    this.marks = this.add.graphics().setDepth(-1000);
    this.slashes = this.add.graphics().setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    // The grenade: a ball of black iron with its fuse alight.
    const bomb = this.textures.createCanvas('grenade', 5, 6)!;
    const iron = bomb.getContext();
    iron.fillStyle = '#18191b';
    iron.fillRect(1, 1, 3, 5);
    iron.fillRect(0, 2, 5, 3);
    iron.fillStyle = '#4a4d52';
    iron.fillRect(1, 2, 1, 1);
    iron.fillStyle = '#ffb030';
    iron.fillRect(2, 0, 1, 1);
    bomb.refresh();
    // Embers: specks of orange that drift up and wink out.
    // The orb a kill leaves for Inti: a small light, pale at the heart.
    if (!this.textures.exists('soul-orb')) {
      const orb = this.textures.createCanvas('soul-orb', 9, 9)!;
      const o = orb.getContext();
      for (const [colour, r] of [['#1f8fb8', 4.5], ['#46e6fa', 3.2], ['#e8ffff', 1.6]] as [string, number][]) {
        o.fillStyle = colour;
        for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
          if (Math.hypot(x - 4, y - 4) <= r) o.fillRect(x, y, 1, 1);
        }
      }
      orb.refresh();
    }
    const speck = this.textures.createCanvas('burning-speck', 2, 2)!;
    speck.getContext().fillStyle = '#ffffff';
    speck.getContext().fillRect(0, 0, 2, 2);
    speck.refresh();
    this.embersUp = this.add.particles(0, 0, 'burning-speck', {
      lifespan: { min: 500, max: 1100 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -42, max: -16 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [0xff7a0a, 0xffa01e, 0xffd060],
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    const spark = this.textures.createCanvas('cut-spark', 2, 2)!;
    spark.getContext().fillStyle = '#ffe2b0';
    spark.getContext().fillRect(0, 0, 2, 2);
    spark.refresh();
    this.sparks = this.add.particles(0, 0, 'cut-spark', {
      lifespan: { min: 160, max: 380 },
      speedX: { min: -60, max: 60 },
      speedY: { min: -80, max: 20 },
      gravityY: 240,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    // Green motes for her healing: rising while she works, bursting when done.
    const mote = this.textures.createCanvas('lawen-mote', 2, 2)!;
    mote.getContext().fillStyle = '#8df07a';
    mote.getContext().fillRect(0, 0, 2, 2);
    mote.refresh();
    this.motes = this.add.particles(0, 0, 'lawen-mote', {
      lifespan: { min: 500, max: 900 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -45, max: -15 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);

    // While developing, Tab swaps who is played, where they stand.
    if (import.meta.env.DEV) this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      if (!this.vitals.standing || this.machi.isDashing) return;
      this.hero = this.hero === 'inti' ? 'cabral' : 'inti';
      this.abilities.reset();
      this.machi = this.enter(this.hero, this.machi);
    });

    this.nahuel = new Nahuel(this, this.sparks, ZOOM);

    this.talkers = [];
    {
      // In 3D only whoever outdoors has a model of their own is talked to (Mateo), and only they and
      // nothing else are brought along: the rest standing about (three/people.ts) only say their one thing. What lies about to be picked up
      // is what the 3D map draws lying there; the places where something is done are all there.
      const told = this.three ? undefined : this.map;
      // Whoever the map names, each in their plot; on one that names nobody, while developing, the innkeeper, to try things on.
      // Whoever is indoors stands in the room; the rest, on their plot.
      // In 3D, only those who stand there as models of their own: whoever keeps a house, where they stand in it.
      const named = (this.three ? [
        ...this.three.keepers.map(k => ({ npc: PEOPLE[k.who], x: k.x, y: k.y, left: false })),
        ...(this.map?.people ?? []).filter(p => !p.inside && this.three!.leads(p.who)).map(p => ({ npc: PEOPLE[p.who], ...middle(p.plot), left: p.faces === 'left' })),
      ].filter(p => p.npc)
        : this.map?.people?.map(({ who, plot, faces, inside }) => ({ npc: PEOPLE[who], ...(inside && this.indoors?.spot(inside.building, inside.at) || middle(plot)), left: faces === 'left' })).filter(p => p.npc))
        ?? (import.meta.env.DEV ? [{ npc: BRAULIO, x: this.start.x + TALK.trial[0], y: this.start.y + TALK.trial[1], left: false }] : []);
      for (const { npc, x, y, left } of named) {
        const shade = this.add.ellipse(x, y, 22, 8, 0x000000, 0.28).setDepth(y - 0.5);
        const figure = this.stand(x, y, npc.sprite ?? TALK.standIn, npc.idle, left);
        // Whoever has no drawing yet is a shape in their own colour, with their name over them.
        if (!npc.sprite) {
          figure.setTintFill(Phaser.Display.Color.HexStringToColor(npc.accent).color).setAlpha(0.85);
          this.add.text(x, y - 80, npc.name, {
            fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: npc.accent,
            stroke: '#14110f', strokeThickness: 3,
          }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio);
        }
        const hint = this.add.text(x, y - 92, npc.sells?.length && !touch.on ? 'F · hablar   T · comprar' : prompt('F', 'hablar'), {
          fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4',
          stroke: '#14110f', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio).setVisible(false).setAlpha(0);
        // Whoever is to be led off somewhere stops standing about once that is settled: they wait to go.
        const taken = this.map?.charges?.find(c => c.who === npc.id);
        // In 3D they stand at their true size, behind a counter: they are talked to from a little further.
        this.talkers.push({ name: npc.name, npc, x, y, hint, figure: [figure, shade], reach: this.three ? TALK.across : undefined, there: taken?.given ? () => !this.story?.has(taken.given!) : undefined });
      }
      // Those who are not talked to: what each has to say shows over them when one comes near; in 3D
      // too, said over their model (or their figure of blocks), as the 2D game says it over their drawing.
      for (const { who, plot, faces } of this.map?.people ?? []) {
        const one = BYSTANDERS[who];
        if (!one) continue;
        // In 3D one who lies abed in a house is heard there.
        const { x, y } = this.three?.abed.find(a => a.who === who) ?? middle(plot);
        const drawn = !!one.sprite && this.textures.exists(one.sprite);
        const figure = this.stand(x, y, drawn ? one.sprite! : TALK.standIn, one.idle, faces === 'left');
        // Their size is that of their one drawing, whatever frame they are shown in.
        const still = this.textures.get(drawn ? one.sprite! : TALK.standIn).getSourceImage();
        if (!drawn) figure.setTintFill(0x9a8f7a).setAlpha(0.85);
        this.add.ellipse(x, y, Math.max(22, still.width * 0.7), 8, 0x000000, 0.28).setDepth(y - 0.5);
        const hint = this.add.text(x, y - still.height - 6, `«${one.says}»`, {
          fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4', align: 'center',
          stroke: '#14110f', strokeThickness: 3, wordWrap: { width: 150 },
        }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio).setVisible(false).setAlpha(0);
        this.talkers.push({ name: one.name, x, y, hint, says: () => this.saying(one) });
      }
      // What lies about to be picked up: it is taken by coming to it and saying so; in 3D, whatever
      // the 3D map draws lying there.
      for (const { what, plot, given } of (this.three ? this.map?.things?.filter(t => this.three!.lies(t.what)) : told?.things) ?? []) {
        const thing = THINGS[what];
        if (!thing || !this.textures.exists(thing.sprite)) continue;
        const { x, y } = middle(plot);
        const drawn = this.add.image(x, y, thing.sprite).setOrigin(0.5, 1).setDepth(y).setVisible(!given);
        const hint = this.add.text(x, y - drawn.height - 6, prompt('F', 'levantar'), {
          fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4',
          stroke: '#14110f', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio).setVisible(false).setAlpha(0);
        // What waits on something having happened is not there until it has.
        this.talkers.push({ name: thing.name, x, y, hint, take: { what, drawn }, there: given ? () => !!this.story?.has(given) : undefined });
      }
      // What is to be brought somewhere waits where the map says, once there is reason to take it. In
      // 3D, whoever walks there as a model of their own (Mateo), and the ox carts (three/cart.ts).
      this.led = [];
      for (const at of (this.three ? this.map?.charges?.filter(c => c.drives || (c.who && this.three!.leads(c.who))) : told?.charges) ?? []) {
        if (!this.textures.exists(at.sprite)) continue;
        const { x, y } = middle(at.from);
        const drawn = this.add.sprite(x, y, at.sprite).setOrigin(0.5, 1).setDepth(y).setVisible(false).setScale(at.scale ?? 1);
        for (const sheet of [at.walk, at.idle, at.side?.walk, at.side?.idle]) {
          if (sheet && this.textures.exists(sheet.sheet) && !this.anims.exists(sheet.sheet)) {
            this.anims.create({ key: sheet.sheet, frames: this.anims.generateFrameNumbers(sheet.sheet, { start: 0, end: sheet.frames - 1 }), frameRate: sheet.rate, repeat: -1 });
          }
        }
        const bar = this.add.rectangle(x, y - drawn.displayHeight - 4, 24, 3, 0xd23c2a).setDepth(1e6).setVisible(false);
        const hint = this.add.text(x, y - drawn.displayHeight - 10, prompt('F', at.does), {
          fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4', align: 'center',
          stroke: '#14110f', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio).setVisible(false).setAlpha(0);
        const still = this.textures.get(at.sprite).getSourceImage() as HTMLImageElement;
        const charge: Led = { at, body: new Escort({ x, y }, at.life, at.pace), drawn, bar, going: false, wide: still.width * (at.scale ?? 1) };
        this.led.push(charge);
        // It waits to be led off whenever it is not on its way and has not arrived.
        this.talkers.push({ name: at.name, x, y, hint, charge, there: () => !charge.going && !this.story?.has(at.happening) && (!at.given || !!this.story?.has(at.given)) });
      }
      // Places where something can be done, once: a ring of stones on the ground marks each
      // while it can be, and what was done stands there after.
      if (this.map?.spots?.length && !this.textures.exists('spot')) {
        const g = this.make.graphics({}, false);
        g.lineStyle(2, 0x3a3027, 0.9).strokeEllipse(13, 7, 22, 10);
        for (let n = 0; n < 7; n++) g.fillStyle(n % 2 ? 0x8a8478 : 0x6b665c).fillRect(Math.round(13 + Math.cos(n * 0.9) * 11) - 1, Math.round(7 + Math.sin(n * 0.9) * 5) - 1, 3, 2);
        g.generateTexture('spot', 26, 14);
        g.destroy();
      }
      for (const at of this.map?.spots ?? []) {
        const { x, y } = middle(at.plot);
        const mark = this.add.image(x, y, 'spot').setOrigin(0.5, 0.5).setDepth(-1e6 + 1.8).setVisible(false);
        const hint = this.add.text(x, y - 30, prompt('F', at.does), {
          fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4', align: 'center',
          stroke: '#14110f', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio).setVisible(false).setAlpha(0);
        // A stand can be made again until it has been held; anything else is done once.
        const done = at.stand?.won ?? at.happening;
        this.talkers.push({ name: at.name, x, y, hint, spot: { at, mark }, there: () => !this.story?.has(done) && this.battle?.at !== at && (!at.given || !!this.story?.has(at.given)) && !(at.until && this.story?.has(at.until)) });
      }
      // A trail along the ground, under everything that stands.
      if (this.map?.trails?.length && !this.textures.exists('mark')) {
        const g = this.make.graphics({}, false);
        g.fillStyle(0x4a1410).fillEllipse(5, 3, 10, 5).fillStyle(0x6b1c16).fillEllipse(4, 2, 5, 3);
        g.generateTexture('mark', 10, 6);
        g.destroy();
      }
      for (const { from, to } of told?.trails ?? []) {
        this.sight.add(trail(this.map!, from, to).map(mark =>
          this.add.image(mark.x, mark.y, 'mark').setScale(0.5 + mark.size * 0.7).setAlpha(0.75).setDepth(-1e6 + 1.7)));
      }
      // C drinks from the flask: nothing is wasted on one who has no need of it.
      this.flask = new Flask();
      this.mending = new Mending(this);
      const drink = () => {
        const { restores, amount } = FLASKS[this.hero];
        const wanting = restores === 'life' ? this.vitals.life < this.vitals.max : this.abilities.mana < MANA;
        // Not mid-dash, nor in the middle of something else: there is no hand free.
        if (!this.vitals.standing || !wanting || this.machi.isDashing || this.machi.isChanneling || !this.flask.drink()) return;
        if (restores === 'life') this.vitals.heal(amount);
        else this.abilities.mana = Math.min(MANA, this.abilities.mana + amount);
        // They stand and drink, facing the viewer, and the light of it comes up round them.
        // In 3D his drink is a capture, given the time it needs (three/cabral.ts).
        if (this.machi.kit.sheets.drink) this.machi.channel(this.shownIn3d ? SIP : DRINKING, 'drink');
        this.mend(MEND[restores]);
      };
      const interact = () => {
        if (!this.vitals.standing) return;
        // Beside whatever is being brought along: it is told to wait, or to come on again.
        const led = this.led.find(c => c.going && inZone(c, this.machi) <= 1);
        if (led) {
          led.halted = !led.halted;
          this.board?.say(`${led.at.name}: ${led.halted ? 'espera acá.' : led.at.drives ? 'sigue camino.' : 'te sigue.'}`);
          return;
        }
        const near = this.beside;
        if (!near) return;
        if (near.take) {
          // Picked up: it is gone from the ground, and the story knows he has it.
          near.take.drawn.destroy();
          this.three?.taken(near.take.what);
          near.hint.destroy();
          this.talkers = this.talkers.filter(t => t !== near);
          this.beside = undefined;
          this.board?.say(THINGS[near.take.what].note);
          this.story?.tell(`tiene:${near.take.what}`);
          return;
        }
        if (near.charge) {
          // Led off: from here on it comes along behind.
          near.charge.going = true;
          this.beside = undefined;
          this.board?.say(`${near.charge.at.name}: no te alejes, y que no se le arrimen.`);
          this.story?.tell(`lleva:${near.charge.at.id}`);
          return;
        }
        if (near.spot) {
          const { at, mark } = near.spot;
          // Not while anyone who holds the place is still on their feet.
          if (at.guarded && this.held(at)) return;
          // A stand is begun, not done: the place stays, for whoever has to make it again.
          if (at.stand) {
            // What was done beforehand counts: fewer come. Whoever commands them comes last, alone.
            const eased = at.stand.eased && this.story?.has(at.stand.eased.given) ? at.stand.eased.waves : at.stand.waves;
            this.battle = { at, waves: new Waves(eased), sent: [], enlisted: 0 };
            if (at.fire) this.three?.light(at.id);
            if (at.note) this.board?.say(at.note);
            this.story?.tell(at.happening);
            return;
          }
          mark.destroy();
          near.hint.destroy();
          this.talkers = this.talkers.filter(t => t !== near);
          this.beside = undefined;
          // What was done stands there from now on, and is in the way like anything else.
          if (at.sprite) this.three?.build(at.id);
          if (at.sprite && this.textures.exists(at.sprite)) {
            const done = this.add.image(near.x, near.y, at.sprite).setOrigin(0.5, 1).setDepth(near.y);
            this.sight.add([done]);
            this.sight.look(this.cameras.main.worldView);
            this.built.push({ x: near.x, y: near.y - 4, hw: done.width * 0.3, hh: 4 });
          }
          if (at.note) this.board?.say(at.note);
          this.story?.tell(at.happening);
          // One of several is done: the count on the board moves, though no step has.
          this.board?.refresh();
          return;
        }
        const npc = near.npc;
        if (!npc) return;
        openDialog(this.game, this.hero, npc, {
          leaning: npc.side ? leaning(this.stands[npc.side]) : undefined,
          heal: () => this.vitals.heal(this.vitals.max),
          told: key => this.story?.tell(`sabe:${key}`),
          agreed: (key, happening) => this.story?.tell(happening ?? `acepto:${key}`),
          has: happening => !!this.story?.has(happening),
          talked: () => this.story?.tell(`hablo:${npc.id}`),
          closed: () => this.story?.tell(`cerro:${npc.id}`),
        });
      };
      this.input.keyboard?.on('keydown-C', drink);
      this.input.keyboard?.on('keydown-F', interact);
      // By touch there are no keys: the buttons ask for the same things by name.
      const act = (what: string) => { if (this.scene.isActive()) ({ drink, interact } as Record<string, () => void>)[what]?.(); };
      this.game.events.on('act', act);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('act', act));
      // A map with a story: it begins.
      this.board?.remove();
      // A map without a story has none to tell, but the same place on screen to be told things in.
      this.story = his && this.map === vadoDeLasVizcachas ? new Story(VADO, RULES) : new Story([]);
      // A game left earlier is taken up where it was, before anyone is listening to the story,
      // so nothing is paid or told a second time.
      const saved = load(this.hero);
      if (saved) this.resume(saved);
      this.board = mountBoard(this.story, FACTS);
      // A mission done is worth experience.
      // What is said of him, and what those who say one thing say, move with the story.
      let stood = this.stands;
      for (const t of this.talkers) if (t.says) t.hint.setText(`«${t.says()}»`);
      this.story.listen(() => {
        const now = this.stands;
        for (const line of moved(stood, now)) this.board?.say(line);
        stood = now;
        for (const t of this.talkers) if (t.says) t.hint.setText(`«${t.says()}»`);
      });
      this.story.listen(news => {
        for (const n of news) {
          // Wherever he stands is told again: a mission just opened may be waiting on his being there.
          this.plotWas = '';
          if (n.kind !== 'done') continue;
          if (n.quest.gold) { this.pack.gold += n.quest.gold; this.board?.say(`+${n.quest.gold} reales`); }
          if (n.quest.xp) this.earn(n.quest.xp);
          // A mission that ends the story: it is told, with the game stopped behind it.
          const final = n.quest.leaves?.find(l => l.startsWith('final:'));
          if (final) {
            this.time.delayedCall(1800, () => {
              this.scene.pause();
              showEnding(final, () => this.scene.resume());
            });
          }
        }
      });
      this.grown();
      this.vitals.life = this.vitals.max;
      this.plotWas = '';
      this.story?.tell('empieza');
      if (saved) {
        // Inside somewhere they are put back in the room; anywhere off the map's ground, back where the story starts.
        const indoors = !!saved.inside && !!this.indoors?.resume(saved.inside);
        const lost = !indoors && (!this.map || !zoneAt(this.map, saved.at.x, saved.at.y));
        const at = lost ? this.start : saved.at;
        this.machi.x = at.x; this.machi.y = at.y; this.stood = { ...at };
      }
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.board?.remove());
      // The game is kept every few seconds, and whenever the page is left or hidden.
      const leaving = () => { if (document.visibilityState === 'hidden') this.keep(); };
      const closing = () => this.keep();
      document.addEventListener('visibilitychange', leaving);
      addEventListener('pagehide', closing);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.keep(); document.removeEventListener('visibilitychange', leaving); removeEventListener('pagehide', closing); });
      this.keeping = KEEP;
      // ?ir=capilla sets the hero down there from the start.
      const wanted = import.meta.env.DEV ? new URLSearchParams(location.search).get('ir') : null;
      if (wanted) this.goTo(wanted);
    }


    // P shows the collision boxes.
    this.input.keyboard?.on('keydown-P', () => {
      const world = this.physics.world;
      world.drawDebug = !world.drawDebug;
      if (world.drawDebug && !world.debugGraphic) world.createDebugGraphic();
      world.debugGraphic?.clear();
    });
    // A ring on the pointer, which is exactly where spells pass.
    this.marker = this.add.ellipse(0, 0, 12, 6).setStrokeStyle(1, 0x46e6fa, 0.8).setDepth(1e6);
    this.input.mouse?.disableContextMenu();

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.size.width, this.size.height);
    // A room somewhere of its own is past the map's edge: the camera is not kept off it.
    if (this.indoors?.indoors && this.indoors.mode === 'fundido') cam.removeBounds();
    cam.setRoundPixels(true);
    // Follow her feet, framed a little above them so her body is centred.
    cam.startFollow(this.shadow, true, 1, 1, 0, CHEST);
    // The camera says where it has settled just before each frame is drawn:
    // the scenery it cannot see is left out of that same frame.
    cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, () => this.sight.look(cam.worldView));
    // In 3D nothing of the world is drawn here.
    if (this.three && !this.overlaid) cam.setVisible(false);
    if (this.overlaid) cam.stopFollow();

    if (this.renderer.type === Phaser.WEBGL && !this.three) {
      const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      renderer.pipelines.addPostPipeline('LookFX', LookFX);
      cam.setPostPipeline(LookFX);
      const found = cam.getPostPipeline(LookFX);
      this.look = (Array.isArray(found) ? found[0] : found) as LookFX;
      this.look.pixel = ZOOM;
    }

    this.draw();
  }

  update(_time: number, delta: number): void {
    // A long frame (tab in the background) must not teleport her.
    const dt = Math.min(0.05, delta / 1000);
    if (this.vitals.update(dt)) this.rise();
    const standing = this.vitals.standing;
    // Down, she takes no orders.
    const input = standing ? this.readInput() : { dx: 0, dy: 0, attack: false };
    // With the musket up the attack is its trigger, not a cut: it is kept
    // from the sabre until it has been let go again.
    this.trigger = input.attack && !this.attackWas;
    this.attackWas = input.attack;
    if (this.readying) this.spentAttack = true;
    if (!input.attack) this.spentAttack = false;
    if (this.spentAttack) input.attack = false;
    // In 3D, with a mouse, he looks where the pointer is, at any angle, and walks whichever way the
    // keys say; never running backwards.
    let backing = false;
    if (this.shownIn3d && !touch.on && !pad.on) {
      const at = this.underMouse(), dx = at.x - this.machi.x, dy = (at.y - this.machi.y) / ISO_Y, far = Math.hypot(dx, dy);
      if (far > 4) this.machi.steer = { x: dx / far, y: dy / far };
      const goes = input.move ?? { x: input.dx, y: input.dy }, len = Math.hypot(goes.x, goes.y), steer = this.machi.steer;
      backing = !!steer && len > 0 && (goes.x * steer.x + goes.y * steer.y) / len < STEER.runAhead;
    } else this.machi.steer = null;
    const running = this.stamina.update(dt, standing && !this.machi.isDashing && !backing && (this.keys.running || touch.run || pad.run), this.machi.isMoving);
    this.machi.pace = tune.speed * (this.wrath.active ? RAGE.pace : 1) * (running ? RUN : 1);
    this.machi.haste = this.wrath.active ? RAGE.haste : 1;
    const from = { x: this.machi.x, y: this.machi.y };
    // A dodge is paid for when it begins, once: a press the hero could not act on costs nothing.
    const dodging = this.machi.isDashing;
    // In 3D his speed and his roll are the look's, which the panel may be changing.
    const in3d = this.shownIn3d;
    // In 3D she goes a little slower than he does: at the 2D game's pace she crawled (the user, 25/10/2026).
    if (in3d && this.hero === 'inti') this.machi.kit.speed = INTI_3D_SPEED;
    if (in3d && this.hero === 'cabral') {
      const { kit } = this.machi, look = this.three!.view.look;
      kit.speed = look.speed;
      if (kit.dash) { kit.dash.time = look.rollTime; kit.dash.distance = look.rollDistance; }
    }
    this.machi.update(dt, input);
    // In 3D she turns the way her orbs will fly: toward what is aimed at, or the way the attack points.
    if (this.overlaid) {
      // Locked on, at the middle of their body as seen; she turns to where they stand.
      this.castAt = this.locked ? { x: this.locked.body.x, y: this.locked.body.y } : input.target ?? null;
      this.three!.castWay(input.target ? { x: input.target.x - this.machi.x, y: (input.target.y - this.machi.y) / ISO_Y } : input.aim ?? null, !!this.locked);
    }
    if (in3d && this.hero === 'cabral' && this.machi.kit.dash) this.three!.cabral?.carry(this.machi, from, this.machi.kit.dash, dt);
    if (!dodging && this.machi.isDashing) this.stamina.dodge();
    // Enemies throw at her chest while she is up.
    // She cannot walk through an enemy: each one she stands in pushes her
    // back out the short way. Done here rather than by the physics engine
    // because her position is set by her own controller, not by a velocity.
    const target = standing ? { x: this.machi.x, y: this.machi.y - TORSO.up } : null;
    const feet = standing ? { x: this.machi.x, y: this.machi.y } : null;
    for (const enemy of this.enemies) {
      // Whatever the nahuel is nearer to than she is goes for it instead.
      const drawn = feet && this.nahuel.lures(enemy.ground, feet);
      const beast = this.nahuel.ground;
      const ember = enemy.update(dt * tune.foes, drawn ? { x: beast.x, y: beast.y - 20 } : target);
      if (ember) this.embers.spawn(ember);
      if (!enemy.alive) continue;
      const clear = pushOut({ x: this.machi.x, y: this.machi.y, ...FEET }, enemy.footprint);
      this.machi.x = clear.x;
      this.machi.y = clear.y;
    }
    // Nor through the trunk of a tree, nor into country too thick to cross.
    // Carts are walked round, wherever they stand.
    const carts = this.led.filter(c => c.drawn.visible).map(footOf).filter((f): f is Footprint => !!f);
    for (const taken of [this.forest?.trunks, this.built, carts]) {
      for (const trunk of taken ?? []) {
        const clear = pushOut({ x: this.machi.x, y: this.machi.y, ...FEET }, trunk);
        this.machi.x = clear.x;
        this.machi.y = clear.y;
      }
    }
    // Inside, the floor of the room holds them; outside, the map's ground.
    if (this.indoors?.indoors) {
      const held = this.indoors.hold(from, this.machi);
      this.machi.x = held.x;
      this.machi.y = held.y;
    } else if (this.map) {
      // In 3D a house with a room is held by its own walls, and gone into by its door.
      const clear = this.three?.hold(from, this.indoors?.block(from, this.machi) ?? this.machi) ?? this.indoors?.block(from, this.machi) ?? this.machi;
      this.machi.x = clear.x;
      this.machi.y = clear.y;
      const held = walk(this.map, from, this.machi);
      this.machi.x = held.x;
      this.machi.y = held.y;
    }
    // In 3D nobody goes in: the buildings are only blocks so far.
    if (!this.three) this.indoors?.check(this.machi);
    this.indoors?.update(this.time.now);
    this.forest?.reveal(this.machi, dt);
    this.country?.reveal(this.machi, dt);
    this.meadow?.follow();
    this.underfoot();
    this.water?.follow();
    // Chonchones go for where she stands; their teeth miss her mid-dash.
    for (const chonchon of this.chonchones) {
      const drawn = feet && this.nahuel.lures(chonchon.ground, feet);
      // Its teeth do nothing to a spirit.
      if (chonchon.update(dt * tune.foes, drawn ? this.nahuel.ground : feet) && !drawn) this.hurt();
    }
    // Royalists shoot from where they stand, and cut whoever is beside them.
    const awake: Soldier[] = [];
    // Indoors, nobody outside can get to the hero.
    if (this.indoors?.indoors) this.route?.toward(null);
    else this.route?.toward(this.machi);
    // Come somewhere safe, every one fallen is due to be up again.
    const safe = !!this.map && !!zoneAt(this.map, this.machi.x, this.machi.y)?.safe;
    if (safe && !this.safeWas) for (const realista of this.realistas) if (!realista.alive) this.due.add(realista);
    this.safeWas = safe;
    for (const realista of this.realistas) {
      // One too far off to be seen or to see is left as he is. If he is due up, he is back at his
      // post where nobody saw him come; one of a wave, with no post, is taken off the field.
      const post = this.posts.get(realista), at = realista.ground;
      const far = Math.abs(at.x - this.machi.x) > AWAKE.x || Math.abs(at.y - this.machi.y) > AWAKE.y;
      if (far && this.due.delete(realista)) {
        if (post) realista.revive();
        else this.three?.bury(realista);
      }
      if (post && far) {
        realista.sleep();
        continue;
      }
      const drawn = feet && this.nahuel.lures(realista.ground, feet);
      // Whatever is being brought along is fair game: some go for it whatever, and anyone goes for
      // it who is nearer it than the hero. Only the hero is found the way round to.
      const prey = feet && !drawn ? this.prey(realista) : undefined;
      realista.route = prey ? undefined : this.route;
      const deed = realista.update(dt * tune.foes, drawn ? this.nahuel.ground : prey?.body ?? feet);
      if (realista.alive) awake.push(realista);
      if (deed.shot) {
        this.shots.spawn(deed.shot);
        if (realista instanceof Realista || IN_3D.has(realista.kind)) this.three?.volley(realista);
      }
      if (deed.cut && prey) { prey.body.strike(); this.sparks.emitParticleAt(prey.body.x, prey.body.y - 20, 6); }
      else if (deed.cut && !drawn) this.hurt(realista instanceof Trooper ? realista.brain.kind.blow?.damage ?? 1 : 1);
      // A captain calls up more of his men.
      const call = (deed as { call?: { many: number; most: number } }).call;
      if (call && realista instanceof Trooper) this.reinforce(realista, call);
      // A sergeant's shout quickens whoever of his own is within hearing.
      const rally = (deed as { rally?: { reach: number; lasts: number } }).rally;
      if (rally) {
        for (const other of this.realistas) {
          if (other !== realista && other.alive && ground(other.ground, at) <= rally.reach) other.hurry(rally.lasts);
        }
      }
    }
    // Nobody stands in another's boots: any two too close are eased apart, each half the way.
    for (let i = 0; i < awake.length; i++) {
      for (let j = i + 1; j < awake.length; j++) {
        const a = awake[i].ground, b = awake[j].ground;
        const dx = b.x - a.x, dy = (b.y - a.y) / ISO_Y, far = Math.hypot(dx, dy);
        if (far >= SPACE) continue;
        // Two on the very same spot part along a way of their own.
        const [ux, uy] = far > 0.01 ? [dx / far, dy / far] : [Math.cos(i + j), Math.sin(i + j)];
        const step = Math.min(SPACE - far, PARTING * dt) / 2;
        awake[i].shove(-ux * step, -uy * step);
        awake[j].shove(ux * step, uy * step);
      }
    }
    this.useAbilities(dt, standing);
    this.unleash(dt, standing);
    // In his rage his fury is not spent.
    if (this.wrath.active) this.fury.gain(FURY);
    const blow = this.machi.takeStrike();
    if (blow) this.land(blow);
    const cast = this.machi.takeCast();
    // In 3D the orb leaves the tip of her branch as it is drawn there, toward what she aims at.
    const tip = cast && this.overlaid ? this.three?.tip() : null;
    if (cast && tip) {
      cast.x = tip.x;
      cast.y = tip.z * ISO_Y;
      // Over the ground under it, which rises and falls (measured from nothing, its orb leapt up as much as the ground stood).
      cast.height = (tip.y - heightAt(cast.x, cast.y)) * Math.cos(PITCH);
      // It hits what it is seen to touch, high in the air: its drawn path, from the tip, is aimed at
      // the spot on screen (the middle of whom she is locked onto; under the pointer, the ground there,
      // which is where the pointer is seen). Aimed along the ground it flew over whoever was aimed at.
      const sx = (this.castAt?.x ?? 0) - cast.x, sy = ((this.castAt?.y ?? 0) - (cast.y - cast.height)) / ISO_Y;
      if (this.castAt && Math.hypot(sx, sy) > 8) { cast.dx = sx; cast.dy = sy; }
    }
    if (cast) {
      // The branch reaches well in front of her, so against something she is
      // standing next to the bolt would start already past it. Anything seen
      // between her chest and the branch tip is hit there and then.
      const chestY = this.machi.y - CHEST, tipY = cast.y - cast.height;
      const reach: Footprint = {
        x: (this.machi.x + cast.x) / 2, y: (chestY + tipY) / 2,
        hw: Math.abs(cast.x - this.machi.x) / 2 + 2, hh: Math.abs(tipY - chestY) / 2 + 2,
      };
      const blocker = this.foes.find(e => e.alive && overlaps(reach, e.body));
      if (blocker) this.wound(blocker, cast.dx, cast.dy * ISO_Y, 1, 'basic');
      else this.bolts.spawn(cast);
    }
    this.bolts.update(dt);
    this.embers.update(dt);
    this.shots.update(dt);
    // A royalist's ball strikes the first time it is seen to touch her, anywhere along the stretch
    // it flew this step; one that does not hurt her (a dodge, the grace after a blow) flies on.
    const torso: Footprint = { x: this.machi.x, y: this.machi.y - TORSO.up, hw: TORSO.w / 2, hh: TORSO.h / 2 };
    this.shots.sweep(4, (x, y, damage) => {
      if (!this.vitals.standing || !overlaps({ x, y, hw: 3.5, hh: 3.5 }, torso) || !this.hurt(damage)) return false;
      this.three?.wounded(this.machi);
      return true;
    });
    this.balls.update(dt);
    // A musket ball bursts on the first thing it is seen to touch, anywhere
    // along the stretch it flew this step.
    this.balls.sweep(4, (x, y) => {
      const struck = this.foes.find(e => e.alive && overlaps({ x, y, hw: MUSKET.girth, hh: MUSKET.girth }, e.body));
      if (struck) this.blast(struck.ground, MUSKET.radius, MUSKET.damage, 'first');
      return !!struck;
    });
    this.lightning.update(dt);
    this.updateGrenades(dt);
    this.updateOrbs(dt);
    // Only the nearest of those within reach offers to talk, or is heard. The sign over
    // them comes up as one draws near and goes out as one leaves, rather than snapping.
    let nearest: Talker | undefined;
    for (const talker of this.talkers) {
      // What is not there just now is neither drawn nor to be dealt with.
      const there = talker.there?.() ?? true;
      talker.take?.drawn.setVisible(there);
      talker.spot?.mark.setVisible(there);
      if (talker.take) this.three?.there(talker.take.what, there);
      if (talker.spot) this.three?.open(talker.spot.at.id, there);
      // The friars' carts stand there once the hostages have been asked about, and stay.
      if (talker.spot?.at.id === 'carretas') this.three?.parked(!!this.story?.has(talker.spot.at.given ?? ''));
      for (const part of talker.figure ?? []) (part as Phaser.GameObjects.Image).setVisible(there);
      if (talker.npc) this.three?.asking(talker.npc.id, there);
      if (!there) continue;
      // Something to be brought along is set off from inside its own ring, the one drawn round it; the
      // rest are as near as they are.
      const reached = talker.charge ? inZone(talker.charge, this.machi) <= 1 : ground(talker, this.machi) <= (talker.reach ?? (talker.npc ? TALK.near : TALK.heard));
      if (reached && (!nearest || ground(talker, this.machi) < ground(nearest, this.machi))) nearest = talker;
    }
    // A place still held says so instead of offering what is done there.
    if (nearest?.spot) {
      const { at } = nearest.spot, wanted = at.guarded && this.held(at) ? 'Vencé a la guardia' : prompt('F', at.does);
      if (nearest.hint.text !== wanted) nearest.hint.setText(wanted);
    }
    this.beside = nearest;
    // In 3D what can be done with whoever is near is said over them there.
    this.three?.hint(nearest ? glyphs(nearest.hint.text) : null, nearest ?? null);
    // What is being brought somewhere comes along behind the hero, worn down by whoever gets near it.
    this.orders?.clear();
    for (const charge of this.led) {
      const { at, body, drawn, bar } = charge, arrived = !!this.story?.has(at.happening);
      const waiting = !charge.going && !arrived && (!at.given || !!this.story?.has(at.given));
      // Once it has arrived it stays where it was brought.
      drawn.setVisible(charge.going || waiting || arrived);
      if (at.drives) this.three?.carted(at.id, dt, charge.going || waiting || arrived ? body : null, body.heading);
      // In 3D its life over it too, while it goes and has lost any: over the cart's hide, or a head.
      this.three?.life(at.id, charge.going ? body : null, at.drives ? LIFE_OVER.cart : LIFE_OVER.walker, body.life / body.max);
      // Standing where it waits or where it was brought, it stands as it stands still.
      if (!charge.going && (waiting || arrived)) this.pose(charge, false, false);
      if (!charge.going && arrived && at.who) this.three?.lead(at.who, body);
      bar.setVisible(charge.going && body.life < body.max);
      // Waiting to be set off, its ring shows how near one has to come to do it.
      if (!charge.going && waiting && at.drives) this.showOrder(charge, drawn.displayHeight, dt);
      if (!charge.going) continue;
      // Told to wait, it stands where it is, still to be looked after. One that drives goes on along
      // the road by itself; anything else follows the hero.
      if (charge.halted) body.moving = false;
      else if (at.drives && this.map) {
        const map = this.map;
        charge.road ??= new Road(map.plots[0].length, map.plots.length, (c, r) => letterAt(map, c, r) !== undefined, { col: at.to[0], row: at.to[1] }, { w: PLOT_W, h: PLOT_H });
        body.drive(dt, charge.road.next(body));
      } else body.follow(dt, this.machi);
      this.showOrder(charge, drawn.displayHeight, dt);
      const hurt = body.harm(dt, this.realistas.filter(soldier => soldier.alive).map(soldier => soldier.ground));
      if (hurt) this.sparks.emitParticleAt(body.x, body.y - 20, 6);
      // Turned to go the way it is going, whichever way it was drawn heading.
      const mirrored = at.fixed ? false : at.faces === 'left' ? body.facing > 0 : body.facing < 0;
      drawn.setPosition(Math.round(body.x), Math.round(body.y)).setDepth(body.y).setFlipX(mirrored);
      // From the side while it goes more across than down; a moment's other way is not a turn.
      if (at.side && body.moving) {
        const across = Math.abs(body.heading.x) > Math.abs(body.heading.y / ISO_Y) * 0.8 || body.heading.y < 0;
        charge.turning = across === !!charge.sideways ? 0 : (charge.turning ?? 0) + dt;
        if (charge.turning > 0.35) { charge.sideways = across; charge.turning = 0; }
      }
      this.pose(charge, body.moving, mirrored);
      if (at.who) this.three?.lead(at.who, body);
      bar.setPosition(Math.round(body.x), Math.round(body.y) - drawn.displayHeight - 4).setSize(24 * body.life / body.max, 3);
      const to = middle(at.to);
      if (body.lost) this.lose(charge, `${at.name}: se perdió por el camino. Hay que volver a buscarla.`);
      else if (body.at(to, PLOT_W * 1.2)) {
        charge.going = false;
        charge.order?.setVisible(false);
        this.halt(charge);
        if (at.note) this.board?.say(at.note);
        this.story?.tell(at.happening);
      }
    }
    // A stand: each wave comes from where the map says, once the last of the one before is down.
    if (this.battle && this.map) {
      const { at, waves, sent } = this.battle, stand = at.stand!, leader = this.battle.leader;
      // The next wave comes once his men are down; the last is not over until whoever commands them is too.
      const standing = sent.filter(soldier => soldier.alive && soldier !== leader).length + (waves.come === waves.sizes.length && leader?.alive ? 1 : 0);
      const coming = waves.update(dt, standing);
      if (typeof coming === 'number') {
        const bounds = { minX: 0, maxX: this.size.width, minY: 0, maxY: this.size.height };
        // From out of sight, the way the column comes from: seen springing up where one looked, it was strange.
        const enter = (n: number, of: number, kind: string | undefined) => {
          const { x, y } = this.offstage(middle(stand.from), (n - (of - 1) / 2) * 46, WAVE_FROM);
          const soldier = this.enlist(kind, x, y, bounds).sent(this.walkable);
          this.realistas.push(soldier);
          sent.push(soldier);
          this.physics.add.overlap(this.bolts.bodies, soldier.zone, this.struck);
          return soldier;
        };
        // Whoever commands them comes with the first, in the middle of it.
        if (waves.come === 1 && stand.leader) this.battle.leader = enter(0, 1, stand.leader.kind);
        for (let n = 0; n < coming; n++) enter(n, coming, stand.mix?.[(this.battle.enlisted++) % stand.mix.length]);
        this.board?.say(waves.come === 1 && stand.leader ? `${stand.leader.name}, y su columna.` : `Oleada ${waves.come} de ${waves.sizes.length}.`);
      } else if (coming === 'won') {
        this.battle = undefined;
        this.story?.tell(stand.won);
      }
    }
    // Somewhere safe, the flask is filled again.
    this.flask.update(dt);
    if (this.vitals.standing) this.stood = { x: this.machi.x, y: this.machi.y };
    if (this.keeping > 0 && (this.keeping -= dt) <= 0) { this.keep(); this.keeping = KEEP; }
    // What mana comes back by itself comes back faster for every point put into it.
    if (this.hero === 'inti') this.abilities.mana = Math.min(MANA, this.abilities.mana + REGEN * (this.growth.gives('flow') - 1) * dt);
    this.mending?.update(dt, this.machi);
    if (this.map && zoneAt(this.map, this.machi.x, this.machi.y)?.safe && this.flask.refill()) {
      this.board?.say(`${FLASKS[this.hero].name}: lleno otra vez.`);
    }
    // The story is told where the hero has got to: the zone he is in, and any named place he has come to.
    if (this.story && this.map) {
      const col = Math.floor(this.machi.x / PLOT_W), row = Math.floor(this.machi.y / PLOT_H);
      if (this.plotWas !== `${col},${row}`) {
        this.plotWas = `${col},${row}`;
        const letter = letterAt(this.map, col, row);
        if (letter) this.story.tell(`zona:${letter}`);
        for (const { name, plot } of this.map.objectives) {
          if (Math.abs(plot[0] - col) <= ARRIVED && Math.abs(plot[1] - row) <= ARRIVED) this.story.tell(`en:${name}`);
        }
      }
    }
    for (const { hint } of this.talkers) {
      const shown = hint === nearest?.hint;
      const alpha = Phaser.Math.Clamp(hint.alpha + (shown ? dt / HINT_FADE.in : -dt / HINT_FADE.out), 0, 1);
      if (alpha !== hint.alpha) hint.setAlpha(alpha).setVisible(alpha > 0);
    }
    this.drawCuts(dt);
    this.flash = Math.max(0, this.flash - dt / FLASH);
    this.draw();
    this.trail(dt);
    if (this.three) {
      this.three.update(dt, this.machi, {
        from, aimed: this.machi.isShouldering ? this.shotAt : null, hurt: this.flash,
        // His rage, dying down over its last moments as the 2D game's glow does.
        rage: this.wrath.active ? Math.min(1, this.wrath.left / 0.8) : 0,
        fallen: !this.vitals.standing, dashTime: this.machi.kit.dash?.time ?? 0.5, trail: true,
      }, this.realistas.filter((r): r is Realista | Trooper => r instanceof Realista || IN_3D.has(r.kind)));
      // Framed a little above his feet, so his body is in the middle.
      // Her orbs are drawn in 3D, lit: in flight, and those her kills leave on the ground.
      if (this.overlaid) this.three.lights(dt, this.bolts.flying, this.orbs.map(o => {
        o.glow.setVisible(false);
        o.shadow.setVisible(false);
        return { x: o.x, y: o.y, up: o.y - o.glow.y, alpha: o.glow.alpha, scale: o.glow.scaleX };
      }), this.abilities.pending.map(p => ({ x: p.x, y: p.y, share: Math.min(1, p.t / STRIKE.delay) })), this.abilities.healShare,
        this.machi.channelling === 'call' ? this.machi.channelShare : null);
      this.three.draw({ x: this.machi.x, y: this.machi.y - CHEST }, dt);
      // What is still drawn in 2D, over it: on its pixels, about the same spot.
      if (this.overlaid) {
        // A ring of her light under whom she is locked onto.
        this.lockRing ??= this.add.ellipse(0, 0, 44, 16).setStrokeStyle(2, 0x46e6fa, 0.9).setDepth(-999);
        this.lockRing.setVisible(!!this.locked);
        if (this.locked) this.lockRing.setPosition(this.locked.ground.x, this.locked.ground.y).setAlpha(0.65 + 0.35 * Math.sin(this.time.now / 120));
        const cam = this.cameras.main, centre = this.three.centre;
        cam.setZoom(this.three.view.pixel / this.three.view.look.far / this.scale.zoom);
        cam.centerOn(centre.x, centre.y);
      }
    }
  }

  /** Life or mana comes back to the hero, seen in its colour: in 2D, and in 3D where he is drawn there. */
  private mend(colour: number): void {
    // Over the 3D world it is drawn there only.
    if (!this.overlaid) this.mending?.begin(colour, this.machi);
    if (this.shownIn3d) this.three?.mend(colour);
  }

  /** Whether the hero is drawn in 3D: wherever the map is. */
  private get shownIn3d(): boolean {
    return !!this.three;
  }

  /**
   * Whether the 2D game still draws over the 3D world what has not been made in 3D yet (Inti's forest:
   * its creatures, her spells, her nahuel), on the world's own pixels, lined up with it.
   */
  /** The spot her orbs are aimed at this step, in 3D, if any. */
  private castAt: Vec | null = null;

  private get overlaid(): boolean {
    return !!this.three && this.hero === 'inti';
  }

  /** The camera shakes: this one's, or the 3D world's (in its pixels: about as far). */
  private shake(ms: number, intensity: number): void {
    rumble(ms, intensity * 120);
    if (this.three) this.three.jolt(ms / 1000, Math.max(1, Math.round(intensity * 400)));
    else this.cameras.main.shake(ms, intensity);
  }

  /** The spot of the world under the mouse: in 3D, the ground there. */
  private underMouse(): Vec {
    const pointer = this.input.activePointer;
    if (this.three) {
      const bounds = this.scale.canvasBounds, k = this.scale.displayScale;
      const at = this.three.underPointer(bounds.left + pointer.x / k.x, bounds.top + pointer.y / k.y);
      if (at) return at;
    }
    pointer.updateWorldPoint(this.cameras.main);
    return { x: pointer.worldX, y: pointer.worldY };
  }

  // While she dashes she leaves copies of herself where she just was, each
  // frozen in the pose she had there and fading out: the eye reads the row of
  // them as speed.
  private trail(dt: number): void {
    // In his rage he trails them wherever he goes.
    if (this.shownIn3d || (!this.machi.isDashing && !this.wrath.active)) { this.echoIn = 0; return; }
    this.echoIn -= dt;
    if (this.echoIn > 0) return;
    this.echoIn = ECHO.every;
    const s = this.sprite;
    const echo = this.add.image(s.x, s.y, s.texture.key, s.frame.name)
      .setFlipX(s.flipX)
      .setDisplayOrigin(s.displayOriginX, s.displayOriginY)
      .setDepth(s.depth - 0.1)   // just behind her
      .setTint(ECHO.tint[this.hero])
      .setAlpha(ECHO.alpha);
    this.tweens.add({ targets: echo, alpha: 0, duration: ECHO.fade, onComplete: () => echo.destroy() });
  }

  // His musket and his grenade work alike. While its key is held he readies
  // it and turns to the pointer; the attack then lets it fly, if he has the
  // fury for it. Letting the key go first puts it away. It leaves on the
  // frame the shot or the throw is drawn.
  private useArms(dt: number, held: Record<Arm, boolean>): void {
    this.armWait.musket = Math.max(0, this.armWait.musket - dt);
    this.armWait.grenade = Math.max(0, this.armWait.grenade - dt);
    // By touch there is no trigger to pull: letting the button go lets it fly, and it is kept up until it has.
    if (touch.on) {
      for (const arm of ['musket', 'grenade'] as Arm[]) {
        if (this.armWas[arm] && !held[arm] && !this.loosing && this.skill(arm).ready) { this.loosing = arm; this.loosingFor = LOOSE; this.trigger = true; }
        this.armWas[arm] = held[arm];
      }
      if (this.loosing && (this.loosingFor -= dt) <= 0) this.loosing = null;
      if (this.loosing) held = { ...held, [this.loosing]: true };
    }
    // He keeps to the one he has readied for as long as its key is down.
    const want: Arm | null = this.readying && held[this.readying] ? this.readying
      : held.musket ? 'musket' : held.grenade ? 'grenade' : null;
    if (want && !this.machi.isDashing) {
      // With the gamepad the musket aims as far as its ball carries, where its line ends.
      const pointer = pad.on && want === 'grenade' && this.padAim ? this.pointed = { x: this.machi.x + this.padAim.x, y: this.machi.y + this.padAim.y }
        : this.pointing(want === 'musket' ? (pad.on ? BALL.range : MUSKET_AIMS) : GRENADE.range, want === 'grenade' ? PAD_THROW : 1);
      // A ball flies at the height of the barrel: by touch or the gamepad it is pointed along the ground, and goes level.
      if ((touch.on || pad.on) && want === 'musket') pointer.y -= MUSKET.height;
      this.machi.shoulder(pointer, want);
      this.shotAt = pointer;
      if (this.trigger && this.skill(want).ready && this.fury.spend(ARMS[want].cost)) {
        this.armWait[want] = ARMS[want].cooldown;
        this.loosed = want;
        this.machi.fire();
      }
    } else if (this.readying) {
      this.machi.lower();
    }
    this.readying = want && this.machi.isShouldering ? want : null;
    if (!this.machi.takeShot()) return;
    this.loosing = null;
    const { x, y } = this.machi;
    if (this.loosed === 'grenade') {
      this.lob({ x, y }, this.within({ x, y }, this.shotAt, GRENADE.range));
      return;
    }
    // Aimed from where the barrel is seen to be, through the pointer. In 3D, along the ground to the
    // spot under the pointer, which is where he aims there; and the shot is seen there.
    const level = this.shownIn3d;
    this.balls.spawn({
      x, y, height: MUSKET.height,
      dx: this.shotAt.x - x, dy: (this.shotAt.y - (level ? y : y - MUSKET.height)) / ISO_Y,
    });
    if (level) this.three?.fire();
    this.shake(60, 0.004);
  }

  // A spot on the ground, pulled in to a reach around another if it is beyond it.
  private within(from: Vec, spot: Vec, reach: number): Vec {
    const far = ground(from, spot);
    if (far <= reach) return { ...spot };
    return { x: from.x + (spot.x - from.x) * reach / far, y: from.y + (spot.y - from.y) * reach / far };
  }

  // A grenade leaves his hand for a spot on the ground. The further it has
  // to go the longer it is in the air and the higher it climbs.
  private lob(from: Vec, to: Vec): void {
    // In 3D it is thrown there, out of his hand; the blast and the fire are still reckoned here.
    if (this.shownIn3d) this.three!.lob(from, to, this.machi.arming?.shot ?? SLING);
    const share = ground(from, to) / GRENADE.range;
    this.grenades.push({
      from, to, t: 0,
      time: GRENADE.flight[0] + (GRENADE.flight[1] - GRENADE.flight[0]) * share,
      arc: GRENADE.arc * (0.35 + 0.65 * share),
      ball: this.add.image(from.x, from.y - GRENADE.hand, 'grenade'),
      shadow: this.add.ellipse(from.x, from.y, 6, 3, 0x000000, 0.3),
    });
  }

  // Grenades fly their arcs and go off where they land, leaving the ground
  // burning; fires burn down, hurting what stands in them every so often.
  private updateGrenades(dt: number): void {
    for (const g of this.grenades) {
      g.t += dt;
      const p = Math.min(1, g.t / g.time);
      const x = g.from.x + (g.to.x - g.from.x) * p, y = g.from.y + (g.to.y - g.from.y) * p;
      // It leaves at the height of his hand, comes down to the ground, and arcs between.
      const z = GRENADE.hand * (1 - p) + g.arc * Math.sin(Math.PI * p);
      g.ball.setPosition(Math.round(x), Math.round(y - z)).setDepth(y).setRotation(g.t * 9);
      g.shadow.setPosition(Math.round(x), Math.round(y)).setDepth(y - 0.5);
      if (p < 1) continue;
      g.ball.destroy();
      g.shadow.destroy();
      this.blast(g.to, GRENADE.radius, GRENADE.damage, 'second', true);
      this.kindle(g.to);
    }
    this.grenades = this.grenades.filter(g => g.t < g.time);

    for (const fire of this.fires) {
      fire.t += dt;
      fire.shader?.setUniform('life.value', Math.max(0, 1 - fire.t / GRENADE.burns));
      if (fire.t >= GRENADE.burns) continue;
      if (Math.random() < dt * EMBERS.patch) {
        // From somewhere on the patch, which is an ellipse on screen.
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * GRENADE.radius;
        this.embersUp.emitParticleAt(fire.x + Math.cos(a) * r, fire.y + Math.sin(a) * r * ISO_Y, 1);
      }
      // Whatever stands in it, or flies over it, catches.
      for (const enemy of this.foes) {
        if (enemy.alive && ground(fire, enemy.ground) <= GRENADE.radius + enemy.girth) this.alight.ignite(enemy);
      }
    }

    // What has caught fire goes on burning for a while wherever it goes,
    // hurt every so often, smouldering and shedding embers as it does.
    this.alight.update(dt, enemy => enemy.alive, (enemy, glow, hurt) => {
      enemy.burning = glow;
      const { x, y, hw, hh } = enemy.body;
      if (glow > 0 && Math.random() < dt * EMBERS.shed) {
        this.embersUp.emitParticleAt(x + Phaser.Math.FloatBetween(-hw, hw), y + Phaser.Math.FloatBetween(-hh, hh), 1);
      }
      if (hurt) this.wound(enemy, 0, -1, hurt, 'second');
      if (hurt) this.sparks.emitParticleAt(x, y, 4);
    });
    for (const fire of this.fires.filter(f => f.t >= GRENADE.burns)) fire.shader?.destroy();
    this.fires = this.fires.filter(f => f.t < GRENADE.burns);
  }

  // Sets a patch of ground alight. The flames are a shader on a quad whose
  // lower part lies on the patch and whose upper part they rise into.
  private kindle(at: Vec): void {
    const fire: Fire = { ...at, t: 0 };
    if (this.renderer.type === Phaser.WEBGL) {
      // Drawn wider than the patch itself: its ragged edge and its fading out need the room.
      const w = Math.round(GRENADE.radius * 2 * 1.5), h = Math.round(w * FIRE_TALL);
      fire.shader = this.add.shader(fireShader('fire', Math.random() * 100), at.x, at.y - h / 2 + w / 4, w, h)
        // It lies on the ground: under every sprite, whichever side of it they stand.
        .setDepth(-900);
    }
    this.fires.push(fire);
  }

  // Something going off: everything within the blast is hurt, wherever the
  // thing itself struck.
  private blast(at: Vec, radius: number, damage: number, stat: Stat, sets = false): void {
    this.blasts.push({ ...at, r: radius, t: 0 });
    this.shake(110, 0.005);
    for (const enemy of this.foes) {
      const spot = enemy.ground;
      if (!enemy.alive || ground(at, spot) > radius + enemy.girth) continue;
      this.wound(enemy, spot.x - at.x || 1, spot.y - at.y, damage, stat);
      if (sets) this.alight.ignite(enemy);
      const { x, y } = enemy.body;
      this.sparks.emitParticleAt(x, y, 10);
    }
  }

  // A blow lands on everything within its reach and inside its cone, measured
  // along the ground: what flies over that ground is caught too.
  private land(blow: Strike): void {
    this.cuts.push({ ...blow, t: 0 });
    let struck = false;
    // With his fury already full, a blow that lands goes to his greatest
    // power instead: one blow, one share, however many it catches.
    const brimming = this.fury.value >= FURY;
    for (const enemy of this.foes) {
      if (!enemy.alive) continue;
      const spot = enemy.ground;
      if (!lands(blow, spot, enemy.girth)) continue;
      const x = spot.x - blow.x, y = (spot.y - blow.y) / ISO_Y;
      this.wound(enemy, x || blow.dx, y * ISO_Y, blow.damage, 'basic');
      if (enemy instanceof Realista || enemy instanceof Trooper) this.three?.blow(enemy, this.machi);
      // Sparks fly off what the blade bites, the way it was swung.
      const { x: bx, y: by } = enemy.body;
      for (let i = 0; i < 9; i++) {
        const spark = this.sparks.emitParticleAt(bx + Phaser.Math.Between(-5, 5), by + Phaser.Math.Between(-6, 6), 1);
        if (!spark) continue;
        spark.velocityX += blow.dx * 90;
        spark.velocityY += blow.dy * 45;
      }
      struck = true;
      this.fury.gain(BLOW * this.growth.gives('flow'));
    }
    if (struck && brimming && !this.wrath.active) this.charge.add(ULTIMATE / tune.blows);
    // A blow that connects is felt.
    if (struck) this.shake(70, 0.003);
  }

  // The cut itself: a crescent of light that whips across in front of him at
  // chest height and is gone. It follows the cone the blow covers without
  // drawing it: thick in the middle, tapering to nothing at both ends, its
  // head racing round and its tail catching up.
  private drawCuts(dt: number): void {
    this.slashes.clear();
    this.cuts = this.cuts.filter(cut => (cut.t += dt) < CUT.time);
    // In 3D his sabre leaves a trail of its own.
    for (const cut of this.shownIn3d ? [] : this.cuts) {
      const p = cut.t / CUT.time;
      const head = Math.min(1, p / 0.4), tail = Math.max(0, (p - 0.3) / 0.7);
      const aim = Math.atan2(cut.dy, cut.dx);
      // A crescent between two arcs, the inner one pulled in most at the middle.
      const crescent = (thick: number) => {
        const outer: Phaser.Math.Vector2[] = [], inner: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= CUT.steps; i++) {
          const u = tail + (head - tail) * i / CUT.steps;
          const a = aim - cut.arc + 2 * cut.arc * u;
          const at = (r: number) => new Phaser.Math.Vector2(
            cut.x + Math.cos(a) * r, cut.y - CUT.up + Math.sin(a) * r * ISO_Y);
          outer.push(at(cut.reach));
          inner.push(at(cut.reach * (1 - thick * Math.sin(Math.PI * u))));
        }
        return [...outer, ...inner.reverse()];
      };
      const fade = 1 - p * p;
      this.slashes.fillStyle(CUT.glow, 0.55 * fade).fillPoints(crescent(0.42), true);
      this.slashes.fillStyle(0xffffff, 0.95 * fade).fillPoints(crescent(0.2), true);
    }
    // A blast: a ball of fire that swells and thins out over the ground it covered.
    this.blasts = this.blasts.filter(blast => (blast.t += dt) < BLAST.time);
    for (const { x, y, r: full, t } of this.blasts) {
      const p = t / BLAST.time, fade = 1 - p * p;
      const r = full * (0.35 + 0.65 * Math.sqrt(p));
      this.slashes.fillStyle(0xff7a1a, 0.55 * fade).fillEllipse(x, y - BLAST.up, r * 2, r * 2 * 0.8);
      this.slashes.fillStyle(0xffe9a8, 0.9 * fade * fade).fillEllipse(x, y - BLAST.up, r * 1.1, r * 1.1 * 0.8);
      this.slashes.lineStyle(2, 0xffffff, 0.8 * fade).strokeEllipse(x, y, r * 2, r * 2 * ISO_Y);
    }
  }

  // Puts a character on the field at a spot, with their own art.
  private enter(hero: Hero, at: Vec): MachiController {
    // Below the map is room for the rooms that are somewhere of their own: the map's ground keeps them off it otherwise.
    // In 3D he goes at the look's speed and rolls its roll, and takes longer over the musket, as its clips do.
    const look = this.three?.view.look;
    const kit = look && hero === 'cabral'
      ? { ...KITS.cabral, speed: look.speed, dash: { time: look.rollTime, distance: look.rollDistance }, shoulder: DRAW, shot: SLING } : KITS[hero];
    const body = new MachiController({ minX: 12, maxX: this.size.width - 12, minY: FRAME, maxY: this.size.height + ROOMS }, kit);
    body.x = at.x;
    body.y = at.y;
    return body;
  }

  // Her abilities: the keys, what they set off, and the marks on the ground.
  private useAbilities(dt: number, standing: boolean): void {
    // The same keys are each character's own abilities. They are read either
    // way, so a press is not kept for later.
    const pressed = this.keys.abilities();
    const keys = this.hero === 'inti' ? pressed : { strike: false, heal: false };
    // In his rage he uses nothing but the sabre.
    const his = this.hero === 'cabral' && standing && !this.wrath.active;
    this.useArms(dt, { musket: his && pressed.strike, grenade: his && pressed.second });
    const at = { x: this.machi.x, y: this.machi.y };
    const confirm = pad.on && this.hero === 'inti' ? this.strikeConfirm : undefined;
    this.strikeConfirm = false;
    const events = this.abilities.update(dt, {
      ...keys,
      confirm,
      pointer: this.hero === 'inti' ? this.strikeSpot(dt, keys.strike) : at,
      at,
      free: standing && !this.machi.isDashing,
      hurt: this.vitals.life < this.vitals.max,
    });

    if (events.healing) this.machi.channel(HEAL.time);
    if (this.abilities.isHealing && !this.overlaid && Math.random() < dt * 40) {
      this.motes.emitParticleAt(at.x + Phaser.Math.Between(-10, 10), at.y - Phaser.Math.Between(10, 70), 1);
    }
    if (events.healed) {
      this.vitals.heal(HEAL.amount * this.growth.gives('second'));
      // In 3D it is seen there (three/healing.ts), as she heals and as it is done.
      if (this.overlaid) this.three?.healed();
      for (let i = 0; i < (this.overlaid ? 0 : 24); i++) {
        this.motes.emitParticleAt(at.x + Phaser.Math.Between(-14, 14), at.y - Phaser.Math.Between(0, 75), 1);
      }
    }

    if (events.cast && this.shownIn3d) this.three?.strike(this.machi, events.cast);
    for (const patch of events.struck) {
      this.lightning.strike(patch.x, patch.y, STRIKE.radius);
      // In 3D it falls there, lighting what stands about; the 3D camera is shaken instead.
      if (this.overlaid) { this.three?.bolt(patch.x, patch.y, STRIKE.radius); this.shake(140, 0.004); }
      // Whatever stands on the patch, or flies over it, takes the bolt.
      for (const enemy of this.foes) {
        const spot = enemy.ground;
        if (!enemy.alive || ground(patch, spot) > STRIKE.radius + enemy.girth) continue;
        this.wound(enemy, spot.x - patch.x || 1, spot.y - patch.y, STRIKE.damage, 'first');
      }
    }

    // Everything is an ellipse: a circle on the ground, seen from above at an angle.
    const ring = (x: number, y: number, r: number) => [x, y, r * 2, r * 2 * ISO_Y] as const;
    this.marks.clear();
    // In 3D they are drawn there, from the muzzle.
    if (this.readying === 'musket' && !this.shownIn3d) {
      // The line of the shot, from the barrel out as far as a ball carries, and
      // the size of the blast where the pointer is; dull when it cannot be paid for.
      const colour = this.skill('musket').ready ? 0xffb45a : 0x8a8478;
      const from = { x: at.x, y: at.y - MUSKET.height };
      const pointer = this.shotAt;
      const dx = pointer.x - from.x, dy = (pointer.y - from.y) / ISO_Y;
      const far = Math.hypot(dx, dy) || 1;
      this.marks.lineStyle(1, colour, 0.5).lineBetween(
        from.x, from.y, from.x + dx / far * BALL.range, from.y + dy / far * BALL.range * ISO_Y);
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(pointer.x, pointer.y, MUSKET.radius));
    }
    if (this.readying === 'grenade') {
      // How far he can throw, and the patch it would land on and set alight.
      const colour = this.skill('grenade').ready ? 0xffb45a : 0x8a8478;
      const to = this.within(at, this.shotAt, GRENADE.range);
      this.marks.lineStyle(1, colour, 0.35).strokeEllipse(...ring(at.x, at.y, GRENADE.range));
      this.marks.fillStyle(colour, 0.14).fillEllipse(...ring(to.x, to.y, GRENADE.radius));
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(to.x, to.y, GRENADE.radius));
    }
    const aim = this.abilities.aim;
    if (aim) {
      // Her reach, and the patch the pointer picks inside it; dull when it cannot be cast.
      const colour = this.abilities.ready('strike') ? 0x46e6fa : 0x8a8478;
      this.marks.lineStyle(1, colour, 0.35).strokeEllipse(...ring(at.x, at.y, STRIKE.range));
      this.marks.fillStyle(colour, 0.14).fillEllipse(...ring(aim.x, aim.y, STRIKE.radius));
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(aim.x, aim.y, STRIKE.radius));
    }
    for (const patch of this.abilities.pending) {
      // A ring closes in on the patch and it brightens as the bolt nears.
      const p = patch.t / STRIKE.delay;
      this.marks.fillStyle(0x46e6fa, 0.1 + 0.3 * p).fillEllipse(...ring(patch.x, patch.y, STRIKE.radius));
      this.marks.lineStyle(1, 0xbef8fc, 0.9).strokeEllipse(...ring(patch.x, patch.y, STRIKE.radius));
      this.marks.lineStyle(1, 0xffffff, 0.4 + 0.6 * p)
        .strokeEllipse(...ring(patch.x, patch.y, STRIKE.radius * (2.2 - 1.2 * p)));
    }
  }

  // Something reached her. Mid-dash, or while she cannot be hurt again, it
  // does nothing; returns whether it counted.
  private hurt(amount = 1): boolean {
    if (cheats.unhurt || this.machi.isDashing || !this.vitals.hit(this.wrath.active, amount)) return false;
    // Being hurt angers him.
    if (this.hero === 'cabral') this.fury.gain(WOUND * this.growth.gives('flow'));
    // A hit breaks the healing ritual.
    if (this.abilities.interrupt()) this.machi.stopChannel();
    this.flash = 1;
    if (!this.vitals.standing) this.fall();
    return true;
  }

  // She is defeated: she falls dead where she stands, everything in the air
  // bursts, and after a while she is back where she started.
  private fall(): void {
    this.machi.fall();
    this.abilities.reset();
    this.fury.reset();
    this.embers.clear();
    this.shots.clear();
    this.nahuel.dismiss();
    this.bolts.clear();
    this.balls.clear();
    this.readying = null;
  }

  /** Their breath, for the HUD: how much is left, and whether it is spent. */
  get breath(): { share: number; winded: boolean } {
    return { share: this.stamina.share, winded: this.stamina.winded };
  }

  private rise(): void {
    this.stamina.reset();
    // Whatever he was bringing is left without him: it goes back to where it waited.
    for (const charge of this.led) if (charge.going) this.lose(charge, `${charge.at.name}: quedó sin quien la lleve. Hay que volver a buscarla.`);
    // A stand that was lost is over: those who came go back, and it can be made again.
    if (this.battle) {
      for (const soldier of this.battle.sent) soldier.dismiss();
      // And those whoever commands them called up.
      for (const called of this.called.values()) for (const soldier of called) soldier.dismiss();
      this.called.clear();
      this.battle = undefined;
      this.board?.say('No aguantaste. Volvé al vado para intentarlo de nuevo.');
    }
    this.machi.rise();
    this.machi.x = this.start.x;
    this.machi.y = this.start.y;
    this.flash = 0;
  }

  // Keyboard input, plus the pointer when steering with it: the left button
  // casts at the pointer and the right one walks toward it, both at any angle.
  private readInput(): MachiInput {
    const input: MachiInput = this.keys.read();
    // The arrows attack the way they point, wherever the hero is walking.
    const arrows = this.keys.attacking;
    if (arrows) {
      const len = Math.hypot(arrows.dx, arrows.dy);
      input.attack = true;
      input.aim = { x: arrows.dx / len, y: arrows.dy / len };
    }
    // A dodge cannot be made with no breath; what it costs is taken once it has begun (below).
    if (input.dash && !this.stamina.canDodge) input.dash = false;
    this.marker.setVisible(controls.mouse && !touch.on && !pad.on);
    if (touch.on) return this.byTouch(input);
    if (pad.on) return this.byPad(input);
    if (!controls.mouse || arrows) return input;

    const mouse = this.input.activePointer, pointer = this.underMouse();
    this.marker.setPosition(Math.round(pointer.x), Math.round(pointer.y));
    // The screen shows the ground foreshortened; undo that to get a true
    // direction on it.
    const toward = (fromX: number, fromY: number, reach: number): Vec | null => {
      const x = pointer.x - fromX, y = (pointer.y - fromY) / ISO_Y;
      const len = Math.hypot(x, y);
      return len > reach ? { x: x / len, y: y / len } : null;
    };
    // On screen the pointer is aimed at from her chest; in 3D it is a spot on the ground, aimed at from her feet.
    input.aim = toward(this.machi.x, this.three ? this.machi.y : this.machi.y - CHEST, 1);
    input.target = { ...pointer };
    input.attack ||= mouse.leftButtonDown();
    if (mouse.rightButtonDown()) input.move = toward(this.machi.x, this.machi.y, ARRIVE);
    return input;
  }

  // By touch: the stick walks at any angle, and an attack goes where its button is dragged,
  // or else at whoever of the enemy is nearest, or else the way the hero is walking.
  private byTouch(input: MachiInput): MachiInput {
    const { stick, drag } = touch;
    // The stick is pushed the way the hero should be seen to go; the ground is foreshortened.
    const along = (v: Vec): Vec => { const far = Math.hypot(v.x, v.y / ISO_Y) || 1; return { x: v.x / far, y: v.y / ISO_Y / far }; };
    if (stick) { input.move = along(stick); this.heading = input.move; }
    if (!input.attack) return input;
    const from = { x: this.machi.x, y: this.machi.y - CHEST };
    if (drag?.by === 'attack') { input.aim = along(drag); return input; }
    const foe = this.nearest(this.hero === 'inti' ? BOLT_RANGE : SABRE_SEEKS);
    if (foe) {
      const at = { x: foe.body.x, y: foe.body.y };
      input.aim = along({ x: at.x - from.x, y: at.y - from.y });
      input.target = at;
    } else if (stick) input.aim = this.heading;
    return input;
  }

  // With the gamepad: the stick walks at any angle and the hero faces the way it goes; an attack
  // goes straight ahead, with no help to aim.
  private byPad(input: MachiInput): MachiInput {
    const { stick } = pad;
    // A grenade held ready: the stick moves where it is to land, within its reach, and he stands.
    if (this.readying === 'grenade') {
      const dt = this.game.loop.delta / 1000, at = this.padAim ??= { x: this.heading.x * GRENADE.range, y: this.heading.y * GRENADE.range * ISO_Y };
      if (stick) {
        at.x += stick.x * PAD_AIM * dt;
        at.y += stick.y * PAD_AIM * dt;
        // Never past its reach, along the ground.
        const far = Math.hypot(at.x, at.y / ISO_Y);
        if (far > GRENADE.range) { at.x *= GRENADE.range / far; at.y *= GRENADE.range / far; }
      }
      // Turned to it.
      const far = Math.hypot(at.x, at.y / ISO_Y);
      if (far > 1) this.heading = { x: at.x / far, y: at.y / ISO_Y / far };
      input.move = undefined;
      if (input.attack) input.aim = this.heading;
      return input;
    }
    this.padAim = null;
    if (this.hero === 'inti') this.lockOn();
    // Her lightning held up, the trigger looses it (as his musket and grenade), and casts no orb.
    const trigger = input.attack;
    this.strikeConfirm = this.hero === 'inti' && !!this.abilities.aim && trigger && !this.triggerWas;
    this.triggerWas = trigger;
    if (this.hero === 'inti' && this.abilities.aim) input.attack = false;
    if (stick) {
      // The stick is pushed the way the hero should be seen to go; the ground is foreshortened.
      const far = Math.hypot(stick.x, stick.y / ISO_Y) || 1;
      input.move = { x: stick.x / far, y: stick.y / ISO_Y / far };
      this.heading = input.move;
    }
    if (input.attack) input.aim = this.heading;
    // Locked on, her orbs go at whom she is locked onto.
    if (this.locked) {
      const at = this.locked.ground, x = at.x - this.machi.x, y = (at.y - this.machi.y) / ISO_Y, far = Math.hypot(x, y) || 1;
      input.aim = { x: x / far, y: y / far };
      input.target = { ...at };
    }
    return input;
  }

  /**
   * Inti's lock, with the gamepad: R3 locks onto the nearest enemy within reach (or lets go), a flick of
   * the right stick moves it to whoever stands that way from whom she is locked onto (on screen), and it
   * is let go of when they fall or get too far.
   */
  private lockOn(): void {
    if (pad.lock) {
      pad.lock = false;
      this.locked = this.locked ? null : this.nearest(LOCK.reach) ?? null;
    }
    const flick = pad.flick;
    pad.flick = null;
    if (flick && this.locked) {
      const from = this.locked.ground;
      let best: Foe | null = null, least = Infinity;
      for (const foe of this.foes) {
        if (!foe.alive || foe === this.locked || ground(this.machi, foe.ground) > LOCK.keep) continue;
        const dx = foe.ground.x - from.x, dy = foe.ground.y - from.y;
        const along = dx * flick.x + dy * flick.y, aside = Math.abs(dx * flick.y - dy * flick.x);
        if (along <= 0) continue;
        const score = along + aside * 2;
        if (score < least) { least = score; best = foe; }
      }
      if (best) this.locked = best;
    }
    if (this.locked && (!this.locked.alive || ground(this.machi, this.locked.ground) > LOCK.keep)) this.locked = null;
  }

  // Whoever of the enemy is nearest the hero and no further than a reach, if anyone.
  private nearest(reach: number): Foe | undefined {
    let found: Foe | undefined, least = reach;
    for (const foe of this.foes) {
      if (!foe.alive) continue;
      const far = ground(this.machi, foe.ground);
      if (far <= least) { least = far; found = foe; }
    }
    return found;
  }

  /**
   * Where whoever plays is pointing, in the world. With a mouse it is the pointer. By touch it is
   * as far as the button held is dragged, out to `reach` when dragged all the way; held and not
   * dragged, it is whoever of the enemy is nearest within that reach, or a little way ahead.
   */
  private pointing(reach: number, ahead = 1): Vec {
    // With the gamepad, straight ahead: as far as it reaches, or the share of that asked for.
    if (pad.on) {
      const at = this.machi, far = reach * ahead;
      return this.pointed = { x: at.x + this.heading.x * far, y: at.y + this.heading.y * far * ISO_Y };
    }
    if (!touch.on) return this.underMouse();
    const { drag } = touch, at = this.machi;
    if (drag && drag.by !== 'attack') return this.pointed = { x: at.x + drag.x * reach, y: at.y + drag.y * reach * ISO_Y };
    // Let go: it goes where it was last pointed.
    if (this.loosing || !this.keys.aiming) return this.pointed;
    const foe = this.nearest(reach);
    if (foe) return this.pointed = { ...foe.ground };
    return this.pointed = { x: at.x + this.heading.x * reach * 0.6, y: at.y + this.heading.y * reach * 0.6 * ISO_Y };
  }

  /**
   * Where Inti's lightning would fall. With the gamepad, while it is held, the right stick moves the spot
   * about her (it goes with her as she walks), never past its reach; it starts on whom she is locked
   * onto, or ahead of her. Otherwise as anything else is pointed.
   */
  private strikeSpot(dt: number, held: boolean): Vec {
    if (!pad.on) { this.strikeAim = null; return this.pointing(STRIKE.range); }
    const at = this.machi;
    if (!held) { this.strikeAim = null; return this.pointing(STRIKE.range); }
    // Along the ground, not foreshortened.
    this.strikeAim ??= this.locked
      ? { x: this.locked.ground.x - at.x, y: (this.locked.ground.y - at.y) / ISO_Y }
      : { x: this.heading.x * STRIKE.range * 0.6, y: this.heading.y * STRIKE.range * 0.6 };
    const right = pad.right;
    if (right) {
      this.strikeAim.x += right.x * PAD_AIM * dt;
      this.strikeAim.y += (right.y / ISO_Y) * PAD_AIM * dt;
    }
    const far = Math.hypot(this.strikeAim.x, this.strikeAim.y);
    if (far > STRIKE.range) { this.strikeAim.x *= STRIKE.range / far; this.strikeAim.y *= STRIKE.range / far; }
    return { x: at.x + this.strikeAim.x, y: at.y + this.strikeAim.y * ISO_Y };
  }

  /** How much of her life is left, from 0 to 1. */
  // Whatever Inti kills leaves an orb where it fell. It lies there a short
  // while, flickering before it goes out, and is hers if she reaches it.
  private updateOrbs(dt: number): void {
    for (const foe of this.foes) {
      const was = this.standing.has(foe);
      if (foe.alive) this.standing.add(foe);
      else this.standing.delete(foe);
      if (!was || foe.alive || this.hero !== 'inti') continue;
      const { x, y } = foe.ground;
      this.orbs.push({
        x, y, t: 0,
        glow: this.add.image(x, y, 'soul-orb').setBlendMode(Phaser.BlendModes.ADD),
        shadow: this.add.ellipse(x, y, 8, 3, 0x000000, 0.25),
      });
    }
    for (const orb of this.orbs) {
      orb.t += dt;
      const left = tune.orbLife - orb.t;
      // It hovers, bobbing, and blinks faster and faster at the end.
      const up = ORB.height + Math.sin(orb.t * 4) * 2;
      const blink = left < ORB.warning ? 0.5 + 0.5 * Math.sin(orb.t * (10 + (ORB.warning - left) * 12)) : 1;
      orb.glow.setPosition(Math.round(orb.x), Math.round(orb.y - up)).setDepth(orb.y)
        .setAlpha(0.35 + 0.65 * blink).setScale(Math.min(1, orb.t / 0.25));
      orb.shadow.setPosition(Math.round(orb.x), Math.round(orb.y)).setDepth(orb.y - 0.5);
      const near = ground(orb, this.machi) <= ORB.reach;
      if (near && this.vitals.standing) {
        // While the nahuel is out she is not yet gathering for the next.
        if (!this.nahuel.present) this.charge.add(ULTIMATE / tune.orbs);
        this.sparks.emitParticleAt(orb.glow.x, orb.glow.y, 8);
        orb.t = Infinity;
      }
    }
    for (const orb of this.orbs.filter(o => o.t >= tune.orbLife)) {
      orb.glow.destroy();
      orb.shadow.destroy();
    }
    this.orbs = this.orbs.filter(o => o.t < tune.orbLife);
  }

  // R lets a hero's greatest power go once it is charged. Cabral's is his
  // rage: he roars with his sabre raised, and until it burns out whatever
  // stands close to him is scorched. It hurts them; it does not set them alight.
  private unleash(dt: number, standing: boolean): void {
    const called = this.keys.unleash();
    const free = called && standing && !this.machi.isDashing;
    // Inti's is the nahuel: it comes out of the light at her side.
    // She calls it by beating her kultrún; it comes on the beat.
    if (free && this.hero === 'inti' && !this.nahuel.present && this.calling === null && this.charge.spend()) {
      this.machi.channel(NAHUEL.call, 'call');
      this.calling = NAHUEL.comes;
    }
    if (this.calling !== null && (this.calling -= dt) <= 0) {
      this.calling = null;
      this.nahuel.summon({ x: this.machi.x + 34, y: this.machi.y + 6 }, tune.beast * this.growth.gives('ultimate'));
      // In 3D a shaft of her light runs to where it comes out, and flares there.
      if (this.overlaid) this.three?.summoned({ x: this.machi.x + 34, y: this.machi.y + 6 });
      this.shake(200, 0.004);
    }
    const torn = this.nahuel.update(dt, this.foes.map(f => ({ ...f.ground, girth: f.girth, alive: f.alive, foe: f })), this.machi);
    this.nahuel.hidden = this.overlaid;
    if (this.overlaid) this.three?.beast(dt, this.nahuel.brain);
    if (torn) {
      const { foe } = torn as typeof torn & { foe: Foe };
      const at = this.nahuel.ground;
      this.wound(foe, foe.ground.x - at.x || 1, foe.ground.y - at.y, NAHUEL.damage);
      this.sparks.emitParticleAt(foe.body.x, foe.body.y, 8);
    }
    if (free && this.hero === 'cabral' && !this.wrath.active && this.charge.spend()) {
      this.wrath.start(tune.rage * this.growth.gives('ultimate'));
      this.readying = null;
      this.machi.lower();
      this.machi.channel(RAGE.roar, 'roar');
      this.shake(260, 0.006);
    }
    const hurt = this.wrath.update(dt);
    if (!this.wrath.active) return;
    if (!standing) { this.wrath.stop(); return; }
    const { x, y } = this.machi;
    if (Math.random() < dt * EMBERS.shed * 0.7) {
      this.embersUp.emitParticleAt(x + Phaser.Math.FloatBetween(-9, 9), y - Phaser.Math.FloatBetween(8, 70), 1);
    }
    if (!hurt) return;
    for (const foe of this.foes) {
      const spot = foe.ground;
      if (!foe.alive || ground({ x, y }, spot) > RAGE.aura + foe.girth) continue;
      this.wound(foe, spot.x - x || 1, spot.y - y, hurt);
      this.sparks.emitParticleAt(foe.body.x, foe.body.y, 5);
    }
  }

  /** For trying things out: their greatest power, fully charged. */
  chargeUp(): void {
    this.charge.add(ULTIMATE);
  }

  /** How near their greatest power is, from 0 to 1. */
  get ultimate(): number {
    // While it lasts the slot shows what is left of it instead.
    if (this.wrath.active) return this.wrath.share(tune.rage * this.growth.gives('ultimate'));
    // The HUD asks before this scene has finished loading, when there is no nahuel yet.
    const nahuel = this.nahuel as Nahuel | undefined;
    if (nahuel?.present) return nahuel.share(tune.beast * this.growth.gives('ultimate'));
    return this.charge.value / ULTIMATE;
  }

  // A spell has been seen to touch an enemy: the spell ends there and the
  // enemy takes the hit. Phaser hands the pair over in either order, so they
  // are told apart by what they carry.
  private struck = (a: unknown, b: unknown): void => {
    const pair = [a, b] as Phaser.GameObjects.GameObject[];
    const spot = pair.find(o => o.getData('bolt'));
    const enemy = pair.find(o => o.getData('enemy'))?.getData('enemy') as Foe | undefined;
    const heading = spot && enemy ? this.bolts.strike(spot) : null;
    if (heading && enemy) this.wound(enemy, heading.dx, heading.dy, 1, 'basic');
  };

  /** For trying things out: one more enemy, a little way off from the hero. */
  spawn(kind: 'realista' | 'sargento' | 'sableador' | 'tirador' | 'capitan' | 'chonchon' | 'cubo'): void {
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.machi.x + Math.cos(angle) * 150, 30, this.size.width - 30);
    const y = Phaser.Math.Clamp(this.machi.y + Math.sin(angle) * 150 * ISO_Y, FRAME, this.size.height - 20);
    const bounds = { minX: 0, maxX: this.size.width, minY: 0, maxY: this.size.height };
    let foe: Foe;
    if (kind === 'realista') this.realistas.push(foe = new Realista(this, x, y, bounds));
    else if (kind === 'sargento' || kind === 'sableador' || kind === 'tirador' || kind === 'capitan') this.realistas.push(foe = new Trooper(this, kind, x, y));
    else if (kind === 'chonchon') this.chonchones.push(foe = new Chonchon(this, x, y, bounds));
    else this.enemies.push(foe = new Enemy(this, x, y));
    this.physics.add.overlap(this.bolts.bodies, foe.zone, this.struck);
  }

  /**
   * Stands someone on the ground: doing what they do while they wait, if that has been drawn,
   * or as their one drawing if not. Each begins at a moment of their own, so no two keep time.
   */
  private stand(x: number, y: number, still: string, idle: Idle | undefined, left: boolean): Phaser.GameObjects.Image {
    if (!idle || !this.textures.exists(idle.sheet)) return this.add.image(x, y, still).setOrigin(0.5, 1).setDepth(y).setFlipX(left);
    if (!this.anims.exists(idle.sheet)) {
      this.anims.create({ key: idle.sheet, frames: this.anims.generateFrameNumbers(idle.sheet, { start: 0, end: idle.frames - 1 }), frameRate: idle.rate, repeat: -1 });
    }
    const figure = this.add.sprite(x, y, idle.sheet, 0).setDepth(y).setFlipX(left)
      .setDisplayOrigin(left ? idle.size - idle.ax : idle.ax, idle.size - idle.up);
    figure.play({ key: idle.sheet, startFrame: Math.floor(Math.random() * idle.frames) });
    return figure;
  }

  /** For trying things out: the story of the map being played, if it has one. */
  get tale(): Story | undefined {
    return this.story;
  }

  /** For trying things out: the places on this map one can be set down at, people first. */
  get places(): { name: string; x: number; y: number }[] {
    return [
      ...this.talkers.map(t => ({ name: t.name, x: t.x, y: t.y })),
      ...(this.map?.objectives ?? []).map(o => ({ name: o.name, ...middle(o.plot) })),
    ];
  }

  /** For trying things out: sets the hero down beside a place, by its name or a part of it. */
  goTo(name: string): boolean {
    const plain = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const place = this.places.find(p => plain(p.name) === plain(name)) ?? this.places.find(p => plain(p.name).includes(plain(name)));
    if (!place) return false;
    // A step to one side and toward the viewer, so as not to land on whoever or whatever is there;
    // into the room they are in, if they are indoors.
    const spot = { x: place.x + 40, y: place.y + 8 };
    const at = this.indoors?.settle(spot) ?? spot;
    this.machi.x = at.x;
    this.machi.y = at.y;
    return true;
  }

  // Whoever is being brought along, seen as what it is doing: walking while it goes, its idle while
  // it stands if it has one, or else as drawn.
  private pose(charge: Led, moving: boolean, mirrored: boolean): void {
    const { at, drawn } = charge, view = charge.sideways && at.side ? at.side : at, sheet = moving ? view.walk : view.idle;
    if (sheet && this.anims.exists(sheet.sheet)) {
      if (drawn.anims.currentAnim?.key !== sheet.sheet || !drawn.anims.isPlaying) drawn.play({ key: sheet.sheet, startFrame: Math.floor(Math.random() * sheet.frames) });
      drawn.setDisplayOrigin(mirrored ? sheet.size - sheet.ax : sheet.ax, sheet.size - sheet.up);
    } else if (drawn.anims.isPlaying || drawn.texture.key !== view.sprite) drawn.stop().setTexture(view.sprite).setOrigin(0.5, 1);
  }

  // Whoever was walking stands as drawn.
  private halt(charge: Led): void {
    if (charge.drawn.anims.isPlaying) charge.drawn.stop().setTexture(charge.at.sprite).setOrigin(0.5, 1);
  }

  // What was being brought is lost: it is back where it waited, whole, to be led off again.
  private lose(charge: Led, says: string): void {
    charge.going = false;
    charge.halted = false;
    charge.order?.setVisible(false);
    charge.body.reset();
    this.halt(charge);
    charge.drawn.setPosition(charge.body.x, charge.body.y).setDepth(charge.body.y);
    this.board?.say(says);
  }

  // Round whatever is being brought along, a ring on the ground that shows how near the hero must be
  // to tell it to wait or to come on: it comes up as they draw near, and lights when they are near
  // enough, with what F would do written over it. Waiting, it keeps a word over it either way.
  private showOrder(charge: Led, tall: number, dt: number): void {
    this.orders ??= this.add.graphics().setDepth(-1e6 + 3);
    const { body } = charge, z = zoneOf(charge), inside = inZone(charge, this.machi), near = inside <= 1;
    // Each eases toward where it should be: the ring fades in as the hero comes and out as they go,
    // and its light comes up and goes down rather than switching.
    const ring = (charge.ring ??= { seen: 0, lit: 0 });
    const ease = (from: number, to: number) => from + (to - from) * Math.min(1, dt * RING_FADE);
    ring.seen = ease(ring.seen, Phaser.Math.Clamp((1.9 - inside) / 0.8, 0, 1));
    ring.lit = ease(ring.lit, near ? 1 : 0);
    if (ring.seen > 0.01) {
      const colour = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x8a8478), Phaser.Display.Color.ValueToColor(0xe2c478), 1, ring.lit);
      const tint = Phaser.Display.Color.GetColor(colour.r, colour.g, colour.b);
      this.orders.lineStyle(1, tint, (0.45 + 0.45 * ring.lit) * ring.seen).strokeEllipse(z.x, z.y, z.rx * 2, z.ry * 2);
      if (ring.lit > 0.01) this.orders.fillStyle(tint, 0.08 * ring.lit * ring.seen).fillEllipse(z.x, z.y, z.rx * 2, z.ry * 2);
    }
    charge.order ??= this.add.text(0, 0, '', {
      fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4', align: 'center',
      stroke: '#14110f', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(1e6).setResolution(ZOOM * window.devicePixelRatio);
    const onward = charge.at.drives ? 'que siga' : 'que te siga';
    // Waiting to be set off, what F does is said over it by its own sign; the ring is all that is drawn here.
    const says = !charge.going ? '' : near ? prompt('F', charge.halted ? onward : 'que espere') : charge.halted ? 'esperando' : '';
    // The words fade too: a new word comes in from nothing, the last fades out where it was.
    const word = charge.order;
    if (says && word.text !== says) word.setText(says).setAlpha(0);
    word.setAlpha(ease(word.alpha, says ? 1 : 0)).setVisible(word.alpha > 0.01).setPosition(Math.round(body.x), Math.round(body.y - tall - 12));
  }

  // What a soldier goes for instead of the hero: whatever is being brought along, if he is one who
  // goes for it whatever, or if it is nearer him than the hero is.
  private prey(soldier: Soldier): Led | undefined {
    let found: Led | undefined, least = ground(soldier.ground, this.machi) * (this.raiders.has(soldier) ? 3 : 1);
    for (const c of this.led) {
      if (!c.going || c.body.lost) continue;
      const far = ground(soldier.ground, c.body);
      if (far < least) { least = far; found = c; }
    }
    return found;
  }

  /**
   * More of his men called up by one who commands: as many as he calls, so long as no more than he
   * may have of those he called are standing. They come from behind him, out past him from the hero,
   * from just out of sight (seen appearing, they popped up), abreast a few paces apart, and come
   * straight on; with no post, they are taken off the field once left far behind.
   */
  /**
   * Where one comes in from out of sight, the way toward `toward` from the hero: out along it past the
   * edge of what is seen (in 3D, what its camera sees), `side` across it; nearer, where that is no ground
   * to stand on; at `toward` itself if nowhere on the way is.
   */
  private offstage(toward: Vec, side = 0, most = CALLED_MOST): Vec {
    const dx = toward.x - this.machi.x, dy = (toward.y - this.machi.y) / ISO_Y, far = Math.hypot(dx, dy) || 1;
    const out = { x: dx / far, y: dy / far }, view = this.cameras.main.worldView;
    const spot = (d: number) => ({ x: this.machi.x + out.x * d - out.y * side, y: this.machi.y + (out.y * d + out.x * side) * ISO_Y });
    const sees = (d: number) => { const p = spot(d - CALLED_PAST); return this.three ? this.three.sees(p) : view.contains(p.x, p.y); };
    let d = 0;
    while (d < most && sees(d)) d += 10;
    for (; d < most; d += 10) if (this.walkable(spot(d).x, spot(d).y)) return spot(d);
    // Nowhere out of sight that way (the ground ends in view, as the far bank of the ford does): along
    // the ground `toward` stands on, to whichever side is out of sight first, one behind another there.
    // Row by row away from the hero (the bank widens further back), the nearest such spot.
    const back = Math.sign(toward.y - this.machi.y) || -1;
    for (let row = 0; row <= OFFSTAGE_BACK; row += 32) {
      for (let along = 0; along < OFFSTAGE_ALONG; along += 20) {
        for (const way of [1, -1]) {
          const p = { x: toward.x + way * (along + Math.abs(side)), y: toward.y + back * row + side * 0.4 };
          const seen = this.three ? this.three.sees(p) : view.contains(p.x, p.y);
          // A little further on, so none of those abreast with it shows at the edge.
          if (!seen && this.walkable(p.x, p.y)) return this.walkable(p.x + way * OFFSTAGE_MORE, p.y) ? { x: p.x + way * OFFSTAGE_MORE, y: p.y } : p;
        }
      }
    }
    return { x: toward.x - out.y * side, y: toward.y + out.x * side * ISO_Y };
  }

  private reinforce(caller: Trooper, call: { many: number; most: number }): void {
    const standing = (this.called.get(caller) ?? []).filter(s => s.alive);
    const coming = Math.min(call.many, call.most - standing.length);
    const bounds = { minX: 0, maxX: this.size.width, minY: 0, maxY: this.size.height };
    const at = caller.ground, dx = at.x - this.machi.x, dy = (at.y - this.machi.y) / ISO_Y, far = Math.hypot(dx, dy) || 1;
    const out = { x: dx / far, y: dy / far };
    // Out along that way until past the edge of what is seen (in 3D, what its camera sees).
    const view = this.cameras.main.worldView;
    const sees = (d: number) => {
      const spot = { x: this.machi.x + out.x * d, y: this.machi.y + out.y * d * ISO_Y };
      return this.three ? this.three.sees(spot) : view.contains(spot.x, spot.y);
    };
    let from = far;
    while (from < CALLED_MOST && sees(from - CALLED_PAST)) from += 10;
    for (let n = 0; n < coming; n++) {
      const side = (n - (coming - 1) / 2) * 46;
      let x = this.machi.x + out.x * from - out.y * side, y = this.machi.y + (out.y * from + out.x * side) * ISO_Y;
      // Where that is no ground to stand on, beside him.
      if (!this.walkable(x, y)) { x = at.x - out.y * side; y = at.y + out.x * side * ISO_Y; }
      const soldier = this.enlist(undefined, x, y, bounds).sent(this.walkable);
      this.realistas.push(soldier);
      standing.push(soldier);
      this.physics.add.overlap(this.bolts.bodies, soldier.zone, this.struck);
    }
    this.called.set(caller, standing);
  }

  // One of the king's men of a kind, by its name: a fusilier, unless it is one of the others.
  private enlist(kind: string | undefined, x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }): Soldier {
    // In 3D every one of them is a fusilier, the one soldier modelled so far.
    // In 3D only the kinds that have a model of their own there are themselves; the rest are fusiliers.
    const own = kind && kind in KINDS && (!this.three || IN_3D.has(kind));
    const soldier = own ? new Trooper(this, kind as KindName, x, y) : new Realista(this, x, y, bounds);
    // Each comes at the hero from a side of his own: one after another round the circle, never two the same.
    const angle = this.enlisted++ * GOLDEN;
    soldier.flank = { x: Math.cos(angle), y: Math.sin(angle) };
    if (this.route) soldier.route = this.route;
    // One in three goes for whatever is being brought along before the hero.
    if (this.enlisted % 3 === 0) this.raiders.add(soldier);
    return soldier;
  }

  /** Whether anyone posted to hold the zone a place is in is still on their feet. */
  private held(at: Spot): boolean {
    const letter = this.map ? letterAt(this.map, ...at.plot) : undefined;
    for (const [soldier, post] of this.posts) if (post.letter === letter && soldier.alive) return true;
    return false;
  }

  /** What the hero being played owns. */
  get pack(): Pack {
    return PACKS[this.hero];
  }

  /** Whoever sells and is near enough to buy from, if they will still have dealings with the hero. */
  get seller(): Npc | undefined {
    const npc = this.beside?.npc;
    return npc?.sells?.length && !closedTo(this.hero, npc) ? npc : undefined;
  }

  /** Buys one of something. Says whether it did. */
  buy(id: string): boolean {
    return this.pack.buy(id, this.hero, this.priceOf(id));
  }

  /** What something costs from whoever sells it here: dearer from a side that dislikes the hero. */
  priceOf(id: string): number {
    const item = ITEMS[id], side = this.beside?.npc?.side;
    return item ? Math.round(item.price * (side ? markup(this.stands[side]) : 1)) : 0;
  }

  /** How the hero stands with the village and the friars, and his fame, by what has happened. */
  get stands(): Standing {
    return standing(this.story?.happened ?? []);
  }

  /** Whether using one of something now would do anything. */
  useful(id: string): boolean {
    const use = ITEMS[id]?.use;
    return use === 'mend' ? this.vitals.standing && this.vitals.life < this.vitals.max : use === 'refill' ? this.flask.left < DRAUGHTS : false;
  }

  /** Uses one of something bought to be used up, if it would do anything. Says whether it did. */
  use(id: string): boolean {
    if (!this.useful(id)) return false;
    const use = this.pack.take(id);
    if (use === 'mend') { this.vitals.heal(MENDS); this.mend(MEND.life); }
    else if (use === 'refill') this.flask.refill();
    return !!use;
  }

  /** How the hero being played has grown. */
  get growth(): Growth {
    return GROWTHS[this.hero];
  }

  /**
   * One of the hero's blows lands on something: it takes what the blow is worth, more for
   * every point put into whatever dealt it, and bringing it down is worth experience.
   */
  private wound(foe: Foe, dx: number, dy: number, amount: number, stat?: Stat): void {
    if (!foe.alive) return;
    // A soldier struck comes after the hero wherever they are, and so does any of his own nearby.
    if (foe instanceof Realista || foe instanceof Trooper) {
      for (const other of this.realistas) if (other === foe || ground(other.ground, foe.ground) <= ALARM) other.provoke(PROVOKED);
    }
    foe.hit(dx, dy, amount * (stat ? this.growth.gives(stat) * this.pack.gives(stat) : 1));
    if (foe.alive) return;
    // Bringing it down is worth experience, and it leaves what it had on it.
    if (foe instanceof Trooper) {
      this.pack.gold += KINDS[foe.kind].spoils;
      this.earn(KINDS[foe.kind].worth);
      return;
    }
    const kind = foe instanceof Realista ? 'realista' : foe instanceof Chonchon ? 'chonchon' : 'cubo';
    this.pack.gold += SPOILS[kind];
    this.earn(WORTH[kind]);
  }

  /** The hero earns experience, and is told when it comes to a level. */
  private earn(xp: number): void {
    if (!this.growth.earn(xp)) return;
    this.board?.say(`Nivel ${this.growth.level}. Tenés ${this.growth.points === 1 ? 'un punto' : `${this.growth.points} puntos`} para repartir${touch.on ? ', en tu hoja' : ': I'}.`);
    this.mend(0xffe08a);
  }

  /** Puts one of the hero's points into something, and makes it so at once. Says whether it did. */
  spend(stat: Stat): boolean {
    if (!this.growth.put(stat)) return false;
    this.grown();
    return true;
  }

  // What the hero's points come to, laid on whatever of theirs is kept as a number of its own.
  private grown(): void {
    const max = LIFE * this.growth.gives('life'), more = max - this.vitals.max;
    this.vitals.max = max;
    // Life gained is life had: a point does not leave them wounded.
    if (more > 0) this.vitals.heal(more);
  }

  /** Keeps the game as it stands, for the next time it is opened. */
  keep(): void {
    if (!this.story || !this.stood) return;
    keep(this.hero, {
      at: { x: Math.round(this.stood.x), y: Math.round(this.stood.y) },
      inside: this.indoors?.within,
      growth: grownOf(this.growth),
      pack: ownedOf(this.pack),
      flask: this.flask.left,
      happened: [...this.story.happened],
      reached: this.story.reached,
      talks: keptTalks(this.hero),
    });
  }

  // Takes up a game left earlier: growth, what is owned, the flask, the conversations, and
  // everything that happened, with what it left on the map.
  private resume(saved: Saved): void {
    regrow(this.growth, saved.growth);
    repack(this.pack, saved.pack);
    this.flask.left = saved.flask;
    restoreTalks(this.hero, saved.talks);
    this.story?.restore(saved.happened, saved.reached);
    const has = (happening: string) => !!this.story?.has(happening);
    for (const talker of [...this.talkers]) {
      // What was picked up is not lying there any more.
      if (talker.take && has(`tiene:${talker.take.what}`)) {
        talker.take.drawn.destroy();
        this.three?.taken(talker.take.what);
        talker.hint.destroy();
        this.talkers = this.talkers.filter(t => t !== talker);
      }
      // What was made somewhere stands there; a fire lit there burns.
      const at = talker.spot?.at;
      if (at?.sprite && !at.stand && has(at.happening)) this.three?.build(at.id);
      if (at?.fire && has(at.happening)) this.three?.light(at.id);
      if (at && !at.stand && has(at.happening) && at.sprite && this.textures.exists(at.sprite)) {
        const done = this.add.image(talker.x, talker.y, at.sprite).setOrigin(0.5, 1).setDepth(talker.y);
        this.sight.add([done]);
        this.built.push({ x: talker.x, y: talker.y - 4, hw: done.width * 0.3, hh: 4 });
      }
    }
    // What was brought somewhere is where it was brought.
    for (const charge of this.led) {
      if (!has(charge.at.happening)) continue;
      const to = middle(charge.at.to);
      charge.body.x = to.x;
      charge.body.y = to.y;
      charge.drawn.setPosition(to.x, to.y).setDepth(to.y);
    }
  }

  // What someone who says one thing says now: something else once the story has turned, or as
  // his name has gone. The ending first, then what was done, then what is said of him.
  private saying(one: { says: string; later?: Record<string, string> }): string {
    const later = one.later ?? {}, has = (h: string) => !!this.story?.has(h), fama = this.stands.fama;
    if (has('final:emboscada') && later.emboscada) return later.emboscada;
    if (has('final:rebato') && later.rebato) return later.rebato;
    if (has('hecha:campana') && later.campana_fundida) return later.campana_fundida;
    if (fama >= 2 && later.fama_buena) return later.fama_buena;
    if (fama <= -2 && later.fama_mala) return later.fama_mala;
    return one.says;
  }

  // Under everyone who stands on the ground (the hero, the soldiers, the people, whoever is being
  // led): their own shape laid on it as their shadow, and in open country the grass over their feet.
  private underfoot(): void {
    // In 3D everyone casts their own shadow there.
    if (this.three) return;
    if (!this.silhouettes) this.silhouettes = new Silhouettes(this);
    const view = this.cameras.main.worldView, near = (p: Vec) => p.x > view.x - 80 && p.x < view.right + 80 && p.y > view.y - 40 && p.y < view.bottom + 120;
    const indoors = !!this.indoors?.indoors;
    const everyone: [Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, Vec, Phaser.GameObjects.GameObject?][] = [[this.sprite, this.machi, this.shadow]];
    for (const r of this.realistas) {
      const parts = r as unknown as { sprite: Phaser.GameObjects.Sprite; shadow?: Phaser.GameObjects.Ellipse };
      everyone.push([parts.sprite, r.ground, parts.shadow]);
    }
    for (const t of this.talkers) if (t.figure) everyone.push([t.figure[0] as Phaser.GameObjects.Sprite, t, t.figure[1]]);
    // A cart stands on the ground at many points (hooves, wheels, the drover's feet): its shadow is laid
    // column by column from where each stands, so none of it hangs in the air.
    for (const c of this.led) {
      if (footOf(c)) this.silhouettes.cast(c.drawn, c.drawn.visible && near(c.body) ? c.body : null, true);
      else everyone.push([c.drawn, c.body]);
    }
    for (const [sprite, feet, oval] of everyone) {
      // Drawn in 3D, he casts his own shadow there.
      const shown = sprite.visible && near(feet) && !(sprite === this.sprite && this.shownIn3d);
      this.silhouettes.cast(sprite, shown ? feet : null);
      (oval as Phaser.GameObjects.Ellipse | undefined)?.setAlpha(0);
      // Grass grows outside, and not where nobody walks.
      this.meadow?.over(sprite, shown && !indoors && this.map && zoneAt(this.map, feet.x, feet.y) ? feet : null);
    }
  }

  /** What the hero carries and what they have been told, by the story's own words for them. */
  get carried(): { has: string[]; knows: string[] } {
    const all = this.story?.happened ?? [];
    return { has: all.filter(h => h.startsWith('tiene:')).map(h => h.slice(6)), knows: all.filter(h => h.startsWith('sabe:')).map(h => h.slice(5)) };
  }

  /** The hero's flask: how many draughts are left of how many, and whether one can be taken now. */
  get draughts(): { left: number; ready: boolean } {
    return { left: this.flask.left, ready: this.flask.ready };
  }

  /** For trying things out: just enough experience to reach the next level. */
  levelUp(): void {
    this.earn(toNext(this.growth.level) - this.growth.xp);
  }

  /** For trying things out: full life, and mana or fury to the brim. */
  restore(): void {
    this.vitals.heal(this.vitals.max);
    this.abilities.mana = MANA;
    this.fury.gain(FURY);
  }

  /** Everything there is to fight. */
  private get foes(): Foe[] {
    return [...this.enemies, ...this.chonchones, ...this.realistas];
  }

  get life(): number {
    return this.vitals.life / this.vitals.max;
  }

  /** How much of her mana is left, from 0 to 1. */
  get mana(): number {
    return this.abilities.mana / MANA;
  }

  /** How much fury he has built up, from 0 to 1. */
  get rage(): number {
    return this.fury.value / FURY;
  }

  /** Who is being played, for the HUD to show what is theirs. */
  /** The two skills of whoever is played, in the order of their slots: whether each can be used, and how far through its cooldown it is. */
  get skills(): { ready: boolean; cooldown: number }[] {
    return (this.hero === 'inti' ? ['strike', 'heal'] as const : ['musket', 'grenade'] as const).map(name => this.skill(name));
  }

  /** What can be done with whatever is beside the hero, in a word; nothing if there is nothing to be done. */
  get offer(): string | undefined {
    if (!this.vitals.standing) return undefined;
    const led = this.led.find(c => c.going && inZone(c, this.machi) <= 1);
    if (led) return led.halted ? (led.at.drives ? 'Que siga' : 'Que te siga') : 'Que espere';
    const near = this.beside;
    if (!near) return undefined;
    if (near.npc) return 'Hablar';
    if (near.take) return 'Levantar';
    const does = near.charge?.at.does ?? (near.spot && !(near.spot.at.guarded && this.held(near.spot.at)) ? near.spot.at.does : undefined);
    return does?.replace(/^./, first => first.toUpperCase());
  }

  get playing(): Hero {
    return this.hero;
  }

  /** An ability's state for the HUD: whether it can be used, and how much cooldown is left (1 to 0). */
  skill(ability: Ability | Arm): { ready: boolean; cooldown: number } {
    if (ability === 'musket' || ability === 'grenade') {
      const { cost, cooldown } = ARMS[ability];
      return {
        ready: this.armWait[ability] === 0 && this.fury.value >= cost,
        cooldown: this.armWait[ability] / cooldown,
      };
    }
    return { ready: this.abilities.ready(ability), cooldown: this.abilities.cooldown(ability) };
  }

  /** Name of the animation on screen, for the debug readout. */
  get state(): string {
    return this.label;
  }

  private draw(): void {
    const pose = this.machi.pose();
    const x = Math.round(pose.x), y = Math.round(pose.y);
    const ax = Math.round(pose.ax);

    // Things further down the screen are in front.
    this.shadow.setPosition(x, y - 1).setDepth(y - 0.5);
    const sheet = KITS[this.hero].sheets[pose.sheet];
    this.sprite
      .setTexture(sheet.src, pose.frame)
      .setFlipX(pose.flip)
      // The origin is her feet under the body's centre. Flipping mirrors the
      // frame inside its own box, so the centre moves to the other side.
      .setDisplayOrigin(pose.flip ? (sheet.w ?? FRAME) - ax : ax, FRAME - pose.ay)
      .setPosition(x, y)
      .setDepth(y);
    this.label = pose.sheet + (pose.flip ? ' (espejado)' : '');

    const standing = this.vitals.standing;
    // Flickers while she cannot be hurt again, so the grace can be seen.
    const blink = this.vitals.protected && Math.floor(this.time.now / 70) % 2 === 0;
    // Dead, she stays where she fell; the shadow under her feet goes with her standing.
    this.sprite.setAlpha(blink ? 0.45 : 1);
    this.shadow.setVisible(standing);
    // Drawn in 3D: her 2D drawing is not shown over it.
    if (this.overlaid) { this.sprite.setVisible(false); this.shadow.setVisible(false); }
    if (this.hitFx) {
      this.hitFx.amount = this.flash;
      // He burns with it, dying down as it runs out.
      this.hitFx.burn = this.wrath.active ? RAGE.glow * Math.min(1, this.wrath.left / 0.8) : 0;
    }
    this.hurtbox.setPosition(x, y - TORSO.up);
    (this.hurtbox.body as Phaser.Physics.Arcade.Body).enable = standing;

    if (this.look) {
      const cam = this.cameras.main;
      this.look.grain = fx.grain ? 1 : 0;
      this.look.light = fx.light ? 1 : 0;
      this.look.dark = tune.dark;
      this.look.reach = tune.reach;
      this.look.glow = tune.glow;
      this.look.crt = fx.crt ? 1 : 0;
      this.look.snow = fx.snow ? 1 : 0;
      this.look.leaves = fx.leaves ? 1 : 0;
      this.look.scrollX = cam.worldView.x;
      this.look.scrollY = cam.worldView.y;
      this.look.lightX = (x - cam.worldView.x) * cam.zoom;
      this.look.lightY = (y - CHEST - cam.worldView.y) * cam.zoom;
    }
  }

  // Diamonds on a staggered grid, each in one of five close greens picked by
  // a hash of its cell, drawn once into a texture the size of the world.
  private drawGround(): void {
    const tex = this.textures.createCanvas('ground', this.size.width, this.size.height)!;
    const g = tex.getContext();
    g.fillStyle = '#2b3524';
    g.fillRect(0, 0, this.size.width, this.size.height);
    const greens = ['#303b27', '#2e3926', '#333e29', '#2c3624', '#35402a'];
    const cols = Math.ceil(this.size.width / TILE_W) + 2, rows = Math.ceil(this.size.height / TILE_H) + 2;
    for (let r = -1; r <= rows * 2; r++) {
      for (let c = -1; c <= cols * 2; c++) {
        if ((r + c) % 2 === 0) continue;
        const x = c * TILE_W / 2, y = r * TILE_H / 2;
        g.fillStyle = greens[Math.abs((c * 73856093) ^ (r * 19349663)) % greens.length];
        g.beginPath();
        g.moveTo(x, y - TILE_H / 2); g.lineTo(x + TILE_W / 2, y);
        g.lineTo(x, y + TILE_H / 2); g.lineTo(x - TILE_W / 2, y);
        g.fill();
      }
    }
    tex.refresh();
    this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-1e6);
  }
}
