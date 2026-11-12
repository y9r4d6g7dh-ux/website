#!/bin/sh
# EasyLife starten (macOS / Linux). Doppelklick, oder im Terminal: sh start-mac.command
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte zuerst von https://nodejs.org installieren (LTS), dann erneut starten."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Erste Einrichtung, das dauert ein paar Minuten..."
  npm install || { echo "Installation fehlgeschlagen."; exit 1; }
fi
echo
echo "EasyLife startet. Computer: http://localhost:3000"
echo "Handy: die \"Network\"-Adresse unten in den Handy-Browser eingeben."
echo "Zum Beenden: Ctrl+C"
echo
(sleep 6; command -v open >/dev/null 2>&1 && open http://localhost:3000) &
npm run dev
