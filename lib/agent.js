/**
 * Brahma Agent Module
 * Autonomous agent for scanning codebases, extracting test cases and templates,
 * and sending structured payloads to the autonomous-agent endpoint.
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
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

// [DEBUG_ID: DBG001] - Debug mode flag - set to false to disable all debug logging
// Can also use environment variable: DEBUG_AGENT=true
const DEBUG_MODE = process.env.DEBUG_AGENT === 'true' || true;

class BrahmaAgent {
  constructor(ui, fetch) {
    this.ui = ui;
    this.fetch = fetch;
    
    // [DEBUG_ID: DBG002] - Workspace path resolution
    // Priority: 1. WORKSPACE_PATH env var, 2. /workspace (VM), 3. process.cwd() (local dev)
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
  }

  /**
   * [DEBUG_ID: DBG003] - Resolve workspace path with fallback logic
   */
  resolveWorkspacePath() {
    const envWorkspace = process.env.WORKSPACE_PATH;
    const defaultWorkspace = "/workspace";
    const cwdWorkspace = process.cwd();

    this.debug("DBG003", "Resolving workspace path...");
    this.debug("DBG003", `  ENV WORKSPACE_PATH: ${envWorkspace || "(not set)"}`);
    this.debug("DBG003", `  Default /workspace exists: ${fs.existsSync(defaultWorkspace)}`);
    this.debug("DBG003", `  Current working directory: ${cwdWorkspace}`);
    this.debug("DBG003", `  __dirname: ${__dirname}`);

    // Priority 1: Environment variable
    if (envWorkspace && fs.existsSync(envWorkspace)) {
      this.debug("DBG003", `  ✓ Using WORKSPACE_PATH env: ${envWorkspace}`);
      return envWorkspace;
    }

    // Priority 2: Default /workspace (for VM)
    if (fs.existsSync(defaultWorkspace)) {
      this.debug("DBG003", `  ✓ Using default /workspace`);
      return defaultWorkspace;
    }

    // Priority 3: Current working directory (for local development)
    this.debug("DBG003", `  ✓ Falling back to CWD: ${cwdWorkspace}`);
    return cwdWorkspace;
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
   */
  async run() {
    this.ui.showInfo("🤖 Starting Brahma Agent Mode...");
    
    // [DEBUG_ID: DBG005] - Display resolved paths
    this.debug("DBG005", "=== AGENT CONFIGURATION ===");
    this.debug("DBG005", `Base Path: ${this.basePath}`);
    this.debug("DBG005", `Test Path: ${this.testPath}`);
    this.debug("DBG005", `Source Path: ${this.sourcePath}`);
    this.debug("DBG005", "===========================");
    
    this.ui.showInfo(`📂 Workspace: ${this.basePath}`);
    this.ui.showInfo(`   └─ Test cases: src/test/java/org/example/evaluations`);
    this.ui.showInfo(`   └─ Templates:  src/main/java/org/example/evaluations`);
    console.log("");

    try {
      // Step 1: Validate paths exist
      this.ui.showInfo("🔍 Validating workspace structure...");
      await this.validatePaths();

      // Step 2: Extract test cases
      this.ui.showInfo("🧪 Scanning for test cases...");
      const testCases = await this.extractTestCases();
      this.ui.showSuccess(`   Found ${testCases.length} test file(s)`);

      if (testCases.length === 0) {
        this.ui.showWarning("⚠️ No test cases found. Exiting agent mode.");
        return { success: false, message: "No test cases found" };
      }

      // Step 3: Extract code templates
      this.ui.showInfo("📄 Scanning for code templates...");
      const codeTemplates = await this.extractCodeTemplates();
      this.ui.showSuccess(`   Found ${codeTemplates.length} source file(s)`);

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

      // Step 7: Write output
      this.ui.showInfo("💾 Writing response to output.txt...");
      await this.writeOutput(response);
      this.ui.showSuccess("✅ Agent mode completed successfully!");

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
   */
  async validatePaths() {
    this.debug("DBG006", "=== PATH VALIDATION ===");
    
    // Check base path
    this.debug("DBG006", `Checking base path: ${this.basePath}`);
    const baseExists = fs.existsSync(this.basePath);
    this.debug("DBG006", `  Base path exists: ${baseExists}`);
    
    if (baseExists) {
      // [DEBUG_ID: DBG007] - List contents of base path
      try {
        const baseContents = fs.readdirSync(this.basePath);
        this.debug("DBG007", `  Base path contents (${baseContents.length} items):`);
        baseContents.forEach(item => {
          const itemPath = path.join(this.basePath, item);
          const isDir = fs.statSync(itemPath).isDirectory();
          this.debug("DBG007", `    ${isDir ? '📁' : '📄'} ${item}`);
        });
      } catch (e) {
        this.debug("DBG007", `  Error reading base path: ${e.message}`);
      }
    }

    if (!baseExists) {
      this.debug("DBG006", "  ❌ Base path validation FAILED");
      throw new Error(`Base path does not exist: ${this.basePath}`);
    }

    // Check test path
    this.debug("DBG006", `Checking test path: ${this.testPath}`);
    const testExists = fs.existsSync(this.testPath);
    this.debug("DBG006", `  Test path exists: ${testExists}`);
    
    if (!testExists) {
      // [DEBUG_ID: DBG008] - Try to find what part of the path exists
      this.debug("DBG008", "  Checking path segments...");
      let currentPath = this.basePath;
      const segments = ["src", "test", "java", "org", "example", "evaluations"];
      for (const segment of segments) {
        const nextPath = path.join(currentPath, segment);
        const segmentExists = fs.existsSync(nextPath);
        this.debug("DBG008", `    ${segmentExists ? '✓' : '✗'} ${nextPath}`);
        if (!segmentExists) break;
        currentPath = nextPath;
      }
      this.debug("DBG006", "  ❌ Test path validation FAILED");
      throw new Error(`Test path does not exist: ${this.testPath}`);
    }

    // Check source path
    this.debug("DBG006", `Checking source path: ${this.sourcePath}`);
    const sourceExists = fs.existsSync(this.sourcePath);
    this.debug("DBG006", `  Source path exists: ${sourceExists}`);
    
    if (!sourceExists) {
      // [DEBUG_ID: DBG009] - Try to find what part of the path exists
      this.debug("DBG009", "  Checking path segments...");
      let currentPath = this.basePath;
      const segments = ["src", "main", "java", "org", "example", "evaluations"];
      for (const segment of segments) {
        const nextPath = path.join(currentPath, segment);
        const segmentExists = fs.existsSync(nextPath);
        this.debug("DBG009", `    ${segmentExists ? '✓' : '✗'} ${nextPath}`);
        if (!segmentExists) break;
        currentPath = nextPath;
      }
      this.debug("DBG006", "  ❌ Source path validation FAILED");
      throw new Error(`Source path does not exist: ${this.sourcePath}`);
    }

    this.debug("DBG006", "=== ALL PATHS VALIDATED ===");
    this.ui.showSuccess("   ✓ Workspace structure validated");
  }

  /**
   * [DEBUG_ID: DBG010] - Recursively scan a directory for .java files
   * @param {string} dirPath - Directory to scan
   * @returns {Array} Array of file objects with path and content
   */
  scanDirectory(dirPath, depth = 0) {
    const results = [];
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      this.debug("DBG010", `Scanning directory: ${dirPath}`);
    }

    if (!fs.existsSync(dirPath)) {
      this.debug("DBG010", `${indent}Directory does not exist: ${dirPath}`);
      return results;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    this.debug("DBG010", `${indent}Found ${items.length} items in ${path.basename(dirPath)}/`);

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Recursively scan subdirectories
        this.debug("DBG010", `${indent}  📁 ${item.name}/`);
        results.push(...this.scanDirectory(fullPath, depth + 1));
      } else if (item.isFile() && item.name.endsWith(".java")) {
        this.debug("DBG010", `${indent}  📄 ${item.name} (Java file)`);
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const relativePath = path.relative(this.basePath, fullPath);

          results.push({
            fileName: item.name,
            filePath: fullPath,
            relativePath: relativePath,
            content: content,
            size: content.length,
          });
        } catch (error) {
          this.ui.showWarning(`   ⚠️ Could not read: ${fullPath}`);
        }
      }
    }

    return results;
  }

  /**
   * Extract test cases from the test directory
   */
  async extractTestCases() {
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
   */
  async extractCodeTemplates() {
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

    fs.writeFileSync(outputFile, header + outputContent);
  }

  /**
   * Write error details to output.txt
   */
  async writeErrorOutput(error) {
    const outputFile = path.join(process.cwd(), "output.txt");

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
      "1. Verify the workspace path exists: /workspace",
      "2. Check that test files exist in: /workspace/src/test/java/org/example/evaluations",
      "3. Check that source files exist in: /workspace/src/main/java/org/example/evaluations",
      "4. Ensure the backend server is running at: " +
        (config.AGENT_URL ||
          config.BACKEND_URL.replace("/chat", "/autonomous-agent")),
      "5. Check your network connection",
    ].join("\n");

    fs.writeFileSync(outputFile, errorContent);
  }
}

module.exports = BrahmaAgent;
