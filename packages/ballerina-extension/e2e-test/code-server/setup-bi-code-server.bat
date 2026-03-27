@echo off
REM =============================================================================
REM WSO2 BI Extension Code-Server Setup Script (Windows Launcher)
REM =============================================================================
REM This batch file launches the bash setup script on Windows systems
REM 
REM Requirements:
REM - Git for Windows (includes Git Bash) OR
REM - WSL (Windows Subsystem for Linux) OR
REM - MSYS2 / Cygwin
REM =============================================================================

echo ============================================
echo WSO2 BI Extension Code-Server Setup
echo ============================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "BASH_SCRIPT=%SCRIPT_DIR%setup-bi-code-server.sh"

REM Check if the bash script exists
if not exist "%BASH_SCRIPT%" (
    echo [ERROR] setup-bi-code-server.sh not found in %SCRIPT_DIR%
    echo Please ensure the script file exists.
    pause
    exit /b 1
)

echo [INFO] Detecting bash environment...
echo.

REM Try Git Bash first (most common on Windows)
where git.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where git.exe') do set "GIT_PATH=%%i"
    for %%i in ("!GIT_PATH!") do set "GIT_DIR=%%~dpi"
    set "BASH_PATH=!GIT_DIR!bin\bash.exe"
    
    if exist "!BASH_PATH!" (
        echo [SUCCESS] Found Git Bash: !BASH_PATH!
        echo [INFO] Launching setup script...
        echo.
        "!BASH_PATH!" "%BASH_SCRIPT%"
        goto :end
    )
)

REM Try bash in PATH (WSL, MSYS2, etc.)
where bash.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Found bash in PATH
    echo [INFO] Launching setup script...
    echo.
    bash.exe "%BASH_SCRIPT%"
    goto :end
)

REM Try wsl
where wsl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Found WSL
    echo [INFO] Converting path and launching setup script...
    echo.
    wsl.exe bash "%BASH_SCRIPT%"
    goto :end
)

REM No bash found
echo [ERROR] Could not find a bash environment!
echo.
echo Please install one of the following:
echo 1. Git for Windows (includes Git Bash)
echo    Download: https://git-scm.com/download/win
echo.
echo 2. Windows Subsystem for Linux (WSL)
echo    Run: wsl --install
echo.
echo 3. MSYS2
echo    Download: https://www.msys2.org/
echo.
pause
exit /b 1

:end
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup script failed with exit code %ERRORLEVEL%
    pause
)
