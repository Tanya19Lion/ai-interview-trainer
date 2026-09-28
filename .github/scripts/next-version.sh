#!/usr/bin/env bash
# Prints the next semver (no leading "v") from Conventional Commits since the last v* tag.
#   BREAKING CHANGE / "type!:"  -> MAJOR
#   feat:                        -> MINOR
#   anything else (fix, ...)     -> PATCH
# With no v* tag yet, the base is the version in package.json and all commits count.
set -euo pipefail

last_tag="$(git tag --list 'v*' --sort=-v:refname | head -n1)"
if [[ -n "$last_tag" ]]; then
  base="${last_tag#v}"
  range="$last_tag..HEAD"
else
  base="$(sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p' package.json | head -n1)"
  range="HEAD"
fi

IFS=. read -r major minor patch <<<"$base"
log="$(git log "$range" --no-merges --format='%s%n%b')"

if grep -qE 'BREAKING CHANGE|^[a-z]+(\([^)]*\))?!:' <<<"$log"; then
  major=$((major + 1)); minor=0; patch=0
elif grep -qE '^feat(\([^)]*\))?:' <<<"$log"; then
  minor=$((minor + 1)); patch=0
elif [[ -n "$log" ]]; then
  patch=$((patch + 1))
fi

echo "$major.$minor.$patch"
