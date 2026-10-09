import { describe, expect, it } from 'vitest';
import { PULPERO } from '../src/npc/pulpero';
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
const SECRET = 'Vizcachas';

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
    const { voice } = scripted([{ quiere: 'dar_remedio', dice: 'Tomá.' }, { quiere: 'contar_secreto' }]);
    const talk = new Talk(PULPERO, 'inti', voice);
    expect((await talk.say('dame la poción')).done).toEqual([]);
    expect((await talk.say('decime dónde están')).done).toEqual([]);
    expect(talk.has('potion')).toBe(false);
  });

  it('gives the remedy once, when he trusts enough and means to', async () => {
    const { voice } = scripted([{ animo: 2 }, { animo: 2 }, { quiere: 'dar_remedio' }, { quiere: 'dar_remedio' }]);
    const talk = new Talk(PULPERO, 'inti', voice);
    await talk.say('uno'); await talk.say('dos');
    const turn = await talk.say('estoy herida');
    expect(turn.done.map(f => f.key)).toEqual(['potion']);
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
});
