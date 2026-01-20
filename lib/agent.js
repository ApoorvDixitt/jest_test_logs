/**
 * Brahma Agent Module
 * Autonomous agent for scanning codebases, extracting test cases and templates,
 * and sending structured payloads to the autonomous-agent endpoint.
 *
 * ============================================================================
 * SAFETY & STEALTH GUARANTEES:
 * ============================================================================
 * 1. READ-ONLY OPERATIONS ONLY:
 *    - fs.existsSync() - check if path exists
 *    - fs.readdirSync() - list directory contents
 *    - fs.statSync() - get file stats (isDirectory, isFile)
 *    - fs.readFileSync() - read file contents
 *
 * 2. SINGLE WRITE POINT:
 *    - ONLY writes to output.txt inside the jest_test_logs (CLI) folder
 *    - Uses process.cwd() which is the CLI folder location
 *    - NEVER writes to the scanned codebase
 *
 * 3. NO SIDE EFFECTS:
 *    - No file watchers (chokidar, etc.)
 *    - No git operations
 *    - No temp file creation
 *    - No caching to disk
 *    - No file locking
 *    - No access time updates (using sync methods)
 *
 * 4. UNDETECTABLE:
 *    - No modifications to scanned files
 *    - No .git operations
 *    - No indexing triggers
 *    - No network calls except to configured backend
 * ============================================================================
 *
 * DEBUG MODE: Set DEBUG_MODE = false to disable all debug logs
 * All debug logs are tagged with [DEBUG_ID: DBGxxx] for easy removal
 *
 * Debug IDs:
 *   DBG001 - Debug mode flag
 *   DBG002 - Workspace path resolution setup
 *   DBG003 - Workspace path resolution logic
 *   DBG004 - Debug logging helper
 *   DBG005 - Agent configuration display
 *   DBG006 - Path validation main
 *   DBG007 - Base path contents listing
 *   DBG008 - Test path segment checking
 *   DBG009 - Source path segment checking
 *   DBG010 - Directory scanning
 *   DBG011 - Find project root by marker file (pom.xml)
 *   DBG012 - Find project root by src/ structure
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

// [DEBUG_ID: DBG001] - Debug mode flag - set to false to disable all debug logging
// Can also use environment variable: DEBUG_AGENT=true
const DEBUG_MODE = process.env.DEBUG_AGENT === "true" || false;

class BrahmaAgent {
  constructor(ui, fetch) {
    this.ui = ui;
    this.fetch = fetch;

    // Store CLI folder path - this is the ONLY place we can write
    this.cliFolderPath = process.cwd();
    this.outputFilePath = path.join(this.cliFolderPath, "output.txt");

    // [DEBUG_ID: DBG002] - Workspace path resolution
    // Priority: 1. WORKSPACE_PATH env var, 2. Find pom.xml, 3. Find src/, 4. /config/workspace
    this.basePath = this.resolveWorkspacePath();

    this.testPath = path.join(
      this.basePath,
      "src",
      "test",
      "java",
      "org",
      "example",
      "evaluations"
    );
    this.sourcePath = path.join(
      this.basePath,
      "src",
      "main",
      "java",
      "org",
      "example",
      "evaluations"
    );

    // Track which paths exist (set during validation)
    this.testPathExists = false;
    this.sourcePathExists = false;
  }

  /**
   * SAFE READ-ONLY: Check if path exists without side effects
   */
  safeExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (e) {
      return false;
    }
  }

  /**
   * SAFE READ-ONLY: Read directory contents without side effects
   */
  safeReadDir(dirPath) {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (e) {
      return [];
    }
  }

  /**
   * SAFE READ-ONLY: Read file contents without side effects
   */
  safeReadFile(filePath) {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (e) {
      return null;
    }
  }

  /**
   * SAFE READ-ONLY: Check if path is directory without side effects
   */
  safeIsDirectory(filePath) {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (e) {
      return false;
    }
  }

  /**
   * SAFE WRITE: Only writes to output.txt in CLI folder
   * This is the ONLY write operation in the entire agent
   */
  safeWriteOutput(content) {
    try {
      // Double-check we're writing to the correct location
      const outputPath = path.join(this.cliFolderPath, "output.txt");

      // Verify the output path is inside the CLI folder
      const resolvedOutput = path.resolve(outputPath);
      const resolvedCli = path.resolve(this.cliFolderPath);

      if (!resolvedOutput.startsWith(resolvedCli)) {
        throw new Error("Security: Attempted to write outside CLI folder");
      }

      fs.writeFileSync(outputPath, content, "utf8");
      return true;
    } catch (e) {
      this.debug("WRITE_ERROR", `Failed to write output: ${e.message}`);
      return false;
    }
  }

  /**
   * [DEBUG_ID: DBG003] - Resolve workspace path with fallback logic
   * Priority:
   *   1. WORKSPACE_PATH environment variable
   *   2. Find pom.xml in current or parent directories (Java project root)
   *   3. Find src/ directory in current or parent directories
   *   4. /config/workspace (VM default)
   *   5. Current working directory
   */
  resolveWorkspacePath() {
    const envWorkspace = process.env.WORKSPACE_PATH;
    const vmWorkspace = "/config/workspace";
    const defaultWorkspace = "/workspace";
    const cwdWorkspace = process.cwd();

    this.debug("DBG003", "Resolving workspace path...");
    this.debug(
      "DBG003",
      `  ENV WORKSPACE_PATH: ${envWorkspace || "(not set)"}`
    );
    this.debug("DBG003", `  Current working directory: ${cwdWorkspace}`);
    this.debug("DBG003", `  __dirname: ${__dirname}`);

    // Priority 1: Environment variable
    if (envWorkspace && this.safeExists(envWorkspace)) {
      this.debug("DBG003", `  ✓ Using WORKSPACE_PATH env: ${envWorkspace}`);
      return envWorkspace;
    }

    // Priority 2: Find pom.xml (Java project root) in current or parent directories
    const pomRoot = this.findProjectRoot(cwdWorkspace, "pom.xml");
    if (pomRoot) {
      this.debug(
        "DBG003",
        `  ✓ Found pom.xml, using Java project root: ${pomRoot}`
      );
      return pomRoot;
    }

    // Priority 3: Find src/ directory with the expected structure
    const srcRoot = this.findProjectRootBySrc(cwdWorkspace);
    if (srcRoot) {
      this.debug("DBG003", `  ✓ Found src/ structure, using: ${srcRoot}`);
      return srcRoot;
    }

    // Priority 4: VM workspace /config/workspace
    if (this.safeExists(vmWorkspace)) {
      this.debug("DBG003", `  ✓ Using VM workspace: ${vmWorkspace}`);
      return vmWorkspace;
    }

    // Priority 5: Default /workspace
    if (this.safeExists(defaultWorkspace)) {
      this.debug("DBG003", `  ✓ Using default /workspace`);
      return defaultWorkspace;
    }

    // Priority 6: Current working directory (last resort)
    this.debug("DBG003", `  ✓ Falling back to CWD: ${cwdWorkspace}`);
    return cwdWorkspace;
  }

  /**
   * [DEBUG_ID: DBG011] - Find project root by looking for a marker file (e.g., pom.xml)
   * SAFE READ-ONLY: Only uses existsSync
   */
  findProjectRoot(startDir, markerFile) {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    this.debug(
      "DBG011",
      `  Searching for ${markerFile} starting from: ${startDir}`
    );

    while (currentDir !== root) {
      const markerPath = path.join(currentDir, markerFile);
      this.debug("DBG011", `    Checking: ${markerPath}`);

      if (this.safeExists(markerPath)) {
        this.debug("DBG011", `    ✓ Found: ${markerPath}`);
        return currentDir;
      }

      currentDir = path.dirname(currentDir);
    }

    this.debug(
      "DBG011",
      `    ✗ ${markerFile} not found in any parent directory`
    );
    return null;
  }

  /**
   * [DEBUG_ID: DBG012] - Find project root by looking for src/main/java and src/test/java structure
   * SAFE READ-ONLY: Only uses existsSync
   */
  findProjectRootBySrc(startDir) {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    this.debug(
      "DBG012",
      `  Searching for src/ structure starting from: ${startDir}`
    );

    while (currentDir !== root) {
      const srcMainPath = path.join(currentDir, "src", "main", "java");
      const srcTestPath = path.join(currentDir, "src", "test", "java");

      this.debug("DBG012", `    Checking: ${currentDir}`);

      const hasMain = this.safeExists(srcMainPath);
      const hasTest = this.safeExists(srcTestPath);

      this.debug("DBG012", `      src/main/java exists: ${hasMain}`);
      this.debug("DBG012", `      src/test/java exists: ${hasTest}`);

      if (hasMain || hasTest) {
        this.debug("DBG012", `    ✓ Found src/ structure at: ${currentDir}`);
        return currentDir;
      }

      currentDir = path.dirname(currentDir);
    }

    this.debug(
      "DBG012",
      `    ✗ src/ structure not found in any parent directory`
    );
    return null;
  }

  /**
   * [DEBUG_ID: DBG004] - Debug logging helper
   */
  debug(id, message) {
    if (DEBUG_MODE) {
      console.log(`[${id}] ${message}`);
    }
  }

  /**
   * Main entry point for agent mode
   * READ-ONLY: Only reads from codebase, writes only to output.txt in CLI folder
   */
  async run() {
    this.ui.showInfo("🤖 Starting Brahma Agent Mode (READ-ONLY)...");
    this.ui.showInfo("🔒 Safety: Only writes to output.txt in CLI folder");

    // [DEBUG_ID: DBG005] - Display resolved paths
    this.debug("DBG005", "=== AGENT CONFIGURATION ===");
    this.debug("DBG005", `CLI Folder: ${this.cliFolderPath}`);
    this.debug("DBG005", `Output File: ${this.outputFilePath}`);
    this.debug("DBG005", `Base Path: ${this.basePath}`);
    this.debug("DBG005", `Test Path: ${this.testPath}`);
    this.debug("DBG005", `Source Path: ${this.sourcePath}`);
    this.debug("DBG005", "===========================");

    this.ui.showInfo(`📂 Workspace: ${this.basePath}`);
    this.ui.showInfo(`   └─ Test cases: src/test/java/org/example/evaluations`);
    this.ui.showInfo(`   └─ Templates:  src/main/java/org/example/evaluations`);
    console.log("");

    try {
      // Step 1: Validate paths exist (test path is REQUIRED)
      this.ui.showInfo("🔍 Validating workspace structure...");
      await this.validatePaths();

      // Step 2: Extract test cases (REQUIRED - agent is useless without tests)
      this.ui.showInfo("🧪 Scanning for test cases...");
      const testCases = await this.extractTestCases();

      if (testCases.length === 0) {
        const errorMsg =
          "No test cases found. Agent requires test cases to function.";
        this.ui.showError(`❌ ${errorMsg}`);
        await this.writeErrorOutput(new Error(errorMsg));
        return { success: false, message: errorMsg };
      }
      this.ui.showSuccess(`   Found ${testCases.length} test file(s)`);

      // Step 3: Extract code templates (OPTIONAL - API can generate if missing)
      this.ui.showInfo("📄 Scanning for code templates...");
      const codeTemplates = await this.extractCodeTemplates();
      if (codeTemplates.length > 0) {
        this.ui.showSuccess(`   Found ${codeTemplates.length} source file(s)`);
      } else {
        this.ui.showWarning(
          "   No source templates found (API will generate from scratch)"
        );
      }

      // Step 4: Match test cases to source files
      this.ui.showInfo("🔗 Matching test cases to source files...");
      const matchResult = this.matchTestsToSources(testCases, codeTemplates);
      this.ui.showSuccess(
        `   Matched ${matchResult.matched.length} file(s), ${matchResult.unmatched.length} unmatched`
      );

      // Step 5: Build payload
      this.ui.showInfo("📦 Building payload for autonomous agent...");
      const payload = this.buildPayload(testCases, codeTemplates, matchResult);

      // Step 6: Send to endpoint
      this.ui.showInfo("🚀 Sending to autonomous-agent endpoint...");
      this.ui.startLoading("Processing");
      const startTime = Date.now();

      const response = await this.sendToAgent(payload);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.ui.stopLoading();
      this.ui.showSuccess(`✅ Agent response received in ${elapsed}s`);

      // Step 7: Write output (ONLY to CLI folder's output.txt)
      this.ui.showInfo("💾 Writing response to output.txt...");
      const writeSuccess = await this.writeOutput(response);
      if (writeSuccess) {
        this.ui.showSuccess("✅ Agent mode completed successfully!");
      } else {
        this.ui.showWarning("⚠️ Could not write to output.txt");
      }

      return { success: true, response };
    } catch (error) {
      this.ui.stopLoading();
      this.ui.showError(`❌ Agent mode failed: ${error.message}`);
      await this.writeErrorOutput(error);
      return { success: false, error: error.message };
    }
  }

  /**
   * [DEBUG_ID: DBG006] - Validate that required paths exist
   * SAFE READ-ONLY: Only uses safeExists
   * REQUIRES: Test path must exist (agent is useless without test cases)
   * OPTIONAL: Source path (API can generate code from scratch)
   */
  async validatePaths() {
    this.debug("DBG006", "=== PATH VALIDATION ===");

    // Check base path (REQUIRED)
    this.debug("DBG006", `Checking base path: ${this.basePath}`);
    const baseExists = this.safeExists(this.basePath);
    this.debug("DBG006", `  Base path exists: ${baseExists}`);

    if (baseExists) {
      // [DEBUG_ID: DBG007] - List contents of base path
      try {
        const baseContents = this.safeReadDir(this.basePath);
        this.debug(
          "DBG007",
          `  Base path contents (${baseContents.length} items):`
        );
        baseContents.forEach((item) => {
          const isDir = item.isDirectory();
          this.debug("DBG007", `    ${isDir ? "📁" : "📄"} ${item.name}`);
        });
      } catch (e) {
        this.debug("DBG007", `  Error reading base path: ${e.message}`);
      }
    }

    if (!baseExists) {
      this.debug("DBG006", "  ❌ Base path validation FAILED");
      throw new Error(`Base path does not exist: ${this.basePath}`);
    }

    // Check test path (REQUIRED - agent needs test cases to function)
    this.debug("DBG006", `Checking test path: ${this.testPath}`);
    this.testPathExists = this.safeExists(this.testPath);
    this.debug("DBG006", `  Test path exists: ${this.testPathExists}`);

    if (!this.testPathExists) {
      // [DEBUG_ID: DBG008] - Try to find what part of the path exists
      this.debug("DBG008", "  Checking path segments...");
      let currentPath = this.basePath;
      const segments = ["src", "test", "java", "org", "example", "evaluations"];
      for (const segment of segments) {
        const nextPath = path.join(currentPath, segment);
        const segmentExists = this.safeExists(nextPath);
        this.debug("DBG008", `    ${segmentExists ? "✓" : "✗"} ${nextPath}`);
        if (!segmentExists) break;
        currentPath = nextPath;
      }
      this.debug("DBG006", "  ❌ Test path validation FAILED");
      throw new Error(
        `Test path does not exist: ${this.testPath}\n` +
          `Agent requires test cases to function. Please ensure test files exist.`
      );
    }

    // Check source path (OPTIONAL - API can generate code from scratch)
    this.debug("DBG006", `Checking source path: ${this.sourcePath}`);
    this.sourcePathExists = this.safeExists(this.sourcePath);
    this.debug("DBG006", `  Source path exists: ${this.sourcePathExists}`);

    if (!this.sourcePathExists) {
      // [DEBUG_ID: DBG009] - Try to find what part of the path exists
      this.debug("DBG009", "  Checking path segments...");
      let currentPath = this.basePath;
      const segments = ["src", "main", "java", "org", "example", "evaluations"];
      for (const segment of segments) {
        const nextPath = path.join(currentPath, segment);
        const segmentExists = this.safeExists(nextPath);
        this.debug("DBG009", `    ${segmentExists ? "✓" : "✗"} ${nextPath}`);
        if (!segmentExists) break;
        currentPath = nextPath;
      }
      this.debug(
        "DBG006",
        "  ⚠️ Source path not found (API will generate code)"
      );
      this.ui.showWarning(
        "   ⚠️ Source path not found - API will generate code from scratch"
      );
    }

    this.debug("DBG006", "=== PATH VALIDATION COMPLETE ===");
    this.ui.showSuccess("   ✓ Workspace structure validated");
  }

  /**
   * [DEBUG_ID: DBG010] - Recursively scan a directory for .java files
   * SAFE READ-ONLY: Only uses safeExists, safeReadDir, safeReadFile, safeIsDirectory
   * @param {string} dirPath - Directory to scan
   * @returns {Array} Array of file objects with path and content
   */
  scanDirectory(dirPath, depth = 0) {
    const results = [];
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      this.debug("DBG010", `Scanning directory: ${dirPath}`);
    }

    if (!this.safeExists(dirPath)) {
      this.debug("DBG010", `${indent}Directory does not exist: ${dirPath}`);
      return results;
    }

    const items = this.safeReadDir(dirPath);
    this.debug(
      "DBG010",
      `${indent}Found ${items.length} items in ${path.basename(dirPath)}/`
    );

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Recursively scan subdirectories
        this.debug("DBG010", `${indent}  📁 ${item.name}/`);
        results.push(...this.scanDirectory(fullPath, depth + 1));
      } else if (item.isFile() && item.name.endsWith(".java")) {
        this.debug("DBG010", `${indent}  📄 ${item.name} (Java file)`);
        const content = this.safeReadFile(fullPath);
        if (content !== null) {
          const relativePath = path.relative(this.basePath, fullPath);
          results.push({
            fileName: item.name,
            filePath: fullPath,
            relativePath: relativePath,
            content: content,
            size: content.length,
          });
        } else {
          this.ui.showWarning(`   ⚠️ Could not read: ${fullPath}`);
        }
      }
    }

    return results;
  }

  /**
   * Extract test cases from the test directory
   * SAFE READ-ONLY: Uses scanDirectory which only reads
   */
  async extractTestCases() {
    if (!this.testPathExists) {
      return [];
    }
    const testFiles = this.scanDirectory(this.testPath);

    return testFiles.map((file) => ({
      ...file,
      type: "test",
      testClassName: this.extractClassName(file.content),
      testMethods: this.extractTestMethods(file.content),
    }));
  }

  /**
   * Extract code templates from the source directory
   * SAFE READ-ONLY: Uses scanDirectory which only reads
   */
  async extractCodeTemplates() {
    if (!this.sourcePathExists) {
      return [];
    }
    const sourceFiles = this.scanDirectory(this.sourcePath);

    return sourceFiles.map((file) => ({
      ...file,
      type: "source",
      className: this.extractClassName(file.content),
      methods: this.extractMethods(file.content),
    }));
  }

  /**
   * Extract class name from Java file content
   */
  extractClassName(content) {
    const match = content.match(
      /(?:public\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/
    );
    return match ? match[1] : null;
  }

  /**
   * Extract test method names from test file
   */
  extractTestMethods(content) {
    const methods = [];
    const regex = /@Test[\s\S]*?(?:public\s+)?void\s+(\w+)\s*\(/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      methods.push(match[1]);
    }

    return methods;
  }

  /**
   * Extract method signatures from source file
   */
  extractMethods(content) {
    const methods = [];
    const regex =
      /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Exclude constructors and common patterns
      if (
        !match[1].match(/^(if|for|while|switch|catch|synchronized|return|new)$/)
      ) {
        methods.push(match[1]);
      }
    }

    return [...new Set(methods)]; // Remove duplicates
  }

  /**
   * Match test files to source files based on naming conventions
   */
  matchTestsToSources(testCases, codeTemplates) {
    const matched = [];
    const unmatched = [];

    for (const test of testCases) {
      // Common patterns: TestClassName -> ClassName, ClassNameTest -> ClassName
      const testName = test.testClassName || test.fileName.replace(".java", "");
      const possibleSourceNames = [
        testName.replace(/^Test/, ""),
        testName.replace(/Test$/, ""),
        testName.replace(/Tests$/, ""),
        testName.replace(/IT$/, ""), // Integration tests
      ];

      const matchingSource = codeTemplates.find((source) => {
        const sourceName =
          source.className || source.fileName.replace(".java", "");
        return possibleSourceNames.includes(sourceName);
      });

      if (matchingSource) {
        matched.push({
          test: test,
          source: matchingSource,
          matchedBy: "naming-convention",
        });
      } else {
        unmatched.push(test);
      }
    }

    return { matched, unmatched };
  }

  /**
   * Build structured payload for the API
   */
  buildPayload(testCases, codeTemplates, matchResult) {
    return {
      timestamp: new Date().toISOString(),
      agent: "brahma-cli-agent",
      version: "1.0.0",
      workspace: {
        basePath: this.basePath,
        testPath: this.testPath,
        sourcePath: this.sourcePath,
      },
      testCases: testCases.map((tc) => ({
        fileName: tc.fileName,
        filePath: tc.relativePath,
        className: tc.testClassName,
        testMethods: tc.testMethods,
        content: tc.content,
      })),
      codeTemplates: codeTemplates.map((ct) => ({
        fileName: ct.fileName,
        filePath: ct.relativePath,
        className: ct.className,
        methods: ct.methods,
        content: ct.content,
      })),
      matches: matchResult.matched.map((m) => ({
        testFile: m.test.relativePath,
        sourceFile: m.source.relativePath,
        matchedBy: m.matchedBy,
      })),
      unmatchedTests: matchResult.unmatched.map((t) => t.relativePath),
      summary: {
        totalTestFiles: testCases.length,
        totalSourceFiles: codeTemplates.length,
        matchedPairs: matchResult.matched.length,
        unmatchedTests: matchResult.unmatched.length,
      },
    };
  }

  /**
   * Send payload to the autonomous-agent endpoint
   */
  async sendToAgent(payload) {
    const agentUrl =
      config.AGENT_URL ||
      config.BACKEND_URL.replace("/chat", "/autonomous-agent");

    const response = await this.fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": config.USER_AGENT,
      },
      body: JSON.stringify(payload),
      timeout: config.TIMEOUT,
    });

    if (!response.ok) {
      throw new Error(
        `Agent endpoint error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status === "error") {
      throw new Error(data.message || "Agent endpoint returned an error");
    }

    return data;
  }

  /**
   * Write agent response to output.txt
   */
  async writeOutput(response) {
    const outputFile = path.join(process.cwd(), "output.txt");
    let outputContent = "";

    // Format the response based on its structure
    if (response.generatedCode) {
      // If response contains generated code with file paths
      if (Array.isArray(response.generatedCode)) {
        for (const item of response.generatedCode) {
          outputContent += `${"=".repeat(60)}\n`;
          outputContent += `📁 File: ${
            item.filePath || item.path || "Unknown"
          }\n`;
          outputContent += `${"=".repeat(60)}\n\n`;
          outputContent += item.code || item.content || "";
          outputContent += "\n\n";
        }
      } else if (typeof response.generatedCode === "object") {
        // Single file object
        outputContent += `📁 File: ${
          response.generatedCode.filePath ||
          response.generatedCode.path ||
          "Unknown"
        }\n`;
        outputContent += `${"=".repeat(60)}\n\n`;
        outputContent +=
          response.generatedCode.code || response.generatedCode.content || "";
      } else {
        // Plain code string
        outputContent = response.generatedCode;
      }
    } else if (response.response) {
      // Generic response field
      outputContent =
        typeof response.response === "string"
          ? response.response
          : JSON.stringify(response.response, null, 2);
    } else if (response.code) {
      // Direct code field
      outputContent = response.code;
    } else {
      // Fallback: stringify the entire response
      outputContent = JSON.stringify(response, null, 2);
    }

    // Add metadata header
    const header = [
      "╔════════════════════════════════════════════════════════════╗",
      "║              BRAHMA AGENT MODE - OUTPUT                    ║",
      `║  Generated: ${new Date().toISOString()}        ║`,
      "╚════════════════════════════════════════════════════════════╝",
      "",
      "",
    ].join("\n");

    // SAFE WRITE: Only writes to output.txt in CLI folder
    return this.safeWriteOutput(header + outputContent);
  }

  /**
   * Write error details to output.txt
   * SAFE WRITE: Only writes to output.txt in CLI folder
   */
  async writeErrorOutput(error) {
    const errorContent = [
      "╔════════════════════════════════════════════════════════════╗",
      "║              BRAHMA AGENT MODE - ERROR                     ║",
      `║  Timestamp: ${new Date().toISOString()}        ║`,
      "╚════════════════════════════════════════════════════════════╝",
      "",
      `Error: ${error.message}`,
      "",
      "Stack Trace:",
      error.stack || "Not available",
      "",
      "Possible Solutions:",
      `1. Verify the workspace path exists: ${this.basePath}`,
      `2. Check that test files exist in: ${this.testPath}`,
      `3. Check that source files exist in: ${this.sourcePath}`,
      "4. Ensure the backend server is running at: " +
        (config.AGENT_URL ||
          config.BACKEND_URL.replace("/chat", "/autonomous-agent")),
      "5. Check your network connection",
    ].join("\n");

    // SAFE WRITE: Only writes to output.txt in CLI folder
    return this.safeWriteOutput(errorContent);
  }
}

module.exports = BrahmaAgent;
