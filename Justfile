# Justfile for slides2gif project
# Install just: https://github.com/casey/just

# Default: run both services
default:
    just dev

# Run both services in parallel
dev:
    just dev-all

# Run www service only
dev-www:
    cd www && npm run dev

# Run png2gif service only
dev-png2gif:
    cd png2gif && npm run dev

# Run both services in parallel using concurrently
dev-all:
    npx concurrently --names "www,png2gif" --prefix-colors "blue,green" "cd www && npm run dev" "cd png2gif && npm run dev"

# Install dependencies for www
install-www:
    cd www && npm install

# Install dependencies for png2gif
install-png2gif:
    cd png2gif && npm install

# Install all dependencies
install-all:
    just install-www
    just install-png2gif

# Build www service
build-www:
    cd www && npm run build

# Build png2gif service
build-png2gif:
    cd png2gif && npm run compile

# Build all services
build-all:
    just build-www
    just build-png2gif

# Clean build artifacts
clean:
    cd www && npm run clean || true
    cd ../png2gif && npm run clean || true
    rm -rf www/.next
    rm -rf png2gif/dist

# Lint www service
lint-www:
    cd www && npm run lint

# Lint png2gif service
lint-png2gif:
    cd png2gif && npm run lint

# Lint all services
lint:
    just lint-www
    just lint-png2gif

# Fix lint errors for www service
fix-www:
    cd www && npm run fix

# Fix lint errors for png2gif service
fix-png2gif:
    cd png2gif && npm run fix

# Fix lint errors for all services
fix:
    just fix-www || true
    just fix-png2gif || true
