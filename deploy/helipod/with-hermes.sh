#!/usr/bin/env bash
# Supply the exact existing Hermes startup command as separate arguments.
set -euo pipefail
if [[ ${1:-} == -- ]]; then shift; fi
if (( $# == 0 )); then
  echo 'Usage: bash deploy/helipod/with-hermes.sh -- <existing Hermes startup command> [args...]' >&2
  exit 2
fi
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ruang_pid=''
hermes_pid=''
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$ruang_pid" ]]; then kill -TERM "$ruang_pid" 2>/dev/null || true; fi
  if [[ -n "$hermes_pid" ]]; then kill -TERM "$hermes_pid" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
node "$project_dir/deploy/helipod/start.mjs" &
ruang_pid=$!
# Preserve the caller's working directory for the existing Hermes command.
"$@" &
hermes_pid=$!
status=0
wait -n "$ruang_pid" "$hermes_pid" || status=$?
# A managed container should restart if either long-lived service exits unexpectedly.
if (( status == 0 )); then status=1; fi
exit "$status"
