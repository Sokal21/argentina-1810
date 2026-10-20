# A character's rig and animations

From the model to a GLB with every clip, and the clips played in the game. Worked out on Cabral,
October 2026, with the user judging every clip in the game. Read it all before animating.

## Where a clip comes from: in this order

1. **Mixamo**, whenever it has the action. Clean, made for games, every bone's twist. The user
   downloads it (mixamo.com, free Adobe account, **FBX, "Without Skin"**) into `tools/mocap/`.
   Its files stay out of git (`.gitignore`, licence: usable in the game, not redistributable);
   only the GLB made from them is kept. Chosen so far: Stand To Roll (his roll), Breathing Idle,
   Walking (his gait, replacing CMU's), Falling Back Death (the royalist's death), Drinking (his
   flask: only the draught, played in 1.4 s; most of the capture is standing about), Walking
   Backwards (walking against where the pointer has him look). Each one's
   flags are in `tools/mocap/README.md`.
2. **CMU motion capture** (free, `tools/mocap/*.bvh`, index: the cgspeed `cmu-mocap-index-text.txt`
   in the una-dinosauria/cmu-mocap mirror). Good enough for walks (his gait was CMU 07_01); crude for
   acrobatics (2008, actors leaping obstacles, rolls over a second long).
3. **Keyed by hand** (`tools/blender/keyframes.py`), for what no capture has: the sabre cut, the
   musket's draw, aim and shot. Hand-keyed body motion reads as robotic; the user said so of every
   walk, idle and roll keyed by eye. Key by hand only what is about a weapon.
4. Paid generation (Tripo's library, text-to-motion): **ask first**; the user finds it expensive.
   Its clips were judged "chaotic" (dive) or flat (idle).

## The rig

- Tripo, `animations/rig` with **`"model": "v1.0-20240301"`** (only v1.0 rigs take Tripo's
  presets; v2.5 rigs failed every retarget with "Invalid input parameter"), `spec` left as tripo.
  25 credits. The rig file is the base every clip is keyed or retargeted onto.
- Its skeleton: Root, Hip, Waist, Spine01, Spine02, NeckTwist01/02, Head; L_/R_ Clavicle,
  Upperarm, Forearm, Hand (no finger bones), Thigh, Calf, Foot, ToeBase; twist bones in arms and
  legs. Rig axes as Tripo gives it: **+X forward, +Y his left, +Z up**; he is ~0.75 tall.

## Putting a capture on: `tools/blender/retarget_rot.py`

```
Blender -b --python tools/blender/retarget_rot.py -- RIG.glb CLIP.(fbx|bvh) OUT.glb --name NAME --frames A:B [--ground] [--twist 0.4] [--straight 0.85] [--travel src/three/rolls/NAME.json]
```

By each bone's turn from a shared pose of reference (the rig brought to the capture's T), twist
and all. What it does and why, each learned from a clip that came out wrong:

- **Ahead is the way the actor travels** over the stretch, not the way his rest pose faces
  (rolls came out sideways). A clip that hardly moves (an idle) is squared once by its first
  pose, and a walk or run cycle (`--gait`) once by how it faces on average, keeping the hips'
  turn with each step; otherwise he is squared **only while standing**, eased through the roll
  (squared by the start pose, an actor standing askew dived askew). Blender takes any option that
  starts like one of its own (`--cycle` → `--cycles-...`) even after `--`: name options with care.
- **Up is straight up**, not the rest spine.
- **Hands are not given turns**: no joint beyond them to know their rest by; they came out flat
  and turned a right angle. They follow the forearms.
- **A spine of three is given bone for bone** (Mixamo Spine/1/2 → Waist/Spine01/Spine02);
  passed one along, the twist gathered in one place and showed.
- `--twist` keeps that share of each spine bone's twist about its length (0.4 for the roll: the
  back wrung round). `--straight` turns the whole body each frame so the hip line lies level and
  square across his way (0.85 for the roll: rolling over the shoulder he lay askew).
- `--ground` rests his lowest point on the ground every frame (measured on the posed mesh): for
  a roll. **Anything on its feet takes `--feet`** (lowest heel or toe at its rest height): the
  scabbard hangs nearly to the ground, took it from `--ground`, and the idle and walk floated.
- **Pose with no action attached**, and attach it only to key: otherwise each update lays back
  the frames already keyed and the hips crept up frame by frame.
- `--travel` writes how far the actor had come at each frame, for the game to sync to (below).
- `--backward` for a fall back: ahead is whence he goes, never squared by the hips (the actor
  stood side on, on guard, and squared by them he fell to his side).
- **An actor who starts in a pose of his own** (on guard): `tools/blender/ease_from.py CLIP FROM
  OUT --frames 8` eases the clip's first frames from a frame of another clip (his idle). Approved
  on the royalist's death: "quedó increíble".

`retarget_bvh.py` is the older, direction-only one: fine for walk cycles (`--stride`), it loses
twist. `measure_bvh.py` prints a clip's joint angles, to key by real numbers.

## Keying by hand: `tools/blender/keyframes.py`

`Rig(rig.glb, carries=('sabre', 'musket'))`, then `rig.key(action, frame, pose)`; a pose names
only the bones that move:

- `ahead(x, y, z)`: point a bone (joint to next joint) that way. `turn(axis, degrees)`: turn
  about a rig axis on top of the parent (a limb hanging down swings forward on a **negative**
  `y` turn; an upright bone leans forward on a positive one).
- `plant(x, y, z, knee=...)` on a thigh or upper arm: two-bone IK, the end at that point. **Plant
  the feet whenever the hips move** (a lunge slid until the feet were planted).
- `'sabre': ahead(...)` aims a carried thing by turning its hand; `cocked(degrees, about=plane)`
  sets it that far off the forearm. A held blade stays **35°–130° off the forearm** (`GRIP`), and
  the turn's twist is shared along the forearm's twist bones (in the wrist alone it looked
  wrenched).
- **Never aim hands with `ahead`**: their axis is made up. Keys are kept continuous (a full roll
  undid itself between keys). `rig.lowest()` gives the posed mesh's lowest point.
- For a cut, **describe the hand's path and the blade's turning, keyed every frame** (`tajo.py`),
  not a few poses of shoulder, elbow and wrist: between few keys the point wandered.

## What he carries: `tools/blender/props.py`

Plain shapes, flat colours (Blender's linear colour: darker than it looks), held by a bone:
`sabre` (right hand; `fist` bends the hand's mesh closed round it, no finger bones), `musket`
(slung on Spine02), `musket_in_hand` (a second musket set along the shot in the aiming pose;
**bind the action's slot** before measuring a pose: an action from another file is not played
otherwise). The game shows one musket or the other and hides the sabre while aiming.
**A gun in both hands is held by the right**: in every frame both hold it, turn the right wrist
so the barrel runs to the left hand (`held` in `anims/mosquete.py`; keyed only at the poses, the
eased frames between let the left hand off by 14 cm), and swap the back gun for the hand's where
both hands are on it.

## A second character: everything is reused

The royalist got all of Cabral's clips at once, approved: the same Tripo v1.0 rig (the same 41
bones), the Mixamo clips re-run by `tools/mocap/README.md`, the hand-keyed ones
(`tools/blender/anims/tajo.py`, `mosquete.py`) re-run on his rig as they are. Their planted points
are measured on Cabral (`Rig(..., written_for=CABRAL)`): on another body each hand's point moves
as far as his shoulder stands from Cabral's, each foot's as far as his ankle (the royalist's
shoulders stand higher, and he held the musket at his chest otherwise). Cabral's own clips come
out byte for byte the same. Re-run a character's hand-keyed clips whenever Cabral's script changes.

## The game's model

`prepare_rigged.py OUT MAIN.glb CLIPS... --front +x --carries sabre,musket,musket_in_hand` joins
every clip into `assets/NAME/3d/NAME_animado.glb`. Re-run it after any clip changes, with the
whole list (the last command in git history has it).

## Playing them: `src/three/motion.ts` and `main.ts`

- `play(name, {once, lasts, pace, afresh, blend})`; `hold(name, share)` shows a clip at a share,
  for one driven by something other than time. Blows blend in fast (0.05 s).
- **Walks are paced by how far a foot reaches** (`reach`), so the feet never slide at any speed.
- **The roll drives both clip and movement from phases** (`ROLL_PHASES`, `rollAt`): he is moved
  as far as the actor had come at that moment (`--travel`), so neither runs ahead and he never
  slides; the flight is given less of the dash. Synced to the controller's own curve, he slid
  before diving and the getting up was crammed into the last inch.
- **Steered by the pointer** (the 3D game's controls): he looks at the mouse, at any angle, and the
  keys move him without turning him (`MachiController.steer`; slower to the side, slower still and
  never running backwards: `STEER`). His legs walk ahead or backwards, whichever is nearer his look,
  giving up to 30° toward it, and his spine turns the rest over its three bones, so it never turns
  more than 60° (90° at the most); the change of legs waits 15° past square, so it does not flicker.
- Swings and shots face where the controller turns him; aiming at the pointer he turns at any
  angle, and is turned so **the barrel's line**, not his middle, meets the pointer.

## Checking

- **`modelos.html`** (`src/three/modelos.ts`): every model side by side in the game's look, each
  clip played as the game times it, muskets and sabre shown as the game shows them; one clip
  alone, turned, slowed, paused. Show the user this rather than strips: strips draw both muskets
  and the sabre at once, which the user took for a fault. A new character goes in `WHO`.

- `tools/blender/strip.py MODEL.glb ACTION DIR --turn DEG --frames N`, `tools/strip_sheet.py`:
  frames from the game's camera. Measure what can be measured (angles, heights, lowest point)
  rather than judge thumbnails; the strips crop and mislead.
- In the game, frame by frame, **only when the user asks**: dev `slow` (0 stops) and
  `tick(seconds)` in the console; `tools/look/blow.mjs` with Playwright. What the strips hid and
  the game showed: a 1-pixel blade vanishing, a sweep of 90° a frame reading as jumps.

## What reads, at ~80 pixels tall (the user's verdicts)

- Motion must be big: 1–2° of breathing or sway is invisible; 4–18° reads.
- A blow needs at least ~6 frames of sweep and something to carry the eye (`trail.ts`).
- A slash is arm and blade as one lever swung from the shoulder, wrapping round the body; with
  the hand reaching forward and the point at the enemy it read as a thrust.
- Running arms swing back twice as far as forward, elbows bent, hands by the hips.
- Ease blows slow-fast-slow; keep every clip's feet planted.
