/**
 * Brahma Agent Module
 * Autonomous agent for scanning codebases, extracting test cases and templates,
 * and sending structured payloads to the autonomous-agent endpoint.
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

class BrahmaAgent {
  constructor(ui, fetch) {
    this.ui = ui;
    this.fetch = fetch;
    this.basePath = "/workspace";
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
   * Main entry point for agent mode
   */
  async run() {
    this.ui.showInfo("🤖 Starting Brahma Agent Mode...");
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
   * Validate that required paths exist
   */
  async validatePaths() {
    if (!fs.existsSync(this.basePath)) {
      throw new Error(`Base path does not exist: ${this.basePath}`);
    }

    if (!fs.existsSync(this.testPath)) {
      throw new Error(`Test path does not exist: ${this.testPath}`);
    }

    if (!fs.existsSync(this.sourcePath)) {
      throw new Error(`Source path does not exist: ${this.sourcePath}`);
    }

    this.ui.showSuccess("   ✓ Workspace structure validated");
  }

  /**
   * Recursively scan a directory for .java files
   * @param {string} dirPath - Directory to scan
   * @returns {Array} Array of file objects with path and content
   */
  scanDirectory(dirPath) {
    const results = [];

    if (!fs.existsSync(dirPath)) {
      return results;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Recursively scan subdirectories
        results.push(...this.scanDirectory(fullPath));
      } else if (item.isFile() && item.name.endsWith(".java")) {
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
