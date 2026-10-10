import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { Plugin } from 'vite';

// While developing, the people one can talk to may be voiced by Claude, through
// the command-line program on this machine and whoever is signed in to it: no
// key is kept anywhere. The game posts what the character is told and what was
// just said to them to /claude, and gets back the answer in the shape it asked
// for. Claude is given no tools and none of this project's settings, and is
// run from an empty folder: it only speaks.

/** One answer from Claude, in the shape of `schema`. */
function ask(system: string, user: string, schema: object, model: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '-p', user,
      '--system-prompt', system,
      '--json-schema', JSON.stringify(schema),
      '--model', model,
      '--tools', '',
      '--strict-mcp-config',
      '--setting-sources', '',
      '--no-session-persistence',
      '--output-format', 'json',
    ], { cwd: tmpdir(), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', reject);
    child.on('close', () => {
      try {
        const answer = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)) as { structured_output?: unknown; is_error?: boolean };
        if (answer.is_error || !answer.structured_output) throw new Error(err || out.slice(0, 300));
        resolve(answer.structured_output);
      } catch (error) { reject(error); }
    });
  });
}

const MODELS = new Set(['haiku', 'sonnet', 'opus']);

export function claudeVoice(): Plugin {
  return {
    name: 'claude-voice',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/claude', (req, res) => {
        // Only this machine may speak through it, even when the server is open to the network.
        const from = req.socket.remoteAddress ?? '';
        if (req.method !== 'POST' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(from)) { res.statusCode = 403; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; if (body.length > 64_000) req.destroy(); });
        req.on('end', () => {
          void (async () => {
            try {
              const { system, user, schema, model } = JSON.parse(body) as { system: string; user: string; schema: object; model: string };
              const answer = await ask(String(system), String(user), schema, MODELS.has(model) ? model : 'sonnet');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(answer));
            } catch (error) {
              res.statusCode = 502;
              res.end(String(error));
            }
          })();
        });
      });
    },
  };
}
