/** Cabral's grenade: lobbed a good way, onto a small patch that it leaves burning. */
export const GRENADE = {
  cost: 40,       // fury it takes
  cooldown: 12,   // seconds until he can throw another
  range: 200,     // how far from him it can land, along the ground
  flight: [0.55, 0.95] as [number, number], // seconds in the air, for the nearest and the furthest throw
  arc: 46,        // how high it climbs on the longest throw
  hand: 44,       // height it leaves his hand at
  radius: 30,     // of the blast and of the fire it leaves
  damage: 2,      // of the blast
  burns: 4.5,     // seconds the fire lasts
  smoulder: 3,    // seconds something set alight goes on burning once it is out of the fire
  scorch: 0.5,    // seconds between each time burning hurts
  burn: 1,        // how much it hurts each time
};
