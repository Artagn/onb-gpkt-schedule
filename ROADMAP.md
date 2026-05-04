# ONB GPKT Schedule - Development Roadmap

> **Last Updated:** 2026-04-24  
> **Strategy:** Incremental Enhancement with Stability Focus

---

## 🎯 Vision

Hệ thống quản lý nhân sự cao cấp với real-time analytics, mobile-first experience cho bộ phận ONB/GPKT.

---

## 📊 Current Status

| Metric | Value |
|--------|-------|
| Current Version | v3.19.2 |
| Active Phase | Production Maintenance |
| Last Major Feature | v3.19.0 - Livechat Performance-based Scoring |

---

## ✅ Completed Milestones

### Track A: Production Stability (All Complete)

| Version | Feature | Status |
|---------|---------|--------|
| v3.9.11 | Holiday-aware Scheduler | ✅ Done |
| v3.9.7 | Review Manager Workflow | ✅ Done |
| v3.9.16 | Livechat Difficulty Scoring | ✅ Done |
| v3.9.13 | Cache-control Headers | ✅ Done |
| v3.9.8 | Dynamic Metrics Sync | ✅ Done |
| v3.10.0 | Configurable Livechat Difficulty | ✅ Done |
| v3.9.30 | Evaluation Data Locking | ✅ Done |
| v3.11.1 | Firebase Read Optimization (70%+) | ✅ Done |
| v3.13.0 | AI Bot Removal & Date Range Optimization | ✅ Done |
| v3.14.0 | Firestore Persistence & Tiered Refetching | ✅ Done |
| v3.16.0 | Hybrid Real-Time (onSnapshot) | ✅ Done |
| v3.17.1 | Instant UI Updates (No F5) | ✅ Done |
| v3.18.0 | Schedule Export Tool | ✅ Done |
| v3.19.0 | Performance-based Livechat Scoring | ✅ Done |

### Track B: Auto-Scheduling Enhancements

| Phase | Feature | Status | Priority |
|-------|---------|--------|----------|
| 1 | Dry-run Preview Mode | ✅ Done | P1 |
| 2 | Skill-based Filtering | 📋 Planned | P2 |
| 3 | Preference-aware Bonus | 📋 Planned | P3 |
| 4 | Leave-aware Auto-fill | 📋 Planned | P3 |

### Track C: UX Improvements (All Complete)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | PWA Optimization | ✅ Done |
| 2 | Skeleton Loading | ✅ Done |
| 3 | Count-Up Animations | ✅ Done |
| 4 | ColorLegend Component | ✅ Done |

---

## 📅 Future Enhancements

### Auto-Scheduling Engine Proposals

> **📌 Status:** Based on `services/schedulerEngine.ts` analysis

#### Current Engine Architecture
```
Phase 1: Evening Shifts  → Ưu tiên ca tối, tự tạo Nghỉ bù sáng hôm sau
Phase 2: Livechat        → Ghép cặp Sáng+Chiều, cân bằng Rank A/B
Phase 3: Remaining       → Scoring Engine (8 tiêu chí) cho Training + Others
```

#### 🔥 High Priority
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 1 | **Skill-based Filtering** | Thêm `requiredSkills[]` vào Job, `skills[]` vào Employee. Filter trước khi scoring | ⭐⭐ |
| 2 | **Dry-run Preview v2** | Enhanced preview với conflict warnings và alternative suggestions | ⭐ |

#### ⚡ Medium Priority
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 3 | **Preference-aware Bonus** | Thêm `preferredShifts[]` vào Employee. Scoring +15 điểm nếu khớp | ⭐⭐ |
| 4 | **Leave-aware Auto-fill** | Khi leave approved → Trigger partial re-schedule cho slot bị ảnh hưởng | ⭐⭐⭐ |
| 5 | **Conflict Auto-fix** | Log conflicts và đề xuất swap thay vì chỉ skip | ⭐⭐⭐ |

#### 📈 Low Priority (Nice-to-have)
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 6 | **Fairness Dashboard** | Report sau mỗi lần schedule: Histogram phân bổ ca tối, ngày nghỉ | ⭐⭐ |
| 7 | **Multi-week Optimization** | Tối ưu cross-week (nghỉ tuần này → ưu tiên làm tuần sau) | ⭐⭐⭐⭐ |

### Scoring Engine Reference (8 Criteria)
```typescript
1. KPI Balance (Monthly)    → Ưu tiên người chưa đủ chỉ tiêu
2. Weekly KPI Cap           → Phạt nặng nếu vượt 120% weekly target
3. Rest Days Balance        → Phạt nặng nếu < 1 ngày nghỉ/tuần
4. "Lĩnh vực" Limit         → Max 2 lớp Lĩnh vực/tuần
5. Task Variety             → Tránh lặp cùng công việc > 3 lần
6. Split-Shift Penalty      → Ưu tiên ghép cặp Sáng+Chiều
7. Saturday Balance         → Cân bằng số T7 làm việc trong tháng
8. Weekly Load Tier Balance → Cân bằng theo tier (Low/Mid/High KPI)
```

---

## 🎯 Decision Framework

### When to proceed to next phase:
1. Current phase features are stable in production (≥1 week)
2. No critical bugs reported
3. User feedback collected and addressed

### When to pause/pivot:
1. Production incidents requiring immediate attention
2. User requests changing priorities
3. Dependencies not available (API, infrastructure)

---

## 📝 Notes

- All new features require preview in staging before production
- AI Chatbot đã gỡ bỏ hoàn toàn (v3.13.0)
- Hệ thống production-stable, focus hiện tại là maintenance và incremental improvements

---

*For implementation details, see [CONTINUITY.md](./CONTINUITY.md).*
