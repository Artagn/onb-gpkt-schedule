import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// Config: Google Form & TinyURL
// ============================================================================
const SURVEY_FORM_BASE =
  'https://docs.google.com/forms/d/e/1FAIpQLSdpIcZw7pdUF76LI7zkSI_Km1EzG4kfxxL2-xuHOeFtFt4xKA/viewform';

// Set via: firebase functions:secrets:set TINYURL_API_TOKEN
const tinyUrlApiToken = defineSecret('TINYURL_API_TOKEN');

/**
 * Normalize tên lớp thành Firestore-safe document ID
 * Ví dụ: "AMIS Kế toán" → "amis-ke-toan"
 */
function normalizeName(name: string): string {
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
export const batchSurveyShortLinks = functions
  .runWith({ secrets: [tinyUrlApiToken] })
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Yêu cầu đăng nhập'
      );
    }

    const { entries } = data as {
      entries: Array<{ className: string; date: string }>;
    };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Thiếu danh sách lớp'
      );
    }

    // Giới hạn batch size để tránh abuse
    if (entries.length > 50) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Tối đa 50 lớp mỗi lần'
      );
    }

    const links: Record<string, string> = {};

    // 2. Xử lý từng entry
    for (const entry of entries) {
      const { className, date } = entry;
      if (!className || !date) continue;

      const cacheKey = `${date}_${normalizeName(className)}`;
      const lookupKey = `${className}|${date}`;

      // 2a. Check Firestore cache
      const cachedDoc = await db
        .collection('surveyShortLinks')
        .doc(cacheKey)
        .get();

      if (cachedDoc.exists) {
        links[lookupKey] = cachedDoc.data()!.shortUrl;
        continue;
      }

      // 2b. Build Google Form URL điền sẵn
      const fullUrl =
        `${SURVEY_FORM_BASE}?entry.1277919513=` +
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
        if (response.ok && json.data?.tiny_url) {
          shortUrl = json.data.tiny_url;
        }
      } catch (err) {
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
