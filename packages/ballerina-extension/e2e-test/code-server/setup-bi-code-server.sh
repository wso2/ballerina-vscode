#!/bin/bash

# =============================================================================
# WSO2 BI Extension Code-Server Setup Script
# =============================================================================
# This script automates the setup of code-server with WSO2 BI extensions
# 
# Supported Platforms:
# - macOS (via Homebrew)
# - Linux (via install script)
# - Windows (via WSL, Chocolatey, Scoop, or winget)
# - Git Bash / MSYS2 / Cygwin
#
# Features:
# 1. Installs code-server if not present
# 2. Automatically copies Ballerina VSIX dependency
# 3. Prompts for VSIX file paths (with smart defaults)
# 4. Installs extensions to code-server
# 5. Configures code-server settings
# 6. Starts code-server with proper configuration
#
# Usage:
#   bash setup-bi-code-server.sh
# =============================================================================

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run with: bash $0"
    exit 1
fi

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_PORT=8080
DEFAULT_HOST="127.0.0.1"
WORKSPACE_PATH=""

# =============================================================================
# Utility Functions
# =============================================================================

print_header() {
    echo ""
    printf "${BLUE}============================================${NC}\n"
    printf "${BLUE}  WSO2 BI Extension Code-Server Setup${NC}\n"
    printf "${BLUE}============================================${NC}\n"
    echo ""
}

print_step() {
    printf "${YELLOW}[STEP]${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

print_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

# =============================================================================
# Step 1: Check and Install Code-Server
# =============================================================================

check_and_install_code_server() {
    print_step "Checking if code-server is installed..."
    
    if command -v code-server &> /dev/null; then
        print_success "Code-server is already installed!"
        code-server --version
        return 0
    fi
    
    print_info "Code-server not found. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            print_info "Installing code-server using Homebrew..."
            brew install code-server
        else
            print_error "Homebrew not found. Please install Homebrew first or install code-server manually."
            echo "Visit: https://github.com/coder/code-server#install"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux" ]]; then
        # Linux (including WSL)
        print_info "Installing code-server using curl..."
        curl -fsSL https://code-server.dev/install.sh | sh
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]] || [[ -n "$WINDIR" ]]; then
        # Windows (Git Bash, MSYS2, Cygwin, or native Windows)
        print_info "Windows detected. Installing code-server..."
        
        # Check if running in WSL
        if grep -qi microsoft /proc/version 2>/dev/null; then
            print_info "WSL detected. Using Linux installation method..."
            curl -fsSL https://code-server.dev/install.sh | sh
        # Check for Chocolatey
        elif command -v choco &> /dev/null; then
            print_info "Installing code-server using Chocolatey..."
            choco install code-server -y
        # Check for Scoop
        elif command -v scoop &> /dev/null; then
            print_info "Installing code-server using Scoop..."
            scoop install code-server
        # Check for winget (Windows Package Manager)
        elif command -v winget.exe &> /dev/null || command -v winget &> /dev/null; then
            print_info "Installing code-server using winget..."
            winget install -e --id coder.code-server
        else
            print_error "No supported package manager found (Chocolatey, Scoop, or winget)."
            echo ""
            echo "Please install code-server manually using one of these methods:"
            echo ""
            echo "1. Using npm (if Node.js is installed):"
            echo "   npm install --global code-server"
            echo ""
            echo "2. Using Chocolatey:"
            echo "   choco install code-server"
            echo ""
            echo "3. Using Scoop:"
            echo "   scoop install code-server"
            echo ""
            echo "4. Download standalone binary:"
            echo "   Visit: https://github.com/coder/code-server/releases"
            echo ""
            exit 1
        fi
    else
        print_error "Unsupported operating system: $OSTYPE"
        echo "Please install code-server manually: https://github.com/coder/code-server#install"
        exit 1
    fi
    
    # Verify installation
    if command -v code-server &> /dev/null; then
        print_success "Code-server installed successfully!"
        code-server --version
    else
        print_error "Failed to install code-server!"
        exit 1
    fi
}

# =============================================================================
# Step 2: Get VSIX File Paths
# =============================================================================

get_vsix_paths() {
    print_step "Getting VSIX file paths..."
    
    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # Navigate to the extension root (2 levels up: code-server -> e2e-test -> extension root)
    BI_EXTENSION_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    # Default path to VSIX directory (in extension's vsix folder)
    DEFAULT_VSIX_DIR="$BI_EXTENSION_ROOT/vsix"
    
    # Automatically copy Ballerina VSIX if not present
    echo ""
    print_info "Checking for Ballerina VSIX in $DEFAULT_VSIX_DIR..."
    BALLERINA_VSIX_CHECK=$(find "$DEFAULT_VSIX_DIR" -maxdepth 1 -name "ballerina-*.vsix" -type f 2>/dev/null | grep -v "ballerina-integrator" | head -n 1)
    
    if [[ -z "$BALLERINA_VSIX_CHECK" ]]; then
        print_error "Ballerina VSIX not found in $DEFAULT_VSIX_DIR."
        print_info "Please ensure the extension is built and VSIXs are available before continuing."
    else
        print_success "Ballerina VSIX already present: $BALLERINA_VSIX_CHECK"
    fi
    
    # Get Ballerina VSIX path
    while true; do
        echo ""
        print_info "Default: Look for Ballerina VSIX in $DEFAULT_VSIX_DIR"
        read -p "Enter the path to the Ballerina VSIX file (or press Enter to use default): " BALLERINA_VSIX_PATH
        
        if [[ -z "$BALLERINA_VSIX_PATH" ]]; then
            # Use default path - find the first ballerina-*.vsix file (excluding ballerina-integrator)
            if [[ -d "$DEFAULT_VSIX_DIR" ]]; then
                BALLERINA_VSIX_PATH=$(find "$DEFAULT_VSIX_DIR" -maxdepth 1 -name "ballerina-*.vsix" -type f | grep -v "ballerina-integrator" | head -n 1)
                if [[ -f "$BALLERINA_VSIX_PATH" ]]; then
                    print_info "Using default Ballerina VSIX: $BALLERINA_VSIX_PATH"
                else
                    print_error "No Ballerina VSIX file found in default location: $DEFAULT_VSIX_DIR"
                    print_info "Please ensure the Ballerina extension is built in the workspace."
                    continue
                fi
            else
                print_error "Default VSIX directory not found: $DEFAULT_VSIX_DIR"
                print_info "Please enter the path manually."
                continue
            fi
        else
            # Expand tilde to home directory
            BALLERINA_VSIX_PATH="${BALLERINA_VSIX_PATH/#\~/$HOME}"
        fi
        
        if [[ -f "$BALLERINA_VSIX_PATH" ]] && [[ "$BALLERINA_VSIX_PATH" == *.vsix ]]; then
            print_success "Ballerina VSIX file found: $BALLERINA_VSIX_PATH"
            break
        else
            print_error "File not found or not a .vsix file: $BALLERINA_VSIX_PATH"
        fi
    done
    
    # Get Ballerina Integrator VSIX path
    while true; do
        echo ""
        print_info "Default: Look for Ballerina Integrator VSIX in $DEFAULT_VSIX_DIR"
        read -p "Enter the path to the Ballerina Integrator VSIX file (or press Enter to use default): " BI_VSIX_PATH
        
        if [[ -z "$BI_VSIX_PATH" ]]; then
            # Use default path - find the first ballerina-integrator-*.vsix file
            if [[ -d "$DEFAULT_VSIX_DIR" ]]; then
                BI_VSIX_PATH=$(find "$DEFAULT_VSIX_DIR" -maxdepth 1 -name "ballerina-integrator-*.vsix" | head -n 1)
                if [[ -f "$BI_VSIX_PATH" ]]; then
                    print_info "Using default Ballerina Integrator VSIX: $BI_VSIX_PATH"
                else
                    print_error "No Ballerina Integrator VSIX file found in default location: $DEFAULT_VSIX_DIR"
                    print_info "Please ensure the BI extension is built first (run 'pnpm run rebuild')."
                    continue
                fi
            else
                print_error "Default VSIX directory not found: $DEFAULT_VSIX_DIR"
                print_info "Please enter the path manually."
                continue
            fi
        else
            # Expand tilde to home directory
            BI_VSIX_PATH="${BI_VSIX_PATH/#\~/$HOME}"
        fi
        
        if [[ -f "$BI_VSIX_PATH" ]] && [[ "$BI_VSIX_PATH" == *.vsix ]]; then
            print_success "Ballerina Integrator VSIX file found: $BI_VSIX_PATH"
            break
        else
            print_error "File not found or not a .vsix file: $BI_VSIX_PATH"
        fi
    done
}

# =============================================================================
# Step 3: Uninstall Existing Extensions
# =============================================================================

uninstall_existing_extensions() {
    print_step "Uninstalling existing Ballerina and Ballerina Integrator extensions (if any)..."
    code-server --uninstall-extension "ballerina.ballerina" || true
    code-server --uninstall-extension "wso2.ballerina-integrator" || true
    print_success "Uninstallation step completed."
}

# =============================================================================
# Step 4: Install Extensions
# =============================================================================

install_extensions() {
    print_step "Installing extensions to code-server..."
    
    # Install Ballerina extension first (dependency)
    print_info "Installing Ballerina extension..."
    if code-server --force --install-extension "$BALLERINA_VSIX_PATH"; then
        print_success "Ballerina extension installed successfully!"
    else
        print_error "Failed to install Ballerina extension!"
        exit 1
    fi
    
    # Install Ballerina Integrator extension
    print_info "Installing Ballerina Integrator extension..."
    if code-server --force --install-extension "$BI_VSIX_PATH"; then
        print_success "Ballerina Integrator extension installed successfully!"
    else
        print_error "Failed to install Ballerina Integrator extension!"
        exit 1
    fi
    
    # List installed extensions for verification
    echo ""
    print_info "Installed extensions:"
    code-server --list-extensions | grep -E "(ballerina|wso2)" || true
}

# =============================================================================
# Step 5: Configure Code-Server Settings
# =============================================================================

configure_code_server_settings() {
    print_step "Configuring code-server settings..."
    
    # Get code-server config directory
    CONFIG_DIR="$HOME/.local/share/code-server/User"
    mkdir -p "$CONFIG_DIR"
    
    SETTINGS_FILE="$CONFIG_DIR/settings.json"
    
    # Create or update settings.json
    print_info "Configuring settings.json..."
    
    # Check if settings file exists
    if [[ -f "$SETTINGS_FILE" ]]; then
        print_info "Existing settings.json found. Backing up..."
        cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create settings with trusted extensions and default password requirement disabled
    cat > "$SETTINGS_FILE" << 'EOF'
{
    "extensions.autoCheckUpdates": false,
    "extensions.autoUpdate": false,
    "workbench.enableExperiments": false,
    "extensions.ignoreRecommendations": true,
    "security.workspace.trust.enabled": false,
    "extensions.confirmedUriHandlerExtensionIds": [
        "wso2.ballerina",
        "wso2.ballerina-integrator",
        "ballerina.ballerina"
    ],
    "security.allowedUNCHosts": [],
    "security.restrictUNCAccess": false
}
EOF
    
    print_success "Settings configured successfully!"
    print_info "Settings file: $SETTINGS_FILE"
}

# =============================================================================
# Step 6: Configure Default Password
# =============================================================================

configure_default_password() {
    print_step "Configuring code-server authentication..."
    
    # Get code-server config directory
    CONFIG_DIR="$HOME/.config/code-server"
    mkdir -p "$CONFIG_DIR"
    
    CONFIG_FILE="$CONFIG_DIR/config.yaml"
    
    # Check if config exists
    if [[ -f "$CONFIG_FILE" ]]; then
        print_info "Existing config.yaml found. Backing up..."
        cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create new config without authentication
    cat > "$CONFIG_FILE" << EOF
bind-addr: 127.0.0.1:8080
auth: none
cert: false
EOF
    print_success "Authentication disabled - no password required!"
    print_info "Config file: $CONFIG_FILE"
}

# =============================================================================
# Step 7: Get Workspace and Server Configuration
# =============================================================================

get_server_config() {
    print_step "Configuring server settings..."
    
    # Get workspace path
    echo ""
    print_info "Current directory: $(pwd)"
    read -p "Enter workspace path (leave empty for current directory): " WORKSPACE_INPUT
    
    if [[ -z "$WORKSPACE_INPUT" ]]; then
        WORKSPACE_PATH="$(pwd)"
        print_info "Using current directory as workspace"
    else
        # Expand tilde to home directory
        WORKSPACE_PATH="${WORKSPACE_INPUT/#\~/$HOME}"
        
        # Convert to absolute path if it's relative
        if [[ ! "$WORKSPACE_PATH" = /* ]]; then
            WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" 2>/dev/null && pwd)" || {
                print_error "Cannot resolve relative path: $WORKSPACE_INPUT"
                print_info "Please use an absolute path or ensure the directory exists"
                exit 1
            }
        fi
        
        print_info "Processed workspace path: $WORKSPACE_PATH"
    fi
    
    # Verify workspace exists
    if [[ ! -d "$WORKSPACE_PATH" ]]; then
        print_error "Workspace directory does not exist: $WORKSPACE_PATH"
        print_info "Please check the path and try again"
        exit 1
    fi
    
    # Get the absolute path to avoid any issues
    WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" && pwd)"
    print_success "Workspace set to: $WORKSPACE_PATH"
    
    # Get port (optional)
    echo ""
    read -p "Enter port number (default: $DEFAULT_PORT): " PORT_INPUT
    if [[ -z "$PORT_INPUT" ]]; then
        SERVER_PORT=$DEFAULT_PORT
    else
        SERVER_PORT=$PORT_INPUT
    fi
    
    # Get host (optional)
    echo ""
    read -p "Enter host address (default: $DEFAULT_HOST): " HOST_INPUT
    if [[ -z "$HOST_INPUT" ]]; then
        SERVER_HOST=$DEFAULT_HOST
    else
        SERVER_HOST=$HOST_INPUT
    fi
    
    print_info "Server will run on: http://$SERVER_HOST:$SERVER_PORT/?folder=$WORKSPACE_PATH"
}

# =============================================================================
# Step 8: Start Code-Server
# =============================================================================

start_code_server() {
    print_step "Starting code-server..."
    
    echo ""
    print_info "Code-server is starting with the following configuration:"
    echo "  - Host: $SERVER_HOST"
    echo "  - Port: $SERVER_PORT"
    echo "  - Workspace: $WORKSPACE_PATH"
    echo ""
    
    # Double-check workspace exists
    if [[ ! -d "$WORKSPACE_PATH" ]]; then
        print_error "CRITICAL: Workspace directory disappeared: $WORKSPACE_PATH"
        exit 1
    fi
    
    print_info "Final workspace verification successful: $(ls -la "$WORKSPACE_PATH" | head -3)"
    
    # Check authentication status from config
    CONFIG_FILE="$HOME/.config/code-server/config.yaml"
    AUTH_TYPE="none"
    PASSWORD=""
    
    if [[ -f "$CONFIG_FILE" ]]; then
        AUTH_TYPE=$(grep "^auth:" "$CONFIG_FILE" | cut -d' ' -f2)
        if [[ "$AUTH_TYPE" == "password" ]]; then
            PASSWORD=$(grep "^password:" "$CONFIG_FILE" | cut -d' ' -f2)
        fi
    fi
    
    echo ""
    printf "${GREEN}🚀 CODE-SERVER READY!${NC}\n"
    printf "${GREEN}===========================================${NC}\n"
    printf "${GREEN}1. Open your web browser${NC}\n"
    printf "${GREEN}2. Navigate to: ${BLUE}http://%s:%s/?folder=%s${NC}\n" "$SERVER_HOST" "$SERVER_PORT" "$WORKSPACE_PATH"
    
    if [[ "$AUTH_TYPE" == "none" ]]; then
        printf "${GREEN}3. No password required! 🎉${NC}\n"
    elif [[ -n "$PASSWORD" ]]; then
        printf "${GREEN}3. Enter password: ${YELLOW}%s${NC}\n" "$PASSWORD"
    fi
    
    printf "${GREEN}4. Your WSO2 BI extensions are ready to use!${NC}\n"
    echo ""
    print_success "Code-server running... Press Ctrl+C to stop."
    echo ""
    
    # Debug: Show the exact command that will be executed
    print_info "Executing command: code-server --bind-addr \"$SERVER_HOST:$SERVER_PORT\" \"$WORKSPACE_PATH\""
    
    # Start code-server
    exec code-server --bind-addr "$SERVER_HOST:$SERVER_PORT" "$WORKSPACE_PATH"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header
    
    # Step 1: Check and install code-server
    check_and_install_code_server
    
    # Step 2: Get VSIX file paths
    get_vsix_paths

    # Step 3: Uninstall existing extensions to avoid conflicts
    uninstall_existing_extensions

    # Step 4: Install extensions
    install_extensions

    # Step 5: Configure code-server settings (trust extensions)
    configure_code_server_settings

    # Step 6: Disable authentication (no password required)
    configure_default_password

    # Step 7: Get server configuration
    get_server_config

    # Step 8: Start code-server
    start_code_server
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Handle Ctrl+C gracefully
trap 'printf "\n${YELLOW}Script interrupted by user${NC}\n"; exit 0' INT

# Check if running as source
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi