@echo off
cd /d "%~dp0"
echo Hukuk otomasyonu baslatiliyor...
echo Tarayicida su adresi acilacak: http://127.0.0.1:4200
echo Pencereyi kapatmak icin Ctrl+C yapabilirsiniz.
echo.
set "NODE_EXE=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
  if exist "D:\Programlar\Node.js\node.exe" (
    set "NODE_EXE=D:\Programlar\Node.js\node.exe"
  ) else (
    if exist "C:\Program Files\nodejs\node.exe" (
      set "NODE_EXE=C:\Program Files\nodejs\node.exe"
    ) else (
      echo Node.js bulunamadi. Once Node.js kurulumunu kontrol edin.
      exit /b 1
    )
  )
)

if not exist ".\node_modules\@angular\cli\bin\ng.js" (
  echo Paketler bulunamadi. Once npm install calistirin.
  exit /b 1
)

"%NODE_EXE%" .\node_modules\@angular\cli\bin\ng.js serve --host 127.0.0.1 --port 4200
