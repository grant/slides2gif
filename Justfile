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

# Setup and Deployment Commands
setup:
    ./setup.sh

# Deploy to production
deploy:
    DEPLOY_ENV=production ./deploy.sh

# Deploy to staging
stage:
    DEPLOY_ENV=staging ./deploy.sh

deploy-www:
    cd www && ./deploy.sh

deploy-png2gif:
    cd png2gif && ./deploy.sh

# Custom domain (slides2gif.com) — verify, map, then add DNS in Cloudflare
domain-verify:
    ./scripts/setup-domain.sh verify

domain-map:
    ./scripts/setup-domain.sh map

domain-dns:
    ./scripts/setup-domain.sh dns

domain-dns-records:
    ./scripts/domain-dns-records.sh

# Secret Management Commands
verify-secrets:
    ./scripts/verify-secrets.sh

sync-secrets:
    ./scripts/sync-secrets.sh

create-secret secret_name:
    ./scripts/create-secret.sh {{secret_name}}

# OAuth Client Management Commands
# Note: OAuth client secrets can only be viewed once when created.
# If you've lost the secret, you'll need to create a new OAuth client.

# Get OAuth client details using gcloud and the Google Cloud REST API
# Example: just oauth-get 51375940236-d594d8kocu5dppjiqq8st4k97vc08nkt.apps.googleusercontent.com
oauth-get client_id:
    @PROJECT=$$(gcloud config get-value project 2>/dev/null || echo 'slides2gifcom'); \
    CLIENT_ID="{{client_id}}"; \
    echo "Fetching OAuth client details for: $$CLIENT_ID"; \
    echo ""; \
    ACCESS_TOKEN=$$(gcloud auth print-access-token 2>/dev/null); \
    if [ -z "$$ACCESS_TOKEN" ]; then \
        echo "❌ Error: Not authenticated. Run 'gcloud auth login' first."; \
        exit 1; \
    fi; \
    echo "Project: $$PROJECT"; \
    echo "Client ID: $$CLIENT_ID"; \
    echo ""; \
    echo "⚠️  Important: Client secrets cannot be retrieved via API for security reasons."; \
    echo "   To view or reset the secret, visit:"; \
    echo "   https://console.cloud.google.com/apis/credentials/oauthclient/$$CLIENT_ID?project=$$PROJECT"; \
    echo ""; \
    echo "📋 To copy the client ID:"; \
    echo "   echo '$$CLIENT_ID' | pbcopy" || echo "   (Copy manually: $$CLIENT_ID)"

# Show details for a specific OAuth client (by Client ID)
# Example: just oauth-show 51375940236-d594d8kocu5dppjiqq8st4k97vc08nkt.apps.googleusercontent.com
oauth-show client_id:
    @PROJECT=$$(gcloud config get-value project 2>/dev/null || echo 'slides2gifcom'); \
    CLIENT_ID="{{client_id}}"; \
    echo "OAuth Client Details"; \
    echo "===================="; \
    echo "Project: $$PROJECT"; \
    echo "Client ID: $$CLIENT_ID"; \
    echo ""; \
    echo "Console URL:"; \
    echo "https://console.cloud.google.com/apis/credentials/oauthclient/$$CLIENT_ID?project=$$PROJECT"; \
    echo ""; \
    echo "⚠️  Client secrets cannot be retrieved via API."; \
    echo "   Visit the console URL above to view/reset the secret."

# Generate .env.local template with OAuth client ID
# Example: just oauth-env 51375940236-d594d8kocu5dppjiqq8st4k97vc08nkt.apps.googleusercontent.com
oauth-env client_id:
    @echo "# Generated OAuth environment variables for www/.env.local"
    @echo "# Client ID: {{client_id}}"
    @echo ""
    @echo "SECRET_COOKIE_PASSWORD=your-secret-cookie-password-here-32-chars-min"
    @echo "OAUTH_CLIENT_ID={{client_id}}"
    @echo "OAUTH_CLIENT_SECRET=your-client-secret-here"
    @echo "GCS_CACHE_BUCKET=slides2gif-cache"
    @echo ""
    @echo "⚠️  Remember to:"
    @echo "   1. Add your OAUTH_CLIENT_SECRET (get it from the console)"
    @echo "   2. Set a secure SECRET_COOKIE_PASSWORD (32+ characters)"

# Open OAuth credentials page in browser
oauth-console:
    @PROJECT=$(gcloud config get-value project 2>/dev/null || echo 'slides2gifcom'); \
    URL="https://console.cloud.google.com/apis/credentials?project=$(PROJECT)"; \
    echo "Opening: $(URL)"; \
    open "$(URL)" 2>/dev/null || xdg-open "$(URL)" 2>/dev/null || \
    echo "Please visit: $(URL)"

# Open OAuth consent screen Audience page (for adding test users)
oauth-consent:
    @echo "Opening OAuth consent screen Audience page..."
    @echo ""
    @echo "To add test users:"
    @echo "  1. Make sure Publishing status is set to 'Testing'"
    @echo "  2. Go to the 'Audience' tab/page"
    @echo "  3. Scroll to 'Test users' section"
    @echo "  4. Click '+ ADD USERS'"
    @echo "  5. Add your email (e.g., granttimmerman@gmail.com)"
    @echo "  6. Click 'ADD' and save"
    @echo ""
    @open "https://console.cloud.google.com/apis/credentials/consent/audience?project=slides2gifcom" 2>/dev/null || \
    xdg-open "https://console.cloud.google.com/apis/credentials/consent/audience?project=slides2gifcom" 2>/dev/null || \
    echo "Please visit: https://console.cloud.google.com/apis/credentials/consent/audience?project=slides2gifcom"

# Copy OAuth client ID to clipboard (macOS)
# Example: just oauth-copy-id 51375940236-d594d8kocu5dppjiqq8st4k97vc08nkt.apps.googleusercontent.com
oauth-copy-id client_id:
    @echo "{{client_id}}" | pbcopy && echo "✅ Client ID copied to clipboard: {{client_id}}" || \
    echo "{{client_id}}" && echo "⚠️  Could not copy to clipboard. Client ID shown above."
