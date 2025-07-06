#!/bin/bash

# Development Environment Setup Script
# Sets up the complete development environment for the DeFi Risk Assessment API

set -e

# Configuration
PROJECT_NAME="defi-risk-assessment"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check Node.js version
check_node() {
    log "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+ first."
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    REQUIRED_VERSION="20.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        error "Node.js version $NODE_VERSION is too old. Please install Node.js 20+ first."
    fi
    
    success "Node.js version $NODE_VERSION is compatible"
}

# Check Python and Slither
check_python_slither() {
    log "Checking Python and Slither installation..."
    
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3.8+ first."
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    log "Found Python version: $PYTHON_VERSION"
    
    # Check if Slither is installed
    if ! command -v slither &> /dev/null; then
        log "Installing Slither..."
        pip3 install slither-analyzer crytic-compile solc-select
        
        # Install Solidity compiler
        solc-select install 0.8.19
        solc-select use 0.8.19
        
        success "Slither and Solidity compiler installed"
    else
        success "Slither is already installed"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    log "Installing Node.js dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "package.json" ]; then
        error "package.json not found. Make sure you're in the correct directory."
    fi
    
    npm ci
    success "Dependencies installed"
}

# Set up environment files
setup_environment() {
    log "Setting up environment files..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f ".env" ]; then
        cp ".env.example" ".env"
        success "Created .env file from .env.example"
        log "Please edit .env file to configure your API keys and settings"
    else
        log ".env file already exists"
    fi
}

# Create data directories
setup_directories() {
    log "Setting up data directories..."
    
    cd "$PROJECT_ROOT"
    
    # Create all necessary directories
    mkdir -p data/{protocols,assessments,cache,logs,temp,backups}
    mkdir -p data/cache/{etherscan,bscscan,polygonscan,defillama,coingecko,slither}
    mkdir -p logs
    mkdir -p tmp
    
    success "Data directories created"
}

# Build the application
build_application() {
    log "Building the application..."
    
    cd "$PROJECT_ROOT"
    npm run build
    
    success "Application built successfully"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$PROJECT_ROOT"
    npm test
    
    success "Tests completed"
}

# Start development server
start_dev() {
    log "Starting development server..."
    
    cd "$PROJECT_ROOT"
    npm run dev
}

# Show help
show_help() {
    echo "DeFi Protocol Risk Assessment - Development Setup"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  setup       Complete development environment setup"
    echo "  install     Install dependencies only"
    echo "  build       Build the application"
    echo "  test        Run tests"
    echo "  dev         Start development server"
    echo "  clean       Clean build artifacts"
    echo "  help        Show this help message"
    echo
}

# Clean build artifacts
clean() {
    log "Cleaning build artifacts..."
    
    cd "$PROJECT_ROOT"
    rm -rf dist/
    rm -rf node_modules/.cache/
    rm -rf tmp/*
    
    success "Clean completed"
}

# Complete setup
complete_setup() {
    log "Starting complete development environment setup..."
    
    check_node
    check_python_slither
    install_dependencies
    setup_environment
    setup_directories
    build_application
    
    success "Development environment setup completed!"
    log ""
    log "Next steps:"
    log "1. Edit .env file to configure your API keys"
    log "2. Run 'npm run dev' to start the development server"
    log "3. Run 'npm test' to verify everything is working"
    log ""
    log "Development server will be available at: http://localhost:3000"
    log "API documentation: http://localhost:3000/api/v1/status"
}

# Main execution
main() {
    case "${1:-setup}" in
        "setup")
            complete_setup
            ;;
        "install")
            install_dependencies
            ;;
        "build")
            build_application
            ;;
        "test")
            run_tests
            ;;
        "dev")
            start_dev
            ;;
        "clean")
            clean
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

main "$@"
