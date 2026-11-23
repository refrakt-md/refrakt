import { Environment } from '@marcbachmann/cel-js';
const env = new Environment().registerVariable('a', 'int');
console.log(env.check('a + 1').type, env.evaluate('a + 1', { a: 1n }));
