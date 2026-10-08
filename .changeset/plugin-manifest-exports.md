---
'@refrakt-md/plan': patch
'@refrakt-md/docs': patch
---

`@refrakt-md/plan` and `@refrakt-md/docs` now export `./package.json`. Their `exports` maps previously left it out, so `require.resolve('<pkg>/package.json')` threw `ERR_PACKAGE_PATH_NOT_EXPORTED` and anything reading the installed package (such as plugin fixture discovery) silently found nothing. `@refrakt-md/plan`'s `files` also no longer lists a `styles` directory that does not exist.
