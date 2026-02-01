# .github Folder - For This Repository Only

**⚠️ IMPORTANT:** The files in this folder are for managing **this repository** (ai-assisted-work), not for deployment to your project.

## For Deployment to Your Project

Use the **delta file** at:
```
agents/github-copilot/copilot-instructions-ai-assisted-work.md
```

This file has a **unique name** that won't overwrite your existing `.github/copilot-instructions.md`. Copy it to your `.github/` folder, then manually merge the content into your own `copilot-instructions.md`.

See **[DEPLOYMENT.md](../DEPLOYMENT.md)** for complete instructions.

---

## Files in This Folder

### copilot-instructions.md
GitHub Copilot configuration **for this repository only** (ai-assisted-work development).

**For your project:** Use `agents/github-copilot/copilot-instructions-ai-assisted-work.md` as a delta file.

### COPILOT-INTEGRATION.md
Historical integration documentation (superseded by DEPLOYMENT.md).

### VALIDATION.md
Configuration validation for this repository's development.

---

## Deployment Quick Reference

### If Using as Submodule
```bash
# Copy the delta file (unique name - won't overwrite anything)
mkdir -p .github
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/

# Then manually merge content into your .github/copilot-instructions.md
```

### If Using Copy-Paste
```bash
# Copy agents folder
cp -r /tmp/ai-work/agents ./agents

# Copy delta file (unique name - won't overwrite anything)
mkdir -p .github
cp agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/

# Then manually merge content into your .github/copilot-instructions.md
```

---

## See Also

- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Main deployment guide
- **[agents/github-copilot/INTEGRATION.md](../agents/github-copilot/INTEGRATION.md)** - Detailed Copilot integration
- **[agents/github-copilot/copilot-instructions-ai-assisted-work.md](../agents/github-copilot/copilot-instructions-ai-assisted-work.md)** - Delta file for your project
