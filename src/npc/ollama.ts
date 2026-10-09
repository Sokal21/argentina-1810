import type { Line, Reply, Voice } from './talk';

/** The shape the model has to answer in. */
const SHAPE = {
  type: 'object',
  properties: {
    dice: { type: 'string' },
    animo: { type: 'integer', minimum: -2, maximum: 2 },
    quiere: { type: 'string', enum: ['nada', 'dar_remedio', 'contar_secreto', 'echar'] },
  },
  required: ['dice', 'animo', 'quiere'],
};

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
        options: { temperature: 0.8, num_predict: 160 },
        messages: [
          { role: 'system', content: system },
          ...lines.map(line => ({ role: line.who === 'npc' ? 'assistant' : 'user', content: line.text })),
        ],
      }),
    });
    if (!response.ok) throw new Error(`El modelo local respondió ${response.status}`);
    const body = await response.json() as { message?: { content?: string } };
    return JSON.parse(body.message?.content ?? '{}') as Reply;
  };
}
