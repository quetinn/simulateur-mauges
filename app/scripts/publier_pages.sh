#!/usr/bin/env sh
# publier_pages.sh — Republie l'application sur GitHub Pages (branche gh-pages = contenu de app/, sans captures ni scripts).
# Usage, depuis la racine du simulateur, après avoir committé sur main : sh app/scripts/publier_pages.sh
# Site : https://quetinn.github.io/simulateur-mauges/ (mis à jour une à deux minutes après le push).
set -e
node tests/parite_app.mjs
W="$(mktemp -d)/gh-pages"
git worktree add --detach "$W" -q
(
  cd "$W"
  git checkout --orphan gh-pages-tmp -q
  git rm -rq --cached .
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name app -exec rm -rf {} +
  mv app/index.html app/data.js app/precalcul.js app/vendor app/README.md .
  rm -rf app
  touch .nojekyll
  git add -A
  git commit -qm "Publication de l'application ($(git -C "$OLDPWD" rev-parse --short HEAD) de main)"
  git push -qf origin HEAD:gh-pages
)
git worktree remove --force "$W"
git branch -D gh-pages-tmp -q 2>/dev/null || true
echo "Publié : https://quetinn.github.io/simulateur-mauges/"
