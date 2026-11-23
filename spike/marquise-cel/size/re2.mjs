import { RE2JS } from '@bufbuild/re2';
console.log(RE2JS.compile('^a+$').test('aaa'));
