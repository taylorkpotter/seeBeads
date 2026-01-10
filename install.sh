#!/bin/sh
# seeBeads installer - https://github.com/taylorkpotter/seeBeads
# Usage: curl -sSL https://raw.githubusercontent.com/taylorkpotter/seeBeads/main/install.sh | sh
#
# This installer will:
# 1. Install Go (if not present)
# 2. Install seebeads dashboard
# 3. Install Beads CLI (bd)
# 4. Launch the dashboard

set -e

# Colors (only if terminal supports it)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    MAGENTA=''
    CYAN=''
    BOLD=''
    DIM=''
    NC=''
fi

# Config
REPO="taylorkpotter/seeBeads"
BINARY_NAME="seebeads"
INSTALL_DIR="${HOME}/.local/bin"
GO_INSTALL_DIR="${HOME}/.local/go"
GO_VERSION="1.22.0"

# Print with style
print_step() {
    printf "${CYAN}▸${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}✓${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}✗${NC} %s\n" "$1" >&2
}

print_warn() {
    printf "${YELLOW}!${NC} %s\n" "$1"
}

# Header
print_header() {
    printf "\n"
    printf "${MAGENTA}${BOLD}  ╭─────────────────────────────────────╮${NC}\n"
    printf "${MAGENTA}${BOLD}  │${NC}     ${CYAN}🔮 seeBeads Installer${NC}          ${MAGENTA}${BOLD}│${NC}\n"
    printf "${MAGENTA}${BOLD}  │${NC}     ${DIM}Visual dashboard for Beads${NC}      ${MAGENTA}${BOLD}│${NC}\n"
    printf "${MAGENTA}${BOLD}  ╰─────────────────────────────────────╯${NC}\n"
    printf "\n"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)  echo "darwin" ;;
        Linux*)   echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)  echo "amd64" ;;
        arm64|aarch64) echo "arm64" ;;
        *)             echo "unknown" ;;
    esac
}

# Get latest release version from GitHub
get_latest_version() {
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | \
            grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' || echo ""
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | \
            grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' || echo ""
    fi
}

# Download file
download() {
    url="$1"
    dest="$2"
    
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$url" -o "$dest"
    elif command -v wget >/dev/null 2>&1; then
        wget -q "$url" -O "$dest"
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
}

# Check if command exists
has_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Install Go if not present
install_go() {
    if has_cmd go; then
        GO_CURRENT="$(go version 2>/dev/null | awk '{print $3}' | sed 's/go//')"
        print_success "Go already installed (${GO_CURRENT})"
        return 0
    fi

    print_step "Installing Go ${GO_VERSION}..."

    OS="$(detect_os)"
    ARCH="$(detect_arch)"
    
    # Try Homebrew first on macOS
    if [ "$OS" = "darwin" ] && has_cmd brew; then
        print_step "Installing Go via Homebrew..."
        brew install go >/dev/null 2>&1
        if has_cmd go; then
            print_success "Go installed via Homebrew"
            return 0
        fi
    fi

    # Download and install Go to ~/.local/go
    GO_TARBALL="go${GO_VERSION}.${OS}-${ARCH}.tar.gz"
    GO_URL="https://go.dev/dl/${GO_TARBALL}"
    
    print_step "Downloading Go from go.dev..."
    TEMP_DIR="$(mktemp -d)"
    
    if ! download "$GO_URL" "${TEMP_DIR}/${GO_TARBALL}"; then
        print_error "Failed to download Go"
        rm -rf "$TEMP_DIR"
        return 1
    fi

    print_step "Extracting Go to ${GO_INSTALL_DIR}..."
    mkdir -p "$GO_INSTALL_DIR"
    tar -xzf "${TEMP_DIR}/${GO_TARBALL}" -C "${GO_INSTALL_DIR}" --strip-components=1
    rm -rf "$TEMP_DIR"

    # Add Go to PATH for this session
    export PATH="${GO_INSTALL_DIR}/bin:$PATH"
    export GOPATH="${HOME}/go"
    export PATH="${GOPATH}/bin:$PATH"

    if has_cmd go; then
        print_success "Go ${GO_VERSION} installed to ${GO_INSTALL_DIR}"
        return 0
    else
        print_error "Go installation failed"
        return 1
    fi
}

# Install Beads CLI
install_beads_cli() {
    if has_cmd bd; then
        BD_VERSION="$(bd version 2>/dev/null | head -1 || echo 'installed')"
        print_success "Beads CLI already installed"
        return 0
    fi

    print_step "Installing Beads CLI..."
    
    if ! has_cmd go; then
        print_error "Go is required to install Beads CLI"
        return 1
    fi

    # Set GOPATH if not set
    if [ -z "$GOPATH" ]; then
        export GOPATH="${HOME}/go"
    fi
    export PATH="${GOPATH}/bin:$PATH"

    go install github.com/steveyegge/beads/cmd/bd@latest 2>/dev/null

    if has_cmd bd; then
        print_success "Beads CLI (bd) installed"
        return 0
    else
        # Try to find it in GOPATH
        if [ -f "${GOPATH}/bin/bd" ]; then
            print_success "Beads CLI installed to ${GOPATH}/bin/bd"
            return 0
        fi
        print_warn "Beads CLI installation may have issues - check 'go install' output"
        return 0
    fi
}

# Detect shell config file
detect_shell_config() {
    shell_name="$(basename "$SHELL")"
    case "$shell_name" in
        zsh)  echo "${HOME}/.zshrc" ;;
        bash)
            if [ -f "${HOME}/.bash_profile" ]; then
                echo "${HOME}/.bash_profile"
            else
                echo "${HOME}/.bashrc"
            fi
            ;;
        fish) echo "${HOME}/.config/fish/config.fish" ;;
        *)    echo "${HOME}/.profile" ;;
    esac
}

# Add to PATH (handles both seebeads and Go paths)
add_to_path() {
    config_file="$(detect_shell_config)"
    shell_name="$(basename "$SHELL")"
    PATHS_ADDED=0
    
    # Build the path additions we need
    paths_to_add=""
    
    # Check if .local/bin needs to be added
    if ! echo "$PATH" | tr ':' '\n' | grep -q "^${HOME}/.local/bin$"; then
        if [ ! -f "$config_file" ] || ! grep -q ".local/bin" "$config_file" 2>/dev/null; then
            paths_to_add="${paths_to_add}\${HOME}/.local/bin:"
        fi
    fi
    
    # Check if Go paths need to be added (if we installed Go locally)
    if [ -d "$GO_INSTALL_DIR" ]; then
        if ! echo "$PATH" | tr ':' '\n' | grep -q "^${GO_INSTALL_DIR}/bin$"; then
            if [ ! -f "$config_file" ] || ! grep -q ".local/go/bin" "$config_file" 2>/dev/null; then
                paths_to_add="${paths_to_add}\${HOME}/.local/go/bin:"
            fi
        fi
    fi
    
    # Check if GOPATH/bin needs to be added
    GOPATH_BIN="${GOPATH:-${HOME}/go}/bin"
    if ! echo "$PATH" | tr ':' '\n' | grep -q "^${GOPATH_BIN}$"; then
        if [ ! -f "$config_file" ] || ! grep -q "go/bin" "$config_file" 2>/dev/null; then
            paths_to_add="${paths_to_add}\${HOME}/go/bin:"
        fi
    fi
    
    # Nothing to add
    if [ -z "$paths_to_add" ]; then
        return 0
    fi
    
    # Remove trailing colon
    paths_to_add="$(echo "$paths_to_add" | sed 's/:$//')"
    
    # Generate the appropriate shell syntax
    if [ "$shell_name" = "fish" ]; then
        # Fish syntax
        fish_paths="$(echo "$paths_to_add" | tr ':' ' ' | sed 's/\${HOME}/$HOME/g')"
        path_block="
# Added by seeBeads installer
set -gx PATH $fish_paths \$PATH"
        if [ -d "$GO_INSTALL_DIR" ]; then
            path_block="${path_block}
set -gx GOPATH \$HOME/go"
        fi
    else
        # Bash/Zsh syntax
        path_block="
# Added by seeBeads installer
export PATH=\"${paths_to_add}:\$PATH\""
        if [ -d "$GO_INSTALL_DIR" ]; then
            path_block="${path_block}
export GOPATH=\"\${HOME}/go\""
        fi
    fi
    
    # Add to config file
    printf "%s\n" "$path_block" >> "$config_file"
    print_success "Updated PATH in ${config_file}"
    PATHS_ADDED=1
    return 1
}

# Main installation
main() {
    print_header
    
    # Detect platform
    OS="$(detect_os)"
    ARCH="$(detect_arch)"
    
    if [ "$OS" = "unknown" ] || [ "$ARCH" = "unknown" ]; then
        print_error "Unsupported platform: $(uname -s) $(uname -m)"
        printf "\n${DIM}Supported: macOS (Intel/Apple Silicon), Linux (x64/ARM64)${NC}\n"
        exit 1
    fi
    
    print_step "Detected ${BOLD}${OS}/${ARCH}${NC}"
    printf "\n"

    # ═══════════════════════════════════════════════════════════════
    # Step 1: Ensure Go is installed
    # ═══════════════════════════════════════════════════════════════
    printf "${BOLD}Step 1/4:${NC} Go Runtime\n"
    if ! install_go; then
        print_error "Failed to install Go. Please install manually from https://go.dev/dl/"
        exit 1
    fi
    printf "\n"

    # ═══════════════════════════════════════════════════════════════
    # Step 2: Install seebeads
    # ═══════════════════════════════════════════════════════════════
    printf "${BOLD}Step 2/4:${NC} seeBeads Dashboard\n"
    
    # Get latest version
    print_step "Checking for releases..."
    VERSION="$(get_latest_version)"
    
    if [ -z "$VERSION" ]; then
        # No release yet, build from source via go install
        print_step "No pre-built releases. Installing via go install..."
        
        # Ensure GOPATH is set
        if [ -z "$GOPATH" ]; then
            export GOPATH="${HOME}/go"
        fi
        export PATH="${GOPATH}/bin:$PATH"
        
        GOPROXY=direct go install "github.com/${REPO}/cmd/seebeads@v0.1.1" 2>/dev/null || {
            print_error "Failed to install seebeads via go install"
            exit 1
        }
        
        # Copy to our install dir for consistency
        if [ -f "${GOPATH}/bin/seebeads" ]; then
            mkdir -p "$INSTALL_DIR"
            cp "${GOPATH}/bin/seebeads" "${INSTALL_DIR}/seebeads"
            chmod +x "${INSTALL_DIR}/seebeads"
        fi
        
        print_success "seeBeads installed"
    else
        print_success "Found release: ${BOLD}${VERSION}${NC}"
        
        # Construct download URL
        BINARY_SUFFIX=""
        if [ "$OS" = "windows" ]; then
            BINARY_SUFFIX=".exe"
        fi
        
        DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/seebeads-${OS}-${ARCH}${BINARY_SUFFIX}"
        
        # Create install directory
        mkdir -p "$INSTALL_DIR"
        
        # Download binary
        print_step "Downloading seebeads ${VERSION}..."
        TEMP_FILE="$(mktemp)"
        
        if ! download "$DOWNLOAD_URL" "$TEMP_FILE"; then
            print_warn "Download failed, falling back to go install..."
            rm -f "$TEMP_FILE"
            
            if [ -z "$GOPATH" ]; then
                export GOPATH="${HOME}/go"
            fi
            export PATH="${GOPATH}/bin:$PATH"
            
            GOPROXY=direct go install "github.com/${REPO}/cmd/seebeads@v0.1.1" 2>/dev/null || {
                print_error "Failed to install seebeads"
                exit 1
            }
            
            if [ -f "${GOPATH}/bin/seebeads" ]; then
                cp "${GOPATH}/bin/seebeads" "${INSTALL_DIR}/seebeads"
                chmod +x "${INSTALL_DIR}/seebeads"
            fi
        else
            # Install binary
            mv "$TEMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}${BINARY_SUFFIX}"
            chmod +x "${INSTALL_DIR}/${BINARY_NAME}${BINARY_SUFFIX}"
        fi
        
        print_success "seeBeads installed to ${INSTALL_DIR}"
    fi
    printf "\n"

    # ═══════════════════════════════════════════════════════════════
    # Step 3: Install Beads CLI
    # ═══════════════════════════════════════════════════════════════
    printf "${BOLD}Step 3/4:${NC} Beads CLI\n"
    install_beads_cli
    printf "\n"

    # ═══════════════════════════════════════════════════════════════
    # Step 4: Configure PATH
    # ═══════════════════════════════════════════════════════════════
    printf "${BOLD}Step 4/4:${NC} Environment Setup\n"
    
    # Add to current session PATH first
    export PATH="${INSTALL_DIR}:${GO_INSTALL_DIR}/bin:${GOPATH:-${HOME}/go}/bin:$PATH"
    
    # Update shell config
    PATH_ADDED=0
    if add_to_path; then
        PATH_ADDED=0
        print_success "PATH already configured"
    else
        PATH_ADDED=1
    fi
    
    # Verify installations
    SEEBEADS_OK=0
    BD_OK=0
    
    if has_cmd seebeads || [ -f "${INSTALL_DIR}/seebeads" ]; then
        SEEBEADS_OK=1
    fi
    
    if has_cmd bd || [ -f "${GOPATH:-${HOME}/go}/bin/bd" ]; then
        BD_OK=1
    fi
    
    printf "\n"
    
    # ═══════════════════════════════════════════════════════════════
    # Success!
    # ═══════════════════════════════════════════════════════════════
    printf "${GREEN}${BOLD}  ╭───────────────────────────────────────────────╮${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}                                               ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}     ${GREEN}✓ Installation Complete!${NC}                  ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}                                               ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}     ${DIM}seebeads${NC}  Dashboard UI           ${GREEN}✓${NC}        ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}     ${DIM}bd${NC}        Beads CLI             ${GREEN}✓${NC}        ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}     ${DIM}go${NC}        Go runtime            ${GREEN}✓${NC}        ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  │${NC}                                               ${GREEN}${BOLD}│${NC}\n"
    printf "${GREEN}${BOLD}  ╰───────────────────────────────────────────────╯${NC}\n"
    printf "\n"
    
    if [ "$PATH_ADDED" = "1" ]; then
        printf "${YELLOW}${BOLD}  ⚠  To use in NEW terminals, restart or run:${NC}\n"
        printf "     ${CYAN}source $(detect_shell_config)${NC}\n\n"
    fi
    
    printf "${DIM}  Launching seeBeads dashboard...${NC}\n\n"
    
    # Small pause for dramatic effect
    sleep 1
    
    # Launch seebeads!
    SEEBEADS_BIN="${INSTALL_DIR}/${BINARY_NAME}"
    if [ ! -f "$SEEBEADS_BIN" ]; then
        SEEBEADS_BIN="${GOPATH:-${HOME}/go}/bin/seebeads"
    fi
    
    "$SEEBEADS_BIN" init --open 2>/dev/null || {
        # If init fails, show manual instructions
        printf "\n${CYAN}${BOLD}  Quick Start:${NC}\n\n"
        printf "  ${DIM}1.${NC} Navigate to any project directory\n"
        printf "  ${DIM}2.${NC} Run: ${CYAN}seebeads init --open${NC}\n\n"
        printf "  ${DIM}This creates a .beads/ folder and opens the dashboard.${NC}\n\n"
    }
}

# Run
main "$@"
