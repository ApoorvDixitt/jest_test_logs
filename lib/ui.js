/**
 * Brahma UI Library
 * Lightweight terminal UI with animations, syntax highlighting, and formatting
 */

const os = require("os");

class BrahmaUI {
  constructor() {
    // ANSI color codes for lightweight syntax highlighting
    this.colors = {
      reset: "\x1b[0m",
      bright: "\x1b[1m",
      dim: "\x1b[2m",

      // Text colors
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",

      // Bright variants
      brightRed: "\x1b[91m",
      brightGreen: "\x1b[92m",
      brightYellow: "\x1b[93m",
      brightBlue: "\x1b[94m",
      brightMagenta: "\x1b[95m",
      brightCyan: "\x1b[96m",
      brightWhite: "\x1b[97m",

      // Background colors
      bgBlack: "\x1b[40m",
      bgRed: "\x1b[41m",
      bgGreen: "\x1b[42m",
      bgYellow: "\x1b[43m",
      bgBlue: "\x1b[44m",
      bgMagenta: "\x1b[45m",
      bgCyan: "\x1b[46m",
      bgWhite: "\x1b[47m",
    };

    // Animation frames for loading
    this.loadingFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    this.currentFrame = 0;
    this.loadingInterval = null;

    // Code language patterns for detection
    this.languagePatterns = {
      javascript:
        /(?:const|let|var|function|=>|\.js|console\.log|require\(|import |export )/i,
      python: /(?:def |import |from |print\(|if __name__|\.py)/i,
      java: /(?:public class|private |protected |static |\.java|System\.out)/i,
      cpp: /(?:#include|std::|cout|cin|\.cpp|\.h|int main\()/i,
      c: /(?:#include|printf|scanf|\.c|\.h|int main\()/i,
      csharp:
        /(?:using System|public class|private |protected |\.cs|Console\.)/i,
      php: /(?:<\?php|\$[a-zA-Z_]|echo |\.php)/i,
      ruby: /(?:def |end\b|puts |\.rb|require |class [A-Z])/i,
      go: /(?:package |func |import |fmt\.|\.go|go mod)/i,
      rust: /(?:fn |let |mut |use |\.rs|println!)/i,
      shell: /(?:\.sh|echo |export )/i,
      sql: /(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|FROM|WHERE)/i,
      html: /(?:<html|<div|<span|<script|<style)/i,
      css: /(?:\{[^}]*\}|@media|\.class|#id)/i,
      json: /^\s*[\{\[][\s\S]*[\}\]]\s*$/,
      yaml: /(?:---|\w+:\s*\w+)/,
      xml: /(?:<\?xml|<[a-zA-Z][^>]*>)/i,
      markdown: /(?:^#{1,6}\s|^\*\s|^\d+\.\s|```)/m,
    };
  }

  /**
   * Detect programming language from code content
   */
  detectLanguage(text) {
    // Clean text for better detection
    const cleanText = text.trim();

    // Check for code blocks first
    const codeBlockMatch = cleanText.match(/```(\w+)/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].toLowerCase();
    }

    // Score each language based on pattern matches
    const scores = {};
    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      const matches = cleanText.match(pattern);
      if (matches) {
        scores[lang] = (scores[lang] || 0) + matches.length;
      }
    }

    // Return language with highest score, or 'text' if no match
    const bestMatch = Object.keys(scores).reduce(
      (a, b) => (scores[a] > scores[b] ? a : b),
      null
    );

    return bestMatch || "text";
  }

  /**
   * Apply syntax highlighting based on detected language
   */
  highlightCode(text, language = null) {
    const detectedLang = language || this.detectLanguage(text);
    let highlighted = text;

    switch (detectedLang) {
      case "javascript":
        highlighted = this.highlightJavaScript(text);
        break;
      case "python":
        highlighted = this.highlightPython(text);
        break;
      case "java":
      case "cpp":
      case "c":
      case "csharp":
        highlighted = this.highlightCStyle(text);
        break;
      case "shell":
        highlighted = this.highlightShell(text);
        break;
      case "json":
        highlighted = this.highlightJSON(text);
        break;
      case "html":
        highlighted = this.highlightHTML(text);
        break;
      case "css":
        highlighted = this.highlightCSS(text);
        break;
      default:
        highlighted = this.highlightGeneric(text);
    }

    return highlighted;
  }

  /**
   * JavaScript syntax highlighting
   */
  highlightJavaScript(text) {
    return (
      text
        // Keywords
        .replace(
          /\b(const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|async|await|import|export|from|default)\b/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // Strings
        .replace(
          /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        )
        // Numbers
        .replace(
          /\b(\d+(?:\.\d+)?)\b/g,
          `${this.colors.yellow}$1${this.colors.reset}`
        )
        // Comments
        .replace(
          /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
          `${this.colors.dim}${this.colors.white}$1${this.colors.reset}`
        )
        // Functions
        .replace(
          /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          `${this.colors.cyan}$1${this.colors.reset}(`
        )
    );
  }

  /**
   * Python syntax highlighting
   */
  highlightPython(text) {
    return (
      text
        // Keywords
        .replace(
          /\b(def|class|if|elif|else|for|while|try|except|finally|import|from|as|return|yield|break|continue|pass|with|lambda|global|nonlocal)\b/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // Built-ins
        .replace(
          /\b(print|len|range|enumerate|zip|map|filter|any|all|sum|min|max|sorted|reversed)\b/g,
          `${this.colors.magenta}$1${this.colors.reset}`
        )
        // Strings
        .replace(
          /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        )
        // Numbers
        .replace(
          /\b(\d+(?:\.\d+)?)\b/g,
          `${this.colors.yellow}$1${this.colors.reset}`
        )
        // Comments
        .replace(
          /(#.*$)/gm,
          `${this.colors.dim}${this.colors.white}$1${this.colors.reset}`
        )
    );
  }

  /**
   * C-style language highlighting
   */
  highlightCStyle(text) {
    return (
      text
        // Keywords
        .replace(
          /\b(int|float|double|char|void|bool|public|private|protected|static|final|class|struct|if|else|for|while|do|switch|case|break|continue|return)\b/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // Strings
        .replace(
          /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        )
        // Numbers
        .replace(
          /\b(\d+(?:\.\d+)?[fF]?)\b/g,
          `${this.colors.yellow}$1${this.colors.reset}`
        )
        // Comments
        .replace(
          /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
          `${this.colors.dim}${this.colors.white}$1${this.colors.reset}`
        )
        // Preprocessor
        .replace(/^(#.*$)/gm, `${this.colors.magenta}$1${this.colors.reset}`)
    );
  }

  /**
   * Shell script highlighting
   */
  highlightShell(text) {
    return (
      text
        // Keywords
        .replace(
          /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function)\b/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // Variables
        .replace(
          /\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g,
          `${this.colors.yellow}$$1${this.colors.reset}`
        )
        // Strings
        .replace(
          /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        )
        // Commands
        .replace(
          /\b(echo|cd|ls|grep|awk|sed|cat|chmod|chown|mkdir|rm|mv|cp)\b/g,
          `${this.colors.cyan}$1${this.colors.reset}`
        )
        // Comments
        .replace(
          /(#.*$)/gm,
          `${this.colors.dim}${this.colors.white}$1${this.colors.reset}`
        )
    );
  }

  /**
   * JSON highlighting
   */
  highlightJSON(text) {
    return (
      text
        // Keys
        .replace(/"([^"]+)":/g, `${this.colors.blue}"$1"${this.colors.reset}:`)
        // String values
        .replace(
          /:\s*"([^"]*)"/g,
          `: ${this.colors.green}"$1"${this.colors.reset}`
        )
        // Numbers
        .replace(
          /:\s*(\d+(?:\.\d+)?)/g,
          `: ${this.colors.yellow}$1${this.colors.reset}`
        )
        // Booleans
        .replace(
          /:\s*(true|false|null)/g,
          `: ${this.colors.magenta}$1${this.colors.reset}`
        )
    );
  }

  /**
   * HTML highlighting
   */
  highlightHTML(text) {
    return (
      text
        // Tags
        .replace(
          /(<\/?[a-zA-Z][^>]*>)/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // Attributes
        .replace(/(\w+)=/g, `${this.colors.cyan}$1${this.colors.reset}=`)
        // Attribute values
        .replace(
          /=\s*(["'])(.*?)\1/g,
          `=${this.colors.green}$1$2$1${this.colors.reset}`
        )
    );
  }

  /**
   * CSS highlighting
   */
  highlightCSS(text) {
    return (
      text
        // Selectors
        .replace(
          /^([.#]?[a-zA-Z-_][a-zA-Z0-9-_]*)\s*\{/gm,
          `${this.colors.blue}$1${this.colors.reset} {`
        )
        // Properties
        .replace(/([a-zA-Z-]+):/g, `${this.colors.cyan}$1${this.colors.reset}:`)
        // Values
        .replace(
          /:\s*([^;]+);/g,
          `: ${this.colors.green}$1${this.colors.reset};`
        )
    );
  }

  /**
   * Generic highlighting for unknown languages
   */
  highlightGeneric(text) {
    return (
      text
        // Quoted strings
        .replace(
          /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        )
        // Numbers
        .replace(
          /\b(\d+(?:\.\d+)?)\b/g,
          `${this.colors.yellow}$1${this.colors.reset}`
        )
        // URLs
        .replace(
          /(https?:\/\/[^\s]+)/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // File paths
        .replace(
          /([\/][^\s]*\.[a-zA-Z]+)/g,
          `${this.colors.cyan}$1${this.colors.reset}`
        )
    );
  }

  /**
   * Start loading animation
   */
  startLoading(message = "Thinking") {
    this.stopLoading(); // Ensure no duplicate intervals

    process.stdout.write(`${this.colors.dim}${message}${this.colors.reset} `);

    this.loadingInterval = setInterval(() => {
      process.stdout.write(
        `\r${this.colors.dim}${message}${this.colors.reset} ${
          this.colors.cyan
        }${this.loadingFrames[this.currentFrame]}${this.colors.reset}`
      );
      this.currentFrame = (this.currentFrame + 1) % this.loadingFrames.length;
    }, 100);
  }

  /**
   * Stop loading animation
   */
  stopLoading() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
      // Clear the line
      process.stdout.write("\r\x1b[K");
    }
  }

  /**
   * Format and display response with proper spacing and code highlighting
   */
  displayResponse(response, title = "Brahma") {
    this.stopLoading();

    // Add spacing before response
    console.log("");

    // Display title with styling
    console.log(
      `${this.colors.bright}${this.colors.blue}${title}:${this.colors.reset}`
    );

    // Check if response contains code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let hasCodeBlocks = false;

    response.replace(codeBlockRegex, (match, language, code, offset) => {
      hasCodeBlocks = true;

      // Print text before code block
      const textBefore = response.substring(lastIndex, offset);
      if (textBefore.trim()) {
        console.log(this.formatText(textBefore));
      }

      // Print code block with highlighting
      console.log(this.formatCodeBlock(code, language));

      lastIndex = offset + match.length;
      return match;
    });

    // Print remaining text after last code block
    const remainingText = response.substring(lastIndex);
    if (remainingText.trim()) {
      if (hasCodeBlocks) {
        console.log(this.formatText(remainingText));
      } else {
        // No code blocks found, check if entire response is code
        const detectedLang = this.detectLanguage(response);
        if (detectedLang !== "text" && detectedLang !== "markdown") {
          console.log(this.formatCodeBlock(response, detectedLang));
        } else {
          console.log(this.formatText(response));
        }
      }
    }

    // Add spacing after response
    console.log("");
  }

  /**
   * Format regular text with basic styling
   */
  formatText(text) {
    return (
      text
        // Bold text (markdown style)
        .replace(
          /\*\*(.*?)\*\*/g,
          `${this.colors.bright}$1${this.colors.reset}`
        )
        // Italic text (markdown style)
        .replace(/\*(.*?)\*/g, `${this.colors.dim}$1${this.colors.reset}`)
        // Inline code
        .replace(
          /`([^`]+)`/g,
          `${this.colors.bgBlack}${this.colors.brightWhite} $1 ${this.colors.reset}`
        )
        // Headers
        .replace(/^(#{1,6})\s+(.*$)/gm, (match, hashes, title) => {
          const level = hashes.length;
          const color = level <= 2 ? this.colors.brightBlue : this.colors.blue;
          return `${color}${this.colors.bright}${title}${this.colors.reset}`;
        })
        // URLs
        .replace(
          /(https?:\/\/[^\s]+)/g,
          `${this.colors.blue}$1${this.colors.reset}`
        )
        // File paths
        .replace(
          /([\/][^\s]*\.[a-zA-Z]+)/g,
          `${this.colors.cyan}$1${this.colors.reset}`
        )
    );
  }

  /**
   * Format code block with syntax highlighting and border
   */
  formatCodeBlock(code, language = null) {
    const detectedLang = language || this.detectLanguage(code);
    const highlighted = this.highlightCode(code, detectedLang);

    // Create a simple border
    const lines = highlighted.split("\n");
    const maxLength = Math.min(
      80,
      Math.max(...lines.map((line) => this.stripAnsi(line).length))
    );
    const border = "─".repeat(Math.max(maxLength, 20));

    let result = `${this.colors.dim}┌${border}┐${this.colors.reset}\n`;

    // Add language label if detected
    if (detectedLang !== "text") {
      result += `${this.colors.dim}│ ${this.colors.brightBlue}${detectedLang}${
        this.colors.dim
      } ${" ".repeat(Math.max(0, maxLength - detectedLang.length - 1))}│${
        this.colors.reset
      }\n`;
      result += `${this.colors.dim}├${border}┤${this.colors.reset}\n`;
    }

    // Add code lines
    lines.forEach((line) => {
      const cleanLine = this.stripAnsi(line);
      const padding = " ".repeat(Math.max(0, maxLength - cleanLine.length));
      result += `${this.colors.dim}│${this.colors.reset} ${line}${padding} ${this.colors.dim}│${this.colors.reset}\n`;
    });

    result += `${this.colors.dim}└${border}┘${this.colors.reset}`;

    return result;
  }

  /**
   * Strip ANSI escape codes for length calculation
   */
  stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  }

  /**
   * Show welcome message with styling
   */
  showWelcome() {
    console.log(
      `${this.colors.bright}${this.colors.blue}🚀 Brahma Interactive Mode${this.colors.reset}`
    );
    console.log(
      `${this.colors.dim}Press Enter to send your message${this.colors.reset}`
    );
    console.log(
      `${this.colors.dim}Use Shift+Enter or Line Feed for new lines${this.colors.reset}`
    );
    console.log(
      `${this.colors.dim}Type 'exit', 'quit', or press Ctrl+C to end the session${this.colors.reset}\n`
    );
  }

  /**
   * Show goodbye message
   */
  showGoodbye() {
    console.log(
      `\n${this.colors.bright}${this.colors.green}👋 Goodbye!${this.colors.reset}`
    );
  }

  /**
   * Show error message with styling
   */
  showError(message) {
    this.stopLoading();
    console.log(
      `\n${this.colors.brightRed}⚠️  ${message}${this.colors.reset}\n`
    );
  }

  /**
   * Show success message with styling
   */
  showSuccess(message) {
    console.log(`${this.colors.brightGreen}✅ ${message}${this.colors.reset}`);
  }

  /**
   * Show info message with styling
   */
  showInfo(message) {
    console.log(`${this.colors.brightBlue}ℹ️  ${message}${this.colors.reset}`);
  }

  /**
   * Show warning message with styling
   */
  showWarning(message) {
    console.log(
      `${this.colors.brightYellow}⚠️  ${message}${this.colors.reset}`
    );
  }

  /**
   * Format user input prompt
   */
  getUserPrompt() {
    return `${this.colors.bright}${this.colors.cyan}You:${this.colors.reset} `;
  }
}

module.exports = BrahmaUI;
