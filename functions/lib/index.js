"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicTrainingSchedule = exports.recalculateAllBalances = exports.onLeaveApproved = exports.onScheduleUpdate = void 0;
const admin = __importStar(require("firebase-admin"));
// Khởi tạo Admin SDK một lần duy nhất tại đây cho toàn bộ Functions
if (!admin.apps.length) {
    admin.initializeApp();
}
// Export các functions từ file riêng
// export { askSchedulerBotV2 } from "./askSchedulerBotV2"; (Removed)
// Phase 5: Leave Balance Triggers
var onLeaveBalanceUpdate_1 = require("./onLeaveBalanceUpdate");
Object.defineProperty(exports, "onScheduleUpdate", { enumerable: true, get: function () { return onLeaveBalanceUpdate_1.onScheduleUpdate; } });
Object.defineProperty(exports, "onLeaveApproved", { enumerable: true, get: function () { return onLeaveBalanceUpdate_1.onLeaveApproved; } });
// Admin Tools
var recalculateBalances_1 = require("./recalculateBalances");
Object.defineProperty(exports, "recalculateAllBalances", { enumerable: true, get: function () { return recalculateBalances_1.recalculateAllBalances; } });
// Public APIs
var getPublicTrainingSchedule_1 = require("./getPublicTrainingSchedule");
Object.defineProperty(exports, "getPublicTrainingSchedule", { enumerable: true, get: function () { return getPublicTrainingSchedule_1.getPublicTrainingSchedule; } });
//# sourceMappingURL=index.js.map