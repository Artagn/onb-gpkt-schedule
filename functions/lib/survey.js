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
exports.batchSurveyShortLinks = void 0;
const functions = __importStar(require("firebase-functions"));
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ============================================================================
// Config: Google Form & TinyURL
// ============================================================================
const SURVEY_FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSdpIcZw7pdUF76LI7zkSI_Km1EzG4kfxxL2-xuHOeFtFt4xKA/viewform';
// Set via: firebase functions:secrets:set TINYURL_API_TOKEN
const tinyUrlApiToken = (0, params_1.defineSecret)('TINYURL_API_TOKEN');
/**
 * Normalize tên lớp thành Firestore-safe document ID
 * Ví dụ: "AMIS Kế toán" → "amis-ke-toan"
 */
function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
// ============================================================================
// batchSurveyShortLinks — Tạo/lấy link khảo sát rút gọn (Callable, yêu cầu auth)
// ============================================================================
exports.batchSurveyShortLinks = functions
    .runWith({ secrets: [tinyUrlApiToken] })
    .region('asia-southeast1')
    .https.onCall(async (data, context) => {
    var _a;
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Yêu cầu đăng nhập');
    }
    const { entries } = data;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Thiếu danh sách lớp');
    }
    // Giới hạn batch size để tránh abuse
    if (entries.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Tối đa 50 lớp mỗi lần');
    }
    const links = {};
    // 2. Xử lý từng entry
    for (const entry of entries) {
        const { className, date } = entry;
        if (!className || !date)
            continue;
        const cacheKey = `${date}_${normalizeName(className)}`;
        const lookupKey = `${className}|${date}`;
        // 2a. Check Firestore cache
        const cachedDoc = await db
            .collection('surveyShortLinks')
            .doc(cacheKey)
            .get();
        if (cachedDoc.exists) {
            links[lookupKey] = cachedDoc.data().shortUrl;
            continue;
        }
        // 2b. Build Google Form URL điền sẵn
        const fullUrl = `${SURVEY_FORM_BASE}?entry.1277919513=` +
            encodeURIComponent(className) +
            `&entry.613051653=${date}`;
        // 2c. Gọi TinyURL API rút gọn
        let shortUrl = fullUrl; // fallback link dài nếu API lỗi
        try {
            const response = await fetch('https://api.tinyurl.com/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tinyUrlApiToken.value()}`,
                },
                body: JSON.stringify({ url: fullUrl, domain: 'tinyurl.com' }),
            });
            const json = await response.json();
            if (response.ok && ((_a = json.data) === null || _a === void 0 ? void 0 : _a.tiny_url)) {
                shortUrl = json.data.tiny_url;
            }
        }
        catch (err) {
            console.error(`TinyURL API error for "${className}":`, err);
        }
        // 2d. Cache vào Firestore
        await db
            .collection('surveyShortLinks')
            .doc(cacheKey)
            .set({
            className,
            date,
            longUrl: fullUrl,
            shortUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        links[lookupKey] = shortUrl;
    }
    return { links };
});
//# sourceMappingURL=survey.js.map