# Data Inventory — Nexus Suite

**งาน:** DATA-INVENTORY-001 / RB-002  
**วันที่:** 2026-09-12 (Asia/Bangkok)  
**ผลส่งมอบ:** Completed — ทะเบียนเชิงวิศวกรรมและ data-flow map; named reviewer acceptance สำหรับ release ยังรอ RB-001  
**ขอบเขต:** ตรวจ source ในเครื่องของ Nexus, Tools, DataLens; ไม่ได้อ่านข้อมูลผู้ใช้, secrets หรือ configuration จริงบน provider

อ่านร่วมกับ [Data Flow Map](DATA_FLOW_MAP_2026-09-12.md) และ [Release Blocker Registry](RELEASE_BLOCKER_REGISTRY_2026-09-12.md). การทำ inventory เสร็จไม่ปิด privacy/security/production gates

## 1. Evidence และวิธีใช้

ครอบคลุม **55 data assets**, รวม Dexie **32 ตารางที่ active ณ schema v27**, ในจำนวนนี้ **24 ตาราง** อยู่ใน SyncTableName, อีก 8 ตารางเป็น local/reference/operational. Cloud SQL ประกาศ **7 public tables**; Auth-managed tables แยกออกเพราะ schema/retention ของ provider ไม่ได้ตรวจจริง

[Source manifest](assurance/data-inventory-source-manifest-2026-09-12.json) เก็บ repo root/HEAD, สถานะ dirty, SHA-256 ของไฟล์ที่เลือก, extracted table/key coverage และ IDs ที่ใช้ในรายงาน. เป็น fingerprint ของหลักฐานที่เลือก ไม่ใช่ release fingerprint ทั้ง working tree

| Repository | HEAD ณ ตรวจ | ข้อจำกัด |
| --- | --- | --- |
| Nexus | `efdebc43b58a4adbc121d90ec5dfe2e857f1ee4a` | working tree มีการแก้ไข; ใช้ source-file hashes ประกอบ |
| Tools | `900da1de87734b767650cf6216296d88f31d7eb9` | working tree มีการแก้ไข; ใช้ source-file hashes ประกอบ |
| DataLens | `3670872e0e4a47a96fa1accd980b336e28000c33` | working tree มีการแก้ไข; ใช้ source-file hashes ประกอบ |

**Observed** หมายถึงเห็นเส้นทาง/fields/controls ใน source; ไม่ใช่ผล runtime/pentest. **UNKNOWN** หมายถึงยังไม่มีหลักฐานยืนยัน. ไม่มีข้อมูลนิติบุคคล/เจ้าของตามกฎหมาย/ชื่อผู้ตรวจที่แต่งตั้งในหลักฐานชุดนี้

กติกาที่ใช้กับ **ทุกแถว**:

- **Data subjects:** ผู้ใช้ และบุคคลอื่นที่ปรากฏใน input เช่น ผู้รับเงิน คู่ค้า/ลูกค้า ผู้ที่อยู่ใน CSV/ภาพ/ข้อความ. Free text อาจมีข้อมูลละเอียดอ่อนมากกว่าชื่อ field
- **Purpose:** คอลัมน์ purpose เป็นสิ่งที่ code ทำ; lawful basis, controller/processor role, permitted purpose/age/territory = **UNKNOWN** ให้ Legal/Privacy ประเมินใน RB-003/005/013
- **Region:** local หมายถึงอุปกรณ์/origin ผู้ใช้ซึ่งไม่ทราบประเทศ; cloud/CDN/SMTP/monitoring region, subprocessors, backup locations = **UNKNOWN** → RB-006
- **Ownership:** Nexus assets เสนอ Engineering/Privacy, Tools assets เสนอ Tools owner/Privacy, DataLens assets เสนอ DataLens owner/Privacy, identity/keys เสนอ Security; ทุกบทบาทยัง UNASSIGNED → RB-001
- **Retention:** ระยะใน source เป็นพฤติกรรมเทคนิค ไม่ใช่ schedule ที่ Legal อนุมัติ. ระยะตามสัญญา/backup/holds ยัง UNKNOWN → RB-007
- ไม่จัดชนิดข้อมูลตามกฎหมายโดยอัตโนมัติ: ตารางการเงิน/พฤติกรรมเป็น personal/confidential ในเชิงวิศวกรรม; Vault/token/PIN/DEK เป็น secrets; GPS/health และ arbitrary CSV ต้องประเมินความอ่อนไหวตามเนื้อหาจริง

## 2. Storage/encryption/deletion profiles

| Code | ความหมายที่ตรวจจาก source |
| --- | --- |
| E1 | repository ส่งผ่าน plaintext เมื่อ encryption disabled; เมื่อ enabled ห่อ business fields ใน encryptedContent. id/syncId/updatedAt ไม่เข้ารหัส และมี PLAINTEXT_KEYS exceptions. DEK อยู่ใน session memory; JS/UI อ่าน decrypted data ได้หลัง unlock |
| E0 | direct Dexie/localStorage/native persistence ในเส้นทางที่ตรวจ ไม่ผ่าน application encrypted repository; OS/browser/provider อาจมี disk encryption ของตนเองซึ่งไม่ได้พิสูจน์ในงานนี้ |
| R1 | user remove/reset/import replacement ลบหรือแทน rows ที่ระบุและส่ง tombstones ตาม syncId; ไม่มี age-based TTL ที่พบ; retention ของ remote tombstone/backups UNKNOWN |
| R2 | merchants เป็น local reference, ถูก backup/import/reset+seed; ไม่อยู่ใน sync list; ไม่มี age TTL |
| R3 | local tombstones ถูกลบหลัง remote upsert สำเร็จ; remote data={} + deleted_at ยังเป็น record จนมีการ purge ที่ต้องกำหนด |
| R4 | cursor/backfill flags; backup/reset clear เฉพาะ backfill flags ในเส้นทางที่ตรวจ ไม่ใช่ล้าง syncState ทั้งหมด |
| R5 | scan run/cache มี checkpoint และ cache clear API; ไม่มีนโยบาย age purge ที่พบ; cache ไม่เก็บ extracted candidate แทน D029 |
| R6 | import history มี clear API แยก; เก็บยอดเงินรวมและ errors ได้; ไม่อยู่ใน global 25-table backup/reset |
| R7 | audit: memory 200 events; persisted sink ตัดเหลือ 500 oldest-first; repository clear API; count cap ไม่ใช่ retention เป็นวัน |
| R8 | persisted candidates ถูก clearRun ใน useFullGalleryScan.reset หลัง import/discard; การปิดแอปก่อน resolve เก็บไว้เพื่อ resume; ไม่มี age TTL ที่พบ |

**ขอบเขต Vault:** UI กำหนดให้ enable encryption ก่อนใช้งาน แต่ shared repository/import passthrough เมื่อ encryption disabled ไม่ใช่ invariant ระดับฐานข้อมูลว่าทุกเส้นทางเก็บ Vault เป็น ciphertext เสมอ. JSON backup มี Vault เมื่อส่งออกจาก session ที่ถอดรหัสได้

**ขอบเขต sync:** SyncProvider เรียกทุก 5 วินาทีและเมื่อ online ถ้ามี user; authStore.sync กัน concurrent sync. ในเส้นทางนี้ไม่พบสวิตช์ opt-in แยกต่อ table. คำว่า optional sync หมายถึง deployment/auth configuration และการมี session ไม่ควรตีความว่า login แล้วข้อมูลทุกชุดยัง local-only

## 3. Dexie inventory — storage: NexusDatabase บนอุปกรณ์

ทุก E1 table มีเส้นทาง F01/F02 (memory ⇄ encrypted/plain row ⇄ cloud relay) และ F15 (backup/export) ตามการใช้จริง; D006 merchants เข้า backup แต่ไม่ sync. แปด local/reference tables ไม่ได้แปลว่าเป็นข้อมูลไม่ละเอียดอ่อน

| ID | Table | Fields / data category | Purpose | Protection | Deletion | Flow | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D001 | `transactions` | รายการเงิน: title, amount, account, recipient, date/time, tags, note, attachment, recurring | ธุรกรรม/นำเข้าและรายงาน | E1 | R1 | F01,F02,F04,F13,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D002 | `accounts` | name, type, icon, color (ไม่มี balance field ใน Account type ที่ตรวจ) | จัดหมวดบัญชี | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D003 | `categories` | ชื่อ/ประเภทหมวด icon/color | จัดหมวดรายรับรายจ่าย | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D004 | `trades` | symbol ราคา/จำนวน entry/exit, P&L inputs, emotion/confidence, notes/screenshots | สมุดบันทึกการเทรด | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/trading/types/index.ts) |
| D005 | `recipientProfiles` | recipientKey (phone/PromptPay), alias, category, amount/count/history | เรียนรู้ผู้รับและเสนอหมวด | E1; recipientKey plaintext | R1 | F01,F02,F04,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D006 | `merchants` | ชื่อร้านและหมวดจาก reference/seed | จับคู่ร้าน | E0 | R2 | F01,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D007 | `budgets` | category, budget amount/period | ติดตามงบ | E1; category plaintext | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D008 | `goals` | ชื่อ เป้าหมายเงิน ความคืบหน้า | ติดตามเป้าหมาย | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D009 | `transactionTemplates` | ชื่อและค่าเริ่มต้นธุรกรรม | เพิ่มรายการซ้ำ | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D010 | `todos` | title/notes, due date, priority, completion | รายการงาน | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/todo/types/index.ts) |
| D011 | `habits` | ชื่อ ความถี่ completedDates และ reminder | ติดตามพฤติกรรม | E1 | R1 | F01,F02,F14,F15 | N01,N02; [type](../src/features/habits/types/index.ts) |
| D012 | `holdings` | symbol, quantity, cost/manual price, notes | พอร์ตลงทุน | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/portfolio/types/index.ts) |
| D013 | `calendarEvents` | title/notes/location, start/end, repeat/reminder | ปฏิทิน | E1 | R1 | F01,F02,F14,F15 | N01,N02; [type](../src/features/calendar/types/index.ts) |
| D014 | `scheduleItems` | title/notes, เวลา repeat/category/reminder | ตารางกิจกรรม | E1 | R1 | F01,F02,F14,F15 | N01,N02; [type](../src/features/schedule/types/index.ts) |
| D015 | `goalMilestoneEvents` | goal identity และ milestone event | ประวัติความคืบหน้าเป้าหมาย | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D016 | `syncTombstones` | table, syncId, deletedAt | ส่งต่อการลบ | E0 | R3 | F03 | N01,N02; N04 |
| D017 | `syncState` | push/pull cursor, backfill flags (key/value) | ควบคุม incremental sync | E0 | R4 | F02,F03 | N01,N02; N04 |
| D018 | `slipScanRuns` | source, cursor/dateRange, timestamps/count/status | resume scan | E0 | R5 | F04 | N01,N02; N08 |
| D019 | `slipScanCache` | assetId/hash/version/status/failures/timestamp | skip/deduplicate scan | E0 | R5 | F04 | N01,N02; N08 |
| D020 | `slipImportHistory` | bank, total imported amount, counts/errors, source/date/duration | ประวัติการนำเข้า | E0 | R6 | F04 | N01,N02; N08 |
| D021 | `vaultEntries` | password/secret notes/recovery key และ metadata ตาม type | เก็บความลับ | E1 + UI requires encryption (ดูข้อจำกัด) | R1 | F01,F02,F06,F15 | N01,N02; [type](../src/features/vault/types/index.ts) |
| D022 | `auditLog` | event type/action/time และ detail metadata | ตรวจเหตุการณ์ความปลอดภัย | E0 | R7 | F16 | N01,N02; N13 |
| D023 | `workoutExercises` | ชื่อ ประเภท exercise/calorie coefficients, gpsTracked/YouTube URL | รายการท่าออกกำลังกาย | E1 | R1 | F01,F02,F12,F15 | N01,N02; [type](../src/features/workouts/types/index.ts) |
| D024 | `workoutEntries` | exercise/date, reps/duration/calories/note, GPS lat/lng/t | บันทึกออกกำลังกายและเส้นทาง | E1 | R1 | F01,F02,F12,F15 | N01,N02; [type](../src/features/workouts/types/index.ts) |
| D025 | `netWorthItems` | asset/liability และมูลค่า | คำนวณ net worth | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D026 | `netWorthSnapshots` | วันที่และยอดรวม asset/liability/net worth | ประวัติ net worth | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D027 | `subscriptions` | ชื่อ ค่าใช้จ่าย billing/status/note | ติดตามค่าสมาชิก | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D028 | `budgetPeriodSnapshots` | budget identity/period และยอดใช้เทียบงบ | ประวัติรอบงบ | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/finance/types/index.ts) |
| D029 | `slipScanCandidates` | bank, merchant, amount, date/time, reference, raw QR payload, confidence; ไม่เก็บ thumbnailUrl | กู้คืนรายการสแกนรอยืนยัน | E0 | R8 | F04 | N01,N02; N08 |
| D030 | `strategies` | ชื่อ strategy และ trading rules/notes | playbook | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/trading/types/index.ts) |
| D031 | `watchlistItems` | symbol และบันทึก watchlist | เฝ้ารายการลงทุนที่ผู้ใช้กรอก | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/trading/types/index.ts) |
| D032 | `economicEvents` | event/date และข้อมูลที่ผู้ใช้บันทึก | economic calendar แบบกรอกเอง | E1 | R1 | F01,F02,F15 | N01,N02; [type](../src/features/trading/types/index.ts) |

ไม่รวม slipScannedAssets เป็น active table: schema v16 drop ตารางเดิมแล้วสร้าง slipScanCache. Dexie version number ไม่ใช่จำนวนตาราง. Derived analysis/store memory แยกจาก durable rows; runtime stores โหลด business data ที่ถอดรหัสเพื่อแสดงผล

## 4. Supabase public tables — storage: configured Supabase project

Payload ที่ cloud รับสัมพันธ์กับข้อมูล D001–D032; fields ใน SQL และ callable paths ผูกกับ N04/N05/N06/N12. ไม่ได้ยืนยัน schema parity/RLS บน production ในงานนี้ (RB-021)

| ID | Table | Fields / purpose | Flow | Access / encryption | Deletion / observed lifetime |
| --- | --- | --- | --- | --- | --- |
| D033 | `synced_records` | user_id, table_name, id, data (plain/envelope), updated_at/deleted_at; relay 24 tables และ tombstones | F02,F03,F10 | RLS owner ตาม auth.uid(); ไม่ใช่ทุกตารางบังคับ AAL2; payload encryption ตามแถว | upsert tombstone data={} และลบ local tombstone หลัง push; ไม่มี TTL purge ของ remote tombstones ที่พบ |
| D034 | `user_encryption_keys` | wrapped_dek, dek_iv, escrow_salt/iterations, user_id/time; password-based key recovery | F06 | owner RLS; DEK ส่งขึ้นเป็น envelope | delete เมื่อ disable encryption; user FK cascade; ระยะ backup/log UNKNOWN |
| D035 | `device_pairing_requests` | id/user_id, secret_hash, encrypted_dek/iv, status, expires/approved timestamps; QR ส่ง DEK ระหว่างอุปกรณ์บัญชีเดียวกัน | F07 | owner RLS; random secret อยู่ใน QR/memory; cloud รับ hash และ ciphertext | ticket 2 นาทีเป็น validation expiry; delete เมื่อ consumed/cancel; ไม่พบ scheduled purge ของ abandoned rows |
| D036 | `mfa_backup_codes` | user_id, salt/hash, created/used_at; recovery code | F08 | management ต้อง owner+aal2; redemption RPC รับ code จาก client เพื่อตรวจฝั่ง server | redeem ลบ hash ที่ใช้; regeneration แทนชุดเก่า; ไม่พบ age TTL |
| D037 | `mfa_backup_code_attempts` | user_id, window_started_at, attempt_count; จำกัดความถี่ recovery | F08 | security-definer RPC เป็นตัวจัดการ | window 15 นาที/5 attempts; success ลบ counter; window ไม่ใช่ retention TTL |
| D038 | `ai_coach_daily_usage` | user_id, usage_date, request_count/updated_at; usage/rate cap | F09 | owner RLS; calling-user JWT | 30 requests/day ตาม Edge source; ไม่มี historical purge ที่พบ |
| D039 | `automation_weekly_digests` | user_id/period, income/expense/net/count, seen_at; สรุปการเงินรายสัปดาห์ | F10 | server aggregate; excludes users with escrow row; owner read/update | cron จันทร์ 09:00 expression ตาม source; ไม่ยืนยัน timezone/config จริง; ไม่มี expiry ที่พบ |

ทั้ง 7 ตารางมี user_id FK ที่อ้าง auth.users แบบ on delete cascade ใน SQL ที่ตรวจ แต่ไม่ใช่หลักฐานว่ามี production account-deletion workflow หรือจะลบ logs/Blob/local/export copies ครบ. Weekly digest ที่สร้างก่อนเปลี่ยน encryption state ไม่ได้ถูกพิสูจน์ว่าลบย้อนหลัง

## 5. Assets นอก Dexie business tables

| ID | Asset / fields | Purpose / input → processing → storage/recipient | Flow | Protection / feature gate | Retention / deletion | Source |
| --- | --- | --- | --- | --- | --- | --- |
| D040 | **บัญชี/Auth/session** — email, password/OTP/TOTP, user ID/email/role, access+refresh token, factor metadata | ผู้ใช้ → SDK/Supabase Auth → browser session; recovery email ผ่าน provider ที่ UNKNOWN | F05,F08,F11,F18,F19 | ส่ง credentials ไป Auth; browser SDK persistent session; token/secret เป็นความลับ | signOut เคลียร์ session ตาม SDK แต่ไม่ใช่ลบ account/local data; provider session/log/SMTP retention UNKNOWN | N04,N05,N06,T01,L01 |
| D041 | **Browser preferences/lock** — PIN hash/salt, wrapped DEK, lock generations, feature/settings/usage/preferences | origin localStorage/sessionStorage ดูตาราง keys | F01,F06,F07,F16 | keys plaintext ยกเว้น wrapped key bytes; PIN hash ไม่ใช่การเข้ารหัสข้อมูล | ส่วนใหญ่ไม่มี TTL; rememberUntil 7 วันเป็นสิทธิ์ unlock ไม่ใช่การลบ key | N06,N07 |
| D042 | **Scanner learning/settings** — merchant/OCR corrections, category corrections, bank selection, scan schedule/counters | แก้ข้อมูลใน UI → Zustand persist → localStorage | F04 | plaintext และไม่เข้า ENCRYPTABLE_TABLES; text corrections อาจมีข้อมูลระบุตัว | reset actions แยกแต่ละ store; global data reset ไม่ครอบคลุม | N08 |
| D043 | **Native payment notifications** — allowlisted package, raw title/text/bigText, postedAt/id; parsed candidate | OS bank notification → SharedPreferences → JS confirm → transaction | F13 | opt-in false + OS permission + 4-package allowlist; MODE_PRIVATE ไม่ใช่ application encryption | max 10 FIFO; acknowledge หลัง confirm/dismiss/unparseable; ไม่มี TTL ที่พบ; ต้นฉบับอยู่ใน OS/แอปธนาคาร | N09 |
| D044 | **Biometric/PIN credential** — App Lock PIN literal ที่ส่งให้ plugin; credential name/server; unlock result | JS → NativeBiometric credentials store → biometric-gated retrieval → JS PIN/DEK unlock | F06 | app ไม่รับ fingerprint image/template ใน interface นี้; template อยู่ภายใต้ OS; PIN ถูกเก็บผ่าน plugin secure API | deleteCredentials เมื่อปิด; hardware backing/OS backup behavior ต้องตรวจอุปกรณ์จริง | N10 |
| D045 | **Raw image/QR/OCR** — ภาพจาก picker/gallery/camera, filename/asset URI, decoded QR/OCR text, thumbnails | OS/file input → browser/native media reader → local OCR/QR → D029 | F04,F20 | local processing ไม่ใช่ upload OCR image ในเส้นทางที่ตรวจ; worker/model assets อาจดาวน์โหลดจาก CDN | memory/object URL ระหว่างงาน; gallery ต้นฉบับไม่ถูกลบจากการลบ transaction; model caches ไม่ใช่ slip table | N08,N11 |
| D046 | **AI prompt/answer** — free-text question ≤2000 chars, language, context JSON ≤20000 chars, rounded totals/categories/budgets/behavior | client → ai-coach Edge → Anthropic → answer | F09 | enabled default false + signed-in/configured + unknown intent; context builder allow-list ที่ client; server ตรวจ shape/length ไม่บังคับ nested allow-list | ไม่มี conversation DB ที่พบในเส้นทางนี้; upstream error body/exception อาจเข้า logs; provider retention UNKNOWN; category text/free-text อาจระบุตัวได้ | N12 |
| D047 | **Sentry/error diagnostics** — exception/message, stack/componentStack, SDK/device/request metadata และ extra ที่ caller ส่ง | browser error buffer → lazy Sentry SDK → configured DSN | F16 | VITE_SENTRY_DSN gate; sendDefaultPii:false; ไม่พบ beforeSend redaction ใน init ที่ตรวจ | buffer max50 ก่อน load; provider event retention/actual DSN UNKNOWN; ไม่รับรองว่าไม่มี sensitive strings | N13 |
| D048 | **Tools document book/draft/settings** — seller/customer, item description/price/quantity, tax, phone/payment/note, saved documents/counters/logo; preferences/history | Tools UI → origin localStorage; explicit cloud sync/reserve → API → private Blob books/{owner}.json | F11,F17,F18 | Supabase auth for cloud; bearer + AAL server check; private Blob ไม่ใช่ client-side content encryption | local remove/clearContacts/deleteDocument; book cap 100 docs; ไม่พบ cloud DELETE/expiry ใน cloud-book API; overwrite/merge ไม่ใช่สิทธิ์ลบครบทุกแห่ง | T01,T02 |
| D049 | **Tools uploaded media/policy/cookie** — image/video bytes, pathname,size,time, owner UUID/access/expiry, signed access cookie | admin-authorized upload token → private Blob media/policies → viewer API | F18 | media ≤50MiB; link/owner; owner JWT→HttpOnly/Secure/SameSite=Strict cookie; admin secret ใช้ฝั่ง UI/API flow | token 5นาที; policy1–365วัน(default7); cookie≤15นาที/expiry; expiry ปฏิเสธอ่านแต่ไม่ลบ; admin DELETE ลบ media+policy | T03 |
| D050 | **DataLens CSV/results/audit** — arbitrary CSV/filename/schema, owner/source/purpose/classification, actor ID/email/role, preview100 rows, profile/issues, signed review/approval notes | browser FormData → FastAPI → pandas → browser result; review/approve round-trip → HTML export | F19 | server Auth verifies JWT+MFA/role; no-store response; HMAC service signature ไม่ใช่ encryption | handler ไม่มี durable DB write; UploadFile.close finally; framework temp/spooling, platform logs/backups UNKNOWN; browser state/export copy ยังมีข้อมูล | L01,L02,L03 |
| D051 | **Exports/backups/downloads** — Nexus 25-table JSON รวม Vault, CSV/PDF reports, Tools documents/QR/files, DataLens HTML | UI reads decrypted values → Blob/file download/share/recipient device | F15,F17,F19 | plaintext artifact ตามชนิด; local encryption ไม่ติดไปกับ export; QR อาจบรรจุ phone/payment/contact/secret ตาม input | ผู้ใช้/ผู้รับควบคุมหลังดาวน์โหลด; server/local reset ไม่ลบสำเนา; import limits ไม่ใช่ retention policy | N03,T02,L03 |
| D052 | **OS/browser caches/backups** — installed assets/PWA cache, OCR language cache, app/WebView/SharedPreferences copies ตาม OS backup policy | asset/CDN fetch → cache; OS may back up eligible app files | F20 | Android allowBackup=true; production exclusions/device transfer behavior UNKNOWN; ไม่อ้างว่า backup ทุกไฟล์สำเร็จจริง | cache eviction/update กับการลบข้อมูลส่วนบุคคลคนละเรื่อง; region/TTL/restore controls UNKNOWN | N11,N14 |
| D053 | **Scheduled reminders** — title/body/entity ID, repeat/time/day, notification display | habit/calendar/schedule → native LocalNotifications → OS notification/lock screen | F14 | native platform + permission; content visibility ขึ้นกับ channel/OS; ไม่ใช่ server push ในเส้นทางนี้ | schedule/cancel; pending/delivered OS copies และ global reset reconciliation ต้องตรวจ RB-007 | N15 |
| D054 | **Map/YouTube external requests** — tile z/x/y for viewed area, IP/request metadata; search query หรือ saved external URL | route viewer → OSM tiles; user link → YouTube | F12 | tile coordinates บอกพื้นที่ viewport ได้แม้ไม่ได้ส่ง GPS route array; ลิงก์เปิดภายนอกเผย query ตาม input | provider logging/retention/region UNKNOWN; เพิ่มใน vendor review จาก data-flow evidence | N16 |
| D055 | **Hosting/API/logs and operator secrets** — request URLs/IP/header/error metadata, SMTP/account notices, deployment secrets, signing/admin/API keys | web/API/Auth infrastructure → provider logs/admin consoles/email provider | F05,F09,F18,F19,F20 | service secrets เป็น control-plane data; ไม่อ่านค่า .env/token/keystore จริงในงานนี้; no-store ไม่ปิด server logs | region, subprocessors, log retention, backups, access roles/custody UNKNOWN; ต้องมี configuration/contract evidence | N04,N12,N13,T03,L02 |

**DataLens physical boundary:** app ระบุ request_only/server_storage:false ใน response และไม่ได้เขียน durable database ใน handler ที่ตรวจ แต่ UploadFile/multipart framework อาจใช้ temporary spool; การ close ไม่พิสูจน์ forensic erase. Provider logging, request buffering, temporary disk และ backups ต้องตรวจ RB-006/007/022

**AI boundary:** aggregate allow-list ลด raw transaction fields ใน client context; category names และคำถามยังเป็นข้อความผู้ใช้. Edge endpoint ไม่บังคับ allow-list ของ nested context และ log upstream error body บางเส้นทาง จึงไม่อ้างว่าไม่มีข้อมูลส่วนบุคคลออกนอกเครื่อง

**External assets:** createWorker("tha+eng") ไม่ตั้ง custom worker/lang/core paths; installed Tesseract defaults ชี้ jsDelivr. ไม่มี slip-image upload ใน OCR path ที่ตรวจ แต่ asset requests เผย request metadata ตาม infrastructure. ตรวจ runtime/CSP จริงใน RB-023/006

## 6. Browser storage keys

Zustand persist keys ต่อไปนี้เป็น localStorage โดย default; plaintext JSON เว้น wrapped bytes ที่ระบุ E1. รายการได้จาก source scan ไม่ได้อ่าน browser data จริง; ไม่มี time-based expiry ใน persist configuration ที่ตรวจ

| Key | Product | Source |
| --- | --- | --- |
| `nexus-bank-selection` | Nexus | [source](../src/features/finance/slipScanner/store/bankSelectionStore.ts) |
| `nexus-category-learning` | Nexus | [source](../src/features/finance/slipScanner/store/categoryLearningStore.ts) |
| `nexus-slip-learning` | Nexus | [source](../src/features/finance/slipScanner/store/learningStore.ts) |
| `nexus-scan-schedule` | Nexus | [source](../src/features/finance/slipScanner/store/scanScheduleStore.ts) |
| `nexus-scanner-analytics` | Nexus | [source](../src/features/finance/slipScanner/store/scannerAnalyticsStore.ts) |
| `nexus-trading-risk-config` | Nexus | [source](../src/features/trading/store/riskConfigStore.ts) |
| `nexus-feature-flags` | Nexus | [source](../src/platform/featureFlagStore.ts) |
| `nexus-ai-coach-settings` | Nexus | [source](../src/store/aiCoachSettingsStore.ts) |
| `nexus-app-lock` | Nexus | [source](../src/store/appLockStore.ts) |
| `nexus-app-settings` | Nexus | [source](../src/store/appSettingsStore.ts) |
| `nexus-gamification` | Nexus | [source](../src/store/gamificationStore.ts) |
| `nexus-language` | Nexus | [source](../src/store/languageStore.ts) |
| `nexus-dismissed-notifications` | Nexus | [source](../src/store/notificationStore.ts) |
| `nexus-tools-preferences` | Tools | [source](../../../Nexus-Tools/src/store.ts) |
| `nexus-language` | Tools | [source](../../../Nexus-Tools/src/shared/languageStore.ts) |

รายละเอียดกลุ่ม: language/theme/feature flags เป็น preferences; gamification เก็บ XP/streak/lastActiveDate; dismissed-notifications เก็บ ids; trading-risk-config และ trading-account-balance เก็บ risk settings/ยอดเงินที่ผู้ใช้กรอก; learning keys เก็บชื่อร้าน/คำแก้ OCR; scanner-analytics เป็น counters; app-lock เก็บ hash/salt/envelope และ unlock policy; Tools preferences เก็บ favorites/recent (สูงสุด 8)/theme

| Additional key / container | Data / expiry / removal |
| --- | --- |
| nexus-trading-account-balance | localStorage balance จาก TradeRiskCalculator; ไม่มี TTL |
| nexus-lock-signal | localStorage lock generation id/hub; ไม่ใช่ credential |
| nexus-session-unlocked, nexus-unlock-generation | sessionStorage session/generation markers; clear/rotate โดย lock code |
| nexus-mfa-verified-user-id | sessionStorage user marker; clear เมื่อ sign-out; ไม่ยกระดับ JWT เป็น aal2 |
| nexus-password-recovery | sessionStorage recovery-mode marker; จบ recovery แล้ว remove |
| Supabase default auth storage (Nexus, DataLens) | project-derived SDK key; session/access/refresh/user metadata; SDK persistent session default ที่ source ใช้; exact deployed key/token TTL UNKNOWN |
| nexus-tools-session | Tools SDK storageKey explicit; session persists ตาม SDK; detectSessionInUrl:false |
| nexus-tools-invoice-draft | seller/customer/items/tax/payment/notes/logo draft ตาม localData; remove draft action |
| nexus-tools-document-book | document book, customer/product cache, seller/counters; local editing/clearing ไม่พิสูจน์ cloud deletion |
| nexus-tools-settings-{id} | SettingsHistory saved parameters/history; เนื้อหาขึ้นกับ tool; manual clear |
| nexus-media-{path-derived-id} | Tools signed cookie, path=/api/media, HttpOnly/Secure/SameSite=Strict; max15นาที และไม่เกิน media expiry |
| nexus_notification_capture / pendingCandidates | Android SharedPreferences แยกจาก browser keys; raw bank notification queue max10 |
| nexus-navigation-v1 / Workbox precache | CacheStorage ของ navigation/assets; max10 navigation entries ใน config; ไม่อ้างว่าเป็น user-data retention policy |
| OCR traineddata cache | installed browser adapter ใช้ idb-keyval/IndexedDB เก็บ models แยกจาก NexusDatabase; runtime instance/eviction UNKNOWN |

Installed SDK defaults อ้างอิงเพื่ออธิบาย persistence เท่านั้น ไม่ใช้แทนการตรวจ runtime session policy/expiry. Origin isolation ของ Nexus/Tools/DataLens ไม่ใช่ per-account isolation; sign-out ใน authStore ไม่เรียก resetAllData

## 7. สิ่งที่ต้องส่งต่องานถัดไป

| Unknown / observed gap | Evidence / ข้อมูลที่ต้องยืนยัน | Owner role / RB |
| --- | --- | --- |
| U01 Operator / roles / lawful basis | ไม่มีชื่อผู้ประกอบการและ mapping purpose→basis/role ที่อนุมัติ; ครอบคลุมทั้ง 55 assets | CEO/Legal/Privacy — RB-001/003/005/013 |
| U02 Providers/regions/contracts | Supabase, Vercel/Blob, Anthropic, Sentry, SMTP, OSM, YouTube, jsDelivr และ OS backup provider ที่ใช้จริง; เปิด/ปิดในแต่ละ deployment | Privacy/Security — RB-006 |
| U03 Retention/deletion completeness | TTL schedule, tombstone expiry, auth/log/backup/case retention, abandoned pairing, cloud book deletion, expired media purge, offline copies | Privacy/Operations — RB-007 |
| U04 Scanner plaintext coverage | candidates มี amount/merchant/reference/payload; history มี total amount/errors; localStorage learning มี source text. ต้องรวมใน encryption/export/reset/threat review | Security/Privacy — RB-023/007 |
| U05 Native credential/OS backup | NativeBiometric interface ส่ง PIN literal ให้ secure plugin; app ไม่รับ biometric template; hardware backing/backup exclusions/device behavior ยังไม่พิสูจน์ | Security/mobile — RB-012/013/023 |
| U06 Telemetry/AI minimization | client allow-list ไม่ใช่ server schema allow-list; free text/categories และ exception/upstream errors ต้องมี exclusion tests และ policy | Security/Product/Privacy — RB-018/023/006 |
| U07 DataLens processing/storage | request scopes, multipart/spooling, logs, preview/export identity, actual CSV categories และ third-party authority | DataLens/Privacy — RB-005/007/013/022 |
| U08 Account lifecycle | sign-out/local reset/cloud account delete/export expiry ไม่ใช่เหตุการณ์เดียวกัน; ตรวจ shared-device account switch และ stale device restore | Engineering/Operations — RB-007/016/021 |
| U09 Deployment/provider facts | selected source hashes ไม่พิสูจน์ deployed build, enabled flags, region, backup schedule หรือ credentials custody | Release/Security — RB-020/021/022 |
| U10 External requests/permissions | OSM viewport leakage, YouTube queries, OCR CDN/cache, reminders/lock-screen content, OS backup policy ตามอุปกรณ์ | Privacy/Security — RB-006/013/023 |

ข้อค้นพบเหล่านี้เป็น inventory facts/unknowns ส่งต่อใน RB ที่มีอยู่ ไม่ได้เริ่มแก้ controls หรือเพิ่ม feature ในงานนี้. โดยเฉพาะข้อความเดิมที่เหมารวม scanner ว่าเก็บเพียง non-financial metadata หรือ DataLens ว่าไม่มีข้อมูลคงอยู่ทุกระดับ ต้องใช้ขอบเขต source ที่ระบุในฉบับนี้

## 8. Source index

N = Nexus, T = Tools, L = DataLens. Links ไป sibling repositories ต้องมี checkout ตามตำแหน่งเดิม; manifest มี root และ source hash สำหรับย้ายเครื่อง/ทวนหลักฐาน. Type files ของแต่ละ domain ระบุในตาราง Dexie

| Ref | Area | Source links |
| --- | --- | --- |
| N01 | Nexus DB/schema/types | [db.ts](../src/database/db.ts), [types.ts](../src/features/sync/types.ts) |
| N02 | Repository/encryption exemptions | [createRepository.ts](../src/database/createRepository.ts), [encryptedRepository.ts](../src/database/encryptedRepository.ts), [plaintextKeys.ts](../src/database/plaintextKeys.ts) |
| N03 | Backup/export/reset | [backupService.ts](../src/database/backupService.ts) |
| N04 | Sync/Auth/cloud schema | [SyncProvider.tsx](../src/features/sync/components/SyncProvider.tsx), [authStore.ts](../src/features/sync/store/authStore.ts), [syncEngine.ts](../src/features/sync/syncEngine.ts), [tombstones.ts](../src/features/sync/tombstones.ts), [schema.sql](../supabase/schema.sql) |
| N05 | MFA / backup code | [mfa.ts](../src/features/sync/mfa.ts), [backupCodes.ts](../src/features/sync/backupCodes.ts), [mfaSession.ts](../src/features/sync/mfaSession.ts) |
| N06 | Session / escrow / pairing | [supabaseClient.ts](../src/lib/supabaseClient.ts), [toolsSession.ts](../src/features/sync/toolsSession.ts), [pairingService.ts](../src/features/pairing/pairingService.ts), [enableEncryption.ts](../src/features/encryption/migration/enableEncryption.ts), [recoverDekFromEscrow.ts](../src/features/encryption/recovery/recoverDekFromEscrow.ts) |
| N07 | App lock / browser stores | [appLockStore.ts](../src/store/appLockStore.ts), [pinLockSlice.ts](../src/store/appLock/pinLockSlice.ts), [lockSignal.ts](../src/store/appLock/lockSignal.ts), [gamificationStore.ts](../src/store/gamificationStore.ts) |
| N08 | Scan candidates / learning / history | [scanCandidateRepository.ts](../src/features/finance/slipScanner/repositories/scanCandidateRepository.ts), [useFullGalleryScan.ts](../src/features/finance/slipScanner/hooks/useFullGalleryScan.ts), [useSmartImport.ts](../src/features/finance/slipScanner/hooks/useSmartImport.ts), [learningStore.ts](../src/features/finance/slipScanner/store/learningStore.ts), [categoryLearningStore.ts](../src/features/finance/slipScanner/store/categoryLearningStore.ts) |
| N09 | Native notification pipeline | [PaymentNotificationListenerService.java](../android/app/src/main/java/com/nexus/app/notifications/PaymentNotificationListenerService.java), [PaymentNotificationCapturePlugin.java](../android/app/src/main/java/com/nexus/app/notifications/PaymentNotificationCapturePlugin.java), [pendingNotificationCandidateStore.ts](../src/features/finance/notificationCapture/store/pendingNotificationCandidateStore.ts) |
| N10 | Biometric interface | [biometricService.ts](../src/features/lock/services/biometricService.ts) |
| N11 | Gallery / OCR | [GalleryMediaPlugin.java](../android/app/src/main/java/com/nexus/app/gallery/GalleryMediaPlugin.java), [ocrRecognizer.ts](../src/features/finance/slipScanner/engine/ocr/ocrRecognizer.ts) |
| N12 | AI request boundary | [buildCoachLlmContext.ts](../src/features/finance/aiAnalytics/engine/coach/context/buildCoachLlmContext.ts), [ClaudeProvider.ts](../src/ai/providers/ClaudeProvider.ts), [index.ts](../supabase/functions/ai-coach/index.ts), [aiCoachSettingsStore.ts](../src/store/aiCoachSettingsStore.ts) |
| N13 | Sentry / audit persistence | [sentry.ts](../src/lib/sentry.ts), [ErrorBoundary.tsx](../src/components/ui/ErrorBoundary.tsx), [dexieAuditSink.ts](../src/features/security/dexieAuditSink.ts) |
| N14 | OS/PWA cache declarations | [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml), [vite.config.ts](../vite.config.ts) |
| N15 | OS reminders | [nativeReminderService.ts](../src/features/reminders/services/nativeReminderService.ts) |
| N16 | GPS/map/external link | [useGpsTracker.ts](../src/features/workouts/gps/useGpsTracker.ts), [WorkoutRouteMap.tsx](../src/features/workouts/components/WorkoutRouteMap.tsx), [youtubeLink.ts](../src/features/workouts/utils/youtubeLink.ts) |
| T01 | Tools auth / SSO | [account.ts](../../../Nexus-Tools/src/services/account.ts), [sso.ts](../../../Nexus-Tools/src/services/sso.ts), [account.ts](../../../Nexus-Tools/server/account.ts) |
| T02 | Tools local/cloud documents | [localData.ts](../../../Nexus-Tools/src/services/localData.ts), [documentBook.ts](../../../Nexus-Tools/src/services/documentBook.ts), [cloud-book.ts](../../../Nexus-Tools/api/cloud-book.ts), [store.ts](../../../Nexus-Tools/src/store.ts) |
| T03 | Tools media/policies/cookie | [media.ts](../../../Nexus-Tools/src/services/media.ts), [upload.ts](../../../Nexus-Tools/api/upload.ts), [media.ts](../../../Nexus-Tools/api/media.ts), [manage-media.ts](../../../Nexus-Tools/api/manage-media.ts), [mediaAccess.ts](../../../Nexus-Tools/server/mediaAccess.ts) |
| L01 | DataLens client/auth | [App.tsx](../../DataLens/frontend/src/App.tsx), [auth.tsx](../../DataLens/frontend/src/auth.tsx) |
| L02 | DataLens API / profiling / security | [main.py](../../DataLens/backend/app/main.py), [analysis.py](../../DataLens/backend/app/analysis.py), [security.py](../../DataLens/backend/app/security.py) |
| L03 | DataLens report | [report.ts](../../DataLens/frontend/src/report.ts), [Governance.tsx](../../DataLens/frontend/src/Governance.tsx) |

## 9. Validation / completion boundary

- เทียบ active Dexie tables ครบ32, sync list ครบ24, public SQL tables ครบ7 กับ source และ manifest; ทุก asset มี ID, purpose, storage/recipient, flow และ lifetime/protection ตามที่ทราบ
- Traceability: ทุก F ID มีคำอธิบายใน Data Flow Map และทุก D ID ถูก map; source links และ selected hashes ตรวจด้วยเครื่องมือ
- ตรวจ dependency references กับ RB registry; UNKNOWN ทุกกลุ่มมีบทบาทและ RB รับช่วง
- เปลี่ยนเฉพาะเอกสาร/manifest จึงไม่รัน Build/TypeScript/lint/unit/E2E ซ้ำ และไม่อ้างว่า validation รอบก่อนเป็นผลของ source ทั้ง3 repositories รอบนี้
- Engineering inventory ส่งมอบเสร็จ; RB-002 อยู่ In Progress เฉพาะรอ reviewer ที่แต่งตั้งรับรอง coverage ตามกติกา release registry. ไม่มี legal/privacy/production approval ที่สร้างขึ้นเอง

**งานถัดไปที่แนะนำ:** RB-001 — ระบุผู้ประกอบการ ช่องทางติดต่อ และแต่งตั้ง accountable owners; Astra + High ช่วยจัดทำข้อมูล/เอกสารได้ โดยชื่อจริงและอำนาจอนุมัติต้องมาจากผู้ประกอบการ
