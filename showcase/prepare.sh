#!/bin/bash

# Preparation script for the showcase
# This builds the latest version of the plugin and copies it to the demo vault.

set -e

echo "🔨 Building the latest version of the plugin..."
npm run build

# Define paths
SHOWCASE_DIR="showcase"
VAULT_DIR="vault"
PLUGIN_TARGET_DIR="$VAULT_DIR/.obsidian/plugins/shopping-list-automatic-reorder"

echo "📂 Preparing demo vault at $PLUGIN_TARGET_DIR..."

# Create the directory if it doesn't exist
mkdir -p "$PLUGIN_TARGET_DIR"

# Copy the build artifacts
cp main.js manifest.json styles.css "$PLUGIN_TARGET_DIR/"

# Ensure the plugin is enabled in the demo vault
echo '["shopping-list-automatic-reorder"]' > "$VAULT_DIR/.obsidian/community-plugins.json"

# Pre-configure Obsidian to trust the vault and skip welcome screens
TEMP_DATA_DIR="showcase/temp-obsidian-data"
mkdir -p "$TEMP_DATA_DIR"
# The vault ID is a hash of the path, but usually 'vault' works for automation if passed as arg
# We create a dummy obsidian.json that marks the vault as trusted
echo "{\"vaults\":{\"$VAULT_DIR\":{\"path\":\"$VAULT_DIR\",\"ts\":$(date +%s)000,\"open\":true}}}" > "$TEMP_DATA_DIR/obsidian.json"

# Basic settings to ensure a clean look
if [ ! -f "$VAULT_DIR/.obsidian/settings.json" ]; then
    echo '{"communityPluginConsole":true, "theme": "obsidian"}' > "$VAULT_DIR/.obsidian/settings.json"
fi

echo "✅ Preparation complete! You can now run the showcase:"
echo "   npx ts-node showcase/showcase.ts"
