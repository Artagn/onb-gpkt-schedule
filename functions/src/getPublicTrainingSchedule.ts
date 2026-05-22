import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Khởi tạo app nếu chưa có
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const getPublicTrainingSchedule = functions
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
            const jobs: any[] = [];
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
                
            const subJobs: any[] = [];
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
            const holidays: any[] = [];
            holidaysSnapshot.forEach(doc => {
                holidays.push({ id: doc.id, ...doc.data() });
            });

            const workPeriodsSnapshot = await db.collection('workPeriods').get();
            const workPeriods: any[] = [];
            workPeriodsSnapshot.forEach(doc => {
                workPeriods.push({ id: doc.id, ...doc.data() });
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
        } catch (error) {
            console.error("Error fetching public schedule:", error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
