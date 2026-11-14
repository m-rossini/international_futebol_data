#!/usr/bin/env sh
# Detect and use the container runtime available on this host.
#
# Supports Docker (WSL, Debian) and Podman (Fedora), including the compose
# implementations shipped with either. Explicit overrides win:
#   CONTAINER_RUNTIME=docker|podman
#   CONTAINER_COMPOSE="docker compose"|"podman compose"|podman-compose|docker-compose
#
# Usage:
#   container-runtime.sh runtime
#   container-runtime.sh compose <compose args...>
#   container-runtime.sh load <archive>...
#   container-runtime.sh exec <container> <command...>
set -eu

detect_runtime() {
    if [ -n "${CONTAINER_RUNTIME:-}" ]; then
        printf '%s\n' "$CONTAINER_RUNTIME"
    elif command -v docker >/dev/null 2>&1; then
        echo docker
    elif command -v podman >/dev/null 2>&1; then
        echo podman
    else
        echo "container-runtime: neither docker nor podman found" >&2
        exit 1
    fi
}

detect_compose() {
    if [ -n "${CONTAINER_COMPOSE:-}" ]; then
        printf '%s\n' "$CONTAINER_COMPOSE"
        return 0
    fi

    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
        echo "podman compose"
    elif command -v podman-compose >/dev/null 2>&1; then
        echo "podman-compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "container-runtime: no compose implementation found" >&2
        exit 1
    fi
}

command_name="${1:-}"
if [ "$#" -gt 0 ]; then
    shift
fi

case "$command_name" in
    runtime)
        detect_runtime
        ;;
    compose)
        # Word splitting is intentional: "docker compose" is two argv entries.
        # shellcheck disable=SC2046
        exec $(detect_compose) "$@"
        ;;
    load)
        [ "$#" -gt 0 ] || {
            echo "usage: $0 load <archive>..." >&2
            exit 2
        }
        runtime_bin="$(detect_runtime)"
        for archive in "$@"; do
            "$runtime_bin" load < "$archive"
        done
        ;;
    exec)
        [ "$#" -ge 1 ] || {
            echo "usage: $0 exec <container> <command...>" >&2
            exit 2
        }
        runtime_bin="$(detect_runtime)"
        container="$1"
        shift
        exec "$runtime_bin" exec "$container" "$@"
        ;;
    *)
        echo "usage: $0 {runtime|compose <args...>|load <archive>...|exec <container> <args...>}" >&2
        exit 2
        ;;
esac
