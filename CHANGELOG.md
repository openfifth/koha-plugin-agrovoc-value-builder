# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add user-visible changes under the `[Unreleased]` heading below as you work.
On the next `npm run release:*`, `increment_version.js` promotes `[Unreleased]`
to a dated `[X.Y.Z]` section and inserts a fresh empty `[Unreleased]` above it
along with the comparison links — do not edit the heading or the links by hand.

## [Unreleased]

### Added

- AGROVOC thesaurus value builder for MARC21 subject fields, ported from the
  in-tree `marc21_field_650_agrovoc.pl` value builder.
- "Replace field" workflow alongside the existing "Create new fields" workflow.
- Concept browsing for broader, narrower, and related terms. Every term is a
  link, so clicking one re-centres the detail panel on it.
- Automated release support: version bump scripts, CHANGELOG promotion, and a
  GitHub Actions workflow that tests against Koha main, stable, and oldstable.

### Changed

- Requests to AGROVOC now use HTTPS instead of HTTP.
- The popup uses the Koha staff interface styling instead of a standalone page.
- Headings and labels say "term" rather than "concept", matching Koha's own
  wording for broader, narrower, and related headings.

### Fixed

- The popup no longer emits two `<title>` elements or a nested `<!DOCTYPE html>`.
- `vocid` and the concept type are validated before they reach the AGROVOC URL.

[Unreleased]: https://github.com/openfifth/koha-plugin-agrovoc-value-builder/compare/v0.0.0...HEAD
