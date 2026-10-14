# Koha AGROVOC Value Builder Plugin

A Koha plugin that gives cataloguers a value builder for the FAO AGROVOC
thesaurus. Search AGROVOC, browse concept relationships, and write the selected
terms into MARC21 subject fields.

This branch is a faithful port of the in-tree `marc21_field_650_agrovoc.pl`
value builder. The popup, the workflow, and the MARC output all match the
in-tree version. Only the plumbing changed, so that Koha can install it as a
plugin instead of shipping it in the source tree.

![Screenshot of the AGROVOC Value Builder Plugin](./imgs/screenshot.png)

The `ui-rewrite` branch holds a redesigned popup that uses the Koha staff
interface styling. Compare the two before you choose one.

## Features

- Search AGROVOC with three match types: starts with, exact match, contains.
- Browse broader, narrower, and related concepts from any result.
- Multi-language terms: English, French, and Spanish.
- Creates one MARC field per selected term.

## Requirements

- **Koha 24.11 or later**
- **Bug 39522** - Add hooks to allow 'Valuebuilder' plugins to be installable
  - Bug URL: https://bugs.koha-community.org/bugzilla3/show_bug.cgi?id=39522
  - Without this bug, Koha cannot install a value builder as a plugin.
- Outbound HTTPS access from the Koha server to `agrovoc.fao.org`.

## Installation

1. Download the `.kpz` file from the
   [latest release](https://github.com/openfifth/koha-plugin-agrovoc-value-builder/releases).
2. Go to Administration > Manage plugins in the staff interface.
3. Upload the `.kpz` file.
4. Enable the plugin.

## Usage

### Setup in the MARC bibliographic framework

1. Go to Administration > MARC bibliographic framework.
2. Choose your framework. Click "MARC structure".
3. Edit subfield `$a` of field **650** or **651**.
4. Set **Plugin** to `agrovoc`.
5. Save the subfield.

Subfield `$a` must have no authority type set. Koha checks the authority link
first, so a subfield with an authority type never reaches its value builder.

### Cataloguing with the plugin

1. Open the record editor. Go to field 650 or 651.
2. Click the plugin button next to subfield `$a`. The AGROVOC popup opens.
3. Enter a term. Choose a match type and a language. Click "Search".
4. Click a result to see its concept relationships.
5. Click "Select" to add a concept to your selection.
6. Click "Create Fields". The plugin clones the field once per selected term.

### MARC21 field population

The plugin writes these values into each field:

| Target | Value |
| --- | --- |
| `$a` | Preferred label |
| `$0` | AGROVOC concept URI |
| `$9` | Numeric concept identifier, taken from the end of the URI |
| `$2` | Source code for the search language |
| Indicator 2 | `7` |

The source code in `$2` follows the search language:

| Language | `$2` |
| --- | --- |
| English | `agrovoc` |
| French | `agrovocf` |
| Spanish | `agrovocs` |

Example output:

```
650 _7 $a soil erosion $2 agrovoc $0 http://aims.fao.org/aos/agrovoc/c_7168 $9 7168
```

### A warning about `$9`

Koha reserves `$9` in a bibliographic field for the record number of a linked
**Koha authority record**. It reads `$9` to build the subject link, it indexes
the value as the `an` search index, and it uses that index to find the records
to rewrite when an authority is edited or merged.

An AGROVOC identifier in `$9` therefore collides with an unrelated Koha
authority number. Three things follow:

1. The subject links to an authority-number search instead of a term search.
2. The value is searchable as if it were a Koha authority id.
3. Editing or merging the Koha authority with that number rewrites the heading
   and `$2` of the AGROVOC field, so the term is lost without warning.

This branch keeps the behaviour because the in-tree version has it. The
`ui-rewrite` branch drops `$9`, since the same identifier already sits inside
the `$0` URI with its namespace attached.

## API integration

The plugin proxies two Skosmos REST endpoints at `https://agrovoc.fao.org/browse/rest/v1`:

- `GET /search?query={term}&lang={lang}` for the result list.
- `GET /{vocid}/{type}?uri={uri}&lang={lang}` for broader, narrower, and related concepts.

The browser never calls AGROVOC directly. Koha makes the request, so the plugin
works where the staff browser has no outbound internet access.

## Development

### Version management

```bash
npm run version:patch   # 1.0.0 -> 1.0.1
npm run version:minor   # 1.0.0 -> 1.1.0
npm run version:major   # 1.0.0 -> 2.0.0
```

Each bump updates `package.json`, `package-lock.json`, the `$VERSION` and
`date_updated` in the plugin module, and promotes the `[Unreleased]` section of
`CHANGELOG.md`.

### Releases

```bash
npm run release:patch
```

This bumps the version, commits, tags, re-enables dormant GitHub Actions
workflows, and pushes. The CI workflow then tests against Koha main, stable, and
oldstable, builds the `.kpz`, and publishes a GitHub release.

### Tests

```bash
KOHA_PLUGIN_DIR=$(pwd) PERL5LIB=$PERL5LIB:. prove -v t/
```

Run the command inside a Koha environment, such as koha-testing-docker.

## License

GPL-3.0
