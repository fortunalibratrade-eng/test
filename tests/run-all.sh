#!/bin/sh
# Menjalankan semua pemeriksaan otomatis (butuh Node.js 18+; tanpa internet, tanpa npm install).
# Pakai dari folder utama proyek:  sh tests/run-all.sh
set -e
echo "1) Sintaks JavaScript"; node --check js/app.js && node --check js/firebase.js && echo "   OK"
echo "2) Linter handler inline (onclick/onchange) <-> fungsi window"; node tests/lint_handlers.mjs js/app.js index.html
echo "3) Tes perilaku (Firestore & DOM palsu) di beberapa zona waktu"
node tests/build.mjs js/app.js tests/app.test.mjs
for tz in Asia/Jakarta America/Los_Angeles UTC; do printf "   TZ=%s  " "$tz"; TZ=$tz node tests/run.mjs ./app.test.mjs all | tail -1; done
