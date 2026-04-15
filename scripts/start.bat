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

:: Créer les dossiers si besoin
if not exist backend mkdir backend
if not exist frontend mkdir frontend

:: Lancer le backend (dans une nouvelle fenêtre)
echo 🚀 Lancement du backend...
start cmd /k "cd /d "%CD%\backend" && set PORT=3000 && echo 🔧 Backend PNDA sur http://localhost:3000 && npm run dev"

:: Attendre
timeout /t 3 /nobreak >nul

:: Lancer le frontend (dans une nouvelle fenêtre)
echo 🚀 Lancement du frontend...
start cmd /k "cd /d "%CD%\frontend" && echo 🎨 Frontend PNDA && npm run dev"

:: Attendre et ouvrir le navigateur
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ✅ Application lancee !
echo.
echo 📍 Frontend: http://localhost:5173
echo 📍 Backend:  http://localhost:3000
echo.
echo 💡 Si les serveurs ne demarrent pas, 
echo    installez d'abord les dependances:
echo    cd backend ^&^& npm install
echo    cd frontend ^&^& npm install
echo.
pause