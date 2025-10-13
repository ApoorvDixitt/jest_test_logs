# 🧹 Brahma CLI - Self-Destruct Mode

## 🚨 **Complete Privacy Mode - Zero Traces Left Behind**

Brahma CLI now supports **Self-Destruct Mode** - it completely removes itself after each use, leaving absolutely no traces on your system.

## 🎯 **What Gets Removed in Self-Destruct Mode:**

### ✅ **Always Removed (Standard Cleanup):**

```
/tmp/brahma-<random>/           # Temporary directory
├── package.json                # Temp package.json
├── node_modules/               # Temp dependencies
└── package-lock.json           # Lock file
```

### ✅ **Self-Destruct Mode Removes:**

```
~/.npm/_npx/brahma-cli/         # NPX cache (forces re-download)
/usr/local/lib/node_modules/brahma-cli/    # Global package
/usr/local/bin/brahma                      # Global symlink
```

## ⚙️ **Configuration**

Self-destruct mode is controlled in `lib/config.js`:

```javascript
module.exports = {
  BACKEND_URL: "https://your-backend.com/chat",
  SELF_DESTRUCT: true, // true = remove all traces, false = keep cache
};
```

## 🔄 **Behavior Comparison**

| Mode              | NPX First Run     | NPX Second Run    | Global Install   | After Use             |
| ----------------- | ----------------- | ----------------- | ---------------- | --------------------- |
| **Normal**        | Download + Cache  | Use Cache (fast)  | Install Once     | Cache/Install Remains |
| **Self-Destruct** | Download + Remove | Download + Remove | Install + Remove | Nothing Remains       |

## 🕒 **Performance Impact**

### **Normal Mode:**

```bash
$ npx brahma-cli "hello"     # 3-5 seconds (download)
$ npx brahma-cli "world"     # 1-2 seconds (cached)
$ npx brahma-cli "again"     # 1-2 seconds (cached)
```

### **Self-Destruct Mode:**

```bash
$ npx brahma-cli "hello"     # 3-5 seconds (download + cleanup)
$ npx brahma-cli "world"     # 3-5 seconds (re-download + cleanup)
$ npx brahma-cli "again"     # 3-5 seconds (re-download + cleanup)
```

## 📱 **User Experience Examples**

### **NPX with Self-Destruct:**

```bash
$ npx brahma-cli "How do I create a React component?"
🔧 Setting up Brahma...
🤔 Thinking...

Brahma:
Here's how to create a React component:
[AI response]

🧹 Self-destruct mode: Removing all traces...
🧹 Cleaned NPX cache

# Check - nothing left behind
$ ls ~/.npm/_npx/
# Empty or no brahma-cli found
```

### **Ctrl+C with Self-Destruct:**

```bash
$ npx brahma-cli
🚀 Brahma Interactive Mode
You: Hello
Brahma: Hi there!
You: ^C

👋 Goodbye!
🧹 Self-destruct mode: Removing all traces...
🧹 Cleaned NPX cache
```

### **Global Install with Self-Destruct:**

```bash
$ npm install -g brahma-cli
$ brahma "hello"
🤔 Thinking...

Brahma:
[AI response]

🧹 Self-destruct mode: Removing all traces...
🧹 Cleaned global installation

$ brahma "world"
command not found: brahma  # Package removed itself!
```

## 🔐 **Permissions & Limitations**

### **NPX Cache Removal:**

✅ **Always works** - User owns `~/.npm/_npx/`

### **Global Install Removal:**

- ✅ **Works** if installed without sudo
- ⚠️ **Requires sudo** if installed with sudo
- 📝 **Shows message**: "Global uninstall requires: sudo npm uninstall -g brahma-cli"

## 🎯 **Use Cases for Self-Destruct Mode**

### **✅ When to Use Self-Destruct:**

- 🔒 **Maximum Privacy**: Shared computers, public systems
- 🕵️ **Zero Forensics**: No traces of AI usage
- 🧪 **Testing/CI**: Clean environment each time
- 🔐 **Compliance**: Strict data policies

### **❌ When to Disable Self-Destruct:**

- ⚡ **Daily Usage**: You use Brahma frequently
- 🚀 **Performance Priority**: Want fast subsequent runs
- 📶 **Limited Internet**: Slow connection, want caching
- 💻 **Personal Machine**: Privacy less critical

## 🛠️ **Configuration Options**

### **Enable Self-Destruct (Maximum Privacy):**

```javascript
// lib/config.js
SELF_DESTRUCT: true;
```

### **Disable Self-Destruct (Better Performance):**

```javascript
// lib/config.js
SELF_DESTRUCT: false;
```

## 🔍 **Verification - Check Nothing is Left:**

### **After NPX with Self-Destruct:**

```bash
# Check NPX cache
ls ~/.npm/_npx/ | grep brahma
# Should return nothing

# Check temp directories
ls /tmp/brahma-*
# Should return "No such file or directory"
```

### **After Global Install with Self-Destruct:**

```bash
# Check global installation
which brahma
# Should return "brahma not found"

# Check global packages
npm list -g brahma-cli
# Should return "empty" or "not found"
```

## ⚠️ **Important Notes**

1. **Re-download Every Time**: Self-destruct mode downloads the package fresh each use
2. **Slower Performance**: Each run takes 3-5 seconds instead of 1-2 seconds
3. **Internet Required**: Cannot work offline after first use
4. **Global Install Behavior**: Global installs will self-remove (requires appropriate permissions)

## 🎚️ **Recommendation**

| User Type                | Recommended Setting    | Reason                                        |
| ------------------------ | ---------------------- | --------------------------------------------- |
| **Privacy-First Users**  | `SELF_DESTRUCT: true`  | Zero traces, maximum privacy                  |
| **Daily Users**          | `SELF_DESTRUCT: false` | Better performance, still secure temp cleanup |
| **Shared Systems**       | `SELF_DESTRUCT: true`  | No evidence of usage                          |
| **Personal Development** | `SELF_DESTRUCT: false` | Faster iteration                              |

The choice is yours - **maximum privacy** vs **better performance**! 🚀
