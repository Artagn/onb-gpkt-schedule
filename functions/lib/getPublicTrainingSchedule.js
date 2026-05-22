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
exports.getPublicTrainingSchedule = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Khởi tạo app nếu chưa có
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.getPublicTrainingSchedule = functions
    .region('asia-southeast1')
    .https.onRequest(async (req, res) => {
    // Cấu hình CORS và Caching (10 phút)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        // Lấy toàn bộ Jobs
        const jobsSnapshot = await db.collection('jobs').get();
        const jobs = [];
        jobsSnapshot.forEach(doc => {
            const data = doc.data();
            // Chỉ lấy những job thuộc nhóm 'Đào tạo'
            if (data.group === 'Đào tạo' || data.group === 'Training') {
                jobs.push({
                    id: doc.id,
                    group: data.group,
                    classification: data.classification,
                });
            }
        });
        // Lấy toàn bộ active SubJobs
        const subJobsSnapshot = await db.collection('subJobs')
            .where('isActive', '==', true)
            .get();
        const subJobs = [];
        subJobsSnapshot.forEach(doc => {
            const data = doc.data();
            subJobs.push({
                id: doc.id,
                jobId: data.jobId,
                name: data.name,
                product: data.product,
                day: data.day,
                shift: data.shift,
                startTime: data.startTime,
                endTime: data.endTime,
                link: data.link,
                isActive: data.isActive
            });
        });
        // Lấy Holidays và WorkPeriods để xử lý hiển thị nghỉ lễ
        const holidaysSnapshot = await db.collection('holidays').get();
        const holidays = [];
        holidaysSnapshot.forEach(doc => {
            holidays.push(Object.assign({ id: doc.id }, doc.data()));
        });
        const workPeriodsSnapshot = await db.collection('workPeriods').get();
        const workPeriods = [];
        workPeriodsSnapshot.forEach(doc => {
            workPeriods.push(Object.assign({ id: doc.id }, doc.data()));
        });
        res.status(200).json({
            success: true,
            data: {
                jobs,
                subJobs,
                holidays,
                workPeriods
            }
        });
    }
    catch (error) {
        console.error("Error fetching public schedule:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
//# sourceMappingURL=getPublicTrainingSchedule.js.map