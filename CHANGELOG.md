# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-10-12

### Added

- 🚀 Initial release of Brahma CLI as NPX package
- ⚡ Instant usage with `npx brahma-cli` - no installation required
- 💬 Interactive mode for multi-turn conversations
- 🎯 One-shot mode for quick questions
- 🔒 Ephemeral runtime with automatic cleanup
- 🌐 Environment variable configuration for backend URL
- 📦 Global installation option with `npm install -g`
- 🛡️ Comprehensive error handling and offline detection
- 🧹 Automatic cleanup of temporary files on all exit scenarios

### Features

- **NPX Support**: Use instantly without installation
- **Environment Configuration**: Set backend URL via `BRAHMA_BACKEND_URL`
- **Dual Mode Operation**: Interactive and one-shot modes
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Clean Architecture**: Modular design with separate client library
- **Security First**: No persistent data, auto-cleanup, session-based

### Technical Details

- Node.js 14+ support
- Dynamic dependency installation in temporary directories
- UUID-based session management
- HTTP communication with backend servers
- Graceful error handling and offline mode
