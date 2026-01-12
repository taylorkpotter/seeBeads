.PHONY: all build build-frontend build-backend dev clean release test

# Version - update this for releases
VERSION ?= 0.1.14
LDFLAGS := -ldflags="-s -w -X main.version=$(VERSION)"

# Default target
all: build

# Build everything
build: build-frontend build-backend

# Build React frontend
build-frontend:
	@echo "📦 Building frontend..."
	cd web && npm ci && npm run build
	@echo "📁 Copying frontend to static directory..."
	mkdir -p internal/server/static
	cp -r web/dist/* internal/server/static/

# Build Go backend
build-backend:
	@echo "🔨 Building backend (v$(VERSION))..."
	go build $(LDFLAGS) -o bin/seebeads ./cmd/seebeads

# Development mode - run frontend dev server
dev-frontend:
	cd web && npm run dev

# Development mode - run Go server with auto-reload (requires air)
dev-backend:
	cd web && npm run build
	mkdir -p internal/server/static
	cp -r web/dist/* internal/server/static/
	go run ./cmd/seebeads serve --open

# Run in development
dev: build-frontend
	go run ./cmd/seebeads serve --open

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf web/dist/
	rm -rf web/node_modules/
	rm -rf internal/server/static/

# Run tests
test:
	go test -v ./...

# Cross-platform release builds
release: build-frontend
	@echo "🚀 Building release binaries (v$(VERSION))..."
	mkdir -p dist
	
	@echo "  Darwin AMD64..."
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o dist/seebeads-darwin-amd64 ./cmd/seebeads
	
	@echo "  Darwin ARM64..."
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o dist/seebeads-darwin-arm64 ./cmd/seebeads
	
	@echo "  Linux AMD64..."
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o dist/seebeads-linux-amd64 ./cmd/seebeads
	
	@echo "  Linux ARM64..."
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o dist/seebeads-linux-arm64 ./cmd/seebeads
	
	@echo "  Windows AMD64..."
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o dist/seebeads-windows-amd64.exe ./cmd/seebeads
	
	@echo "✅ Release builds complete!"
	@ls -la dist/

# Install locally
install: build
	cp bin/seebeads /usr/local/bin/seebeads
	@echo "✅ Installed seebeads to /usr/local/bin"

# Format code
fmt:
	go fmt ./...
	cd web && npm run lint -- --fix || true

# Lint
lint:
	golangci-lint run
	cd web && npm run lint

# Show help
help:
	@echo "seeBeads Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build          Build frontend and backend"
	@echo "  build-frontend Build only the React frontend"
	@echo "  build-backend  Build only the Go backend"
	@echo "  dev            Run in development mode"
	@echo "  dev-frontend   Run frontend dev server with hot reload"
	@echo "  dev-backend    Run backend with rebuilt frontend"
	@echo "  clean          Remove build artifacts"
	@echo "  test           Run tests"
	@echo "  release        Build release binaries for all platforms"
	@echo "  install        Install to /usr/local/bin"
	@echo "  fmt            Format code"
	@echo "  lint           Run linters"
	@echo "  help           Show this help"
