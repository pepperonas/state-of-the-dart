# Player avatar icons (game-icons.net)

167 icons curated from [game-icons.net](https://game-icons.net) for the player
avatar picker. They are licensed **CC BY 3.0**
(https://creativecommons.org/licenses/by/3.0/) by their authors — see
`manifest.tsv` (`author` column, `source` = path in
https://github.com/game-icons/icons). The app credits them in the picker and on
the imprint page.

The SVGs here are the originals from the repository (black background square +
one white path). `tools/gen-avatar-icons.py` takes the path of each and writes:

- `src/components/icons/avatarCatalog.ts` — groups, authors (small, eager)
- `src/components/icons/avatarPaths.ts` — the path data (lazy chunk)

```bash
python3 tools/gen-avatar-icons.py
```

To add an icon: drop its SVG into `svg/`, add a row to `manifest.tsv`, add its
German/English label under `avatar_picker.gi` in both locale files, re-run.
