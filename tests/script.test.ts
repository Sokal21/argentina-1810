import { describe, expect, it } from 'vitest';
import { PEOPLE } from '../src/npc/people';
import { offered, passed, scripted, type Option, type Script } from '../src/npc/script';
import { SCRIPTS } from '../src/npc/scripts';
import { Talk } from '../src/npc/talk';

const plain = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Plays a whole conversation by choosing, taking at each moment whichever option `choose` picks. */
async function play(script: Script, choose: (options: Option[], turn: number) => Option) {
  const npc = PEOPLE[script.who];
  const talk = new Talk(npc, 'cabral', scripted(script));
  const leaked: string[] = [];
  for (let turn = 0; turn < 60 && !talk.over; turn++) {
    const beat = offered(script, talk.trust, talk.lines, key => talk.took(key));
    if (!beat) break;
    const option = choose(beat.options, turn);
    const before = talk.trust;
    await talk.say(option.says);
    // Whatever of theirs is given away in an answer has to be something they already trusted enough to tell.
    for (const favour of npc.favours) {
      if (favour.tells?.some(word => plain(option.answer).includes(plain(word))) && before < favour.needs) leaked.push(`${beat.id}: ${favour.key}`);
    }
  }
  return { talk, leaked };
}
const best = (options: Option[]) => [...options].sort((a, b) => b.animo - a.animo)[0];
const worst = (options: Option[]) => [...options].sort((a, b) => a.animo - b.animo)[0];

describe('a conversation by choosing', () => {
  const script: Script = {
    who: 'braulio',
    beats: [
      { id: 'hola', options: [{ says: 'Buenas.', answer: 'Buenas.', animo: 1 }, { says: 'Abrí.', answer: 'No.', animo: -1 }] },
      { id: 'lejos', trust: 9, options: [{ says: 'Contame.', answer: 'Bueno.', animo: 0 }, { says: 'Dale.', answer: 'Ya va.', animo: 0 }] },
      { id: 'despues', after: ['hola'], options: [{ says: '¿Y ahora?', answer: 'Ahora nada.', animo: 0 }, { says: 'Me voy.', answer: 'Vaya.', animo: 0 }] },
    ],
  };

  it('offers the first moment that can come up, and each only once', async () => {
    const talk = new Talk(PEOPLE.braulio, 'cabral', scripted(script));
    expect(offered(script, talk.trust, talk.lines)?.id).toBe('hola');
    await talk.say('Buenas.');
    expect([...passed(script, talk.lines)]).toEqual(['hola']);
    // The one that asks for more trust than there is is passed over.
    expect(offered(script, talk.trust, talk.lines)?.id).toBe('despues');
    await talk.say('Me voy.');
    expect(offered(script, talk.trust, talk.lines)).toBeUndefined();
  });

  it('answers what was written for what was said, and moves their trust by it', async () => {
    const talk = new Talk(PEOPLE.braulio, 'cabral', scripted(script));
    const turn = await talk.say('Abrí.');
    expect(turn.says).toBe('No.');
    expect(talk.trust).toBe(PEOPLE.braulio.trust - 1);
  });
});

describe('what was written for each of them', () => {
  it('is there for all four', () => {
    expect(Object.keys(SCRIPTS).sort()).toEqual(Object.keys(PEOPLE).sort());
  });

  for (const [who, script] of Object.entries(SCRIPTS)) {
    const npc = PEOPLE[who];
    describe(npc.name, () => {
      it('is well made: its own, two or three things to say each time, none said twice', () => {
        expect(script.who).toBe(who);
        expect(new Set(script.beats.map(b => b.id)).size).toBe(script.beats.length);
        const says = script.beats.flatMap(b => b.options.map(o => o.says));
        expect(new Set(says).size).toBe(says.length);
        const wants = new Set(['nada', 'echar', ...npc.favours.map(f => f.wants), ...(npc.errands ?? []).map(e => e.wants)]);
        for (const beat of script.beats) {
          expect(beat.options.length, beat.id).toBeGreaterThanOrEqual(2);
          expect(beat.options.length, beat.id).toBeLessThanOrEqual(3);
          for (const id of beat.after ?? []) expect(script.beats.some(b => b.id === id), `${beat.id} after ${id}`).toBe(true);
          for (const option of beat.options) expect(wants.has(option.quiere ?? 'nada'), `${beat.id}: ${option.quiere}`).toBe(true);
        }
      });

      it('gives up everything to whoever always says what sits best with them', async () => {
        const { talk } = await play(script, best);
        expect(talk.over).toBe(false);
        for (const favour of npc.favours) expect(talk.has(favour.key), favour.key).toBe(true);
        // And is asked whatever they have to ask, and takes it on.
        // (what waits on something having happened in the story is not asked here: nothing has).
        for (const errand of (npc.errands ?? []).filter(e => !e.given)) expect(talk.took(errand.key), errand.key).toBe(true);
      });

      it('shuts for good on whoever always says the worst', async () => {
        const { talk } = await play(script, worst);
        expect(talk.over).toBe(true);
        for (const favour of npc.favours) expect(talk.has(favour.key), favour.key).toBe(false);
      });

      it('never gives anything away before they trust enough to, whatever is chosen', async () => {
        // A good many ways through it, each always the same.
        for (let seed = 1; seed <= 400; seed++) {
          const { leaked } = await play(script, (options, turn) => options[(Math.imul(seed, 2654435761) >>> (turn % 28)) % options.length]);
          expect(leaked, `way ${seed}`).toEqual([]);
        }
      });

      it('always has something to say first, to answer how they greet', () => {
        const talk = new Talk(npc, 'cabral', scripted(script));
        expect(offered(script, talk.trust, talk.lines)).toBeDefined();
      });
    });
  }

  it('asks again what don Braulio asks until it is taken on, whatever was answered first', async () => {
    const script = SCRIPTS.braulio;
    // Someone who always says the plain thing: he never earns more trust than he came with.
    const talk = new Talk(PEOPLE.braulio, 'cabral', scripted(script));
    const plainest = (options: Option[]) => options.find(o => o.animo === 0 && !o.quiere) ?? options[0];
    for (let turn = 0; turn < 12; turn++) {
      const beat = offered(script, talk.trust, talk.lines, key => talk.took(key));
      if (!beat || beat.asks) break;
      await talk.say(plainest(beat.options).says);
    }
    // It has come to the asking, without his having won anything.
    expect(talk.trust).toBe(PEOPLE.braulio.trust);
    expect(offered(script, talk.trust, talk.lines, key => talk.took(key))?.asks).toBe('hijo');
    // He answers something else, and is asked again.
    await talk.say('¿Y por qué no fue nadie a buscarlo?');
    const again = offered(script, talk.trust, talk.lines, key => talk.took(key));
    expect(again?.asks).toBe('hijo');
    const turn = await talk.say(again!.options.find(o => o.quiere === 'encargar_hijo')!.says);
    expect(turn.agreed.map(e => e.key)).toEqual(['hijo']);
    expect(offered(script, talk.trust, talk.lines, key => talk.took(key))?.asks).toBeUndefined();
  });

  it('has don Braulio wait for the news only once there is news, and takes it when it is told', async () => {
    const script = SCRIPTS.braulio;
    const talk = new Talk(PEOPLE.braulio, 'cabral', scripted(script));
    const knows = new Set<string>();
    talk.happened = h => knows.has(h);
    const next = () => offered(script, talk.trust, talk.lines, key => talk.took(key), talk.happened);
    expect(script.beats.find(b => b.id === 'noticia')?.given).toBe('sabe:tobias');
    // Before he has been to the chapel there is no such thing to say.
    for (let turn = 0; turn < 30; turn++) {
      const beat = next();
      if (!beat) break;
      expect(beat.id).not.toBe('noticia');
      if (beat.asks) { await talk.say(beat.options.find(o => o.quiere)!.says); continue; }
      await talk.say([...beat.options].sort((a, b) => b.animo - a.animo)[0].says);
    }
    knows.add('sabe:tobias');
    const beat = next();
    expect(beat?.id).toBe('noticia');
    const turn = await talk.say(beat!.options[0].says);
    expect(turn.agreed.map(e => e.happening)).toEqual(['dijo:noticia']);
  });
});
