# 🚀 Deployment Protocol

This document outlines the mandatory steps for deploying updates to the ONB GPKT Schedule application.
**ALWAYS** follow this checklist to ensure consistency and avoid caching issues.

## 1. Pre-Deployment Checklist

### 🔢 Versioning
- [ ] Determine the new version number (SemVer: `Major.Minor.Patch`).
- [ ] Update version strings in the following files:
    1.  **`vite.config.ts`**: Update `manifest.description`.
    2.  **`index.html`**: Update `<title>` and `<meta name="build-time">` (ensure `FORCE UPDATE` comment is updated).
    3.  **`components/Sidebar.tsx`**: Update "Schedule Manager vX.Y.Z".
    4.  **`components/Login.tsx`**: Update footer "Phiên bản X.Y.Z".

### 📝 Documentation
- [ ] Update `CONTINUITY.md`: Add a changelog entry under "CHANGELOG HISTORY".
- [ ] Update `task.md`: Mark relevant tasks as completed.

### ✅ Verification
- [ ] Run `npm run build` locally to ensure no build errors.
- [ ] Verify no critical lint errors remain.

## 2. Deployment Command
Run the build and deploy commands sequentially:

```powershell
npm.cmd run build
firebase.cmd deploy --only hosting
```

> **Note:** Use `.cmd` suffix on Windows to avoid execution policy issues.

## 3. Post-Deployment
- [ ] Verify the live site shows the new version number.
- [ ] Check `Console` for any unexpected errors.
- [ ] Hard refresh (Ctrl+F5) to clear old cache if needed.
