@echo off
set EXPO_TOKEN=4tuLb4WhRpro7J3PMs2JSFpmdzaaaSlKp_v2iM76
cd /d "%~dp0"
echo Triggering EAS production AAB build for Google Play Console...
node "C:\Users\lokes\AppData\Roaming\npm\node_modules\eas-cli\bin\run" build --platform android --profile production --non-interactive --no-wait

