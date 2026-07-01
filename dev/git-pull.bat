@echo off
REM Git pull instantly for Windows

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

REM Main execution
call :print_banner
call :print_info "Pulling latest changes from git..."
git pull
if %errorlevel% equ 0 (
    call :print_success "Git pull completed successfully"
) else (
    call :print_error "Git pull failed"
)
