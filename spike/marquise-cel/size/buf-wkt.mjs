import { celEnv, parse, plan, CelScalar } from '@bufbuild/cel';
import { strings } from '@bufbuild/cel/ext';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
const env = celEnv({ funcs: strings, variables: { a: CelScalar.INT } });
console.log(plan(env, parse('a + 1'))({ a: 1n }), timestampFromDate(new Date()));
