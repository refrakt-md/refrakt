{% bug id="BUG-046" status="confirmed" severity="minor" tags="editor,types,dx" %}

# The editor preview fails to typecheck where it restores community rune styles

Found while implementing v0.41.3 (BUG-034 touches the same file). It is on `main` before that
change, and CI does not typecheck the editor app, so nothing catches it.

`packages/editor/app/src/lib/preview/block-renderer.ts:54` copies `communityStyles` back onto
the rune configs. `communityStyles` is typed `Record<string, unknown>`, so each `styles` value
is `unknown`. `RuneConfig.styles` expects
`Record<string, string | { prop: string; template?: string; transform?: NamedTransform }>`.

## Steps to Reproduce

1. `npm run build`
2. `cd packages/editor && npx tsc --noEmit -p app`

## Expected

No errors.

## Actual

```
app/src/lib/preview/block-renderer.ts(54,37): error TS2322: Type 'Record<string, unknown>' is not
assignable to type 'Record<string, string | { prop: string; template?: string | undefined;
transform?: NamedTransform | undefined; }>'.
```

## Fix sketch

Type `communityStyles` as `Record<string, RuneConfig['styles']>` where it is declared, rather
than casting at the assignment. Consider adding the editor app to a CI typecheck so the next
one is caught.

## Environment

- `main` at v0.41.2 packages

{% /bug %}
