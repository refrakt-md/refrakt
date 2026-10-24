---
'@refrakt-md/plan': patch
'@refrakt-md/content': patch
---

Building plan content no longer slows down with the length of the repository's git history (BUG-043). History extraction now runs one `git log` over the plan directory and one `git cat-file --batch` for file contents, where it used to start one `git log --follow` per file and one `git show` per commit and file. In this repository that is 7 git processes instead of about 5,200, and the plan site builds in about 8 seconds instead of about 170 on a full-history clone. Renames inside the plan directory now carry the whole history to the new path, so a renamed entity's timeline includes the commits before its rename. The pipeline also runs git from the plan directory instead of the process's working directory, and content timestamps now walk only the commits that touched the content directory.
