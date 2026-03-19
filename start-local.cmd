@echo off
cd /d "%~dp0"
echo Hukuk otomasyonu baslatiliyor...
echo Tarayicida su adresi acilacak: http://127.0.0.1:4200
echo Pencereyi kapatmak icin Ctrl+C yapabilirsiniz.
echo.
"C:\Program Files\nodejs\node.exe" .\node_modules\@angular\cli\bin\ng.js serve --host 127.0.0.1 --port 4200
