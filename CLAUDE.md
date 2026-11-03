# iconpack — паки SVG-иллюстраций

Node: `export PATH="$HOME/.local/node-v22.23.4-linux-x64/bin:$PATH"`.

- `themes/*.json` — гаммы (токены цветов). В деталях и сценах только токены: `fill="acc"`, никаких #hex.
- `style.json` — толщина обводки и прочая геометрия.
- `packs/<pack>/parts/*.svg` — библиотека деталей (кот: позы `cat-*`, лица `face-*`, брелки `charm-*`; машина; реквизит). `<limb d w fill/>` — конечность-трубка с обводкой.
- `packs/<pack>/scenes/<id>.svg` — сцена: `<bg windows x sign/>` + `<part id x y s [flip] [face]/>` + обычный SVG. У поз `cat-*` лицо задаётся `face="smug|happy|wink"`. `<id>.md` рядом — журнал доработки.
- Сборка: `node lib/scene.mjs <pack> [id]` → `dist/<pack>/{vars,<тема>}/<id>.svg`.
- Просмотр: `node lib/page.mjs <pack>` (страница со сценами, журналами, историей) + `node lib/serve.mjs` → 0.0.0.0:8080 = https://test.bomji.org.

## Как делать сцену
1. Композиция строго по `docs/COMPOSITION.md`.
2. Доработка строго по `docs/REVIEW.md`: до 5 проходов, на каждом `node lib/review.mjs <pack> <id>`, смотреть лист проверки, править, писать журнал.
3. Новые позы и предметы рисуются в `parts/` и переиспользуются. В сцене не рисовать то, что пригодится ещё раз.
