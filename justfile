# Desktop workflows for the OpenCode Electron app.
# Run from the repository root.

_desktop := "packages/desktop"

# Show available desktop workflows.
default: help

help:
    @just --list

# Build renderer and main assets (runs prebuild automatically via bun).
build:
    cd {{ _desktop }} && bun run build

# Package Linux artifacts (deb, rpm, AppImage). Depends on build.
package: build
    cd {{ _desktop }} && bun run package:linux

# Launch desktop dev mode with hot-reload (runs predev automatically via bun).
run:
    cd {{ _desktop }} && bun run dev
