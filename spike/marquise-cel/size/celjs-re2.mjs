import { Environment } from '@marcbachmann/cel-js';
import { RE2JS } from '@bufbuild/re2';
const env = new Environment().registerVariable('a', 'int');
console.log(env.evaluate('a + 1', { a: 1n }), RE2JS.compile('^a+$').test('aaa'));
