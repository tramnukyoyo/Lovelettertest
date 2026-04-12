@echo off
cd /d "E:\GamebuddiesPlatform\HeartsGambit\client"
node node_modules\vite\bin\vite.js preview --port 5183 --strictPort --host 127.0.0.1 > preview.log 2>&1
