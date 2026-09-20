@echo off
REM Google Play Store AAB Upload Helper
REM Usage: upload_aab.bat <path_to_aab> [track: internal|alpha|beta|production] [path_to_service_account_json]

IF "%~1"=="" (
    echo Usage: upload_aab.bat path\to\your-app.aab [track] [path\to\service_account.json]
    echo Example: upload_aab.bat ./app-release.aab internal ./play-service-account.json
    exit /b 1
)

set AAB_FILE=%~1
set TRACK=%~2
IF "%TRACK%"=="" set TRACK=internal
set KEY_FILE=%~3
IF "%KEY_FILE%"=="" set KEY_FILE=play-service-account.json

cd /d "%~dp0frontend"
node scripts/upload_to_playstore.js --aab "%AAB_FILE%" --track "%TRACK%" --key "%KEY_FILE%"

