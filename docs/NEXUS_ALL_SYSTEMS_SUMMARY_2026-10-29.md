# Nexus — สรุประบบทั้งหมดสำหรับพัฒนาต่อ

**วันที่จัดทำ:** 29 ตุลาคม 2026  
**ขอบเขต:** Nexus Main, Nexus All/Project Hub, Nexus Tools, DataLens, AlgoViz และ ScreenTutor  
**วัตถุประสงค์:** เป็นเอกสารตั้งต้นสำหรับวางแผนพัฒนา ตรวจความพร้อม และแยกขอบเขตของแต่ละระบบ

> เอกสารนี้เป็น engineering snapshot จาก source code และเอกสารใน workspace ไม่ใช่ใบรับรอง production, security, legal หรือ compliance และไม่ควรใช้แทนการทดสอบบนอุปกรณ์จริงหรือการตรวจสอบ deployment ล่าสุด

## 1. ขอบเขตและหลักฐานที่ใช้

รายงานนี้ตรวจจาก:

- source และ package configuration ใน `Nexus` และ repository แยกของแต่ละระบบ
- router, services, stores, database schema, API routes และเอกสารใน `docs/`
- รายงานสถานะและ audit ที่มีวันที่กำกับ เช่น `SYSTEM_STATUS_REPORT_2026-09-30.md`, `PHASE_0_3_FULL_REGRESSION_RELIABILITY_2026-10-02.md` และ `PHASE_0_4_2_ANDROID_SCANNER_RUNTIME_FIX_2026-10-03.md`
- README และ production/GitHub links ของแต่ละ repository

**สิ่งที่ไม่นับเป็นระบบแยก:** `Nexus Tools.remote` เป็น remote worktree/สำเนาทางเทคนิค ไม่ใช่ผลิตภัณฑ์ที่ต้องนับเพิ่ม และไม่รวมโครงการ XAUUSD หรือโฟลเดอร์ทดลองอื่นที่อยู่นอกขอบเขต Nexus ทั้งหกระบบ

**ข้อควรระวังเรื่องสถานะ source:** root repository `Nexus` มีการแก้ไขที่ยังไม่ commit หลายรายการจากงานก่อนหน้า ดังนั้นบางส่วนของ source ปัจจุบันอาจใหม่กว่ารุ่นที่ deploy อยู่บน Vercel หรือรุ่นใน standalone repository

## 2. ภาพรวมระบบทั้งหมด

| ระบบ | บทบาท | รูปแบบ | URL หลัก | Repository | สถานะข้อมูล |
|---|---|---|---|---|---|
| **Nexus All / Project Hub** | จุดเริ่มต้นและตัวสลับไปยังทุกผลิตภัณฑ์ | Route ภายใน root Nexus | `https://nexus-lemon-eight-32.vercel.app/` และ `/projects` | อยู่ใน `Nexus` | ไม่ใช่ฐานข้อมูลธุรกิจแยก |
| **Nexus Main** | Personal finance, planning, trading journal และ secure workspace | Web + Android + Electron จาก architecture หลัก | `https://nexus-main-phi.vercel.app` | `Piecez2548/Nexus-Main` และ source หลักใน `Piecez2548/Nexus` | IndexedDB/Dexie เป็นหลัก, optional Supabase sync |
| **Nexus Tools** | เครื่องมือเอกสาร สื่อ OCR QR และเอกสารธุรกิจ | Standalone web app + Vercel Functions/Blob | `https://nexus-tools-chi.vercel.app` | `Piecez2548/Nexus-Tools` | browser-local เป็นหลัก, cloud เฉพาะงานที่ผู้ใช้เลือก |
| **DataLens** | วิเคราะห์และ profile CSV แบบ deterministic | React frontend + FastAPI backend | `https://datalens-kappa-one.vercel.app` | `Piecez2548/DataLens` | วิเคราะห์ใน request, ไม่ตั้งใจเก็บ CSV ถาวร |
| **AlgoViz** | ห้องทดลองแสดง algorithm แบบ interactive | Standalone web app (Nexus ลิงก์ไป; `/algoviz` redirect มาที่นี่) | `https://algoviz-brown-kappa.vercel.app` | `Piecez2548/AlgoViz` | ไม่มี business persistence |
| **ScreenTutor** | ผู้ช่วยเรียนรู้จากภาพหน้าจอด้วย OCR/Local AI | Standalone web + Electron bridge ใน root | `https://screentutor.vercel.app` และ root `/screentutor` | `Piecez2548/ScreenTutor` | local history/settings; optional Ollama |

## 3. สถาปัตยกรรมร่วมของ Nexus

### 3.1 Source of truth และการแยก repository

`Nexus` เป็น source workspace ที่มี architecture หลักและ embedded routes หลายตัว ขณะที่ `Nexus-Main`, `Nexus-Tools`, `DataLens`, `AlgoViz` และ `ScreenTutor` เป็น repository/deployable surface ที่แยกออกมาเพื่อ deploy หรือทำ portfolio ได้สะดวก

ผลกระทบสำคัญ:

1. การแก้ feature หลักควรกำหนด source of truth ให้ชัดก่อนแก้ เพื่อไม่ให้ root กับ standalone drift กัน
2. การเปลี่ยน route, auth, schema หรือ contract ต้องตรวจทั้ง embedded route, standalone repo, README และ deployment
3. standalone repository ไม่ได้หมายความว่ามี implementation เดียวกับ root เสมอไป ตัวอย่างชัดเจนคือ ScreenTutor รุ่น standalone ยังมี demo fallback ที่ root source ปัจจุบันแก้ให้ fail-closed แล้ว

### 3.2 Local-first data model

Nexus Main ใช้ลำดับชั้นโดยทั่วไปดังนี้:

`Page → component/hook → Zustand store → service → repository → Dexie/IndexedDB`

Supabase sync, encryption และ audit เป็นชั้นเสริม ไม่ใช่ตัวแทนของ business logic ใน React component การออกแบบนี้ทำให้ระบบทำงาน offline ได้ แต่ทำให้ต้องรับผิดชอบเรื่อง migration, conflict, tombstone และความสอดคล้องของ relation เอง

ฐานข้อมูล `NexusDatabase` มี schema version 2–27 และตารางหลักประมาณ 32 ตาราง เช่น:

- finance: `transactions`, `accounts`, `categories`, `budgets`, `goals`, `merchants`, `recipientProfiles`, `subscriptions`
- trading: `trades`, `holdings`, `strategies`, `watchlistItems`, `economicEvents`
- planning: `todos`, `habits`, `scheduleItems`, `goalMilestoneEvents`
- scan/import: `slipScanRuns`, `slipScanCache`, `slipImportHistory`, `slipScanCandidates`
- security/storage: `vaultEntries`, `auditLog`, `syncState`, `syncTombstones`
- health/net worth: `workoutExercises`, `workoutEntries`, `netWorthItems`, `netWorthSnapshots`

IndexedDB ไม่มี foreign key จริง ความสัมพันธ์จึงถูกบังคับโดย service/repository และควรมี relational consistency audit แยกต่างหาก

### 3.3 Authentication, lock และ sync

- Supabase email/password, OTP verification และ TOTP MFA
- App Lock PIN/biometric เป็นคนละชั้นกับ auth ของ Supabase
- backup codes, device pairing/recovery และ session handling อยู่ในขอบเขตความปลอดภัยของ Main
- sync ใช้ metadata, tombstone และ conflict guards; generic synced records relay ผ่าน Supabase
- Vault เข้ารหัสเสมอ ส่วนข้อมูลอื่นรองรับ AES-GCM แบบเลือกเปิดใช้
- ข้อมูล local plaintext เป็นค่าเริ่มต้นสำหรับตารางทั่วไป จึงต้องสื่อสารกับผู้ใช้ให้ตรงกับ threat model

### 3.4 Platform targets

- Web/Vercel สำหรับทุกผลิตภัณฑ์ที่มี frontend
- Capacitor Android สำหรับ Nexus Main และฟีเจอร์ native เช่น MediaStore, notifications, biometric และ filesystem
- Electron สำหรับ desktop capture/OCR/Ollama ของ ScreenTutor และ shell ของ Nexus
- DataLens มี FastAPI backend แยกจาก React frontend
- Nexus Tools ใช้ Vercel Functions และ Vercel Blob สำหรับ private cloud media/books

## 4. Nexus Main — ระบบธุรกิจหลัก

### 4.1 ขอบเขตและโมดูล

Nexus Main คือ personal finance/productivity workspace สำหรับผู้ใช้รายบุคคล โดยมี route หลัก:

- dashboard, finance, transactions, accounts, categories, merchants, recipients
- budgets, goals, net worth, subscriptions และ reports
- AI analytics และ executive view
- trading journal, portfolio, strategies, watchlist, economic calendar
- todo, habits, schedule, vault, workouts และ settings

เอกสาร `MODULES.md` แบ่งออกเป็นประมาณ 17 โมดูล พร้อม security, sync, encryption, lock, pairing และ automation เป็น cross-cutting modules

### 4.2 Finance และการนำเข้าเงิน

รองรับ transaction type เช่น income, expense, transfer, refund และ adjustment พร้อม account/category/merchant/recipient relation

ช่องทางข้อมูล:

- เพิ่ม/แก้ไข/ลบด้วยมือ
- CSV/JSON/PDF import/export ตาม feature ที่เปิดใช้
- QR/OCR slip scanner และ gallery scanner
- payment notification capture บน Android
- template และ duplicate/conflict handling

**ข้อเท็จจริงที่ต้องรักษา:** bank account type ปัจจุบันเป็น manual local ledger ไม่ใช่การเชื่อมธนาคาร และไม่มี broker/live market connection

### 4.3 Gallery/OCR/QR scanner

กระบวนการที่ออกแบบไว้:

1. เลือก source และ date range
2. prefilter หา QR ก่อน OCR เต็มรูปแบบ
3. สร้าง candidate/review record
4. ให้ผู้ใช้ตรวจและยืนยันผ่าน Smart Import
5. จึงเขียน transaction พร้อม duplicate/conflict guard

Android notification allowlist ปัจจุบันครอบคลุม:

- SCB Easy: `com.scb.phone`
- K PLUS: `com.kasikorn.retail.mbanking.wap`
- Krungthai NEXT: `ktbcs.netbank`
- เป๋าตัง: `com.ktb.customer.qr`

notification listener อ่านเฉพาะจำนวนเงินและคู่กรณีจากแอปที่อนุญาต เก็บเป็น bounded pending candidate และต้องให้ผู้ใช้ยืนยันก่อนเขียน transaction

### 4.4 AI analytics

analytics ส่วนใหญ่เป็น deterministic/local ไม่ใช่การส่งข้อมูลทั้งหมดไป model ภายนอก ประกอบด้วย:

- health score แบบถ่วงน้ำหนักและ rule ประมาณ 46 กฎใน 15 หมวด
- recommendation engine, behavior detector, forecast/trend และ what-if
- executive summary
- AI Coach ประมาณ 16 intents
- Claude fallback ผ่าน Supabase Edge Function เฉพาะกรณี opt-in และ unknown intent

จุดนี้ควรรักษา explainability, provenance และการแยก deterministic result กับ generated wording ให้ชัด

### 4.5 Trading และ portfolio

มี journal, metrics, strategy/playbook, watchlist, manual holdings และ user-entered economic calendar โดยคำนวณ win rate, profit factor, RR, drawdown, expectancy, holding time และ equity curve ได้

ยังไม่มี:

- live broker connection
- order execution
- live market price feed
- financial advice หรือ regulated portfolio management

### 4.6 Security และ operational readiness

มี App Lock, biometric, optional AES-GCM, Supabase MFA, audit log, sync tombstones และ vault encryption แต่ยังต้องทำ verification matrix สำหรับ migration, cross-account isolation, backup/restore และ Android physical test ให้ครบก่อนสื่อสารว่า production-ready

## 5. Nexus All / Project Hub

### 5.1 บทบาท

Project Hub เป็นหน้าเริ่มต้น/ตัวจัดหมวดผลิตภัณฑ์ ไม่ใช่ระบบข้อมูลการเงินแยก มี route `/`, `/index.html`, `/projects` และ `/projects/index.html` ที่ชี้มายัง hub เดียวกันใน source ปัจจุบัน

Hub แสดงลิงก์ไปยัง:

- Main: `/dashboard`
- Nexus Tools: production external origin
- DataLens: production external origin
- AlgoViz: `/algoviz`
- ScreenTutor: `/screentutor`

### 5.2 Auth และ UX boundary

- ใช้ account menu/theme/app-lock ตามที่ source เปิดไว้
- Main/DataLens ใช้ Supabase identity เดียวกันในระดับระบบ แต่เมื่อข้าม origin ต้อง re-auth หรือผ่าน contract ที่กำหนด
- ห้ามส่ง token, PIN หรือ CSV ผ่าน URL
- การเปลี่ยนลิงก์ต้องแก้ HTML/CSS, route tests, allowlist และ documentation พร้อมกัน

### 5.3 ประเด็นที่ต้องยืนยันบน deployment

เอกสาร audit เดิมบางฉบับบันทึกว่าเว็บ root เคยเปิด ScreenTutor ขณะที่ source ปัจจุบันกำหนด root เป็น Nexus All แล้ว จึงต้องตรวจ production deployment จริงอีกครั้งหลัง deploy เพื่อยืนยันว่า Vercel ใช้ revision เดียวกับ source ล่าสุด

## 6. Nexus Tools — Document & Media Workspace

### 6.1 ขอบเขตเครื่องมือ

Tools เป็น bilingual public workspace ที่รวมเครื่องมือประมาณ 17 กลุ่ม เช่น:

- PDF merge/split/compress/page manager/text replacement
- images-to-PDF, image studio, batch ZIP, background removal
- OCR, QR, unit converter, text/developer utilities
- invoice และ document books

UI มี Home, All tools, Favorites, category filter, search ด้วย `Ctrl+K`, dark/light theme, recent tools และ lazy-loaded workspace

### 6.2 Data/privacy model

- เครื่องมือทั่วไปประมวลผลใน browser เป็นหลัก
- private books และ media ใช้ Vercel Blob ผ่าน Vercel Functions
- cloud book เป็น per-user และใช้ ETag/`If-Match` ป้องกัน concurrent overwrite
- upload มี owner/link policy, expiry และ bounded limits
- media GET มี authorization, range support, CSP/sandbox และ `no-store`
- Supabase session/MFA และ nonce-bound postMessage ใช้สำหรับ cross-origin handoff
- token ไม่อยู่ใน URL; nonce เป็น one-use และตรวจ exact origin/popup

ข้อจำกัด: data ใน Tools ไม่ได้ end-to-end encrypted แบบ Vault ของ Main และ local data อาจยังอยู่หลัง sign-out จึงต้องระบุใน privacy/UX copy ให้ชัด

### 6.3 Integration ที่ยังเป็น Planned

เอกสาร Nexus Tools ระบุ automatic background sync และ direct sharing เข้า finance เป็น Planned ยังไม่ควรถือว่าเป็น data integration ที่ใช้งานจริงจนกว่าจะมี contract, retry, idempotency และ audit ครบ

### 6.4 สถานะ validation

เคยพบ environment issue ในบางรอบของ `npm run build` ที่หา `pdfjs-dist/cmaps` ไม่พบ และ `npm run lint` ที่หา `eslint` ไม่พบ ซึ่งอาจเป็น dependency/tooling state ไม่ใช่ defect ของ business logic ต้องทำ clean install และ CI reproduction ก่อนสรุปผล

## 7. DataLens — CSV profiling และ governance

### 7.1 ขอบเขต

DataLens เป็นระบบวิเคราะห์ CSV แบบ deterministic ไม่มี AI API เป็นแกนหลัก มี frontend React และ backend FastAPI แยกกัน

ความสามารถหลัก:

- upload CSV, ตรวจ header/schema และ type override
- missing/duplicate/numeric stats, IQR outliers และ Pearson correlation
- quality score และ business rules
- executive summary และ editable HTML brief
- SHA-256 fingerprint และ method version
- HMAC-signed event chain, review/approval gates และ role checks
- responsive/accessibility/security headers และ E2E/security checks

### 7.2 Backend contract

endpoint หลัก:

- `GET /api/health`
- `POST /api/analyze`
- `POST /api/audit/review`
- `POST /api/audit/approve`

ข้อจำกัดโดย source:

- CSV สูงสุด 4 MiB บน Vercel และ 10 MiB ใน local mode
- สูงสุดประมาณ 100,000 rows และ 100 columns
- ใช้ pandas/numpy แบบ deterministic
- ไม่มีเจตนาเก็บ CSV ถาวรใน analysis request

### 7.3 Auth, audit และ governance

backend ตรวจ Supabase bearer token, role allowlist และ MFA `aal2` เมื่อมี factor ใช้งาน HMAC-SHA256 เซ็น event record และตรวจ canonical payload ก่อน approve

ข้อควรระวังทางกฎหมาย/องค์กร:

- checkbox authorization ไม่เท่ากับ DPA/consent สำหรับข้อมูลตัวแทน
- ยังไม่มี central audit DB, key rotation และ independent ledger แบบองค์กรเต็มรูปแบบ
- ต้องกำหนด controller/processor, retention, deletion, incident response และ data residency ให้ชัดก่อนรับข้อมูล confidential ในวงกว้าง

## 8. AlgoViz — ห้องทดลอง algorithm

### 8.1 ขอบเขต

AlgoViz เป็น educational visualizer ไม่มี auth, backend หรือ business data persistence ใช้ deterministic step trace เพื่อให้ผู้ใช้เล่น animation และดู state ของ algorithm

หมวดหลัก:

- Search: BFS, DFS, Greedy Best-First Search พร้อม queue/stack/frontier/visited/metrics
- Pathfinding: Dijkstra และ A* พร้อม weighted graph, priority, distance และ parent
- Sorting: Bubble, Selection, Insertion, Merge, Quick พร้อม comparison/swap trace

ตัวอย่าง input sorting ถูกกำหนด deterministic เช่น `[42, 18, 64, 9, 31, 56, 23]`

### 8.2 State และ UX

Zustand store ควบคุม active category, current step, total steps, playing และ speed 0.5/1/2/4x มีทั้ง embedded route `/algoviz` และ standalone deployment

### 8.3 แนวทางพัฒนาต่อ

- เพิ่ม accessibility ของ playback/keyboard และคำอธิบายแต่ละ step
- เพิ่ม algorithm complexity และ invariant checks โดยไม่ทำให้ trace ไม่ deterministic
- แยก educational content จาก algorithm engine เพื่อทดสอบได้ง่าย
- ถ้าต้องเก็บ lesson/progress ควรตัดสินใจใหม่เรื่อง auth และ persistence แทนการเพิ่มแบบ ad hoc

## 9. ScreenTutor — OCR และ Local AI

### 9.1 ขอบเขต

ScreenTutor เป็นผู้ช่วยเรียนรู้จาก region บนหน้าจอ รองรับ:

- screen-region selection
- Thai/English OCR ด้วย Tesseract.js
- content classification: programming error, multiple choice, math, translation, general text/unknown
- Ollama provider สำหรับ local analysis
- local history/settings/privacy
- Electron native bridge สำหรับ capture และ global hotkey `Ctrl+Shift+Space`

### 9.2 Root integrated implementation

source ปัจจุบันใน root มี provider state `initializing`, `ready`, `unavailable`, `error`, `demo` พร้อม `ScreenTutorError` และ validation ที่ไม่ยอมรับ empty response เมื่อไม่มี capture จริง ผลลัพธ์จะแสดง source เช่น `REAL · Ollama`, `DEMO · Sample output` หรือ `Source not recorded`

### 9.3 Standalone drift ที่ต้องแก้

repository standalone ยังมี `makeDemoAnalysis` ที่ fallback เป็นคำตอบ hardcoded option C เมื่อ Ollama ไม่พร้อม ซึ่งเสี่ยงทำให้ผู้ใช้เข้าใจว่าเป็นคำตอบจริง แม้ root source จะปรับ fail-closed แล้ว

**ลำดับที่แนะนำ:** ทำ contract เดียวกันระหว่าง root และ standalone ก่อน deploy รอบถัดไป โดยให้ demo mode ติดป้ายชัด, ไม่ตอบเหมือนผลจริง และไม่สร้าง history ที่ดูเหมือน verified answer

### 9.4 Verification ที่ยังขาด

ต้องทดสอบ packaged Electron + Windows capture + global hotkey + Ollama จริงบนเครื่อง Windows และทดสอบกรณี provider offline/empty/timeout ให้ครบ

## 10. การไหลของข้อมูลระหว่างระบบ

```text
Project Hub
  ├─ internal route → Nexus Main
  ├─ internal route → AlgoViz
  ├─ internal route → ScreenTutor
  ├─ external origin → Nexus Tools
  └─ external origin → DataLens

Nexus Main
  ├─ local Dexie/IndexedDB
  ├─ optional Supabase sync + tombstones
  ├─ Android MediaStore/notifications → candidate → user confirmation → transaction
  └─ optional AI Gateway for unknown intent

Nexus Tools
  ├─ browser-local processing
  └─ authenticated Vercel Functions → private Blob books/media

DataLens
  └─ CSV request → FastAPI deterministic analysis → review/approval/audit response
```

หลักการสำคัญคือ external origin ไม่ควรได้รับ token หรือ financial data ผ่าน URL และการส่งข้อมูลข้ามระบบต้องมี explicit user action, origin check, idempotency และ audit trail

## 11. สถานะ verification ล่าสุดที่มีหลักฐาน

| รายการ | หลักฐาน/สถานะ | ความหมาย |
|---|---|---|
| Root full regression | Phase 0.3 ผ่าน 2 รอบ: 461 files, 2,904 tests, 0 failed | ดีสำหรับ source revision นั้น แต่ต้อง rerun เมื่อมีการเปลี่ยน source เพิ่ม |
| Scanner-focused tests | Phase 0.4.2 ผ่าน 99 files, 494 tests | logic path ดีใน test environment |
| TypeScript/Vite/Oxlint/Cap sync | ผ่านตาม Phase 0.4.2 | ยังไม่เท่ากับ Android APK/device proof |
| Android `assembleDebug` | blocked ด้วย Java NIO loopback | ยังไม่มี APK ใหม่จากรอบนั้นและยังไม่ physical retest |
| Physical scanner on Vivo V2348 | pending | ต้องทดสอบบนเครื่องจริงโดยไม่ล้างข้อมูลผู้ใช้ |
| ScreenTutor Electron/Ollama | pending | ต้องทดสอบ packaged desktop path |
| Nexus Tools clean build | มี dependency/tooling failures บางรอบ | ต้อง reproduce ใน clean CI |
| DataLens | มี unit/security/E2E design และ backend limits | ต้องยืนยัน deployment config, secrets, retention และ organizational governance |
| Production URL parity | pending verification | source ปัจจุบันอาจใหม่กว่า deployment/standalone snapshot |

## 12. สิ่งที่ยังไม่มีหรือไม่ควรสื่อสารเกินจริง

- ไม่มี direct bank API/account aggregation หรือการอ่าน password/OTP ของธนาคาร
- ไม่มี broker connection, live market data หรือ order execution
- ไม่มี generic push notification/automation engine ที่สมบูรณ์
- ยังไม่มี iOS release ที่ยืนยันแล้ว
- ยังไม่มี multi-user enterprise tenancy, organization roles และ billing ที่ครบ
- AI analytics ส่วนใหญ่ deterministic; Claude/Ollama เป็น optional provider ไม่ใช่แหล่งความจริงทางการเงิน
- DataLens authorization checkbox ไม่ใช่ legal consent/DPA เต็มรูปแบบ
- Android scanner และ packaged Electron OCR ยังต้องมี physical/E2E evidence ก่อนประกาศ production-ready

## 13. ความเสี่ยงและ technical debt ที่ควรจัดการ

### P1 — ความสอดคล้องของผลิตภัณฑ์และ source

1. ระบุ source of truth ระหว่าง root กับ standalone ให้เป็นทางการ
2. ตรวจ root URL/Project Hub/ScreenTutor บน Vercel ให้ตรงกับ source ปัจจุบัน
3. แก้ ScreenTutor standalone ให้ใช้ provider/result semantics แบบ fail-closed เดียวกับ root

### P1/P2 — ความน่าเชื่อถือของ scanner

1. แก้ Android build environment และสร้าง APK ใหม่
2. ทดสอบ permission, cancellation, duplicate, safe mode และ write-after-confirm บน Vivo V2348
3. วัด throughput/accuracy ของ QR prefilter และ OCR ด้วยชุดภาพจริง โดยรายงาน precision/recall และเวลา ไม่รับประกัน “หนึ่งรูปในหนึ่งวินาที” จนกว่าจะวัดจริง

### P2 — Release/CI

1. ทำ CI matrix แยก root, Main, Tools, DataLens, AlgoViz, ScreenTutor
2. รัน clean install, typecheck, lint, unit, E2E, build และ deployment smoke test
3. ทำ version/commit manifest เพื่อรู้ว่า production URL ใช้ revision ใด
4. เพิ่ม observability แบบ privacy-preserving, error ID และ rollback procedure

### P2 — Security/privacy/legal

1. เขียน privacy notice, terms, retention/deletion และ incident response ให้ครบ
2. ทำ DataLens controller/processor และ confidential-data policy
3. ตรวจ key management, MFA assurance, cross-account isolation, backup/restore และ RLS/sync boundaries
4. ก่อน bank connectivity ต้องเลือก provider/jurisdiction/consent/revoke/audit และห้ามทำ credential scraping

### P3 — Maintenance

- ตัดสินใจ retention/deprecation ของ Calendar compatibility tables
- แยก generated docs/old audit กับ current status ให้เห็นชัด
- ลด duplicate code ระหว่าง embedded และ standalone หรือสร้าง shared package ที่มี version contract

## 14. แผนพัฒนาต่อที่แนะนำ

### Phase 0 — Baseline และ release truth

1. สร้าง manifest ระบุ repo, commit, build artifact และ production URL ของทั้งหกระบบ
2. ทำ source/deploy parity check ของ root, Main, Tools, DataLens, AlgoViz และ ScreenTutor
3. ทำ clean CI baseline ให้ได้ผลซ้ำได้ก่อนแก้ feature ใหม่

### Phase 1 — ปิดความเสี่ยงที่กระทบผู้ใช้จริง

1. Android scanner build + physical test
2. แก้ ScreenTutor standalone drift และทดสอบ Electron/Ollama
3. แก้ Tools dependency/lint/build reproducibility
4. ยืนยัน Project Hub และ deep links ทุกหน้าบน production

### Phase 2 — Data integrity และ privacy

1. migration/integrity matrix ของ Dexie 2–27
2. relational consistency และ cross-account sync test
3. backup/restore และ deletion/retention test
4. DataLens governance, key rotation และ incident workflow

### Phase 3 — Product integration

1. shared auth/session contract ระหว่าง Hub, Main, Tools และ DataLens
2. idempotent direct share/import ระหว่าง Tools กับ Main
3. release automation และ changelog/versioning แบบเดียวกัน

### Phase 4 — ขยายความสามารถที่ต้องใช้การกำกับดูแล

1. ประเมิน bank connectivity แบบ official API/regulated aggregator
2. ประเมิน broker/market data เฉพาะเมื่อมี provider contract และ risk controls
3. พิจารณา iOS, enterprise tenancy, billing และ push notifications หลัง baseline แข็งแรง

## 15. ตัวเลขขนาด code โดยประมาณ

ตัวเลขชุดนี้เป็น snapshot จากการนับ `git ls-files` และ code extensions ณ รอบ 27 กันยายน 2026 ไม่ใช่ตัวเลข immutable และไม่รวม `node_modules`, `dist` หรือ build output:

| ระบบ | tracked files | code files | physical code lines | non-empty lines |
|---|---:|---:|---:|---:|
| Nexus root | 1,807 | 1,446 | 113,287 | 98,653 |
| Nexus Main | 1,924 | 1,653 | 247,396 | 222,574 |
| Nexus Tools | 106 | 91 | 8,442 | 8,345 |
| DataLens | 46 | 20 | 4,299 | 4,137 |
| AlgoViz | 27 | 21 | 2,261 | 2,176 |
| ScreenTutor | 19 | 10 | 562 | 503 |
| รวมทั้งหก | 3,929 | 3,241 | 376,247 | — |

Nexus Main มีตัวเลขสูงกว่า root ใน snapshot เพราะเป็น standalone tree ที่มีไฟล์/ประวัติการ build และเอกสารของตัวเอง จึงไม่ควรบวกตัวเลขเพื่ออ้างว่าเป็นจำนวน business logic ที่ไม่ซ้ำกัน

## 16. เอกสารอ้างอิงใน workspace

- [PROJECT_ARCHITECTURE.md](D:/Project_001/Nexus-Project/Nexus/docs/PROJECT_ARCHITECTURE.md)
- [MODULES.md](D:/Project_001/Nexus-Project/Nexus/docs/MODULES.md)
- [ROADMAP.md](D:/Project_001/Nexus-Project/Nexus/docs/ROADMAP.md)
- [SYSTEM_STATUS_REPORT_2026-09-30.md](D:/Project_001/Nexus-Project/Nexus/docs/SYSTEM_STATUS_REPORT_2026-09-30.md)
- [FULL_SYSTEM_AUDIT_2026-09-30.md](D:/Project_001/Nexus-Project/Nexus/docs/FULL_SYSTEM_AUDIT_2026-09-30.md)
- [PHASE_0_3_FULL_REGRESSION_RELIABILITY_2026-10-02.md](D:/Project_001/Nexus-Project/Nexus/docs/PHASE_0_3_FULL_REGRESSION_RELIABILITY_2026-10-02.md)
- [PHASE_0_4_2_ANDROID_SCANNER_RUNTIME_FIX_2026-10-03.md](D:/Project_001/Nexus-Project/Nexus/docs/PHASE_0_4_2_ANDROID_SCANNER_RUNTIME_FIX_2026-10-03.md)
- [LEGAL_PRIVACY_READINESS_2026-09-09.md](D:/Project_001/Nexus-Project/Nexus/docs/LEGAL_PRIVACY_READINESS_2026-09-09.md)
- [COMMERCIAL_READINESS.md](D:/Project_001/Nexus-Project/Nexus/docs/COMMERCIAL_READINESS.md)
- [DATABASE_AUDIT_2026-09-30.md](D:/Project_001/Nexus-Project/Nexus/docs/DATABASE_AUDIT_2026-09-30.md)
- [FAKE_FEATURE_AUDIT_2026-09-30.md](D:/Project_001/Nexus-Project/Nexus/docs/FAKE_FEATURE_AUDIT_2026-09-30.md)
- [NEXUS_TOOLS.md](D:/Project_001/Nexus-Project/Nexus/docs/NEXUS_TOOLS.md)
- [SCREENTUTOR_MVP.md](D:/Project_001/Nexus-Project/Nexus/docs/SCREENTUTOR_MVP.md)

## สรุปผู้บริหาร

Nexus มีแกนหลักเป็น local-first personal finance/productivity platform และมีผลิตภัณฑ์เสริมสี่ตัวที่ขยาย workflow ไปยัง document/media tools, CSV governance, algorithm education และ screen learning assistant โดย architecture ปัจจุบันมีพื้นฐานค่อนข้างครบสำหรับผู้ใช้คนเดียว แต่จุดที่ต้องปิดก่อนพัฒนา feature ใหญ่ต่อคือความตรงกันระหว่าง source กับ deployment, การทดสอบ Android/Electron จริง, ScreenTutor fallback semantics, CI ที่ทำซ้ำได้, data/privacy governance และการวางกรอบ bank connectivity อย่างถูกกฎหมาย

ลำดับที่เหมาะสมคือ **ยืนยัน release truth → ปิด physical/E2E risk → ปิด data/security governance → ค่อยเพิ่ม integration และความสามารถเชิงพาณิชย์**
