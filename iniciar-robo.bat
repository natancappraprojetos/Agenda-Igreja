@echo off
color 0a
title Robo da Agenda Igreja

echo ==============================================
echo       Iniciando o Robo do WhatsApp...
echo ==============================================
echo.

cd whatsapp-bot

:: Verifica se a pasta node_modules existe, se não, instala as dependencias
if not exist node_modules (
    echo [!] Primeira vez rodando! Instalando dependencias (isso pode demorar uns minutos)...
    call npm install
    echo [!] Instalacao concluida!
    echo.
)

:: Roda o bot
call npm start

echo.
echo ==============================================
echo Pressione qualquer tecla para fechar a janela...
pause > nul
