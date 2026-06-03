import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ========== HELPER: Timezone conversion constants ==========
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in milliseconds

/**
 * Normalizes any ISO or standard string date to Vietnam YYYY-MM-DD
 */
const normalizeDateString = (dateInput: string): string => {
    if (dateInput && dateInput.includes('T')) {
        const utcDate = new Date(dateInput);
        const vietnamDate = new Date(utcDate.getTime() + VIETNAM_OFFSET_MS);
        const year = vietnamDate.getUTCFullYear();
        const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateInput; // Already YYYY-MM-DD
};

/**
 * Trigger: Synchronizes role & employeeId to user_roles mapping whenever an employee is written
 */
export const onEmployeeWrite = functions.firestore
    .document("employees/{employeeId}")
    .onWrite(async (change, context) => {
        const employeeId = context.params.employeeId;

        // 1. Handle Deletion
        if (!change.after.exists) {
            const beforeData = change.before.data();
            if (beforeData && beforeData.email) {
                const emailKey = beforeData.email.toLowerCase().trim();
                await db.collection("user_roles").doc(emailKey).delete();
                console.log(`🗑️ Deleted user_role mapping for email: ${emailKey} (employeeId: ${employeeId})`);
            }
            return;
        }

        // 2. Handle Create / Update
        const data = change.after.data();
        if (!data || !data.email) {
            console.warn(`⚠️ Employee doc written without email field (employeeId: ${employeeId})`);
            return;
        }

        const emailKey = data.email.toLowerCase().trim();
        const role = data.role || "Nhân viên";

        // Store mapping in user_roles
        await db.collection("user_roles").doc(emailKey).set({
            role: role,
            employeeId: employeeId,
            email: data.email.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`🔄 Synced user_role for ${emailKey} -> employeeId: ${employeeId}, role: ${role}`);
    });

/**
 * Admin Callable Function: runDataMigration
 * Timeout: 540 seconds, Memory: 1GB
 * Standardizes dates containing 'T' and populates user_roles safely in sequential batches.
 */
export const runDataMigration = functions
    .runWith({
        timeoutSeconds: 540,
        memory: "1GB"
    })
    .https.onCall(async (data, context) => {
        // Enforce Super Admin authorization
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
        }
        const callerEmail = context.auth.token.email?.toLowerCase().trim();
        if (callerEmail !== 'khainguyendang@gmail.com') {
            throw new functions.https.HttpsError('permission-denied', 'Only the Super Admin is authorized to run database migration.');
        }

        console.log("🚀 Starting Database Migration v4.1.0...");
        
        // --- PHASE 1: Populate user_roles mapping ---
        console.log("Phase 1: Migrating employees -> user_roles...");
        const employeesSnap = await db.collection("employees").get();
        let userRolesCount = 0;
        let userRolesBatch = db.batch();
        let userRolesOpCount = 0;

        for (const doc of employeesSnap.docs) {
            const emp = doc.data();
            if (emp.email) {
                const emailKey = emp.email.toLowerCase().trim();
                const ref = db.collection("user_roles").doc(emailKey);
                
                userRolesBatch.set(ref, {
                    role: emp.role || "Nhân viên",
                    employeeId: doc.id,
                    email: emp.email.trim(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                userRolesCount++;
                userRolesOpCount++;

                if (userRolesOpCount >= 400) {
                    await userRolesBatch.commit();
                    userRolesBatch = db.batch();
                    userRolesOpCount = 0;
                }
            }
        }

        if (userRolesOpCount > 0) {
            await userRolesBatch.commit();
        }
        console.log(`✅ Successfully synced ${userRolesCount} employees to user_roles.`);

        // --- PHASE 2: Migrate dates in operational collections ---
        const collectionsToMigrate = ['schedule', 'leaves', 'allocations'];
        const migrationResults: Record<string, number> = {};

        for (const coll of collectionsToMigrate) {
            console.log(`Phase 2: Migrating dates in collection: ${coll}...`);
            const snap = await db.collection(coll).get();
            let migratedCount = 0;
            let batch = db.batch();
            let operationCount = 0;

            for (const doc of snap.docs) {
                const docData = doc.data();
                const rawDate = docData.date;

                // Idempotency: only process documents containing 'T' (ISO format)
                if (rawDate && typeof rawDate === 'string' && rawDate.includes('T')) {
                    const normalizedDate = normalizeDateString(rawDate);
                    batch.update(doc.ref, { date: normalizedDate });
                    migratedCount++;
                    operationCount++;

                    if (operationCount >= 400) {
                        await batch.commit();
                        batch = db.batch();
                        operationCount = 0;
                    }
                }
            }

            if (operationCount > 0) {
                await batch.commit();
            }
            migrationResults[coll] = migratedCount;
            console.log(`✅ Collection ${coll}: Migrated ${migratedCount} documents successfully.`);
        }

        return {
            success: true,
            message: "Migration completed successfully",
            userRolesSynced: userRolesCount,
            migrationResults
        };
    });
