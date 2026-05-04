---
description: Cập nhật version number khi release (tránh lệch phiên bản)
---
# Workflow: Bump Version

Khi cần release phiên bản mới, cập nhật version ở các vị trí sau:

// turbo-all

## Steps

1. Cập nhật version trong `package.json`:
   ```json
   "version": "X.Y.Z"
   ```

2. Cập nhật version trong `vite.config.ts` (PWA manifest description):
   ```typescript
   description: 'Lịch làm việc và phân công ONB/GPKT vX.Y.Z'
   ```

3. Cập nhật version trong `components/Sidebar.tsx` (line ~77):
   ```tsx
   <p className="text-xs text-slate-400 mt-1">Schedule Manager vX.Y.Z</p>
   ```

4. Thêm entry vào `CHANGELOG.md`:
   ```markdown
   ### vX.Y.Z - YYYY-MM-DD
   - Mô tả các thay đổi
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```

## Version Locations Summary

| File | Location | Mục đích |
|------|----------|----------|
| `package.json` | line 4 | Source of truth |
| `vite.config.ts` | PWA description | PWA install prompt |
| `Sidebar.tsx` | line ~77 | User-visible in app |

> **Đã loại bỏ:** index.html title, Login footer (không cần thiết)
