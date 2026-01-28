# Slides2Gif Scripts

Utility scripts for managing the slides2gif project.

## Setup

Install dependencies:

```bash
cd scripts
npm install
```

Or use the Justfile command:

```bash
just install-scripts
```

## Available Scripts

### cleanup-jpg

Removes all `.jpg` and `.jpeg` files from the GCS bucket. Since we've switched to PNG format, old JPG files should be cleaned up. They will be automatically regenerated as PNG when slides are accessed again.

**Usage:**

```bash
# Interactive mode (10 second confirmation)
npm run cleanup-jpg

# Skip confirmation
npm run cleanup-jpg --yes

# Or use the Justfile command
just cleanup-jpg --yes
```

**Environment Variables:**

- `GCS_CACHE_BUCKET` - The GCS bucket name (defaults to `slides2gif-cache`)

## Adding New Scripts

1. Create a new TypeScript file in this directory
2. Add a script entry to `package.json`
3. Update this README with usage instructions
