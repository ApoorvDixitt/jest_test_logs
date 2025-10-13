#!/usr/bin/env node

/**
 * Brahma CLI - File-based AI Chat Interface
 * NPX Package Version - Hardcoded Backend
 *
 * Usage:
 *   npx brahma-cli                          # Start File Based I/O mode
 *   npx brahma-cli --file                   # Start File Based I/O mode
 *   npm install -g brahma-cli && brahma     # Global install
 *
 * File Based I/O: Read from input.txt, write to output.txt
 *
 * No configuration required - backend URL is preconfigured!
 */

const path = require("path");
const BrahmaClient = require("../lib/client");
const config = require("../lib/config");

async function main() {
  try {
    // Check for help flags first
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
      showHelp();
      return;
    }

    // Use hardcoded backend URL from config file
    const backendUrl = config.BACKEND_URL;

    // Initialize Brahma client
    const brahma = new BrahmaClient(backendUrl);

    // Check for mode flags (keeping for backward compatibility)
    const hasFileFlag = args.includes("--file") || args.includes("-f");

    // Always start file mode
    await brahma.startFileModeInteractive();
  } catch (error) {
    const BrahmaUI = require("../lib/ui");
    const ui = new BrahmaUI();
    ui.showError(
      "Brahma is offline. Cannot reach AI server. Please try again later."
    );
    process.exit(1);
  }
}

function showHelp() {
  const BrahmaUI = require("../lib/ui");
  const ui = new BrahmaUI();

  console.log("");
  ui.showInfo("Brahma CLI - File-based AI Chat Interface");
  console.log("");
  console.log("USAGE:");
  console.log("  npx brahma-cli [OPTIONS]");
  console.log("");
  console.log("OPTIONS:");
  console.log("  -f, --file                       # Start File Based I/O mode");
  console.log("  -h, --help                       # Show this help message");
  console.log("");
  console.log("FILE BASED I/O:");
  console.log("  Read from input.txt, write to output.txt");
  console.log("  Menu-based interface with keyboard navigation");
  console.log("");
  console.log("EXAMPLES:");
  console.log("  npx brahma-cli                    # Start file mode");
  console.log("  npx brahma-cli --file             # Start file mode");
  console.log("");
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  const BrahmaUI = require("../lib/ui");
  const ui = new BrahmaUI();
  ui.showError("Brahma encountered an unexpected error.");
  process.exit(1);
});

main();
