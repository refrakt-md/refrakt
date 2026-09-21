---
'@refrakt-md/content': minor
'@refrakt-md/cli': minor
---

**`refrakt validate` now validates your project.**

With no arguments it used to validate `baseConfig` — refrakt's own built-in
theme config — and print a checkmark. In a user's project that is a self-test of
the library, reported as though it were a check of their work. It now validates
every site in `refrakt.config.json`: config resolution first, then content.

```bash
refrakt validate                 # every site
refrakt validate --site main     # one site
refrakt validate --only content  # narrow to one layer
refrakt validate --deep          # add the cross-page tier
refrakt validate --format json   # structured findings
```

Exits non-zero when any finding is at error severity, zero otherwise. Warnings
never affect the exit code and there is no `--strict`: a gate that goes red on
day one is a gate someone turns off.

**Config resolution runs first, because its failures cause content findings.** A
plugin that fails to resolve takes its runes with it, and every use of them
would be reported as an undefined tag — dozens of errors against correct
content, caused by one line of config. When that happens the command reports the
config failure and skips the content layer rather than listing both as peers.

The config layer checks resolution, not shape: whether `theme`, every entry in
`plugins[]`, and `entityRoutes` types actually resolve. Shape is the published
JSON Schema's job.

`@refrakt-md/content` gains `RefraktLoader.validateSite({ deep })`, which
returns structured findings for a site using the loader's own assembled tag set
— so the fast tier cannot disagree with the build about which runes exist.
