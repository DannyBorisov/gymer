#!/bin/bash

# Xcode Cloud post-clone script
# Installs node_modules, builds the web app, and syncs to iOS

set -e

# Navigate to the frontend package root (where package.json is)
cd "$CI_PRIMARY_REPOSITORY_PATH/packages/frontend"

# Install Node.js using Homebrew if not available
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing via Homebrew..."
    brew install node
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the web app
echo "Building web app..."
npm run build

# Sync to iOS (copies dist/ to ios/App/App/public and updates native project)
echo "Syncing to iOS..."
npx cap sync ios

# Resolve Swift packages after node_modules are in place
echo "Resolving Swift packages..."
cd "$CI_PRIMARY_REPOSITORY_PATH/packages/frontend/ios/App"
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App

echo "Build and sync completed successfully"
