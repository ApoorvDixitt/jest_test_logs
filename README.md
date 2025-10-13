# Brahma CLI

# Brahma CLI

> 🚀 **Instant AI Chat through Files** - Ready to use out of the box!

A file-based AI chat interface with preconfigured backend. No setup required - just run and start chatting with AI through input/output files!

## 🌟 Features

- **🚀 Instant Access**: Use with `npx` - no installation required
- **📁 File-Based I/O**: Read from input.txt, write to output.txt
- **🔄 Clean Output**: Only AI responses in output file, no timestamps or metadata
- **⌨️ Menu Navigation**: Easy keyboard navigation with arrow keys
- **🔒 Secure & Private**: No persistent data, ephemeral runtime
- **🧹 Auto-Cleanup**: Automatic cleanup of all temporary files
- **🚨 Self-Destruct Mode**: Complete removal including NPX cache (configurable)
- **🌐 Backend Agnostic**: Works with any compatible AI backends

## ⚡ Quick Start

### Instant Usage (No Setup Required)

```bash
# Start Brahma CLI
npx brahma-cli

# Or explicitly specify file mode
npx brahma-cli --file
```

A ter## 🌟 Features

- **🚀 Instant Access**: Use with `npx` - no installation required
- ** Dual I/O Modes**: Terminal-based chat OR file-based input/output
- **⌨️ Smart Input**: Enter to send, Shift+Enter for new lines (no accidental sending!)
- **🔄 Continuous Interaction**: Multi-turn conversations with context memory
- **🔒 Secure & Private**: No persistent data, ephemeral runtime
- **🧹 Auto-Cleanup**: Automatic cleanup of all temporary files
- **🚨 Self-Destruct Mode**: Complete removal including NPX cache (configurable)
- **🌐 Backend Agnostic**: Works with any compatible AI backends

## ⚡ Quick Start

### Instant Usage (No Setup Required)

````bash
# Start with mode selection menu
npx brahma-cli

# Go directly to Terminal Based I/O with optional initial question
npx brahma-cli "How do I create a React component?"
npx brahma-cli --terminal

# Go directly to File Based I/O mode
npx brahma-cli --file

### Global Installation

```bash
# Install globally for faster access
npm install -g brahma-cli

# Use with short command
brahma
````

## 🛠️ Configuration

**No configuration required!** The backend URL is preconfigured in the package.

> **For Developers**: If you need to change the backend URL, edit the `BACKEND_URL` constant in `lib/config.js`

## 📁 File Based I/O

Brahma CLI uses a file-based interface for all interactions:

- Read prompts from `input.txt` with predefined structure
- Write clean AI responses to `output.txt` (no timestamps or metadata)
- Each new request overwrites the previous output for clean results
- Menu-based prompt processing with easy keyboard navigation
- Perfect for structured inputs and automated workflows

### How to Use:

1. Edit `input.txt` with your question (preserves the predefined structure)
2. Select "Process Input" from the menu using keyboard navigation (arrow keys + Enter)
3. Clean AI response appears in `output.txt` (previous content is cleared)
4. Input file is reset to default structure for next prompt
5. Select "Exit Brahma" or press Ctrl+C to exit completely

````

## 📁 I/O Modes

Brahma CLI supports two I/O modes for different workflows:

### 1. Terminal Based I/O (Default Interactive)

- Real-time chat interface in your terminal
- Multi-turn conversations with context memory
- Smart input handling (Enter to send, Shift+Enter for new lines)

### 2. File Based I/O

- Read prompts from `input.txt` with predefined structure
- Write clean AI responses to `output.txt` (no timestamps or metadata)
- Each new request overwrites the previous output for clean results
- Menu-based prompt processing with easy keyboard navigation
- Perfect for structured inputs or when you prefer file-based interaction

```bash
# Select mode interactively
npx brahma-cli

# Direct file mode
npx brahma-cli --file
````

In file mode:

1. Edit `input.txt` with your question (preserves the predefined structure)
2. Select "Process Input" from the menu using keyboard navigation (arrow keys + Enter)
3. Clean AI response appears in `output.txt` (previous content is cleared)
4. Input file is reset to default structure for next prompt
5. Select "Exit to Mode Selection" to return to the mode selection menu
6. Select "Exit Brahma" or press Ctrl+C to exit completely

### Global Installation

```bash
# Install globally for faster access
npm install -g brahma-cli

# Use with short command
brahma "How do I center a div?"
brahma  # Interactive mode
```

## 🛠️ Configuration

**No configuration required!** The backend URL is preconfigured in the package.

> **For Developers**: If you need to change the backend URL, edit the `BACKEND_URL` constant in `bin/brahma.js`

## 🎯 Usage Examples

### Terminal Based I/O with Direct Questions

```bash
npx brahma-cli "How do I reverse a string in Python?"
npx brahma-cli "Show me a REST API example in Node.js"
npx brahma-cli "What's the difference between let and const?"
```

### Interactive Mode

````bash
$ npx brahma-cli
🚀 Brahma Interactive Mode
Press Enter to send your message
Use Shift+Enter or Line Feed for new lines
Type 'exit', 'quit', or press Ctrl+C to end the session

You: How do I create a React component?

Brahma:
Here's how to create a basic React component:

```jsx
import React from 'react';

function MyComponent() {
  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
}

export default MyComponent;
````

You: How can I add state to it?

Brahma:
You can add state using the useState hook:

```jsx
import React, { useState } from "react";

function MyComponent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

You: exit
👋 Session ended. All temporary files cleaned up.

```

## ⌨️ Input Controls

### Interactive Mode Input
- **Enter**: Send your message
- **Shift+Enter**: Add a new line (continue typing)
- **Ctrl+C**: Exit the session
- **Arrow Keys**: Navigate within your current input

### Multi-line Example
```

You: Write a Python function that:
[Shift+Enter]

> - Takes a list of numbers
> - Filters out even numbers
> - Returns the sum of odd numbers
>   [Enter to send]

Brahma: [Response with complete function]

```

This prevents accidental sending and allows you to build complex, multi-line prompts!

## 🌟 Features

- **🚀 Instant Access**: Use with `npx` - no installation required
- **💬 Interactive Mode**: Multi-turn conversations with context memory
- **⚡ One-Shot Mode**: Quick single questions from command line
- **🔒 Secure & Private**: No persistent data, ephemeral runtime
- **🧹 Auto-Cleanup**: Automatic cleanup of all temporary files
- **� Backend Agnostic**: Works with any compatible AI backend

## 📋 Requirements

- Node.js 14.0.0 or higher
- Internet connection (to communicate with your backend server)
- A compatible backend server (see Backend Integration section)

## 🔌 Backend Integration

Your backend server should implement this API:

### Endpoint
```

POST /chat

````

### Request Format
```json
{
  "prompt": "user message text",
  "session_id": "unique-uuid-string",
  "mode": "terminal" // or "file-based"
}
````

### Success Response

```json
{
  "status": "success",
  "response": "AI response in markdown format",
  "session_id": "same-uuid-echoed-back"
}
```

### Error Response

```json
{
  "status": "error",
  "error": "brief_error_description",
  "response": "User-friendly error message"
}
```

## � NPX vs Global Installation

| Method     | Command               | Pros                                                                     | Cons                                               |
| ---------- | --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| **NPX**    | `npx brahma-cli`      | ✅ No installation<br>✅ Always latest version<br>✅ No global pollution | ❌ Slightly slower startup<br>❌ Requires internet |
| **Global** | `npm i -g brahma-cli` | ✅ Faster startup<br>✅ Works offline                                    | ❌ Manual updates<br>❌ Global package management  |

## 🔒 Security & Privacy

- **No API Keys**: No sensitive credentials stored in CLI
- **Ephemeral Runtime**: Creates temporary directory, auto-cleaned on exit
- **No Persistent Data**: No logs, history, or cache files
- **Session-Based**: Each conversation gets unique UUID
- **Clean Exit**: Handles all termination scenarios (Ctrl+C, crashes, etc.)
- **🚨 Self-Destruct Mode**: Optional complete removal including NPX cache (see SELF-DESTRUCT.md)

## �🐛 Troubleshooting

### "Backend URL not configured"

```bash
# Set the environment variable
export BRAHMA_BACKEND_URL="https://your-backend-server.com/chat"
```

### "Cannot reach AI server"

- Check your internet connection
- Verify the backend URL is correct and accessible
- Ensure your backend server is running
- Test the backend URL in a browser or with curl

### "Failed to install dependencies"

- Check Node.js version: `node --version` (requires 14+)
- Clear npm cache: `npm cache clean --force`
- Try with different network connection

### Permission Issues

- Use `npx` instead of global installation
- Or install with: `sudo npm install -g brahma-cli`

## � Publishing Your Own Version

1. **Fork and customize** this repository
2. **Update package.json** with your details:
   ```json
   {
     "name": "your-brahma-cli",
     "author": "Your Name",
     "repository": "https://github.com/yourusername/brahma-cli"
   }
   ```
3. **Publish to NPM**:
   ```bash
   npm login
   npm publish
   ```
4. **Use your version**:
   ```bash
   npx your-brahma-cli "question"
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test with: `npm test`
5. Submit a pull request

## � License

MIT License - see LICENSE file for details
