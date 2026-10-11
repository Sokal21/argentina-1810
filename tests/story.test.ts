import { describe, expect, it } from 'vitest';
import { Story, type Quest } from '../src/story/story';
import { VADO } from '../src/story/vado';

const quests: Quest[] = [
  { id: 'a', name: 'A', opens: ['empieza'], steps: [{ says: 'ir', when: ['en:x'] }, { says: 'hablar', when: ['hablo:y'] }], leaves: ['sabe:algo'] },
  { id: 'b', name: 'B', opens: ['hecha:a', 'tiene:llave'], steps: [{ says: 'abrir', when: ['en:puerta'] }] },
];

describe('what has happened in a game', () => {
  it('opens a mission when any one of its doors does, and says so', () => {
    const story = new Story(quests);
    expect(story.current).toEqual([]);
    expect(story.tell('empieza').map(n => n.kind)).toEqual(['opened']);
    expect(story.current.map(c => c.step.says)).toEqual(['ir']);
  });

  it('does its steps in order, and what is done leaves what it leaves', () => {
    const story = new Story(quests);
    story.tell('empieza');
    // The second step's happening comes first: it waits its turn.
    expect(story.tell('hablo:y')).toEqual([]);
    expect(story.current[0].step.says).toBe('ir');
    // Then the first: both are settled at once, the mission is done, and the next opens.
    const news = story.tell('en:x');
    expect(news.map(n => `${n.kind}:${n.quest.id}`)).toEqual(['step:a', 'done:a', 'opened:b']);
    expect(story.isDone('a')).toBe(true);
    expect(story.knows('algo')).toBe(true);
    expect(story.current.map(c => c.quest.id)).toEqual(['b']);
  });

  it('has more than one door into a mission', () => {
    const story = new Story(quests);
    story.tell('tiene:llave');
    expect(story.isOpen('b')).toBe(true);
    expect(story.isOpen('a')).toBe(false);
    expect(story.holds('llave')).toBe(true);
  });

  it('lets nothing happen twice', () => {
    const story = new Story(quests);
    story.tell('empieza');
    expect(story.tell('empieza')).toEqual([]);
    expect(story.happened).toEqual(['empieza']);
  });

  it('tells whoever is listening', () => {
    const story = new Story(quests), heard: string[] = [];
    story.listen(news => heard.push(...news.map(n => n.kind)));
    story.tell('empieza'); story.tell('nada');
    expect(heard).toEqual(['opened']);
  });
});

describe('the hook of El vado de las Vizcachas', () => {
  const play = (...happenings: string[]) => {
    const story = new Story(VADO);
    for (const h of happenings) story.tell(h);
    return story;
  };

  it('begins with the inn, and nothing else', () => {
    const story = play('empieza');
    expect(story.current.map(c => c.step.says)).toEqual(['Llegá a la posada.']);
  });

  it('is done as the document says: the inn, the word given, the battlefield, the poncho, the path', () => {
    const story = play('empieza', 'en:La posada');
    expect(story.current[0].step.says).toBe('Hablá con don Braulio.');
    story.tell('hablo:braulio');
    expect(story.isDone('posada')).toBe(true);
    // Talking to him is not taking it on.
    expect(story.isOpen('hijo')).toBe(false);
    story.tell('acepto:hijo');
    expect(story.current.map(c => c.quest.id)).toEqual(['hijo']);
    story.tell('zona:B');
    expect(story.current[0].step.says).toContain('poncho');
    story.tell('tiene:poncho');
    expect(story.current[0].step.says).toContain('rastro');
    story.tell('zona:S');
    expect(story.isDone('hijo')).toBe(true);
    expect(story.knows('rastro')).toBe(true);
  });

  it('can be come upon without don Braulio: the poncho is a door of its own', () => {
    // He was shut out of the inn, walked to the battlefield all the same and found it.
    const story = play('empieza', 'en:La posada', 'hablo:braulio', 'cerro:braulio', 'zona:B', 'tiene:poncho');
    expect(story.isOpen('hijo')).toBe(true);
    expect(story.current[0].step.says).toContain('rastro');
    story.tell('zona:S');
    expect(story.isDone('hijo')).toBe(true);
  });

  it('does not count the path walked before the poncho was found: coming to a place is not kept', () => {
    const story = play('empieza', 'acepto:hijo', 'zona:B', 'zona:S');
    story.tell('tiene:poncho');
    expect(story.isDone('hijo')).toBe(false);
    expect(story.has('zona:S')).toBe(false);
    // He has to come to it now.
    story.tell('zona:S');
    expect(story.isDone('hijo')).toBe(true);
  });

  it('goes on to the chapel, and from there back with the news', () => {
    const story = play('empieza', 'en:La posada', 'hablo:braulio', 'acepto:hijo', 'zona:B', 'tiene:poncho', 'zona:S');
    expect(story.current.map(c => c.quest.id)).toEqual(['capilla']);
    // He was in the path when it opened: the first step is done by his being there, told again.
    story.tell('zona:S');
    expect(story.current[0].step.says).toContain('capilla');
    story.tell('zona:K'); story.tell('hablo:anselmo');
    expect(story.current[0].step.says).toContain('Tobías');
    story.tell('hablo:tobias');
    expect(story.isDone('capilla')).toBe(true);
    expect(story.knows('tobias')).toBe(true);
    // The village is somewhere he has been: he has to go back to it all the same.
    expect(story.current.map(c => c.step.says)).toEqual(['Volvé al pueblo.']);
    story.tell('zona:P');
    expect(story.current[0].step.says).toContain('don Braulio');
    story.tell('dijo:noticia');
    expect(story.isDone('noticia')).toBe(true);
  });

  it('lets the boy be found before anyone has spoken to the friar', () => {
    const story = play('empieza', 'tiene:poncho', 'zona:S', 'zona:K', 'hablo:tobias');
    expect(story.isDone('capilla')).toBe(true);
  });
});

describe('a step that waits on several things', () => {
  const quests: Quest[] = [{ id: 'f', name: 'F', opens: ['empieza'], steps: [{ says: 'las tres', all: ['a', 'b', 'c'] }, { says: 'después', when: ['d'] }] }];

  it('is done when all of them have happened, in whatever order, and says how many have', () => {
    const story = new Story(quests);
    story.tell('empieza'); story.tell('c');
    expect(story.count(story.current[0].step)).toBe(1);
    story.tell('a');
    expect(story.current[0].step.says).toBe('las tres');
    story.tell('b');
    expect(story.current[0].step.says).toBe('después');
  });
});

describe('the three fires', () => {
  it('are a mission of their own: wood first, then a fire on each rise in any order', () => {
    const story = new Story(VADO);
    story.tell('acepto:fogatas');
    expect(story.current.map(c => c.step.says)).toEqual(['Juntá leña y yesca junto a la capilla.']);
    story.tell('tiene:lena'); story.tell('armada:medio'); story.tell('armada:oeste');
    expect(story.isDone('fogatas')).toBe(false);
    story.tell('armada:este');
    expect(story.isDone('fogatas')).toBe(true);
  });
});

describe('the two that are settled by talking', () => {
  it('shelters Mateo: hear all he knows, then tell the innkeeper no', () => {
    const story = new Story(VADO);
    story.tell('acepto:amparar'); story.tell('sabe:capitan');
    expect(story.current[0].step.says).toContain('Mateo');
    story.tell('sabe:columna');
    expect(story.current[0].step.says).toContain('don Braulio');
    story.tell('dijo:no');
    expect(story.isDone('amparar')).toBe(true);
  });

  it('gives up the wounded: see where the carts go, then say so', () => {
    const story = new Story(VADO);
    story.tell('acepto:rehenes'); story.tell('sabe:carretas'); story.tell('dijo:carretas');
    expect(story.isDone('rehenes')).toBe(true);
  });
});

describe('the last way out', () => {
  it('is open to anyone, whoever they have fallen out with, and ends the story', () => {
    const story = new Story(VADO);
    for (const h of ['empieza', 'cerro:braulio', 'cerro:anselmo', 'cerro:mateo', 'cerro:tobias', 'planta:vado']) story.tell(h);
    expect(story.current.map(c => c.quest.id)).toContain('vado');
    story.tell('aguanto:vado');
    expect(story.isDone('vado')).toBe(true);
    expect(story.has('final:solo')).toBe(true);
  });
});
