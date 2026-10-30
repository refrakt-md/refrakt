---
'@refrakt-md/runes': minor
'@refrakt-md/types': minor
'@refrakt-md/transform': minor
'@refrakt-md/content': minor
'@refrakt-md/sveltekit': minor
'@refrakt-md/cli': minor
'@refrakt-md/language-server': minor
'create-refrakt': minor
---

New site option `runes.schema: "deny" | "allow"` (default `deny`), SPEC-181 D8.

- **It lets a project definition declare `schema`.** With `allow`, a definition in `runes.dir` may declare a `schema` table, which SPEC-145 D25 otherwise rejects. Use it only when every definition in the directory is reviewed like first-party code. A wrong row renders identically and publishes a false claim as JSON-LD. The D25 rejection now names the option.
- **A preferred project rune also takes the aliases it shares with the plugin rune it shadows.** For example, `"testimonial": "__project__"` settles `review` as well. An alias another plugin rune claims still needs its own `prefer` entry.
