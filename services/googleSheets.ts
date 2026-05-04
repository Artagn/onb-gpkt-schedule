import * as jose from 'jose';
import { Employee, Job, EmployeeRank, JobGroup, Role, Status, TimeFrame } from '../types';

// CREDENTIALS
const SPREADSHEET_ID = '1NpZYVdQAhg1X7gpLaoRV-c1F0P5qusFnS5V-fq47F2Q';
const CLIENT_EMAIL = 'onb-schedule-service@onb-schedule.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDm8VYsPmXhutbc
ixyNWcHeTFHMZfx7MpP4gzpOx+ci08eTjmjbM1MiX6mzuDhGSd/4AR5Hp/AQBxjZ
1Af/8pk7gTy8aQw/LScbwzPHSIjPxF3RRiAaUvddEOaEK9f2ryqZZubTmFerG+h8
T1I6dlWmZ7SsWG98N01CopuroZNTyACe2Q0Tqao2u7oXCxhCcAOM257rkapXEeMr
K6kDZalQLMxWRPwLaTIpKmhLfyoSriZ3ZeA/SF9Jm5MJevUiB9gLX7JkyaTofH/k
od8bI9EYOm/Z+cBFSEl8jyOEPiKnBRaqtnBZ3hVUg14A3/3e68AR0LvVN7xKiHnQ
HaWSei/VAgMBAAECggEAAbeznR51WgWDzGicH1YBTzKwnLf5IH5wDiCwZJPFMuOx
1TWxhHMq2rOCRYP+JnxYANYbSvZOCVnQKWs+XaeI1GHh7oHL1ZrI8sJ+e6yHrfSR
1mOyi0I+NOWSXVMefFHHBpSMF3Cc3aOBFLmZ94rX7hCmje3rcwL4nWFXDeKkqp0W
Jcsh7gYUsqLMzf/OcHYZWEs/LaXfoZnBEUmuz3YcreFkvgYOqlQadinQn5AAjzWC
Nn+qoGpZGxSF4P2yWc9t8woo0+DnLSR7kyB1cPmIbAremC9C5VaCdRw68lygKOE6
xTazI2Uw2PWZZnuh25e5a7q5QSDX6LGdnRL0e6jNmQKBgQD/IXai/1hojI1+8ORD
n203Yu96u9qQyfucGam0ZvFpXlaaCevl9fG8m5djOmmkbDeBCQyaZv9P/jn8XFLk
mufWvu50Kfr6LkZBAle9NWLoBLvL8uvVAIY9JW/Ca7EbGee3Wnm35O5/gL4FKhJV
H8SeOKeihYcTznOva7sQMj55eQKBgQDnusZ7gSnK5TmZIx36WwkzsBx52io9D4hW
MKudb867dl9NK+77Ae+rVdfvd0K23bT4Jiaca0Wtr3SEl8IJWKCXQ7gV/J90vMEj
pXpfeG8pdpuWLLi0MytJa+bB0ab5BHDvNY3mlRBfFPg8TYd+strLH8UvRewTZAof
8mBz4H+uPQKBgEDzF+yu7KbRAUSLttCwSXGMMkMgh6fMg81diyJuAo88gPd+Bxvn
3L6TLZsJR9Of6RFkaFz2U5Ddu41PQ5sHBHZa7QGNnmMKXMA4BHYanS9L5TMqiHcV
RxdR7H2mRNQNaDv5QHtcQIsdD0LpTvl0uO0+pw5sx9J3AGRsHJcm81ihAoGAdohY
jMZGDW3xZ37KD8zPSSw1dLL+1hsC3yuoLTEK62MiXoQxix2zbc3MVcaITqfbsO86
4toQW0abcFN8QnGeO6G9ISoGmp0OomA712fwXKI59bhMhoiCBN13vP6zzT7TUdjw
C9mF9UzxqU7zFwD/39URdRvsJQMQFsVRRxS32vUCgYANrDRXdq4JcfggcjuGgUn/
QCDCjWOospgtT01L9UR07JCBCqxwt4L2P1GUQedHSXkMvMaWCKDrX/WoUEAu79tA
UZxNmw1RU8Jr2d+eVr8pdjBWbpWCnzmTxjyI3TkeOLn06MOf7j3Ez22LuJnttE5D
RNlUs+pfyjRycw7suAuiNg==
-----END PRIVATE KEY-----`;

async function getAccessToken(): Promise<string> {
    try {
        const alg = 'RS256';
        const pkcs8 = PRIVATE_KEY;
        const privateKey = await jose.importPKCS8(pkcs8, alg);

        const jwt = await new jose.SignJWT({
            scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        })
            .setProtectedHeader({ alg, typ: 'JWT' })
            .setIssuer(CLIENT_EMAIL)
            .setSubject(CLIENT_EMAIL)
            .setAudience('https://oauth2.googleapis.com/token')
            .setExpirationTime('1h')
            .setIssuedAt()
            .sign(privateKey);

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token Auth Failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error: any) {
        console.error("Service Account Auth Error:", error);
        throw new Error("Không thể xác thực Service Account (Có thể do trình duyệt chặn CORS). Vui lòng sử dụng Backend hoặc chế độ Công khai.");
    }
}

// Fallback: Fetch from Public Sheet (Anyone with the link can view)
async function fetchPublicSheetData(sheetName: string, query: string = 'SELECT *'): Promise<any[][]> {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Public Sheet Fetch Failed: ${response.status}`);
    }

    const text = await response.text();
    // Remove "/*O_o*/" and "google.visualization.Query.setResponse(" wrapper
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const json = JSON.parse(jsonString);

    if (json.status !== 'ok') {
        throw new Error(`Sheet Query Error: ${json.errors?.[0]?.message}`);
    }

    // Convert cols/rows to simple array of arrays
    // Gviz structure: { table: { cols: [...], rows: [{ c: [{v: val}, ...] }] } }
    return json.table.rows.map((row: any) => {
        return row.c.map((cell: any) => cell ? cell.v : null);
    });
}

export async function fetchSheetData(): Promise<{ employees: Employee[], jobs: Job[], method: 'private' | 'public' }> {
    try {
        // Try Service Account First
        const accessToken = await getAccessToken();

        // 1. Fetch Employees
        const empResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Danh sách nhân viên!A2:G`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const empData = await empResponse.json();

        // 2. Fetch Jobs
        const jobResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Danh sách Công việc!A2:G`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const jobData = await jobResponse.json();

        // 3. Fetch KPI (Assume sheet name 'KPI' or 'Bảng KPI')
        // Try fetching 'Bảng KPI' first, if fails maybe handle error, but let's assume strict naming
        let kpiRows: any[][] = [];
        try {
            const kpiResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Bảng KPI!A2:D`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const kpiData = await kpiResponse.json();
            kpiRows = kpiData.values || [];
        } catch (e) { console.warn("Could not fetch KPI sheet via private API"); }

        return {
            employees: mapEmployees(empData.values || [], kpiRows),
            jobs: mapJobs(jobData.values || []),
            method: 'private'
        };

    } catch (error: any) {
        console.warn("Service Account failed, trying Public Access...", error);

        try {
            // Try Public Access (GVIZ)
            const empRows = await fetchPublicSheetData('Danh sách nhân viên');
            const jobRows = await fetchPublicSheetData('Danh sách Công việc');

            let kpiRows: any[][] = [];
            try {
                kpiRows = await fetchPublicSheetData('Bảng KPI'); // Or whatever the KPI sheet is named
            } catch (e) { console.warn("KPI sheet not found public"); }

            return {
                employees: mapEmployees(empRows.slice(0), kpiRows),
                jobs: mapJobs(jobRows.slice(0)),
                method: 'public'
            };

        } catch (publicError: any) {
            console.error("Public Access failed:", publicError);
            throw new Error(`Đồng bộ thất bại. \n1. Service Account: ${error.message}. \n2. Public Link: Vui lòng chia sẻ Sheet ở chế độ 'Bất kỳ ai có liên kết' để test trên trình duyệt.`);
        }
    }
}

// Updated Mapping based on User's Data Structure
// Sheet 1: Họ và Tên | Email | Phân hạng | Nhóm việc | Khung thời gian | Vai trò | Tình trạng
function mapEmployees(rows: any[][], kpiRows: any[][]): Employee[] {
    // Create KPI Map: Email -> KPI Score
    const kpiMap = new Map<string, number>();
    kpiRows.forEach(row => {
        if (row[0] && row[1]) kpiMap.set(String(row[0]).trim(), parseInt(row[1]));
    });

    return rows.map((row, index) => {
        const email = String(row[1] || '');
        return {
            id: `sheet-${index}`,
            stt: index + 1,
            fullName: String(row[0] || 'Unknown'),
            email: email,
            rank: (row[2] as EmployeeRank) || EmployeeRank.None,
            jobGroups: parseEnumArray<JobGroup>(String(row[3] || ''), Object.values(JobGroup)),
            timeFrames: parseEnumArray<TimeFrame>(String(row[4] || ''), Object.values(TimeFrame)),
            role: (row[5] as Role) || Role.Staff,
            status: (row[6] as Status) || Status.Inactive,
            kpiStandard: kpiMap.get(email.trim()) || 100, // Merge KPI
            weeklyScore: 0,
            monthlyScore: 0
        };
    }).filter(e => e.fullName !== 'Unknown' && e.fullName !== 'Họ và Tên');
}

// Sheet 2: Tên công việc | Nhóm | Phân loại | Điểm chuẩn | Thời lượng (phút) | Độ khó | Trạng thái
function mapJobs(rows: any[][]): Job[] {
    return rows.map((row, index) => {
        const isActiveStr = String(row[6] || '');
        const isActive = isActiveStr === 'Đang sử dụng' || isActiveStr === 'Active';

        return {
            id: `sheet-job-${index}`,
            name: String(row[0] || 'Unnamed Job'),
            group: (row[1] as JobGroup) || JobGroup.Other,
            classification: row[2] as any,
            standardPoint: parseFloat(String(row[3]).replace(',', '.')) || 0, // Handle 1,5 -> 1.5
            durationMinutes: parseInt(row[4]) || 0,
            difficulty: parseFloat(row[5]) || 1,
            isActive: isActive
        };
    }).filter(j => j.name !== 'Unnamed Job' && j.name !== 'Tên công việc');
}

function parseEnumArray<T>(value: string, validValues: string[]): T[] {
    if (!value) return [];
    return value.split(',')
        .map(s => s.trim())
        .filter(s => validValues.includes(s)) as any as T[];
}