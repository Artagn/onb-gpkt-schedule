# CODE_EXAMPLES.md - Reference Patterns

## 1. DATA ACCESS PATTERN (v3.0 - TanStack Query)

Instead of manually subscribing in useEffect, use the custom Query Hooks.

### Reading Data
```typescript
// Any Component
import { useSchedulesQuery } from '../hooks/queries/useSchedulesQuery';

const MyComponent = () => {
    const { data: schedule, isLoading, error } = useSchedulesQuery();

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            {schedule?.map(item => <div key={item.id}>{item.date}</div>)}
        </div>
    );
};
```

### Writing Data (Optimistic UI)
Use the mutation hooks. They handle invalidation and optimistic updates automatically.

```typescript
import { useScheduleMutations } from '../hooks/queries/useSchedulesQuery';

const TaskManager = () => {
    const { update, remove } = useScheduleMutations();

    const handleComplete = (item: ScheduleItem) => {
        // Just call the mutation. 
        // UI updates INSTANTLY thanks to onMutate logic in the hook.
        update.mutate({ ...item, status: 'Completed' });
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Sure?")) {
            remove.mutate(id);
        }
    };
}
```

### Legacy Context Access
For components that haven't been migrated to hooks yet, you can still use `useData` but setters are deprecated.

```typescript
import { useData } from '../context/DataContext';

const LegacyComp = () => {
    // Data is still fresh (proxied from Query cache)
    const { employees } = useData(); 
    
    // ❌ SETTERS ARE DEPRECATED
    // const { setEmployees } = useData(); // Do NOT use this.
}
```

### Configuration Data (WorkPeriods & Holidays)
Use the dedicated hooks for configuration data as well.

```typescript
import { useWorkPeriodsQuery, useWorkPeriodMutations } from '../hooks/useWorkPeriodsQuery';

const PeriodConfig = () => {
   const { data: periods } = useWorkPeriodsQuery();
   const { save } = useWorkPeriodMutations();

   const handleAdd = (period: WorkPeriod) => {
       save.mutate(period);
   };
}
```

---

## 2. NAVIGATION PATTERN (v2.3 - React Router)

### Legacy (Tabs) vs New (Routes)

**OLD (Do Not Use):**
```typescript
// ❌ Don't use state for main pages
const [currentTab, setCurrentTab] = useState('dashboard');
```

**NEW (Use Router):**
```typescript
// ✅ Use Link or useNavigate
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../routes';

const MyButton = () => {
    const navigate = useNavigate();
    
    return (
        <button onClick={() => navigate(ROUTES.REPORTS)}>
            Go to Reports
        </button>
    );
}
```

---

## 3. RBAC IMPLEMENTATION PATTERN

### Adding RBAC to a Component

```typescript
// 1. Import Role type
import { Role } from '../types';

// 2. Add prop to interface (or get from User Context if available)
interface Props {
    currentUserRole: Role;
}

// 3. Accept in component
const MyComponent: React.FC<Props> = ({ currentUserRole }) => {
    
    // 4. Create permission check
    const canEdit = currentUserRole === Role.Admin || currentUserRole === Role.Coordinator;
    
    // 5. Use in UI
    return (
        <div>
            {canEdit && <button onClick={handleEdit}>Edit</button>}
            
            {!canEdit && (
                <div className="text-sm text-yellow-600">
                    🔒 Chế độ Xem. Chỉ Điều phối viên mới có thể chỉnh sửa.
                </div>
            )}
        </div>
    );
};
```

---

## 4. EXCEL EXPORT PATTERN

### Using `excelExportService`

```typescript
import { exportWeeklySchedule } from '../services/excelExportService';

const handleExport = () => {
    exportWeeklySchedule(
        schedule, 
        jobs, 
        employees, 
        new Date(fromDate) // Start date
    );
};
```

---

## 5. SERVICE LAYER PATTERN (Refactored v1.8)

### Mutation (Write)
```typescript
const handleAddJob = async (job: Job) => {
    try {
        await jobsService.add(job);
        toast.success("Thêm thành công");
    } catch (error) {
        // v2.1: Check for Quota Exceeded (Daily Limit)
        if ((error as Error).message.includes("QUOTA_EXCEEDED")) {
             toast.error("Đã hết hạn ngạch miễn phí hôm nay!");
        } else {
             toast.error("Lỗi: " + (error as Error).message);
        }
    }
}
```

---

## 6. AUDIT LOGGING

```typescript
import { auditService } from '../services/firestoreService';

// Log critical actions
auditService.log(
    'SCHEDULE_UPDATE', 
    'ScheduleItem', 
    itemId, 
    { diff: 'Change shift Morning -> Evening' }, 
    currentUserEmail || 'System' // Always provide an actor
);
```

---

## 7. SECURITY PATTERN (v2.5)

### Login Restriction (App.tsx)
Prevent access for unknown or deactivated users.

```typescript
useEffect(() => {
    // Only run when data is fully loaded to prevent false positives
    if (user && dataLoaded && employees.length > 0) {
        const emp = employees.find(e => e.email.toLowerCase() === user.email?.toLowerCase());

        // 1. Not Found Check
        if (!emp) {
            toast.error("Truy cập bị từ chối! Email không tồn tại.");
            signOut(auth);
            return;
        }

        // 2. Status Check
        if (emp.status === Status.Deactivated) {
            toast.error("Tài khoản đã bị DỪNG KÍCH HOẠT.");
            signOut(auth);
        }
    }
}, [user, dataLoaded, employees]);
```

---

## 8. GROUPING LOGIC PATTERN (Daily View)

### Composite Key Grouping
When grouping generic items (SubJobs) that need to be merged by specific criteria (e.g. same name & product).

```typescript
// Create a unique key for grouping
const key = `${classification}|${sub.product}|${sub.jobId}|${sub.name}`;

if (!grouped.has(key)) grouped.set(key, []);
grouped.get(key)!.push(sub);

// Process groups later
grouped.forEach((subs, key) => {
    // Merge logic: Earliest Start, Latest End
    // ...
});
```

## 10. COMPLEX TRANSACTION PATTERN (Smart Swap)

### Multi-Document Atomic Update
When an action requires updating multiple documents (e.g. Request Status, User A Schedule, User B Schedule) AND potentially cascading changes (Morning Shift), use `writeBatch`.

```typescript
// IN: services/swapService.ts

async function executeSwap(request: SwapRequest) {
    const batch = writeBatch(db);
    
    // 1. Update Request Status
    const requestRef = doc(db, 'swapRequests', request.id);
    batch.update(requestRef, { status: 'Approved' });

    // 2. Fetch A & B Schedules (simplified for example)
    // ... [Fetch logic] ...

    // 3. Swap A -> B
    const newIdsA = itemA.employeeIds.filter(id => id !== request.requesterId);
    newIdsA.push(request.targetId);
    batch.update(doc(db, 'schedule', itemA.id), { employeeIds: newIdsA });

    // 4. Swap B -> A (if B exists)
    if (itemB) {
        const newIdsB = itemB.employeeIds.filter(id => id !== request.targetId);
        newIdsB.push(request.requesterId);
        batch.update(doc(db, 'schedule', itemB.id), { employeeIds: newIdsB });
    }

    // 5. Special Logic: If Evening Shift, perform cascading swap for Next Morning
    if (request.requestShift === 'Tối') {
         // ... [Find next day items] ...
         // ... [Swap next day items in same batch] ...
    }

    await batch.commit(); // Atomic commit
}
```

---

## 11. BATCH OPERATIONS PATTERN (Admin Tools)
 
### Query & Delete
For admin tools needing complex filtering and safe deletion.
 
```typescript
// IN: services/cleanupService.ts
 
// 1. Complex Query
const q = query(collection(db, 'schedule'), 
    where('date', '>=', fromDate),
    where('date', '<=', toDate)
);
const snap = await getDocs(q);
 
// 2. Client-side Filter (for flexibility)
const filtered = snap.docs.filter(d => 
    d.data().status.includes(keyword) // flexible search
);
 
// 3. Batch Delete
const batch = writeBatch(db);
filtered.forEach(doc => batch.delete(doc.ref));
 
// 4. Audit the Batch
const auditRef = doc(collection(db, 'audits'));
batch.set(auditRef, { 
    action: 'BATCH_DELETE', 
    count: filtered.length 
});
 
await batch.commit();
```
 
---
 
*End of Examples*

---

## 9. DATE LOGIC PATTERN (Timezone Safety)

### Filtering by Date Range (Local Time)
When filtering data by a date picker value (yyyy-mm-dd), ALWAYS construct full day boundaries to ensure timezone (GMT+7) doesn't shift the timestamp to the previous day in UTC.

**BAD (Do Not Use):**
```typescript
// ❌ Creates UTC Midnight (e.g. 7 AM Local) or Local Midnight -> UTC previous day
new Date(fromDate) 
```

**GOOD (Use This):**
```typescript
// ✅ Explicitly set boundaries
const filterStart = new Date(fromDate + 'T00:00:00');
const filterEnd = new Date(toDate + 'T23:59:59');

// Use date-fns for comparison
if (!isWithinInterval(itemDate, { start: filterStart, end: filterEnd })) return;
```

---

## 9. DEPRECATED / HIDDEN PATTERNS

### 9.1 Chatbot Restoration (Hidden v2.6.0)

If we need to restore the AI Chatbot, re-create `components/ChatBot/ChatWidget.tsx`:

```tsx
import React, { useState } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions'; // Import functions
import { functions } from '../../services/firebaseConfig'; // Import initialized functions
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{sender: 'user' | 'bot', text: string}[]>([
        { sender: 'bot', text: 'Xin chào! Tôi có thể giúp gì về lịch làm việc tuần này?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = { sender: 'user' as const, text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Call Backend Function (askSchedulerBotV2)
            const askBot = httpsCallable(functions, 'askSchedulerBotV2');
            const result: any = await askBot({ question: userMsg.text });
            
            setMessages(prev => [...prev, { sender: 'bot', text: result.data.answer }]);
        } catch (error) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Lỗi kết nối Server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Minimal Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-80 md:w-96 flex flex-col border border-gray-200" style={{height: '500px'}}>
                    {/* Header */}
                    <div className="bg-blue-600 p-4 rounded-t-lg flex justify-between items-center text-white">
                        <div className="font-bold flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" /> Trợ lý Lịch ONB
                        </div>
                        <button onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                m.sender === 'user' 
                                    ? 'bg-blue-100 text-blue-900 self-end rounded-br-none' 
                                    : 'bg-white border self-start rounded-bl-none shadow-sm markdown-content'
                            }`}>
                                {m.sender === 'bot' ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {m.text}
                                    </ReactMarkdown>
                                ) : (
                                    m.text
                                )}
                            </div>
                        ))}
                        {isLoading && <div className="text-xs text-gray-500 italic ml-2">Đang suy nghĩ...</div>}
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-white rounded-b-lg flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Hỏi về lịch làm việc..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading}
                            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

## 12. CHATBOT IDENTITY MAP PATTERN (Backend)

### Mapping Auth Email to Employee Name
In Cloud Functions, we often have the `userEmail` from Context Auth, but need the `DisplayName` for natural conversation.

```typescript
// IN: functions/src/askSchedulerBotV2.ts

const employeesSnap = await db.collection("employees").get();
const empMap: Record<string, string> = {};
let currentUserName = userEmail; // Default fallback

employeesSnap.forEach(doc => {
    const d = doc.data();
    const name = d.fullName || d.name || d.displayName || doc.id;
    empMap[doc.id] = name; // Map ID -> Name

    // Logic: Find the name of the CURRENT USER
    if (d.email === userEmail || d.gmail === userEmail) {
        currentUserName = name;
    }
});

// Use in System Prompt
const buildSystemPrompt = (userName: string, ...) => `
    Bạn đang nói chuyện với: ${userName}.
    Khi tìm lịch của "tôi", hãy tìm theo tên "${userName}".
`;
```

---

## 13. MULTI-SELECT FILTER PATTERN

### Filtering by Array Inclusion
When you need to filter a list where an item field (e.g., `jobId`) must match **ANY** value in a selected array (e.g., `["Id1", "Id2"]`).

```typescript
// State
const [selectedJobs, setSelectedJobs] = useState<string[]>([]); // Empty = All

// Logic
const filteredItems = items.filter(item => {
    // 1. If filter is empty, return true (Pass all)
    if (selectedJobs.length === 0) return true;
    
    // 2. Check inclusion
    return selectedJobs.includes(item.jobId);
});
```

---

## 14. SUPER ADMIN BYPASS PATTERN (Emergency)

### Hardcoded Override
In scenarios where database connectivity is flaky or data is corrupted, you need a way to ensure Admin access for maintenance.

```typescript
// IN: App.tsx or DataContext.tsx

const SUPER_ADMINS = ['khainguyendang@gmail.com'];

// ... inside logic ...
const isSuperAdmin = user?.email && SUPER_ADMINS.includes(user.email);

// Priority Check: Super Admin > DB Role
const role = isSuperAdmin ? Role.Admin : (employee?.role || Role.Staff);
```

---

## 15. FIREBASE CACHE CONTROL PATTERN (Deployment)



### 15.1 firebase.json Configuration (Strict)
To prevent users from being stuck on old versions (Sticky Cache), configure `firebase.json` to disable caching for the entry point (`index.html`) and service worker.

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.@(html|json)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

### 15.2 Safe Deploy Script (package.json)
Prevents deploying old artifacts by accident.

```json
"scripts": {
  "deploy": "npm run build && firebase deploy --only hosting"
}
```

### 15.3 PWA Versioning (vite.config.ts)
To force all clients to update the Service Worker immediately, **increment the version** in the manifest description.

```typescript
manifest: {
  // ...
  description: 'App Description v3.1.18', // Change this number!
  // ...
}
```

*End of Examples*

## 16. CODE SPLITTING PATTERN (v3.2.0)

### Lazy Loading Routes
To reduce initial bundle size, import heavy page components using `React.lazy`.

```typescript
// App.tsx
import React, { Suspense } from 'react';
import { LoadingSpinner } from './components/UI';

// 1. Lazy Import
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));

// 2. Wrap in Suspense
<Route 
    path="/admin" 
    element={
        <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
        </Suspense>
    } 
/>
```

---

## 17. STRICT TYPING PATTERN (Service Layer)

### Typed Collection Service
Avoid `any`. Use generic helpers with Zod validation.

```typescript
// services/firestoreService.ts

// 1. Define Schema & Type
const AuditLogSchema = z.object({
    id: z.string(),
    action: z.string(),
    timestamp: z.string()
});
type AuditLog = z.infer<typeof AuditLogSchema>;

// 2. Create Service
export const auditService = {
    // Return typed Promise<AuditLog[]>
    getAll: async (): Promise<AuditLog[]> => {
        return loadCollection<AuditLog>(COLLECTIONS.AUDITS, AuditLogSchema);
    },
    
    // Accept typed input
    log: async (entry: Omit<AuditLog, 'id'>) => {
        // ...
    }
};
```

---

## 18. LEAVE BALANCE PATTERN (v3.3.0)

### 18.1 Fetching Balance & History
Use dedicated hooks for balance data. They handle WorkPeriod and Holiday eligibility automatically.

```typescript
// Reading Balance
import { useLeaveBalanceQuery } from '../hooks/useLeaveBalanceQuery';

const BalanceDisplay = ({ employeeId }) => {
    const { data: balance, isLoading } = useLeaveBalanceQuery(employeeId);
    
    return (
        <div>
            Khả dụng: {balance?.compLeaveAvailable || 0}
            Đã dùng: {balance?.compLeaveUsed || 0}
        </div>
    );
};
```

```typescript
// Reading History (all T7/CN/Holiday work)
import { useLeaveBalanceHistory } from '../hooks/useLeaveBalanceHistory';

const HistoryList = ({ employeeId }) => {
    const { data: items } = useLeaveBalanceHistory(employeeId);
    
    // items contains: { date, shift, jobId, isHoliday, isWeekend }
    // Only eligible items are returned (already filtered)
    return items?.map(item => <div>{item.date} - {item.shift}</div>);
};
```

### 18.2 Toggle Status with Cache Invalidation
When toggling schedule status (Complete/Pending), invalidate related queries for instant UI update.

```typescript
import { LEAVE_BALANCE_KEYS } from '../hooks/useLeaveBalanceQuery';
import { LEAVE_BALANCE_HISTORY_KEYS } from '../hooks/useLeaveBalanceHistory';

const toggleStatus = async (itemId: string) => {
    const item = schedule.find(s => s.id === itemId);
    const newStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    
    await scheduleService.save({ ...item, status: newStatus });
    
    // 1. Invalidate schedule
    queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    
    // 2. Invalidate balance for all assigned employees (Cloud Function will update)
    item.employeeIds.forEach(empId => {
        queryClient.invalidateQueries({ queryKey: LEAVE_BALANCE_KEYS.byEmployee(empId) });
        queryClient.invalidateQueries({ queryKey: LEAVE_BALANCE_HISTORY_KEYS.byEmployee(empId) });
    });
};
```

### 18.3 Eligibility Logic (Cloud Function)
Balance is tracked server-side via `onScheduleUpdate` trigger. Logic:

```typescript
// Eligibility Check Order:
// 1. Is Holiday? → Check 'holidays' collection → TRUE if match
// 2. Is Weekend (T7/CN)? → Check 'workPeriods' config
//    - Find period by date range
//    - Check if shift is in standard config
//    - TRUE if shift NOT in config (overtime)
```

*End of Examples*

---

## 19. CLOUD FUNCTION TIMEZONE PATTERN (v3.4.7)

### 19.1 Problem: UTC vs Vietnam Time
Cloud Functions run in **UTC timezone**. When Firestore stores dates as ISO strings (e.g., `"2026-01-04T17:00:00.000Z"`), JavaScript's `new Date()` interprets this as **Jan 4, 17:00 UTC**.

However, in Vietnam (UTC+7), this timestamp is actually **Jan 5, 00:00** - a completely different day!

**Impact:** `getDay()` returns wrong day-of-week, causing weekday work to be misclassified as weekend.

### 19.2 Solution: Add Vietnam Offset Before Date Operations

```typescript
// IN: functions/src/recalculateBalances.ts (or any Cloud Function)

// Define constant offset
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in milliseconds

/**
 * Normalize ISO date string to YYYY-MM-DD in Vietnam timezone
 * Input: "2026-01-09T17:00:00.000Z" (UTC 17:00 = VN 00:00 next day)
 * Output: "2026-01-10" (correct Vietnam date)
 */
const normalizeDateString = (dateInput: string): string => {
    if (dateInput.includes('T')) {
        // ISO format with time - convert to Vietnam timezone
        const utcDate = new Date(dateInput);
        const vietnamDate = new Date(utcDate.getTime() + VIETNAM_OFFSET_MS);
        const year = vietnamDate.getUTCFullYear();
        const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateInput; // Already in YYYY-MM-DD format
};

/**
 * Get dayOfWeek (0=Sun, 6=Sat) from YYYY-MM-DD string
 * Uses Date.UTC() to ensure consistent results regardless of server timezone
 */
const getDayOfWeek = (dateStr: string): number => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCDay();
};

// Usage
const rawDate = scheduleData.date; // "2026-01-09T17:00:00.000Z"
const normalizedDate = normalizeDateString(rawDate); // "2026-01-10"
const dayOfWeek = getDayOfWeek(normalizedDate); // 6 (Saturday) - CORRECT!
```

### 19.3 Auto-Invalidate Related Queries After Mutation

When a mutation triggers a Cloud Function that updates related data (e.g., approving leave updates balance), use a timeout to refetch the updated data.

```typescript
// IN: hooks/useLeavesQuery.ts

const update = useMutation({
    mutationFn: (item: LeaveRequest) => leavesService.save(item),
    onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        
        // Cloud Function needs time to process
        if (variables.status === 'Approved') {
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['leave_balance'] });
            }, 1500); // 1.5s delay for Cloud Function execution
        }
    }
});

---

## 20. EVALUATION APPROVE/REJECT PATTERN (v3.9.7)

### 20.1 Service Functions
```typescript
// IN: services/evaluationService.ts

export const evaluationsService = {
    // Approve evaluation
    approve: async (id: string, approvedBy: string): Promise<void> => {
        const ref = doc(db, COLLECTIONS.EVALUATIONS, id);
        await updateDoc(ref, {
            status: 'approved',
            approvedBy,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    },

    // Reject with mandatory reason
    reject: async (id: string, reason: string): Promise<void> => {
        if (!reason.trim()) throw new Error('Lý do từ chối là bắt buộc');
        const ref = doc(db, COLLECTIONS.EVALUATIONS, id);
        await updateDoc(ref, {
            status: 'rejected',
            notes: reason,
            updatedAt: new Date().toISOString()
        });
    },

    // Bulk approve
    bulkApprove: async (ids: string[], approvedBy: string): Promise<void> => {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        ids.forEach(id => {
            const ref = doc(db, COLLECTIONS.EVALUATIONS, id);
            batch.update(ref, {
                status: 'approved',
                approvedBy,
                approvedAt: now,
                updatedAt: now
            });
        });
        await batch.commit();
    }
};
```

### 20.2 ReadOnly Props for Review Mode
When displaying evaluation forms in a review drawer, pass `readOnly=true` to disable inputs:

```typescript
// ReviewManager.tsx - Detail Drawer
<Sheet open={!!selectedEval} onClose={() => setSelectedEval(null)}>
    {selectedEval?.evaluationGroup === 'ONB_DT' ? (
        <EmployeeFormDT 
            readOnly={true}
            employeeId={selectedEval.employeeId}
            periodId={selectedEval.periodId}
        />
    ) : (
        <EmployeeFormKS readOnly={true} />
    )}
</Sheet>
```

```typescript
// EmployeeFormDT.tsx - Props interface
interface Props {
    readOnly?: boolean;
    employeeId?: string;
    periodId?: string;
}

// Usage in component
const isEditable = !readOnly && existingEval?.status !== 'approved';

{isEditable && (
    <button onClick={handleSubmit}>Gửi đánh giá</button>
)}
```

### 20.3 Top Performer Calculation
```typescript
// IN: EmployeeFormDT.tsx or EmployeeFormKS.tsx

const topPerformer = useMemo(() => {
    // Only approved evaluations (across ALL groups)
    const approvedEvals = allEvaluations.filter(e => e.status === 'approved');
    if (approvedEvals.length === 0) return null;

    // Find the one with highest overallRate
    let best = approvedEvals[0];
    approvedEvals.forEach(evaluation => {
        if ((evaluation.summary?.overallRate || 0) > (best.summary?.overallRate || 0)) {
            best = evaluation;
        }
    });

    const employee = employees.find(e => e.id === best.employeeId);
    return {
        name: employee?.fullName || 'Unknown',
        rate: best.summary?.overallRate || 0,
        result: best.summary?.result || '-',
        group: best.evaluationGroup === 'ONB_DT' ? 'Chuyển giao' : 'Kiểm soát'
    };
}, [allEvaluations, employees]);

// Use in JSX
{topPerformer && (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        🏆 Top: {topPerformer.name} [{topPerformer.group}] {topPerformer.rate.toFixed(1)}%
    </div>
)}
```

### 20.4 Bulk Selection Pattern
```typescript
// State
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Toggle single
const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
};

// Toggle all
const toggleAll = () => {
    if (selectedIds.size === items.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(items.map(i => i.id)));
    }
};

// Bulk action
const handleBulkApprove = async () => {
    await evaluationsService.bulkApprove([...selectedIds], currentUser.email);
    setSelectedIds(new Set()); // Clear selection
    queryClient.invalidateQueries({ queryKey: EVALUATION_KEYS.all });
};
```

### 20.5 Dynamic Metrics with DB Fallback (v3.9.8)
When rendering tables/forms that need configurable metrics from DB, use this pattern:

```typescript
// IN: WorkPointsTable.tsx

// 1. Define fallback defaults (backward compatibility)
const DEFAULT_CRM_METRICS = [
    { id: 'the_tu_hoc', name: 'Thẻ Tự học', defaultPoints: 0.3 },
    { id: 'the_cddl', name: 'Thẻ CĐDL', defaultPoints: 0.5 },
    // ...
];

// 2. Query metrics from DB
const { data: allMetrics = [] } = useEvaluationMetricsQuery();

// 3. Group by category with fallback
const crmMetricsDef = useMemo(() => {
    const fromDb = allMetrics
        .filter(m => m.category === 'crm_card' && m.isActive)
        .sort((a, b) => a.order - b.order);
    
    if (fromDb.length > 0) {
        return fromDb.map(m => ({ 
            id: m.id, 
            name: m.name, 
            points: m.defaultPoints 
        }));
    }
    // Fallback if DB is empty
    return DEFAULT_CRM_METRICS.map(m => ({ 
        id: m.id, 
        name: m.name, 
        points: m.defaultPoints 
    }));
}, [allMetrics]);

// 4. Use in render
{crmMetricsDef.map(m => (
    <th key={m.id} title={`${m.points} đ/thẻ`}>{m.name}</th>
))}

// 5. Use in calculations
const totalPoints = crmMetricsDef.reduce(
    (sum, m) => sum + (rowData[m.id]?.points || 0), 
    0
);
```

**Benefits:**
- Admin can add/edit/delete metrics in MetricManager → Table updates automatically
- Backward compatible if `evaluation_metrics` collection is empty
- Metrics sorted by `order` field for consistent display

---

## 21. HOLIDAY-AWARE SCHEDULER PATTERN (v3.9.11)

### 21.1 isWorkDay() Helper
Before generating schedule slots, check if the day/shift is a working period.

```typescript
// IN: services/schedulerEngine.ts

const isWorkDay = (day: Date, shift: string, holidays: Holiday[], workPeriods: WorkPeriod[]): boolean => {
    // 1. Check if it's a holiday
    if (holidays.some(h => isSameDay(new Date(h.date), day))) return false;
    
    // 2. Find current work period
    const currentPeriod = workPeriods.find(wp => 
        isWithinInterval(day, { start: new Date(wp.startDate), end: new Date(wp.endDate) })
    );
    
    if (!currentPeriod) return true; // No period defined = assume work day
    
    // 3. Get day index (0 = Mon, 6 = Sun for our config)
    const dayOfWeek = day.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert JS Sunday=0 to our Mon=0
    
    const dayConfig = currentPeriod.days[dayIndex as keyof typeof currentPeriod.days];
    
    // 4. Check if shift is enabled for this day
    if (shift === 'Sáng' && !dayConfig.morning) return false;
    if (shift === 'Chiều' && !dayConfig.afternoon) return false;
    if (shift === 'Tối' && !dayConfig.evening) return false;
    
    return true;
};

// Usage in slot generation
weekDays.forEach((day, dayIndex) => {
    dayPatterns.forEach(pattern => {
        if (!isWorkDay(day, pattern.shift, holidays, workPeriods)) {
            return; // Skip holidays and non-working shifts
        }
        // ... generate slots
    });
});
```

### 21.2 Pre-compute Map for Sort (Performance)
Avoid O(n²) by pre-computing values before sorting.

```typescript
// IN: services/schedulerEngine.ts

// ❌ BAD: O(n²) - filter inside sort comparator
candidates.sort((a, b) => {
    const loadA = schedule.filter(s => s.employeeIds.includes(a.id)).length;
    const loadB = schedule.filter(s => s.employeeIds.includes(b.id)).length;
    return loadA - loadB;
});

// ✅ GOOD: O(n) pre-compute + O(n log n) sort
const loadMap = new Map<string, number>();
candidates.forEach(emp => {
    const load = schedule.filter(s => s.employeeIds.includes(emp.id)).length;
    loadMap.set(emp.id, load);
});

candidates.sort((a, b) => {
    return (loadMap.get(a.id) || 0) - (loadMap.get(b.id) || 0);
});
```

---

## 22. VISIBILITY-AWARE TIMER PATTERN (v3.9.11)

### Pause Timer When Tab Hidden
Reduce CPU usage by pausing intervals when user isn't viewing the page.

```typescript
// IN: useDashboardStats.ts

useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    const startTimer = () => {
        timer = setInterval(() => setNow(new Date()), 60000);
    };
    
    const handleVisibility = () => {
        if (document.hidden) {
            clearInterval(timer);
        } else {
            setNow(new Date()); // Sync immediately when visible
            startTimer();
        }
    };
    
    startTimer();
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', handleVisibility);
    };
}, []);
```

**Benefits:**
- Timer doesn't run when tab is hidden (saves CPU)
- Syncs immediately when user returns to tab
- Proper cleanup on component unmount

---

## 21. COORDINATOR MODE SAVE PATTERN (v3.9.16)

### Problem: Coordinator saves to wrong employee
When a Coordinator reviews employee evaluations, there are TWO employee concepts:
- `currentEmployee`: The logged-in user (Coordinator)
- `targetEmployee`: The employee being reviewed

**BAD (Bug - Do Not Use):**
```typescript
// ❌ Always saves to Coordinator's own evaluation!
const handleSave = async () => {
    if (!currentEmployee || !openPeriod) return;
    
    const evaluation = {
        id: `${openPeriod.id}_${currentEmployee.id}`,  // Wrong!
        employeeId: currentEmployee.id,                 // Wrong!
        // ... data from selected employee's form
    };
    await saveMutation.mutateAsync(evaluation);
};
```

**GOOD (Correct Pattern):**
```typescript
// ✅ Uses targetEmployee (the employee being viewed/reviewed)
const handleSave = async () => {
    if (!targetEmployee || !openPeriod) return;  // Check targetEmployee!
    
    const evaluation = {
        id: `${openPeriod.id}_${targetEmployee.id}`,  // Correct!
        employeeId: targetEmployee.id,                 // Correct!
        // ... data from selected employee's form
    };
    await saveMutation.mutateAsync(evaluation);
};

// targetEmployee is derived from:
const targetEmployee = useMemo(() => {
    if (isCoordinator && selectedEmployeeId) {
        return employees.find(e => e.id === selectedEmployeeId);
    }
    return currentEmployee;  // Staff sees their own data
}, [isCoordinator, selectedEmployeeId, employees, currentEmployee]);
```

**Key Insight:** When building forms that Coordinators can use to view/edit OTHER employees' data, always use `targetEmployee` (derived from dropdown selection) for save operations, NOT `currentEmployee` (logged-in user).

*End of Examples*
```
