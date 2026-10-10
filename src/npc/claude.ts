import { account, shape } from './ollama';
import type { Line, Reply, Voice } from './talk';

/**
 * A voice from Claude. While developing, the dev server passes /claude on to
 * the command-line program on this machine (see tools/claude_voice.ts); the
 * same call can be pointed at something of our own later.
 */
export function claude(model: 'haiku' | 'sonnet' | 'opus' = 'sonnet', base = '/claude'): Voice {
  return async (system: string, lines: Line[], wants: string[]): Promise<Reply> => {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user: account(lines), schema: shape(wants), model }),
    });
    if (!response.ok) throw new Error(`Claude respondió ${response.status}: ${await response.text()}`);
    return await response.json() as Reply;
  };
}
