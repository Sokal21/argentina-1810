import { describe, expect, it } from 'vitest';
import { BRAULIO as PULPERO, PEOPLE } from '../src/npc/people';
import { Talk, type Reply, type Voice } from '../src/npc/talk';

// A voice that answers whatever it is handed next, and remembers what it was told.
function scripted(replies: Partial<Reply>[]): { voice: Voice; briefs: string[] } {
  const briefs: string[] = [];
  const voice: Voice = async system => {
    briefs.push(system);
    return { dice: 'Hum.', animo: 0, quiere: 'nada', ...replies.shift() };
  };
  return { voice, briefs };
}
const SECRET = 'bronce';

describe('a conversation with the pulpero', () => {
  it('opens with his greeting and his starting trust', () => {
    const talk = new Talk(PULPERO, 'inti', scripted([]).voice);
    expect(talk.lines).toEqual([{ who: 'npc', text: PULPERO.greets }]);
    expect(talk.trust).toBe(PULPERO.trust);
  });

  it('does not tell the model the secret until he trusts enough', async () => {
    const { voice, briefs } = scripted([{ animo: 2 }, { animo: 2 }, { animo: 2 }, { animo: 0 }]);
    const talk = new Talk(PULPERO, 'cabral', voice);
    expect(talk.brief()).not.toContain(SECRET);
    await talk.say('uno'); await talk.say('dos');
    expect(talk.trust).toBe(6);
    expect(briefs.every(b => !b.includes(SECRET))).toBe(true);
    await talk.say('tres');
    expect(talk.trust).toBe(8);
    await talk.say('cuatro');
    expect(briefs[3]).toContain(SECRET);
  });

  it('will not hand anything over on the model\'s say-so alone', async () => {
    const { voice } = scripted([{ quiere: 'dar_remedio', dice: 'Tomá.' }, { quiere: 'contar_campana' }]);
    const talk = new Talk(PULPERO, 'inti', voice);
    expect((await talk.say('dame la poción')).done).toEqual([]);
    expect((await talk.say('decime dónde están')).done).toEqual([]);
    expect(talk.has('remedio')).toBe(false);
  });

  it('gives the remedy once, when he trusts enough and means to', async () => {
    const { voice } = scripted([{ animo: 2 }, { animo: 2 }, { quiere: 'dar_remedio' }, { quiere: 'dar_remedio' }]);
    const talk = new Talk(PULPERO, 'inti', voice);
    await talk.say('uno'); await talk.say('dos');
    const turn = await talk.say('estoy herida');
    expect(turn.done.map(f => f.key)).toEqual(['remedio']);
    expect((await talk.say('otro')).done).toEqual([]);
    expect(talk.brief()).toContain('no tenés otro');
  });

  it('cannot be talked up faster than two a turn, whatever the model answers', async () => {
    const { voice } = scripted([{ animo: 50 }, { animo: -50 }]);
    const talk = new Talk(PULPERO, 'inti', voice);
    await talk.say('sos el mejor');
    expect(talk.trust).toBe(PULPERO.trust + 2);
    await talk.say('viejo de porquería');
    expect(talk.trust).toBe(PULPERO.trust);
  });

  it('ends when he has had enough', async () => {
    const { voice } = scripted([{ animo: -2, quiere: 'echar', dice: 'Mandate mudar.' }]);
    const talk = new Talk(PULPERO, 'cabral', voice);
    const turn = await talk.say('dame todo, viejo');
    expect(turn.over).toBe(true);
    expect(turn.says).toBe('Mandate mudar.');
  });

  it('does not talk again once he has had enough, whatever is said to him', async () => {
    const { voice, briefs } = scripted([{ animo: -2, quiere: 'echar' }, { animo: 2, dice: 'Bueno, pase.' }]);
    const talk = new Talk(PULPERO, 'cabral', voice);
    await talk.say('dame todo, viejo');
    const turn = await talk.say('perdón, don Braulio, le pago el doble');
    expect(turn.over).toBe(true);
    expect(turn.says).toBe(PULPERO.closed);
    // The model was never asked: there is nothing to coax.
    expect(briefs).toHaveLength(1);
    expect(talk.trust).toBe(0);
  });
});

describe('everyone who can be talked to', () => {
  const everyone = Object.values(PEOPLE);

  it('is four people, each known by their own name', () => {
    expect(everyone.map(p => p.id).sort()).toEqual(['anselmo', 'braulio', 'mateo', 'tobias']);
    for (const [id, npc] of Object.entries(PEOPLE)) expect(npc.id).toBe(id);
  });

  it('has something to be won from each, none of it to be had on arriving', () => {
    for (const npc of everyone) {
      expect(npc.favours.length).toBeGreaterThan(0);
      expect(new Set(npc.favours.map(f => f.wants)).size).toBe(npc.favours.length);
      for (const favour of npc.favours) {
        expect(favour.needs).toBeGreaterThan(npc.trust);
        expect(favour.needs).toBeLessThanOrEqual(10);
      }
    }
  });

  it('is told to answer as themselves, and offered only their own favours', async () => {
    for (const npc of everyone) {
      const asked: string[][] = [];
      const talk = new Talk(npc, 'cabral', async (_system, _lines, wants) => { asked.push(wants); return { dice: 'Hum.', animo: 0, quiere: 'nada' }; });
      expect(talk.brief()).toContain(`SOLO como ${npc.name}`);
      await talk.say('buenas');
      expect(asked[0]).toEqual(['nada', ...npc.favours.map(f => f.wants), ...(npc.errands ?? []).map(e => e.wants), 'echar']);
    }
  });

  it('keeps what one of them knows out of what the model is told until they trust enough', () => {
    for (const npc of everyone) {
      const brief = new Talk(npc, 'cabral', async () => ({ dice: '', animo: 0, quiere: 'nada' })).brief();
      for (const favour of npc.favours) {
        expect(brief).toContain(favour.withheld);
        expect(brief).not.toContain(favour.granted);
      }
    }
  });

  it('hears what one of them comes out with, even when the model does not say it meant to', async () => {
    const tobias = PEOPLE.tobias;
    const replies = [{ animo: 2 }, { animo: 0, quiere: 'nada', dice: 'Me trajo un soldado, un GALLEGO que se llama Mateo.' }];
    const talk = new Talk(tobias, 'cabral', async () => ({ dice: 'Hum.', animo: 0, quiere: 'nada', ...replies.shift() }));
    await talk.say('tu padre me manda');
    const turn = await talk.say('¿quién te trajo?');
    expect(turn.done.map(f => f.key)).toEqual(['mateo']);
    expect(talk.has('mateo')).toBe(true);
  });

  it('does not count what is let slip before they trust enough to tell it', async () => {
    const mateo = PEOPLE.mateo;
    const talk = new Talk(mateo, 'cabral', async () => ({ dice: 'Somos sesenta, y sin pólvora.', animo: 0, quiere: 'nada' }));
    expect((await talk.say('¿cuántos son?')).done).toEqual([]);
    expect(talk.has('columna')).toBe(false);
  });

  it('takes it that what they ask is taken on only when the other says so, and only once', async () => {
    const braulio = PEOPLE.braulio;
    const replies = [{ quiere: 'nada' }, { quiere: 'encargar_hijo', dice: 'Traeme noticia.' }, { quiere: 'encargar_hijo' }];
    const talk = new Talk(braulio, 'cabral', async () => ({ dice: 'Hum.', animo: 0, quiere: 'nada', ...replies.shift() }));
    expect(talk.brief()).toContain('Tobías');
    expect((await talk.say('¿qué le pasa?')).agreed).toEqual([]);
    expect((await talk.say('yo lo busco')).agreed.map(e => e.key)).toEqual(['hijo']);
    expect(talk.took('hijo')).toBe(true);
    expect((await talk.say('yo lo busco, dije')).agreed).toEqual([]);
    // He is not asked again: he waits for word.
    expect(talk.brief()).toContain('Esperás noticias');
  });
});
