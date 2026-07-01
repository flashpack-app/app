#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Flash ASCII Banner
BANNER="
    █████ █      ███   ████ █   █     
   █     █     █   █ █     █   █      
  ████  █     █████  ███  █████       
 █     █     █   █     █ █   █  █     
█     █████ █   █ ████  █   █  █    
"

# Functions
print_banner() {
    echo -e "${YELLOW}${BANNER}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Main execution
print_banner
print_info "Pulling latest changes from git..."
git pull
if [ $? -eq 0 ]; then
    print_success "Git pull completed successfully"
else
    print_error "Git pull failed"
fi
