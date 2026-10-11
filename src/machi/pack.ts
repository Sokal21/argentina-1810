import type { Hero } from './data';
import type { Stat } from './growth';

// What a hero owns: their money, what they have bought to use up, and what
// they wear in each of the four places something can be worn. Nothing here
// is drawn, and nothing here knows what using a thing does to the game:
// it says what there is and what it is worth.

/** Where something can be worn. */
export type Place = 'weapon' | 'chest' | 'boots' | 'charm';
export const PLACES: Record<Place, string> = { weapon: 'Arma', chest: 'Peto', boots: 'Botas', charm: 'Talismán' };

/** Something that can be bought. */
export interface Item {
  id: string;
  name: string;
  /** What it costs, in reales. Things are dear: a purchase is something saved up for. */
  price: number;
  /** What it does, for whoever is deciding whether to buy it. */
  does: string;
  icon: string;
  /** Worn in a place, where it makes something of its wearer's that much more than it was; */
  wear?: { place: Place; stat: Stat; adds: number };
  /** or used up, for one of the things the game knows how to do. */
  use?: 'mend' | 'refill';
  /** Only for one of the heroes, if not for both. */
  only?: Hero;
}

/** Everything there is to buy, by its name in the game's own workings. */
export const ITEMS: Record<string, Item> = {
  venda: {
    id: 'venda', name: 'Vendas', price: 45, icon: 'cosas/venda.png', use: 'mend',
    does: 'Una vez: devuelven dos golpes de vida.',
  },
  odre: {
    id: 'odre', name: 'Odre de caña', price: 70, icon: 'cosas/odre.png', use: 'refill',
    does: 'Una vez: llena el frasco, estés donde estés.',
  },
  sable: {
    id: 'sable', name: 'Sable de tropa', price: 260, icon: 'cosas/sable.png', only: 'cabral',
    wear: { place: 'weapon', stat: 'basic', adds: 0.25 },
    does: 'Arma: un cuarto más de daño por sablazo.',
  },
};

/** What each kind of enemy leaves when it falls, in reales. */
export const SPOILS = { cubo: 1, chonchon: 3, realista: 4 };

/** What a hero owns. */
export class Pack {
  gold = 0;
  /** How many of each thing to use up they have. */
  readonly bag: Record<string, number> = {};
  /** What they wear in each place, by its name. */
  readonly worn: Partial<Record<Place, string>> = {};
  /** What they own that is worn, whether they have it on or not. */
  readonly owned = new Set<string>();

  /** Whether one of something can be paid for, and makes sense to buy. */
  canBuy(id: string, hero: Hero): boolean {
    const item = ITEMS[id];
    if (!item || (item.only && item.only !== hero) || this.gold < item.price) return false;
    // Something worn is bought once.
    return !(item.wear && this.owned.has(id));
  }

  /** Buys one of something. Says whether it did. What is worn is put on at once. */
  buy(id: string, hero: Hero): boolean {
    if (!this.canBuy(id, hero)) return false;
    const item = ITEMS[id];
    this.gold -= item.price;
    if (item.wear) {
      this.owned.add(id);
      this.worn[item.wear.place] = id;
    } else this.bag[id] = (this.bag[id] ?? 0) + 1;
    return true;
  }

  /** Takes one of something to use up out of the bag. Says what it is for, or nothing if there was none. */
  take(id: string): Item['use'] {
    if (!this.bag[id]) return undefined;
    this.bag[id]--;
    return ITEMS[id].use;
  }

  /** Puts on something owned, or takes off what is worn in its place if it is already on. */
  wear(id: string): void {
    const place = ITEMS[id]?.wear?.place;
    if (!place || !this.owned.has(id)) return;
    if (this.worn[place] === id) delete this.worn[place];
    else this.worn[place] = id;
  }

  /** How many times what it was something of theirs is, for what they have on. */
  gives(stat: Stat): number {
    return Object.values(this.worn).reduce((much, id) => {
      const wear = ITEMS[id!]?.wear;
      return wear?.stat === stat ? much + wear.adds : much;
    }, 1);
  }
}

/** Each hero's pack, for as long as the page is open. */
export const PACKS: Record<Hero, Pack> = { inti: new Pack(), cabral: new Pack() };
