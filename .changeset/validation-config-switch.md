---
"@refrakt-md/content": minor
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
---

A narrow escape hatch for content validation (WORK-559, SPEC-132 D5)

Content validation is configurable per site and per error id:

```json
{
  "validation": {
    "enabled": true,
    "disableIds": ["attribute-type-invalid"]
  }
}
```

- `enabled: false` stops reporting every suppressible finding for that site.
- `ids` replaces the default error-id list entirely.
- `disableIds` stops treating specific ids as problems, leaving the rest
  reporting. **This is the one to reach for first.**

**A disabled id is demoted to `info`, not dropped.** Someone who has judged an
id unimportant should stop seeing it in the build summary, but it should not
become invisible — a reader who goes looking, or the editor's validation rail,
can still see what was set aside, so turning the id back on later is an informed
choice rather than a leap. An id that was never in the allow-list is a different
thing and is simply not reported: there is no value in an `info` stream of every
check the project has decided against.

**`critical` findings are reported whatever you configure.** A parse error, an
unclosed tag, a tag in a position its schema forbids — these mean the document
could not be understood, which is not a matter of preference. A test pins that a
fully disabled config still surfaces one.

**There is no per-page or per-tag suppression, and there will not be.** That
granularity invites silencing the one call site that revealed a real bug, which
is how a validation feature becomes decoration.

The field is in `refrakt.config.schema.json` with a description, so it appears
in the generated configuration reference, and the reference page now lists which
error ids are on out of the box and what each one catches.
