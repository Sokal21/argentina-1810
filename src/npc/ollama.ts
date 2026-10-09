import type { Line, Reply, Voice } from './talk';

/**
 * The shape the model has to answer in. It first puts into its own words
 * what was just said to it: a small model that has to do that before it
 * speaks answers the question instead of drifting off.
 */
const SHAPE = {
  type: 'object',
  properties: {
    entiende: { type: 'string' },
    dice: { type: 'string' },
    animo: { type: 'integer', minimum: -2, maximum: 2 },
    quiere: { type: 'string', enum: ['nada', 'dar_remedio', 'contar_secreto', 'echar'] },
  },
  required: ['entiende', 'dice', 'animo', 'quiere'],
};

// The talk so far goes to the model as one account of it, not as turns of
// its own: shown its earlier lines as things it said, a small model takes
// them for the pattern to follow and repeats them.
function account(lines: Line[]): string {
  const last = lines[lines.length - 1];
  const before = lines.slice(0, -1).map(line => `${line.who === 'npc' ? 'Vos' : 'Forastero'}: ${line.text}`);
  return [
    before.length ? `Lo que se dijeron hasta ahora:\n${before.join('\n')}\n` : '',
    `El forastero te dice ahora: "${last.text}"`,
    '',
    'Contestale a eso, sin repetir nada que ya hayas dicho. En "entiende" poné en pocas palabras qué te está diciendo o pidiendo; en "dice", lo que le respondés en voz alta.',
  ].join('\n');
}

/**
 * A voice from a model running on this machine, through Ollama. The dev
 * server passes /ollama on to it, so the game talks to its own address and
 * the same call can be pointed at something else later.
 */
export function ollama(model = 'gemma3:12b', base = '/ollama'): Voice {
  return async (system: string, lines: Line[]): Promise<Reply> => {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: SHAPE,
        keep_alive: '20m',
        options: { temperature: 0.7, num_predict: 220 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: account(lines) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`El modelo local respondió ${response.status}`);
    const body = await response.json() as { message?: { content?: string } };
    return JSON.parse(body.message?.content ?? '{}') as Reply;
  };
}
