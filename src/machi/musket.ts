/** Cabral's musket: a shot aimed while its key is held and let go on release. */
export const MUSKET = {
  cost: 30,       // fury it takes
  cooldown: 9,    // seconds until it can be fired again: a musket is slow to reload
  height: 38,     // how far above the ground the ball leaves the barrel
  girth: 8,       // half the width of the ball's path: how near a miss still counts
  radius: 46,     // of the blast where the ball lands, along the ground
  damage: 2,      // to everything inside the blast
};
