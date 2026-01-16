/**
 * Brahma Client Library
 * Handles all CLI operations including temp environment, communication, and cleanup
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const config = require("./config");
const BrahmaUI = require("./ui");

// Use node-fetch from package dependencies (no temp install needed)
const fetch = require("node-fetch");

class BrahmaClient {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.sessionId = this.generateUUID();
    this.fetch = fetch; // Use imported fetch directly
    this.cleanup = this.cleanup.bind(this);
    this.ui = new BrahmaUI();

    // Setup cleanup handlers immediately
    this.setupCleanupHandlers();
  }

  /**
   * Generate a simple UUID v4
   */
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Cleanup function for exit
   */
  cleanup() {
    // Self-destruct mode: Remove all traces including NPX cache and global installs
    if (config.SELF_DESTRUCT) {
      this.selfDestruct();
    }
  }

  /**
   * Self-destruct mode: Remove NPX cache and global installations
   */
  selfDestruct() {
    try {
      // Detect how the CLI was invoked
      const isNpx = this.isRunningViaNewx();
      const isGlobal = this.isGlobalInstall();

      if (isNpx) {
        this.removeNpxCache();
      }

      if (isGlobal) {
        this.removeGlobalInstall();
      }
    } catch (error) {
      // Silently fail - don't show errors during self-destruct
    }
  }

  /**
   * Check if running via NPX
   */
  isRunningViaNewx() {
    // Check if the current executable path contains _npx
    const execPath = process.argv[1] || "";
    return execPath.includes("_npx") || execPath.includes(".npm/_npx");
  }

  /**
   * Check if installed globally
   */
  isGlobalInstall() {
    const execPath = process.argv[1] || "";
    return (
      execPath.includes("/usr/local/bin/") ||
      execPath.includes("/usr/local/lib/node_modules/") ||
      execPath.includes("node_modules/.bin/")
    );
  }

  /**
   * Remove NPX cache
   */
  removeNpxCache() {
    const homeDir = os.homedir();
    const npxCachePath = path.join(homeDir, ".npm", "_npx");

    // Look for brahma-cli in NPX cache
    if (fs.existsSync(npxCachePath)) {
      const cacheContents = fs.readdirSync(npxCachePath);

      for (const item of cacheContents) {
        if (item.includes("brahma-cli")) {
          const brahmaCachePath = path.join(npxCachePath, item);
          try {
            fs.rmSync(brahmaCachePath, { recursive: true, force: true });
            this.ui.showSuccess("Cleaned NPX cache");
          } catch (err) {
            // Silently fail
          }
        }
      }
    }
  }

  /**
   * Remove global installation (requires careful handling)
   */
  removeGlobalInstall() {
    const globalPaths = [
      "/usr/local/bin/brahma",
      "/usr/local/lib/node_modules/brahma-cli",
    ];

    let hasPermissions = true;

    for (const globalPath of globalPaths) {
      try {
        if (fs.existsSync(globalPath)) {
          fs.rmSync(globalPath, { recursive: true, force: true });
        }
      } catch (err) {
        if (err.code === "EACCES" || err.code === "EPERM") {
          hasPermissions = false;
        }
      }
    }

    if (!hasPermissions) {
      this.ui.showInfo(
        "Note: Global uninstall requires: sudo npm uninstall -g brahma-cli"
      );
    } else {
      this.ui.showSuccess("Cleaned global installation");
    }
  }

  /**
   * Setup cleanup handlers for all exit scenarios
   */
  setupCleanupHandlers() {
    process.on("exit", this.cleanup);
    process.on("SIGINT", () => {
      this.ui.showGoodbye();
      if (config.SELF_DESTRUCT) {
        this.ui.showInfo("Self-destruct mode: Removing all traces...");
      }
      this.cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      this.cleanup();
      process.exit(0);
    });
    process.on("uncaughtException", () => {
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Send prompt to backend server with retry logic
   */
  async sendPrompt(prompt, mode) {
    const requestPayload = {
      prompt: prompt.trim(),
      session_id: this.sessionId,
      mode: mode,
    };

    let lastError;

    // Retry logic for handling timeouts
    for (let attempt = 1; attempt <= config.RETRY_ATTEMPTS; attempt++) {
      try {
        this.ui.showInfo(
          `⏳ Attempt ${attempt}/${config.RETRY_ATTEMPTS} - Sending request...`
        );

        const response = await this.fetch(this.backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": config.USER_AGENT,
          },
          body: JSON.stringify(requestPayload),
          timeout: config.TIMEOUT,
        });

        if (!response.ok) {
          throw new Error(`Backend server error: ${response.status}`);
        }

        const data = await response.json();

        // Handle both success and error responses from backend
        if (data.status === "success") {
          return data.response || "No response received";
        } else if (data.status === "error") {
          // Backend returned an error status (e.g., AI server offline)
          return data.response || "Backend error occurred";
        } else {
          throw new Error("Unknown response format from backend");
        }
      } catch (error) {
        lastError = error;

        if (error.name === "FetchError" && error.type === "request-timeout") {
          this.ui.showWarning(
            `⚠️ Request timeout on attempt ${attempt}/${config.RETRY_ATTEMPTS}`
          );

          if (attempt < config.RETRY_ATTEMPTS) {
            this.ui.showInfo(
              `⏸️ Waiting ${config.RETRY_DELAY / 1000} seconds before retry...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, config.RETRY_DELAY)
            );
            continue;
          }
        } else {
          // For non-timeout errors, don't retry
          throw error;
        }
      }
    }

    // If we get here, all retry attempts failed
    throw new Error(
      `Request failed after ${config.RETRY_ATTEMPTS} attempts. Last error: ${lastError.message}`
    );
  }

  /**
   * File-based I/O mode - with menu button to process prompt
   */
  async startFileModeInteractive() {
    // Clear screen completely (including scrollback)
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");

    const inputFile = path.join(process.cwd(), "input.txt");
    const outputFile = path.join(process.cwd(), "output.txt");

    // Always reset the input.txt file to default content on start
    const defaultInputContent =
      "While Writing the code , make sure to not give any comments , only the code output , keep the function simple , easy to understand , and make sure the code look human generated .\n\n\n\n\nThese are the Test Cases :\n\n\n\n\n\n\nMake sure above test cases are passed, and give me the updated code given below :\n\n";
    fs.writeFileSync(inputFile, defaultInputContent);

    // Always reset the output.txt file to be empty on start
    fs.writeFileSync(outputFile, "");

    let isProcessing = false;
    let requestCount = 0;

    // Menu options
    const options = [
      {
        key: "1",
        label: "Process Input",
        description: "Send input.txt content to AI",
      },
      { key: "2", label: "Exit Brahma", description: "Close the application" },
    ];

    let selectedIndex = 0;
    let exitRequested = false;

    const renderMenu = (statusMessage = null) => {
      // Use ANSI escape codes to position cursor at top and clear screen
      // \x1b[H = move cursor to home (0,0)
      // \x1b[2J = clear entire screen
      // \x1b[3J = clear scrollback buffer
      process.stdout.write("\x1b[2J\x1b[3J\x1b[H");

      console.log(
        `${this.ui.colors.bright}${this.ui.colors.blue}📁 Brahma File Mode${this.ui.colors.reset}`
      );
      console.log(
        `${this.ui.colors.dim}input.txt → AI → output.txt${this.ui.colors.reset}`
      );
      if (requestCount > 0) {
        console.log(
          `${this.ui.colors.green}✓ ${requestCount} request${
            requestCount > 1 ? "s" : ""
          } processed${this.ui.colors.reset}`
        );
      }
      console.log("");
      console.log(
        `${this.ui.colors.brightYellow}Select an option:${this.ui.colors.reset}\n`
      );

      options.forEach((option, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? `${this.ui.colors.brightCyan}❯ ` : "  ";
        const label = isSelected
          ? `${this.ui.colors.brightCyan}${option.label}${this.ui.colors.reset}`
          : `${this.ui.colors.white}${option.label}${this.ui.colors.reset}`;
        const desc = isSelected
          ? `  ${this.ui.colors.dim}${option.description}${this.ui.colors.reset}`
          : "";

        console.log(`${prefix}${label}`);
        if (desc) console.log(desc);
      });

      console.log(
        `\n${this.ui.colors.dim}↑↓ Navigate • Enter Select • Ctrl+C Exit${this.ui.colors.reset}`
      );

      // Show status message below menu if provided
      if (statusMessage) {
        console.log(`\n${"─".repeat(50)}\n`);
        console.log(statusMessage);
      }
    };

    // Helper to wait for any key press
    const waitForKeyPress = (message = "Press any key to continue...") => {
      return new Promise((resolve) => {
        console.log(`\n${this.ui.colors.dim}${message}${this.ui.colors.reset}`);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      });
    };

    // Main file mode loop
    while (!exitRequested) {
      renderMenu();

      const choice = await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        const onKeyPress = (key) => {
          if (key === "\u0003") {
            // Ctrl+C
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onKeyPress);
            resolve("exit");
          } else if (key === "\u001b[A") {
            // Up arrow
            selectedIndex =
              selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
            renderMenu();
          } else if (key === "\u001b[B") {
            // Down arrow
            selectedIndex =
              selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
            renderMenu();
          } else if (key === "\r" || key === "\n") {
            // Enter
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onKeyPress);
            resolve(options[selectedIndex].key);
          } else if (key >= "1" && key <= String(options.length)) {
            // Direct number input
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onKeyPress);
            resolve(key);
          }
        };

        process.stdin.on("data", onKeyPress);
      });

      // Process user choice
      if (choice === "1" || choice === "Process Input") {
        try {
          if (isProcessing) {
            renderMenu(
              `${this.ui.colors.yellow}⏳ Already processing a request, please wait...${this.ui.colors.reset}`
            );
            await waitForKeyPress();
            continue;
          }

          isProcessing = true;
          const content = fs.readFileSync(inputFile, "utf8").trim();

          // Skip if content is empty
          if (!content) {
            renderMenu(
              `${this.ui.colors.red}❌ Input file is empty. Please add content to input.txt${this.ui.colors.reset}`
            );
            await waitForKeyPress();
            isProcessing = false;
            continue;
          }

          // Show processing status below menu
          const truncatedContent =
            content.length > 50 ? content.substring(0, 50) + "..." : content;

          renderMenu(
            `${this.ui.colors.blue}📝 Request #${
              requestCount + 1
            }: "${truncatedContent}"\n⏳ Processing... (Timeout: ${
              config.TIMEOUT / 1000
            }s)${this.ui.colors.reset}`
          );

          const startTime = Date.now();
          this.ui.startLoading("Processing");

          const response = await this.sendPrompt(content, "file-based");

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          this.ui.stopLoading();

          // Clear output file and write only the AI response
          fs.writeFileSync(outputFile, response);

          // Reset input file to default template
          fs.writeFileSync(
            inputFile,
            "While Writing the code , make sure to not give any comments , only the code output , keep the function simple , easy to understand , and make sure the code look human generated .\n\n\n\n\nThese are the Test Cases :\n\n\n\n\n\n\nMake sure above test cases are passed, and give me the updated code given below :\n\n"
          );

          requestCount++;

          // Show success message below menu
          renderMenu(
            `${this.ui.colors.green}✅ Request #${requestCount} completed in ${elapsed}s\n📝 Response written to output.txt${this.ui.colors.reset}`
          );
          await waitForKeyPress();
        } catch (error) {
          this.ui.stopLoading();

          let errorMsg = `${this.ui.colors.red}❌ Failed: ${error.message}${this.ui.colors.reset}`;

          if (
            error.message.includes("timeout") ||
            error.message.includes("retry")
          ) {
            errorMsg += `\n${this.ui.colors.yellow}💡 Backend taking longer than expected.${this.ui.colors.reset}`;
          } else {
            errorMsg += `\n${this.ui.colors.yellow}🔗 Check your connection and backend status.${this.ui.colors.reset}`;
          }

          // Clear output file and write a detailed error message
          const errorMessage = `Error: ${
            error.message
          }\n\nTimestamp: ${new Date().toISOString()}\n\nPossible solutions:\n1. Check if the backend server is running\n2. Verify your internet connection\n3. Try a simpler request to test connectivity\n4. The AI may be processing a complex request - try again in a moment`;
          fs.writeFileSync(outputFile, errorMessage);

          renderMenu(errorMsg);
          await waitForKeyPress();
        } finally {
          isProcessing = false;
        }
      } else if (
        choice === "2" ||
        choice === "Exit Brahma" ||
        choice === "exit"
      ) {
        exitRequested = true;
        console.log("");
        this.ui.showGoodbye();
        this.ui.showSuccess(
          `📊 Processed ${requestCount} requests in this session`
        );
        this.ui.showSuccess("👋 Exiting Brahma. Thanks for using!");
        this.cleanup();
        process.exit(0);
      }
    }

    // This should not be reached, but keeping as a fallback
    console.log("");
    this.ui.showGoodbye();
    this.ui.showSuccess(
      `📊 Processed ${requestCount} requests in this session`
    );
    this.ui.showSuccess("🧹 File Based I/O mode ended.");
    this.cleanup();
    process.exit(0);
  }
}

module.exports = BrahmaClient;
