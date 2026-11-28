#!/usr/bin/env bash
# Audit en lecture seule du dépôt CreditBridge AI. À lancer à la racine du dépôt :
#   bash scripts/audit.sh > audit.txt
# N'affiche que les NOMS des variables d'environnement, jamais leurs valeurs.
set -u

if [ ! -f package.json ]; then
  echo "ERREUR : package.json introuvable. Lancez ce script à la racine du dépôt CreditBridge AI." >&2
  exit 1
fi

section() { printf '\n===== %s =====\n' "$1"; }

section "Git"
git rev-parse --abbrev-ref HEAD 2>/dev/null; git status --short 2>/dev/null | head -20

section "Structure (src, 3 niveaux)"
find src -maxdepth 3 -not -path '*/node_modules*' 2>/dev/null | sort | head -120

section "Versions clés (package.json)"
node -e '
const p=require("./package.json"); const d={...p.dependencies,...p.devDependencies};
for (const k of ["react","typescript","vite","tailwindcss","vite-plugin-pwa","workbox-window","dexie","firebase","zod","vitest","jest","@playwright/test"])
  console.log(k.padEnd(20), d[k] ?? "— absent");
console.log("\nscripts:", p.scripts);'

section "Firebase installé (doit être >= 12.5.0 pour inferenceSource)"
node -p 'require("firebase/package.json").version' 2>/dev/null || echo "firebase non installé"

section "Types du SDK : InferenceMode / initializeDeviceModel / inferenceSource"
grep -rhoE "(PREFER_ON_DEVICE|ONLY_ON_DEVICE|PREFER_IN_CLOUD|ONLY_IN_CLOUD)" node_modules/@firebase/ai/dist/ai-public.d.ts 2>/dev/null | sort -u
grep -n "initializeDeviceModel\|inferenceSource" node_modules/@firebase/ai/dist/ai-public.d.ts 2>/dev/null | head

section "Usages Firebase / IA dans le code"
grep -rnE "firebase/(ai|app-check|auth|firestore|remote-config)|getAI|getGenerativeModel|InferenceMode" src 2>/dev/null | head -40

section "IndexedDB / Dexie"
grep -rnE "from ['\"]dexie['\"]|new Dexie|\.version\(" src 2>/dev/null | head -20

section "Zod / validation"
grep -rln "from ['\"]zod['\"]" src 2>/dev/null | head -20

section "PWA / Service Worker"
ls public 2>/dev/null; grep -nE "VitePWA|registerType|workbox|manifest" vite.config.* 2>/dev/null
grep -rnE "serviceWorker|registerSW" src 2>/dev/null | head

section "Tests"
find . -path ./node_modules -prune -o \( -name '*.test.ts*' -o -name '*.spec.ts*' \) -print 2>/dev/null | head -30

section "Variables d'environnement (noms uniquement)"
for f in .env .env.local .env.example .env.development; do
  [ -f "$f" ] && { echo "-- $f"; sed -E 's/=.*/=<masqué>/' "$f" | grep -v '^\s*#' | grep -v '^\s*$'; }
done
echo "-- .env ignoré par git ?"; git check-ignore -v .env .env.local 2>/dev/null || echo "ATTENTION : .env non ignoré"

section "Secrets potentiellement exposés (motifs, sans afficher la valeur)"
grep -rlE "AIza[0-9A-Za-z_-]{35}|FIREBASE_APPCHECK_DEBUG_TOKEN\s*=\s*['\"][0-9a-f-]{36}" src public 2>/dev/null || echo "aucun motif trouvé"

section "Firestore / Hosting"
ls firebase.json firestore.rules firestore.indexes.json .firebaserc 2>/dev/null

section "Racine du dépôt, déploiement, routage"
node -v 2>/dev/null; npm -v 2>/dev/null
ls -1 vercel.json firebase.json .firebaserc README.md LICENSE .gitignore tsconfig*.json vite.config.* tailwind.config.* postcss.config.* 2>/dev/null
echo "-- hébergement (Vercel ou Firebase Hosting ?)"
[ -f vercel.json ] && echo "vercel.json présent" || echo "vercel.json absent"
grep -n '"hosting"' firebase.json 2>/dev/null | head -3
echo "-- TypeScript strict ?"
grep -nE '"strict"|"noUncheckedIndexedAccess"' tsconfig*.json 2>/dev/null
echo "-- routage"
grep -rnE "react-router|createBrowserRouter|<Routes" src package.json 2>/dev/null | head -5
echo "-- répertoires cibles présents (docs/ tests/)"
ls -d docs tests tests/unit tests/integration tests/e2e 2>/dev/null

section "Build et typage"
npx tsc --noEmit 2>&1 | tail -15
npm run build 2>&1 | tail -15