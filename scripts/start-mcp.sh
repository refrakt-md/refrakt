#!/usr/bin/env bash
# Launch @refrakt-md/mcp against this project without requiring a workspace
# build. We can't just `npx -y @refrakt-md/mcp@<v>` here because npm exec
# resolves the workspace package (packages/mcp) instead of the registry
# tarball — so we cd out of the workspace before npx.
#
# The MCP server discovers plugins (e.g. @refrakt-md/plan) by import-resolving
# them from the project cwd. With no workspace install, none are reachable.
# We pre-install the plugin set into a stable per-version cache and surface
# it via NODE_PATH so resolution from the project succeeds without writing
# anything inside the repo.

set -euo pipefail

VERSION="0.11.2"
PLUGINS=(
	"@refrakt-md/plan@${VERSION}"
)

PROJECT_DIR="$PWD"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/refrakt-mcp/${VERSION}"

needs_install=0
for spec in "${PLUGINS[@]}"; do
	name="${spec%@*}"
	[ "${name:0:1}" = "@" ] && name="@${spec#@}" && name="${name%@*}"
	if [ ! -d "$CACHE/node_modules/$name" ]; then
		needs_install=1
		break
	fi
done

if [ "$needs_install" -eq 1 ]; then
	mkdir -p "$CACHE"
	cd "$CACHE"
	if [ ! -f package.json ]; then
		printf '%s\n' '{"name":"refrakt-mcp-cache","private":true,"version":"0.0.0"}' > package.json
	fi
	npm install --silent --no-package-lock --no-audit --no-fund "${PLUGINS[@]}" >&2
fi

cd /tmp
exec env NODE_PATH="$CACHE/node_modules" \
	npx -y "@refrakt-md/mcp@${VERSION}" --cwd "$PROJECT_DIR"
