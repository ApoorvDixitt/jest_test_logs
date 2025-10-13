/**
 * Brahma Client Library
 * Handles all CLI operations including temp environment, communication, and cleanup
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");
const crypto = require("crypto");
const os = require("os");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const config = require("./config");
const BrahmaUI = require("./ui");

class BrahmaClient {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.sessionId = this.generateUUID();
    this.tempDir = null;
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
   * Creates ephemeral temp environment (simplified - no dependencies needed)
   */
  async createTempEnvironment() {
    // Generate random suffix for temp directory
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const tempDir = path.join(os.tmpdir(), `brahma-${randomSuffix}`);

    // Create directory
    fs.mkdirSync(tempDir, { recursive: true });

    this.tempDir = tempDir;

    this.ui.showInfo("Brahma ready!");
    return tempDir;
  }

  /**
   * Cleanup function to remove temporary directory
   */
  cleanup() {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      try {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch (err) {
        // Silently fail - no logs or error messages
      }
    }

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
    const os = require("os");
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
   * Send prompt to backend server using native Node.js HTTP/HTTPS
   */
  async sendPrompt(prompt, mode) {
    const requestPayload = {
      prompt: prompt.trim(),
      session_id: this.sessionId,
      mode: mode,
    };

    const requestData = JSON.stringify(requestPayload);
    const url = new URL(this.backendUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
          'User-Agent': config.USER_AGENT,
        },
        timeout: config.TIMEOUT,
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`Backend server error: ${res.statusCode}`));
              return;
            }

            const data = JSON.parse(responseData);

            // Handle both success and error responses from backend
            if (data.status === "success") {
              resolve(data.response || "No response received");
            } else if (data.status === "error") {
              // Backend returned an error status (e.g., AI server offline)
              resolve(data.response || "Backend error occurred");
            } else {
              reject(new Error("Unknown response format from backend"));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.abort();
        reject(new Error('Request timeout'));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * Get multi-line input with proper Enter/Shift+Enter handling
   */
  async getMultiLineInput(rl) {
    return new Promise((resolve) => {
      let inputBuffer = "";
      let currentLine = "";
      let cursorPos = 0;

      // Save original terminal settings
      const originalRawMode = process.stdin.isRaw;

      // Set up raw mode to capture all key events
      process.stdin.setRawMode(true);
      process.stdin.resume();

      // Display initial prompt
      process.stdout.write(this.ui.getUserPrompt());

      const cleanup = () => {
        process.stdin.setRawMode(originalRawMode);
        process.stdin.removeListener("data", onData);
      };

      const onData = (chunk) => {
        const input = chunk.toString();

        // Handle different key combinations
        for (let i = 0; i < input.length; i++) {
          const char = input[i];
          const charCode = input.charCodeAt(i);

          // Handle Ctrl+C (Exit)
          if (charCode === 3) {
            cleanup();
            this.ui.showGoodbye();
            if (config.SELF_DESTRUCT) {
              this.ui.showInfo("Self-destruct mode: Removing all traces...");
            }
            this.cleanup();
            process.exit(0);
          }

          // Handle Enter (0x0D) - Send message
          else if (charCode === 13) {
            // Check if we have a next character that might be line feed
            const nextChar =
              i + 1 < input.length ? input.charCodeAt(i + 1) : null;

            // Skip line feed if it follows carriage return
            if (nextChar === 10) {
              i++; // Skip the line feed
            }

            // Add current line to buffer
            if (currentLine.trim() !== "" || inputBuffer !== "") {
              if (inputBuffer === "") {
                inputBuffer = currentLine;
              } else {
                inputBuffer += "\n" + currentLine;
              }
            }

            // If we have content, send it
            if (inputBuffer.trim() !== "") {
              cleanup();
              process.stdout.write("\n");
              resolve(inputBuffer.trim());
              return;
            } else {
              // Empty input, just continue
              currentLine = "";
              cursorPos = 0;
              process.stdout.write("\n" + this.ui.getUserPrompt());
            }
          }

          // Handle Line Feed (0x0A) - New line (Shift+Enter equivalent)
          else if (charCode === 10) {
            // Add current line to buffer and start new line
            if (inputBuffer === "") {
              inputBuffer = currentLine;
            } else {
              inputBuffer += "\n" + currentLine;
            }
            currentLine = "";
            cursorPos = 0;
            process.stdout.write("\n  > "); // Continuation prompt
          }

          // Handle Backspace (0x08 or 0x7F)
          else if (charCode === 8 || charCode === 127) {
            if (currentLine.length > 0 && cursorPos > 0) {
              currentLine =
                currentLine.slice(0, cursorPos - 1) +
                currentLine.slice(cursorPos);
              cursorPos--;
              // Move cursor back, clear to end of line, rewrite line, position cursor
              process.stdout.write("\b\x1b[K" + currentLine.slice(cursorPos));
              // Move cursor back to correct position
              const moveBack = currentLine.length - cursorPos;
              if (moveBack > 0) {
                process.stdout.write("\x1b[" + moveBack + "D");
              }
            }
          }

          // Handle regular printable characters
          else if (charCode >= 32 && charCode <= 126) {
            currentLine =
              currentLine.slice(0, cursorPos) +
              char +
              currentLine.slice(cursorPos);
            cursorPos++;
            // Write character and any remaining characters, then position cursor
            process.stdout.write(char + currentLine.slice(cursorPos));
            const moveBack = currentLine.length - cursorPos;
            if (moveBack > 0) {
              process.stdout.write("\x1b[" + moveBack + "D");
            }
          }

          // Handle arrow keys and other special sequences
          else if (charCode === 27) {
            // ESC sequence
            if (i + 2 < input.length && input.charCodeAt(i + 1) === 91) {
              // [
              const key = input.charCodeAt(i + 2);
              i += 2; // Skip the [ and key code

              switch (key) {
                case 68: // Left arrow
                  if (cursorPos > 0) {
                    cursorPos--;
                    process.stdout.write("\x1b[D");
                  }
                  break;
                case 67: // Right arrow
                  if (cursorPos < currentLine.length) {
                    cursorPos++;
                    process.stdout.write("\x1b[C");
                  }
                  break;
                case 65: // Up arrow - previous line from buffer
                case 66: // Down arrow - next line from buffer
                  // Could implement history navigation here
                  break;
              }
            }
          }
        }
      };

      process.stdin.on("data", onData);
    });
  }

  /**
   * File-based I/O mode - with menu button to process prompt
   */
  async startFileModeInteractive() {
    await this.createTempEnvironment();

    // Clear screen and show file mode interface
    process.stdout.write("\x1B[2J\x1B[0f");

    this.ui.showWelcome();
    console.log("");
    this.ui.showSuccess("📁 File Based I/O Mode Activated!");
    console.log("");
    this.ui.showInfo("📝 Edit input.txt with your questions");
    this.ui.showInfo("📖 Responses will appear in output.txt");
    this.ui.showInfo("� Select 'Process Input' to send your prompt to AI");
    this.ui.showInfo("🚪 Press Ctrl+C to exit");
    console.log("");
    console.log(
      `${this.ui.colors.dim}${"=".repeat(60)}${this.ui.colors.reset}`
    );
    console.log("");

    const inputFile = path.join(process.cwd(), "input.txt");
    const outputFile = path.join(process.cwd(), "output.txt");

    // Always reset the input.txt file to default content on start
    const defaultInputContent =
      "These are the Test Cases :\n\n\n\n\n\n\nMake sure above test cases are passed, and give me the updated code given below :";
    fs.writeFileSync(inputFile, defaultInputContent);

    // Always reset the output.txt file to be empty on start
    fs.writeFileSync(outputFile, "");

    this.ui.showSuccess(`📄 Files ready: input.txt and output.txt`);
    console.log("");

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

    const displayMenu = () => {
      // Clear previous menu area only (not the whole screen)
      console.log("");
      console.log(
        `${this.ui.colors.brightYellow}File Based I/O Menu:${this.ui.colors.reset}`
      );
      console.log("");

      options.forEach((option, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? "▶ " : "  ";
        const color = isSelected
          ? this.ui.colors.brightCyan
          : this.ui.colors.white;
        const resetColor = this.ui.colors.reset;

        console.log(
          `${color}${prefix}${option.key}. ${option.label}${resetColor}`
        );
        if (isSelected) {
          console.log(
            `${this.ui.colors.dim}     ${option.description}${this.ui.colors.reset}`
          );
        }
      });

      console.log("");
      console.log(
        `${this.ui.colors.dim}Use arrow keys ↑↓ to navigate, Enter to select${this.ui.colors.reset}`
      );
    };

    // Main file mode loop
    while (!exitRequested) {
      displayMenu();

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
            displayMenu();
          } else if (key === "\u001b[B") {
            // Down arrow
            selectedIndex =
              selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
            displayMenu();
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

      // Clear menu area by using a fresh screen
      process.stdout.write("\x1B[2J\x1B[0f");
      this.ui.showWelcome();
      console.log("");
      this.ui.showSuccess("📁 File Based I/O Mode Activated!");
      console.log("");

      // Process user choice
      if (choice === "1" || choice === "Process Input") {
        try {
          if (isProcessing) {
            this.ui.showInfo("⏳ Already processing a request, please wait...");
            continue;
          }

          isProcessing = true;
          const content = fs.readFileSync(inputFile, "utf8").trim();

          // Skip if content is empty or default
          if (!content) {
            this.ui.showError(
              "❌ Input file is empty. Please add content to input.txt"
            );
            isProcessing = false;
            continue;
          }

          requestCount++;
          const truncatedContent =
            content.length > 50 ? content.substring(0, 50) + "..." : content;
          this.ui.showInfo(
            `📝 Request #${requestCount}: "${truncatedContent}"`
          );
          this.ui.startLoading("Processing");

          const response = await this.sendPrompt(content, "file-based");

          // Clear output file and write only the AI response
          fs.writeFileSync(outputFile, response);

          // Clear the input file for next input but preserve structure
          fs.writeFileSync(
            inputFile,
            "These are the Test Cases :\n\n\n\n\n\n\nMake sure above test cases are passed, and give me the updated code given below :"
          );

          // Show success message
          console.log("");
          this.ui.showSuccess(
            `✅ Successfully processed request #${requestCount}`
          );
          this.ui.showSuccess(`📝 Response written to output.txt`);
          this.ui.showSuccess(`📄 Input file has been reset for next prompt`);
          console.log("");
        } catch (error) {
          this.ui.showError(
            "❌ Failed to process input. Please check your connection."
          );
          // Clear output file and write only the error message
          fs.writeFileSync(
            outputFile,
            "Error: Failed to process input. Please check your connection."
          );
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
        this.ui.showSuccess(
          `� Processed ${requestCount} requests in this session`
        );
        this.ui.showSuccess("🔄 Returning to mode selection...");
        console.log("");
        // Return to mode selection menu
        await this.showModeSelection();
        return; // Exit this function after mode selection completes
      } else if (
        choice === "3" ||
        choice === "Exit Brahma" ||
        choice === "exit"
      ) {
        exitRequested = true;
        // Exit the application
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
