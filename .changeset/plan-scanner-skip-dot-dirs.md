---
'@refrakt-md/plan': patch
---

The plan scanner no longer descends into dot-directories such as `.git`. Their contents are not plan content, and a lock file git deleted mid-scan could fail the scan with `ENOENT`.
