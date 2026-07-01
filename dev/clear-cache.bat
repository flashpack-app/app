@echo off
REM Clear Expo cache and restart for Windows

REM Flash ASCII Banner
echo     █████ █      ███   ████ █   █     
echo    █     █     █   █ █     █   █      
echo   ████  █     █████  ███  █████       
echo  █     █     █   █     █ █   █  █     
echo █     █████ █   █ ████  █   █  ^>nul
echo.

REM Functions
:print_banner
goto :eof

:print_success
echo [√] %~1
goto :eof

:print_info
echo [i] %~1
goto :eof

:print_error
echo [X] %~1
goto :eof

:stop_expo
call :print_info "Stopping Expo server..."
taskkill /F /IM node.exe /FI "WINDOWTITLE eq expo*" 2^>nul || true
call :print_success "Expo server stopped"
goto :eof

REM Main execution
call :print_banner
call :print_info "Clearing Expo cache and restarting server..."
call :stop_expo
npx expo start --clear
