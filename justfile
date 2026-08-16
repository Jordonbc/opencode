# Desktop workflows for the OpenCode Electron app.
# Run from the repository root.

_desktop := "packages/desktop"

# Build renderer and main assets (runs prebuild automatically via bun).
build:
    bun --cwd {{ _desktop }} run build

# Package Linux artifacts (deb, rpm, AppImage). Depends on build.
package: build
    bun --cwd {{ _desktop }} run package:linux

# Launch desktop dev mode with hot-reload (runs predev automatically via bun).
run:
    bun --cwd {{ _desktop }} run dev
