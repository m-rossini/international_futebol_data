#!/usr/bin/env bash
# Substitute the container DNS resolver into the nginx config.
#
# The nginx configs use `resolver @RESOLVER@ valid=10s ipv6=off;` so that
# upstream container names are re-resolved per request instead of once at
# startup. Without it, recreating a container leaves nginx proxying to the old
# IP until nginx itself restarts (502s).
#
# The address cannot be hardcoded: Docker uses 127.0.0.11, while Podman uses
# the compose network's gateway, which varies with the network. So read it from
# a running container's /etc/resolv.conf, which is authoritative for whichever
# runtime is in use.
#
# Usage: set-nginx-resolver.sh <nginx-conf-basename>
#   e.g. set-nginx-resolver.sh futebol-dev.conf
set -euo pipefail

CONF_NAME="${1:?usage: set-nginx-resolver.sh <nginx-conf-basename>}"
CONF="nginx/conf.d/${CONF_NAME}"
PLACEHOLDER="@RESOLVER@"

[ -f "$CONF" ] || { echo "ERROR: $CONF not found" >&2; exit 1; }
grep -q "$PLACEHOLDER" "$CONF" || { echo "$CONF has no $PLACEHOLDER placeholder; nothing to do"; exit 0; }

# Any running container on the compose network reports the same resolver.
# Prefer reading /etc/resolv.conf from a live container, since that is
# authoritative for whichever runtime is in use (Docker vs Podman).
RESOLVER=""
RUNTIME=$(command -v podman || command -v docker || true)
for name in futebol-api futebol-web futebol-observe api web openobserve; do
    if [ -n "$RUNTIME" ] && out=$($RUNTIME exec "$name" cat /etc/resolv.conf 2>/dev/null); then
        RESOLVER=$(printf '%s\n' "$out" | awk '/^nameserver/ { print $2; exit }')
        [ -n "$RESOLVER" ] && break
    fi
done

if [ -z "$RESOLVER" ]; then
    # Fall back to the network gateway, then to Docker's embedded DNS.
    NET=$(command -v podman >/dev/null 2>&1 && echo podman || echo docker)
    RESOLVER=$(podman network inspect futebol_default --format '{{range .Subnets}}{{.Gateway}}{{end}}' 2>/dev/null || true)
    [ -z "$RESOLVER" ] && RESOLVER="127.0.0.11"
    echo "  (could not read resolv.conf from a container; falling back to $RESOLVER)"
fi

# sed needs the delimiter escaped if the address ever contained one; IPs do not.
sed -i "s|${PLACEHOLDER}|${RESOLVER}|g" "$CONF"
echo "  resolver set to $RESOLVER in $CONF"
