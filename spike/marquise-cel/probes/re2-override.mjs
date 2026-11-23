// Can cel-js's built-in matches() be replaced by RE2?
import { Environment } from '@marcbachmann/cel-js';
import { RE2JS } from '@bufbuild/re2';
const evil = 'a'.repeat(28) + '!';
for (const how of ['receiver', 'signature']) {
  try {
    const env = new Environment();
    if (how === 'receiver') env.registerFunction({ name: 'matches', receiverType: 'string', returnType: 'bool', params: [{ name: 'p', type: 'string' }], handler: (s, p) => RE2JS.compile(p).test(s) });
    else env.registerFunction('string.matches(string): bool', (s, p) => RE2JS.compile(p).test(s));
    env.registerVariable('s', 'string');
    const t = performance.now();
    const r = env.evaluate("s.matches('^(a+)+$')", { s: evil });
    console.log(how, '→', r, (performance.now() - t).toFixed(1), 'ms', '| (?i):', env.evaluate("'ABC'.matches('(?i)abc')"));
  } catch (e) { console.log(how, '→ ERR', e.message.split('\n')[0]); }
}
