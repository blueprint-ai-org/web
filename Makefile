.PHONY: version-bump install env

NEW_VERSION ?= patch

version-bump:       ## bump package.json version: NEW_VERSION=<x.y.z|major|minor|patch|...> (default: patch)
	npm version $(NEW_VERSION) --no-git-tag-version

install:            ## install the Node dependencies
	npm ci

env:                ## create .env from the .example template(s) where missing
	@for f in .env; do \
	  if [ -f $$f.example ] && [ ! -f $$f ]; then cp $$f.example $$f; chmod 600 $$f; echo "created $$f"; fi; \
	done
