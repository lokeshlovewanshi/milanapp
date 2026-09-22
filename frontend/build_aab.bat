@echo off
if "%EXPO_TOKEN%"=="" (
  echo ERROR: EXPO_TOKEN is not set.
  echo Set it once with: setx EXPO_TOKEN "your-new-expo-token"
  exit /b 1
)
cd /d "%~dp0"
echo Triggering EAS production AAB build for Google Play Console...
node "C:\Users\lokes\AppData\Roaming\npm\node_modules\eas-cli\bin\run" build --platform android --profile production --non-interactive --no-wait

