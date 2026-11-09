@echo off
setlocal
title Macarrao Dellas - Verificar codigo
pushd "%~dp0"
echo Pare o servidor desta copia antes de verificar a compilacao.
echo.
call npm test
if errorlevel 1 goto failed
call npm run typecheck
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo.
echo Testes, tipos e compilacao concluidos.
pause
popd
exit /b 0
:failed
echo.
echo Uma verificacao falhou. Copie a mensagem acima, sem senhas ou dados pessoais.
pause
popd
exit /b 1
