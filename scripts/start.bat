@echo off
title PNDA Suivi-Evaluation

echo ========================================
echo    PNDA Suivi-Evaluation
echo ========================================
echo.

:: Aller à la racine du projet
cd /d "C:/Projets/pnda-se"

echo 📁 Repertoire: %CD%
echo.

:: Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non installe
    pause
    exit /b 1
)

:: Lancer l'API connectee a Supabase (dans une nouvelle fenêtre)
echo 🚀 Lancement de l'API Supabase...
start "PNDA API" cmd /k "cd /d ""%CD%\server"" && set PORT=4000 && echo API PNDA sur http://localhost:4000 && npm run dev"

:: Attendre
timeout /t 3 /nobreak >nul

:: Lancer l'interface (dans une nouvelle fenêtre)
echo 🚀 Lancement du frontend...
start "PNDA Web" cmd /k "cd /d ""%CD%\web"" && echo Frontend PNDA && npm run dev"

:: Attendre et ouvrir le navigateur
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ✅ Application lancee !
echo.
echo 📍 Frontend: http://localhost:5173
echo 📍 API Supabase: http://localhost:4000
echo.
echo 💡 Si les serveurs ne demarrent pas, 
echo    installez d'abord les dependances:
echo    npm install
echo.
pause