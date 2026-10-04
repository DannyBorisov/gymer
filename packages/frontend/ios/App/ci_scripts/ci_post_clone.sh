#!/bin/bash

# Xcode Cloud post-clone script
# Installs node_modules so Capacitor Swift Packages can be resolved

set -e

echo "Installing Node.js dependencies..."

# Navigate to the frontend package root (where package.json is)
cd "$CI_PRIMARY_REPOSITORY_PATH/packages/frontend"

# Install Node.js using nvm or brew if not available
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing via Homebrew..."
    brew install node
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
npm ci

echo "Node modules installed successfully"
