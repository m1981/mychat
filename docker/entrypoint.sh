#!/bin/sh
set -ex  # Add -x for command tracing

echo "=== Debug: Environment ==="
echo "USER: $(whoami)"
echo "UID: $(id -u)"
echo "GID: $(id -g)"
echo "PWD: $(pwd)"
echo "EUID: $(id -u)"
echo "Groups: $(id -G)"
echo "=== Directory Permissions ==="
ls -la /app
ls -la /usr/local/bin/entrypoint.sh
echo "=== Volume Mounts ==="
mount | grep app
echo "=== Process Tree ==="
ps aux
echo "=== Capabilities ==="
getcap /usr/sbin/su-exec || echo "No special capabilities set"
echo "======================="

# Add node_modules/.bin to PATH
export PATH=/app/node_modules/.bin:$PATH

# Debug pre-installation state
echo "=== Pre-Installation State ==="
echo "NODE_MODULES exists: $(test -d node_modules && echo 'yes' || echo 'no')"
echo "PNPM_FROZEN_LOCKFILE: ${PNPM_FROZEN_LOCKFILE}"
echo "Current filesystem permissions:"
ls -la /app/node_modules 2>/dev/null || echo "node_modules doesn't exist"
ls -la /home/node/.local/share/pnpm/store 2>/dev/null || echo "pnpm store doesn't exist"
echo "======================="

# Ensure directories exist and fix permissions
fix_permissions() {
    local path="$1"
    echo "Attempting to fix permissions for: $path"
    if [ ! -d "$path" ]; then
        echo "Creating directory: $path"
        mkdir -p "$path" || echo "Failed to create directory: $path"
    fi
    echo "Current permissions for $path:"
    ls -la "$path"
    if [ "$(stat -c '%u' "$path")" != "$(id -u node)" ]; then
        echo "Attempting to change ownership of $path"
        chown -R node:node "$path" || echo "Failed to change ownership of $path"
    fi
}

# Fix permissions for critical directories
echo "=== Fixing Permissions ==="
fix_permissions /app/node_modules
fix_permissions /home/node/.local/share/pnpm/store
fix_permissions /home/node/.cache/pnpm
echo "======================="

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "${PNPM_FROZEN_LOCKFILE}" = "false" ]; then
    echo "=== Starting Installation ==="
    echo "Current user context:"
    id
    echo "Installing dependencies..."
    if [ "${PNPM_FROZEN_LOCKFILE}" = "true" ]; then
        echo "Running: su-exec node pnpm install --frozen-lockfile"
        su-exec node pnpm install --frozen-lockfile || {
            echo "Installation failed with exit code: $?"
            echo "su-exec version: $(su-exec -V 2>&1 || echo 'not available')"
            echo "su-exec permissions: $(ls -l /usr/sbin/su-exec)"
        }
    else
        echo "Running: su-exec node pnpm install"
        su-exec node pnpm install || {
            echo "Installation failed with exit code: $?"
            echo "su-exec version: $(su-exec -V 2>&1 || echo 'not available')"
            echo "su-exec permissions: $(ls -l /usr/sbin/su-exec)"
        }
    fi
    
    echo "=== Post-Installation State ==="
    ls -la /app/node_modules
    echo "======================="
fi

echo "=== Final Execution ==="
echo "Command to execute: $@"
echo "======================="

# Execute the passed command as node user
exec su-exec node "$@"
