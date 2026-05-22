import * as admin from "firebase-admin";

// Khởi tạo Admin SDK một lần duy nhất tại đây cho toàn bộ Functions
if (!admin.apps.length) {
    admin.initializeApp();
}

// Export các functions từ file riêng
// export { askSchedulerBotV2 } from "./askSchedulerBotV2"; (Removed)

// Phase 5: Leave Balance Triggers
export { onScheduleUpdate, onLeaveApproved } from "./onLeaveBalanceUpdate";

// Admin Tools
export { recalculateAllBalances } from "./recalculateBalances";

// Public APIs
export { getPublicTrainingSchedule } from "./getPublicTrainingSchedule";
