#!/usr/bin/env bash
# pull-schema.sh — bring the gateway's published SDL into this repo.
#
# The artefact is `schema.graphql` in the `api` repo, generated and guarded by
# its own test (`graph/schema_publish_test.go`). It is NOT an npm package: the
# `@blueprint-ai` token expires and lives in Terraform Cloud, so a file at a
# ref is the cheaper contract.
#
# Two sources, in order:
#   1. The sibling checkout `../api/schema.graphql`, when it exists and no
#      explicit API_REF was asked for. In the blueprint-ai workspace that is
#      the schema you are actually developing against.
#   2. `gh api` at API_REF (default `dev`).
#
# The first line of the result records where it came from, so a stale schema is
# visible in a diff instead of being guessed at.
#
# Usage: bash scripts/pull-schema.sh          # sibling checkout, else dev
#        API_REF=huginn/2026-10-06 bash scripts/pull-schema.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT=schema.graphql
SIBLING=../api/schema.graphql

if [[ -z "${API_REF:-}" && -f "$SIBLING" ]]; then
  origin="local checkout ../api @ $(git -C ../api rev-parse --short HEAD 2>/dev/null || echo unknown)"
  cp "$SIBLING" "$OUT.tmp"
else
  ref="${API_REF:-dev}"
  if ! command -v gh >/dev/null; then
    echo "ERROR: gh is not installed and ../api/schema.graphql is not available" >&2
    exit 1
  fi
  origin="blueprint-ai-org/api @ $ref"
  gh api -H 'Accept: application/vnd.github.raw' \
    "repos/blueprint-ai-org/api/contents/schema.graphql?ref=$ref" > "$OUT.tmp"
fi

{
  echo "# PULLED from $origin on $(date -u +%Y-%m-%dT%H:%M:%SZ) by scripts/pull-schema.sh — do not edit"
  cat "$OUT.tmp"
} > "$OUT"
rm -f "$OUT.tmp"

echo "wrote $OUT ($(wc -c < "$OUT") bytes) from $origin"
