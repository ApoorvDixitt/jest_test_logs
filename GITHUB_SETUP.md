# GitHub Setup Guide

## 🚀 Push to GitHub

Follow these steps to push your Brahma CLI to GitHub:

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Zero-dependency Brahma CLI"
```

### 2. Create GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `brahma-cli` (or your preferred name)
4. Do NOT initialize with README (we already have one)
5. Click "Create repository"

### 3. Connect and Push
```bash
# Replace 'yourusername' with your GitHub username
git remote add origin https://github.com/yourusername/brahma-cli.git
git branch -M main
git push -u origin main
```

### 4. Update Repository URLs
After creating the repo, update these files with your actual GitHub URLs:
- `package.json` (repository, homepage, bugs fields)
- `README.md` (clone command)

## ✨ Clone and Use Instructions

Once pushed to GitHub, anyone can use it instantly:

```bash
# Clone and use immediately (no npm install needed!)
git clone https://github.com/yourusername/brahma-cli.git
cd brahma-cli
node bin/brahma.js

# Or use npm scripts
npm start
```

## 🎯 Key Benefits

- **Zero Dependencies**: Uses only Node.js built-in modules
- **Instant Clone-and-Use**: No `npm install` required
- **Portable**: Works on any system with Node.js 14+
- **Fast**: No dependency installation time
- **Reliable**: No version conflicts or dependency issues