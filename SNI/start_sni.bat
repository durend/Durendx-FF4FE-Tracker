@echo off
REM Starts SNI (https://github.com/alttpo/sni) for the FF4FE Tracker.
REM
REM SNI normally listens on port 23074. This also opens port 8080, the
REM tracker's default, so the launcher works without changing the port.
REM
REM Setup: download SNI for Windows from https://github.com/alttpo/sni/releases
REM and extract it into this folder, so sni.exe sits next to this file.
REM Close QUsb2Snes before running this - they would fight over port 8080
REM and the device.

set SNI_USB2SNES_LISTEN_ADDRS=0.0.0.0:23074,0.0.0.0:8080

if not exist "%~dp0sni.exe" (
    echo sni.exe not found in this folder.
    echo Download SNI from https://github.com/alttpo/sni/releases
    echo and extract it into: %~dp0
    pause
    exit /b 1
)

start "" "%~dp0sni.exe"
