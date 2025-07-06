#!/bin/bash

# Production Deployment Script for DeFi Protocol Risk Assessment API
# This script handles the complete deployment process

set -e

# Configuration
PROJECT_NAME="defi-risk-assessment"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        warning ".env file not found. Creating from .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        warning "Please edit .env file with your configuration before continuing."
        read -p "Press Enter when you've configured the .env file..."
    fi
    
    success "Prerequisites check completed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Build TypeScript
    log "Compiling TypeScript..."
    npm run build
    
    success "Application build completed"
}

# Create backup
create_backup() {
    log "Creating backup of existing data..."
    
    if [ -d "$PROJECT_ROOT/data" ]; then
        mkdir -p "$BACKUP_DIR"
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$PROJECT_ROOT" data
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    else
        log "No existing data to backup"
    fi
}

# Deploy with Docker Compose
deploy() {
    log "Deploying with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images (if using remote images)
    log "Pulling base images..."
    docker-compose pull
    
    # Build and start services
    log "Building and starting services..."
    docker-compose up -d --build
    
    # Wait for services to be healthy
    log "Waiting for services to start..."
    sleep 10
    
    # Check health
    check_health
    
    success "Deployment completed successfully"
}

# Deploy with monitoring
deploy_with_monitoring() {
    log "Deploying with monitoring enabled..."
    
    cd "$PROJECT_ROOT"
    
    # Deploy with monitoring profile
    docker-compose --profile monitoring up -d --build
    
    # Wait for services
    sleep 15
    
    # Check health of all services
    check_health
    
    success "Deployment with monitoring completed"
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Check main API
    local api_health
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/v1/status > /dev/null; then
            api_health="healthy"
            break
        fi
        log "Waiting for API to be ready... ($i/30)"
        sleep 2
    done
    
    if [ "$api_health" = "healthy" ]; then
        success "API is healthy"
    else
        error "API failed to start properly"
    fi
    
    # Show running containers
    log "Running containers:"
    docker-compose ps
}

# Show logs
show_logs() {
    log "Showing recent logs..."
    docker-compose logs --tail=50 -f
}

# Stop services
stop() {
    log "Stopping services..."
    cd "$PROJECT_ROOT"
    docker-compose down
    success "Services stopped"
}

# Clean up
cleanup() {
    log "Cleaning up..."
    cd "$PROJECT_ROOT"
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove unused images (optional)
    read -p "Remove unused Docker images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker image prune -f
    fi
    
    success "Cleanup completed"
}

# Update deployment
update() {
    log "Updating deployment..."
    
    # Create backup first
    create_backup
    
    # Build new version
    build_application
    
    # Deploy
    deploy
    
    success "Update completed"
}

# Show status
status() {
    log "Service status:"
    cd "$PROJECT_ROOT"
    docker-compose ps
    
    log "\nService health:"
    curl -s http://localhost:3000/api/v1/status | jq . || echo "API not responding"
    
    log "\nResource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# Main menu
show_help() {
    echo "DeFi Protocol Risk Assessment - Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy              Deploy the application"
    echo "  deploy-monitoring   Deploy with monitoring stack"
    echo "  build              Build the application only"
    echo "  backup             Create backup of data"
    echo "  stop               Stop all services"
    echo "  update             Update deployment (with backup)"
    echo "  cleanup            Stop and clean up all resources"
    echo "  logs               Show service logs"
    echo "  status             Show service status"
    echo "  health             Check service health"
    echo "  help               Show this help message"
    echo
}

# Main execution
main() {
    case "${1:-help}" in
        "deploy")
            check_prerequisites
            build_application
            create_backup
            deploy
            ;;
        "deploy-monitoring")
            check_prerequisites
            build_application
            create_backup
            deploy_with_monitoring
            ;;
        "build")
            build_application
            ;;
        "backup")
            create_backup
            ;;
        "stop")
            stop
            ;;
        "update")
            check_prerequisites
            update
            ;;
        "cleanup")
            cleanup
            ;;
        "logs")
            show_logs
            ;;
        "status")
            status
            ;;
        "health")
            check_health
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
