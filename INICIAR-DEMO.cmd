@echo off
setlocal
title Macarrao Dellas - Demo local
pushd "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24.x e abra este arquivo novamente.
  pause
  exit /b 1
)
if not exist "node_modules\next\package.json" (
  echo Instalando as dependencias da demo...
  call npm ci
  if errorlevel 1 (
    echo Nao foi possivel instalar. Confira a conexao e o Node.js 24.x.
    pause
    exit /b 1
  )
)
if not exist ".env.local" (
  call npm run setup
  if errorlevel 1 (
    pause
    exit /b 1
  )
  echo.
  echo Guarde o e-mail e a senha exibidos acima antes de continuar.
  pause
)
echo.
echo Site: http://127.0.0.1:3000
echo Painel: http://127.0.0.1:3000/gestor
echo Mantenha esta janela aberta. Use Ctrl+C para parar.
call npm run dev
popd
endlocal
