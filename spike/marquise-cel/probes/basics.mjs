import { Environment, evaluate } from '@marcbachmann/cel-js';
import { run, isCelError, celEnv, parse } from '@bufbuild/cel';
import { strings } from '@bufbuild/cel/ext';

const exprs = [
  ['dur add', 'duration("15m") + duration("1h30m")'],
  ['dur > 24h', 'duration("72h") > duration("48h")'],
  ['dur days literal', 'duration("3d")'],
  ['ts - ts', 'timestamp("2026-11-23T00:00:00Z") - timestamp("2026-11-20T00:00:00Z")'],
  ['ts + dur', 'timestamp("2026-11-23T00:00:00Z") + duration("24h")'],
  ['int div', '7 * 100 / 9'],
  ['div zero', '1 / 0'],
  ['double', '7.0 * 100.0 / 9.0'],
  ['int+double', '1 + 2.0'],
  ['macro filter', '[1,2,3].filter(x, x > 1).size()'],
  ['map 3arg', '[1,2,3].map(x, x > 1, x * 2)'],
  ['split', '"a, b".split(", ")'],
  ['optional index', '["a"][?3].orValue("z")'],
  ['optional field', '{"a": 1}.?b.orValue(0)'],
  ['optional.of', 'optional.of(1).hasValue()'],
  ['optional.none', 'optional.none().orValue(2)'],
  ['has', 'has({"a":1}.a)'],
  ['cel.bind', 'cel.bind(x, 2, x * x)'],
  ['math.greatest', 'math.greatest(1, 5, 3)'],
  ['ts getFullYear tz', 'timestamp("2026-11-23T23:30:00Z").getFullYear("Europe/Stockholm")'],
  ['string matches', '"abc".matches("^a.c$")'],
  ['exists_one', '[1,2].exists_one(x, x == 1)'],
  ['list sum (nonstd)', '[1,2,3].sum()'],
  ['join (strings ext)', '["a","b"].join(", ")'],
  ['transformMap (two-var)', '{"a":1}.transformMap(k, v, v + 1)'],
];
const celjs = new Environment({ enableOptionalTypes: true, unlistedVariablesAreDyn: true });
const show = (v) => { try { return typeof v === 'object' && v !== null ? (v.constructor?.name + ' ' + JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x + 'n' : x)) : (typeof v === 'bigint' ? v + 'n' : JSON.stringify(v)); } catch { return String(v); } };
for (const [name, e] of exprs) {
  let a, b;
  try { a = show(celjs.evaluate(e, {})); } catch (err) { a = 'ERR ' + err.message.split('\n')[0]; }
  try { const r = run(e, {}, { funcs: strings }); b = isCelError(r) ? 'ERR ' + r.message.split('\n')[0] : show(r); } catch (err) { b = 'THROW ' + err.message.split('\n')[0]; }
  console.log(`${name.padEnd(24)} | cel-js: ${a.slice(0, 70).padEnd(70)} | buf: ${b.slice(0, 70)}`);
}
