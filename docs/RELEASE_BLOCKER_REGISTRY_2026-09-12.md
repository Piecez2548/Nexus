# Release Blocker Registry — Nexus Suite

**วันที่:** 2026-09-12 (Asia/Bangkok)  
**งาน:** RBR-001 — Completed (จัดทำทะเบียนเท่านั้น)  
**ขอบเขต:** Nexus All/Main, Tools, DataLens, Supabase และ Android  
**สถานะ release:** real-data pilot / public / paid / organizational launch = **NO-GO**

ทะเบียนนี้แปลงข้อค้นพบภายในเป็นงานที่ติดตามได้ ไม่ใช่การวินิจฉัยกฎหมายใหม่หรือหลักฐานว่าปิดข้อค้นพบแล้ว RB-001 เป็น **Blocked** รอข้อมูลผู้ประกอบการ/การแต่งตั้งและ contact evidence; RB-002 เป็น **In Progress** เฉพาะรอ named reviewer acceptance; การทำ evidence ทางวิศวกรรมต่อในวันที่ 2026-09-13 ทำให้ RB-006, RB-011, RB-012, RB-015, RB-016, RB-017, RB-018, RB-019, RB-020, RB-021, RB-022 และ RB-023 เป็น **In Progress** โดยยังไม่มีรายการใด Closed. การอนุมัติจาก Legal หมายถึงผู้เชี่ยวชาญที่ผู้ประกอบการแต่งตั้ง ไม่ใช่โมเดล AI

## 1. วิธีอ่านสถานะและหลักฐาน

- P0 = ข้อขวาง release ตามรายงานเดิม หรือข้อขวางการพิสูจน์ release candidate; P1 = ต้องปิดก่อน pilot ตามขอบเขตที่ใช้จริง ตัวเลข priority ไม่ใช่ลำดับเริ่มงาน
- **Planned** = งานยังไม่เริ่ม/ยังไม่มีหลักฐานปิด; **In Progress** = เริ่มแล้ว; **Blocked** = เริ่มแล้วแต่ติด dependency; **Closed** = หลักฐานครบและผู้ตรวจที่แต่งตั้งลงชื่อ; **Not Applicable** = มีขอบเขตและเหตุผลลงชื่อพร้อมพิสูจน์ว่าฟีเจอร์/ช่องทางนั้นไม่เปิดใช้
- บทบาท Owner ในตารางเป็นข้อเสนอ ผู้รับผิดชอบรายบุคคล ผู้ตรวจ และวันครบกำหนดของทั้ง 24 รายการยัง **UNASSIGNED / TBD** ไม่ถือว่าการระบุ CEO หรือ Legal เป็นการแต่งตั้งจริง
- Dependencies หมายถึงงานที่ต้องมีผลลัพธ์ก่อน **ปิด** รายการนั้น การสำรวจ/ร่างเริ่มก่อนได้ แต่ผู้ใช้กำหนดให้ทำทีละงาน
- หลักฐานต้องระบุ ID, วันที่, ผู้จัดทำ/ผู้ตรวจ, repository + commit/build/deployment/configuration ที่ตรวจ, ผลจริง, ข้อจำกัด และที่เก็บที่ผู้ตรวจเข้าถึงได้ เก็บสัญญา ข้อมูลบุคคล และรายละเอียด pentest ในพื้นที่ควบคุมสิทธิ์; ใน Git เก็บเพียง reference ที่ไม่เปิดเผยข้อมูล
- เปลี่ยน source, provider, data flow หรือขอบเขตหลังตรวจ ต้องประเมินผลกระทบและเปิดรายการที่เกี่ยวข้องใหม่ หลักฐานของรุ่นเดิมไม่ปิดรุ่นใหม่โดยอัตโนมัติ

**ทะเบียนปัจจุบัน (อัปเดต 2026-09-13):** 24 รายการเปิด — P0 15, P1 9; Planned 10, In Progress 13, Blocked 1, Closed 0, Not Applicable 0. TEST-STABILITY-001 อยู่ในหลักฐานที่เสร็จแล้ว ไม่รวมใน 24 รายการ

## 2. แหล่งอ้างอิงและขอบเขตความเชื่อมั่น

| รหัส | หลักฐาน | ใช้เพื่อ |
| --- | --- | --- |
| S1 | [Executive final status](EXECUTIVE_FINAL_STATUS_AND_NEXT_ACTIONS_2026-09-12.md) §6–8 | ต้นทาง P0 11 รายการ และ P1 7 รายการ |
| S2 | [Release baseline](RELEASE_BASELINE_2026-09-12.md) | local validation และ TEST-STABILITY-001; production evidence ที่ยังขาด |
| S3 | [Legal/privacy readiness](LEGAL_PRIVACY_READINESS_2026-09-09.md) | ขอบเขต privacy, processing roles และข้อจำกัดคำกล่าวอ้าง |
| S4 | [Commercial due diligence](COMMERCIAL_DUE_DILIGENCE_2026-09-09.md) | สิทธิ์การใช้ทรัพย์สิน การดำเนินงาน และ commercial boundary |
| S5 | [Vendor register](VENDOR_AND_TRANSFER_REGISTER.md) | provider facts ที่ยังเป็น REQUIRED/VERIFY |
| S6 | [Retention/rights runbook](DATA_RETENTION_AND_RIGHTS_RUNBOOK.md) | รายการข้อมูลและขั้นตอนที่ยังเป็น template |
| S7 | [Incident runbook](INCIDENT_RESPONSE_RUNBOOK.md) | บทบาทและขั้นตอนที่ยังไม่มีรายชื่อ |
| S8 | [Privacy draft](PRIVACY_NOTICE_DRAFT.md), [Terms draft](TERMS_DRAFT.md) | เอกสารยังมีช่องว่างและยังไม่อนุมัติ |
| S9 | [Security documentation](SECURITY.md), [CSP configuration](../vercel.json), [Android build configuration](../android/app/build.gradle) | ข้อจำกัด encryption/export/PIN/MFA, CSP ปัจจุบัน และ signing |
| S10 | [Research plan](USER_RESEARCH_PLAN.md), [Commercial readiness](COMMERCIAL_READINESS.md) | แผนวิจัยและข้อเสนอทางธุรกิจที่ยังเป็นสมมติฐาน |
| S11 | [Data Inventory](DATA_INVENTORY_2026-09-12.md), [Data Flow Map](DATA_FLOW_MAP_2026-09-12.md) | 55 assets / 20 flows จาก source ของทั้งสาม repositories; provider/legal unknowns มีงานรับช่วง |
| S12 | [Operator/accountability record](OPERATOR_AND_ACCOUNTABILITY_RECORD_2026-09-12.md) | บันทึกรูปแบบบุคคลธรรมดาและชื่อที่แจ้ง Piece แล้ว; ยังรอข้อมูลที่เหลือและหลักฐานการแต่งตั้ง |

ตรวจไฟล์ท้องถิ่นในรอบนี้พบว่า vendor/incident/retention ยังเป็น template; Privacy/Terms ยังเป็น draft; CSP มี inline script และ connect-src ที่กว้าง; Android configuration ไม่มี production signingConfig ในไฟล์ที่ตรวจ การค้นหาใน LoginScreen/authStore/schema ไม่พบ versioned terms acceptance จึงยังต้องพิสูจน์ด้วย RB-004

ผล Tools/DataLens, production Supabase, deployment และ Android install ใน S1 เป็น **หลักฐานที่รายงานไว้ก่อนหน้า** รอบนี้ไม่ได้ตรวจระบบภายนอกซ้ำ ไม่ถือว่าล้มเหลว และไม่ถือว่าผ่านสำหรับ candidate ใหม่ จึงแยกเป็น RB-020–022

S2 บันทึกผลล่าสุดหลัง TEST-STABILITY-001: **448/448 files, 2,782/2,782 tests**, targeted 5 รอบ, Recipient Learning E2E 1/1, lint (oxlint), TypeScript และ release build ผ่าน ตัวเลขเดิม 2,781 ใน S1 เป็นประวัติคนละรอบ ไม่ใช้แทนผลล่าสุด การตรวจครั้งนี้ไม่รัน suite ซ้ำเพราะเปลี่ยนเฉพาะเอกสาร

## 3. ทะเบียนข้อขวาง release

**ใช้กับ:** Pilot = pilot ข้อมูลจริง; Launch = public/paid/organizational release. รายการมีเงื่อนไขยังเป็น Planned จนกว่าจะมีหลักฐานปิดหรือ Not Applicable ที่อนุมัติ

| ID | P | งานและขอบเขตที่ขวาง | Owner ที่เสนอ | ต้องมีผลก่อนปิด | สถานะ | ต้นทาง |
| --- | --- | --- | --- | --- | --- | --- |
| RB-001 | P0 | ผู้ประกอบการ ช่องทางติดต่อ และแต่งตั้ง accountable owners — Pilot/Launch | CEO | — | Blocked | S12 partially filled: individual operator, supplied name Piece; remaining facts, appointments and contact evidence pending |
| RB-002 | P1 | Data Inventory / Data Flow Map — Pilot/Launch | Engineering lead + Privacy owner | RB-001 | In Progress | S11: engineering deliverable complete; named reviewer acceptance pending RB-001 |
| RB-003 | P0 | Privacy Notice / Terms ไทย–อังกฤษฉบับอนุมัติ — Pilot/Launch | Legal | RB-001, RB-002, RB-005, RB-006, RB-007, RB-013, RB-017, RB-019, RB-023 | Planned | S1 P0/2; S8 |
| RB-004 | P0 | เผยแพร่เอกสารและ versioned acceptance แยก optional consent — Pilot/Launch | Engineering lead | RB-003 | Planned | S1 P0/3 |
| RB-005 | P0 | DataLens controller/processor decision และ DPA — organizational CSV | Legal + Privacy owner | RB-001, RB-002, RB-006 | Planned | S1 P0/4 |
| RB-006 | P0 | Vendor, region, subprocessors, retention และ transfer evidence — ทุก provider ที่ใช้ | Privacy owner + Security | RB-001, RB-002 | In Progress | S1 P0/5; S5; 2026-09-13 engineering facts |
| RB-007 | P0 | Retention schedule และ rights-request workflow — Pilot/Launch | Privacy owner | RB-001, RB-002, RB-006 | Planned | S1 P0/6; S6 |
| RB-008 | P0 | Incident commander, ผู้สำรอง และช่องทางที่ติดต่อได้ — Pilot/Launch | COO | RB-001 | Planned | S1 P0/7; S7 |
| RB-009 | P0 | Breach escalation / notification tabletop — Pilot/Launch | Privacy owner + Security | RB-006, RB-008, RB-017 | Planned | S1 P0/8 |
| RB-010 | P0 | Independent pentest และปิด critical/high — ทุก surface ใน release | Security owner | RB-004, RB-012, RB-015, RB-021, RB-022, RB-023 | Planned | S1 P0/9 |
| RB-011 | P0 | Chain of title, source/assets rights, LICENSE/NOTICE — Pilot/Launch | Legal + IP owner | RB-001 | In Progress | S1 P0/10; S4; 2026-09-13 engineering baseline |
| RB-012 | P0 | Android production signing / release process — Android distribution | Release owner | RB-001, RB-011, RB-015 | In Progress | S1 P0/11; 2026-09-13 signing baseline |
| RB-013 | P1 | DPIA / necessity และ residual risks — Pilot/Launch | Privacy owner + Legal | RB-001, RB-002, RB-006, RB-023 | Planned | S1 P1/1 |
| RB-014 | P1 | Supabase leaked-password protection decision — Supabase Auth | Security owner | RB-001 | Planned | S1 P1/2 |
| RB-015 | P1 | Release governance และ source candidate ที่ตรวจสอบได้ — Pilot/Launch | Engineering lead | RB-001 | In Progress | S1 P1/3; S2 §7; 2026-09-13 governance baseline |
| RB-016 | P1 | Restore / recovery / lost-device / sync / outage drills — Pilot/Launch | Operations + QA | RB-007, RB-012, RB-017, RB-021, RB-022, RB-023 | In Progress | S1 P1/4; 2026-09-13 drill index |
| RB-017 | P1 | Support hours, response targets, RTO/RPO และ escalation — Pilot/Launch | COO + Support | RB-001 | In Progress | S1 P1/5; 2026-09-13 support baseline |
| RB-018 | P1 | Privacy-safe pilot analytics/research — Pilot/Launch | Product + Privacy owner | RB-003, RB-004, RB-007, RB-013 | In Progress | S1 P1/6; S10; 2026-09-13 pilot baseline |
| RB-019 | P1 | Packaging/pricing/cost model และขอบเขตข้อเสนอ — Pilot/Launch | CEO + Product + Finance | RB-001, RB-017 | In Progress | S1 P1/7; S10; 2026-09-13 commercial baseline |
| RB-020 | P0 | Deployment ผูกกับ candidate และ production smoke — Pilot/Launch | Release owner + QA | RB-010, RB-015, RB-021, RB-022 | In Progress | S2 §6–7; 2026-09-13 smoke record |
| RB-021 | P0 | Supabase production configuration / RLS / migrations evidence — cloud release | Security + Database owner | RB-014, RB-015 | In Progress | S2 §6; 2026-09-13 linked verification |
| RB-022 | P0 | Tools/DataLens candidate และ regression evidence — suite release | เจ้าของ Tools/DataLens + QA | RB-015 | In Progress | S2 §6; 2026-09-13 separate-deployable verification |
| RB-023 | P1 | Security posture decision: plaintext export, optional encryption, PIN/MFA, CSP — Pilot/Launch | Security owner | RB-002 | In Progress | S1 §5; S3; S9; 2026-09-13 posture record |
| RB-024 | P0 | Final scoped GO/NO-GO record — Pilot/Launch | Release authority ที่ CEO แต่งตั้ง | RB-001, RB-002, RB-003, RB-004, RB-005, RB-006, RB-007, RB-008, RB-009, RB-010, RB-011, RB-012, RB-013, RB-014, RB-015, RB-016, RB-017, RB-018, RB-019, RB-020, RB-021, RB-022, RB-023 | Planned | S1 §7–8; S2 §7 |

RB-002, RB-020–024 เป็นรายการเพิ่มจากการจัด dependency และช่องว่างหลักฐานใน baseline ไม่ใช่ข้อค้นพบช่องโหว่ใหม่ การจัดลำดับ P เป็นข้อเสนอสำหรับทะเบียนนี้ ไม่ใช่คะแนนความรุนแรงของ pentest

## 4. เกณฑ์ปิดงานและหลักฐานที่ต้องส่ง

### RB-001 — Operator และ accountability

ระบุชื่อผู้ประกอบการ/คู่สัญญา ที่อยู่ ตลาด/กลุ่มผู้ใช้ และช่องทาง privacy/security/support ที่ทดสอบส่งถึงผู้รับได้; แต่งตั้งบุคคลรับผิดชอบ Legal/Privacy, Security, Release, Operations, Support และผู้อนุมัติ release พร้อมผู้สำรองตามหน้าที่ หลักฐาน: decision record และ contact test. CEO ลงชื่อแต่งตั้ง; ทุก RB มี named owner, reviewer และกำหนดส่งก่อนอนุมัติ pilot

**2026-09-12 — เริ่ม RB-001:** เตรียม S12 พร้อม operator profile, contact register, role boundaries, assignment mapping ครบ24 blockers และ closure checklist. ยังไม่มีชื่อ/ที่อยู่/ช่องทางที่ผู้ประกอบการยืนยันหรือหลักฐานแต่งตั้ง/contact test จึงรอข้อมูลจากผู้ใช้; ไม่ได้แต่งตั้งคนหรือส่งข้อความทดสอบแทน

**2026-09-12 — ข้อมูลเพิ่มเติม RB-001:** ผู้ใช้แจ้ง “นามบุคคล Piece”; บันทึกเป็นบุคคลธรรมดาและชื่อที่แจ้ง Piece ใน S12. ชื่อเต็มสำหรับเอกสารสัญญาและข้อมูลที่เหลือยังรอยืนยัน; สถานะยัง Blocked

### RB-002 — DATA-INVENTORY-001

ทำทะเบียนและแผนภาพที่ trace กลับไป source ได้ ครอบคลุม local IndexedDB/storage, account/Auth, cloud sync/tombstones, key envelopes, Vault, financial/health/GPS, biometric interface, scanning/notifications/pairing, Tools Blob, DataLens CSV/report, AI, telemetry, logs และ export/backup ระบุ input → processing → storage → recipient → deletion, purpose, feature flag, sensitive category, encryption/metadata และสถานะ region/retention/role ที่ทราบหรือ UNKNOWN. ตรวจแยก biometric template กับ assertion ของ OS โดยไม่สมมติว่าแอปเก็บ template

หลักฐาน: inventory IDs เชื่อม data-flow edges และ source references; Engineering ตรวจ coverage; ข้อมูล provider/กฎหมายที่ยังไม่ทราบมีเจ้าของไป RB-005–007/013 การทำแผนที่เสร็จได้โดยยังมี UNKNOWN ที่ติดตามไว้ ไม่ถือว่าผ่าน privacy gate

**2026-09-12 — DATA-INVENTORY-001 ส่งมอบเสร็จ:** S11 และ source manifest ครอบคลุม Dexie 32 ตาราง (sync 24), public cloud tables 7, assets รวม55 และ flows20. ตรวจ table/ID/source coverage แล้ว; เงื่อนไขผู้ตรวจที่แต่งตั้งลงชื่อยังรอ RB-001 จึงไม่เปลี่ยน RB-002 เป็น Closed. U01–U10 ใน inventory ส่งต่อข้อเท็จจริงที่ยังไม่ทราบ และ scanner plaintext/AI/log/export/deletion boundaries ไปยัง RB เดิมที่รับผิดชอบ

### RB-003 — Approved legal text

เติม operator และข้อเท็จจริงจาก data flows/vendor/retention; กำหนดอายุ/ผู้ใช้/พื้นที่บริการและ service limitations ตามขอบเขตที่อนุมัติ; ไทยและอังกฤษสอดคล้อง มี version/effective date/history ไม่มี placeholder เหลือ หลักฐาน: ฉบับที่ Legal อนุมัติพร้อมบันทึก review ของ Privacy owner. ไม่ใช้การยอมรับ Terms แทน consent ทุกวัตถุประสงค์

### RB-004 — Publication และ acceptance

เชื่อมฉบับอนุมัติก่อน login/registration, settings และจุด upload ที่เกี่ยวข้อง; acceptance ไม่ติ๊กล่วงหน้า บันทึก account/version/timestamp ผ่านช่องทางที่ตรวจสอบความถูกต้องได้ แยก optional consent และมี policy สำหรับผู้ใช้เดิม/การเปลี่ยนสาระสำคัญ หลักฐาน: schema/migration, UI และ API tests สำหรับข้าม acceptance/ปลอม version/ข้ามสิทธิ์ พร้อม candidate verification; QA และ Legal ตรวจการแสดงข้อความ

### RB-005 — DataLens roles/DPA

บันทึกบทบาทต่อ use case, คำสั่งประมวลผล, confidentiality, subprocessors, retention/return/deletion, rights assistance และ incident cooperation; มี DPA ฉบับที่ใช้ลงนามได้และลงนามกับคู่สัญญาที่ต้องใช้ก่อนรับข้อมูลองค์กร หลักฐาน: Legal decision และ agreement reference; checkbox ของผู้อัปโหลดอย่างเดียวไม่ปิดรายการ

### RB-006 — Vendor evidence

กรอก Supabase/Vercel และ Sentry/AI/ผู้ให้บริการอื่นที่ RB-002 พบให้ครบ: entity, actual config/region, subprocessors, DPA, retention/deletion, transfer decision โดยผู้ตรวจ Legal/Privacy. หลักฐานลงวันที่และผูก environment; provider ที่เลือกปิดต้องพิสูจน์ว่าไม่มี data flow ไปหา provider นั้น การมีเอกสาร template หรือ URL นโยบายอย่างเดียวไม่ครบ

### RB-007 — Retention/rights

แต่ละ inventory item มี retention trigger และระยะเวลาตัวเลข ผู้อนุมัติ deletion mechanism, backup expiry/legal hold และขอบเขตไฟล์ที่ผู้ใช้ export ออกไป; case workflow ครอบคลุม identity verification, access/copy/correction/deletion/restriction/objection/withdrawal ตามที่ Legal ประเมิน หลักฐาน: synthetic case ตั้งแต่รับเรื่องถึงตอบกลับ, deletion/restore checks ที่ไม่ทำข้อมูลลบกลับมา, provider response และ Privacy review

### RB-008 — Incident staffing

เติมชื่อ ผู้สำรอง ช่องทาง และ coverage ใน runbook; ทดสอบการเรียกตัวแต่ละบทบาทและสิทธิ์เข้าถึงเครื่องมือ หลักฐาน: roster และ contact exercise ที่ COO ตรวจ; template ที่มี REQUIRED ยังปิดไม่ได้

### RB-009 — Breach exercise

Legal/Privacy ตรวจ decision tree, trigger/deadline ที่ใช้กับกิจการจริง, processor escalation และข้อความแจ้ง; ซ้อม incident พร้อม timestamps, containment, notify/do-not-notify decisions, recovery และ corrective actions หลักฐาน: tabletop report และ sign-off ของ Incident commander/Privacy/Legal; ห้ามถือว่าเอกสาร runbook เท่ากับผ่านการซ้อม

### RB-010 — Independent security assurance

กำหนด scope/version/environment และอำนาจทดสอบก่อนว่าจ้าง ครอบคลุม web/API, account separation/RLS, MFA/backup-code/AAL semantics, handoff/pairing, file upload/CSV/exports และ mobile ที่เปิดใช้จริง หลักฐาน: independent signed report, critical/high fixes และ retest; ระบุ residual findings กับผู้รับผิดชอบ การปิด critical/high ต้องมีหลักฐานแก้และ retest ไม่ใช่เปลี่ยนสถานะยอมรับเอง

ใช้ candidate/test environment ที่ผูก version ใน RB-015/021/022 ได้ ไม่ต้องเปิดรับข้อมูลจริงก่อน pentest. RB-012 ใช้เงื่อนไข Not Applicable ได้เฉพาะ release ที่ไม่มี Android

### RB-011 — Ownership/licensing

ทำ ownership/assignment/licence record สำหรับ source, dependencies, generated assets, fonts/icons/images/sample data; reconcile กับ SBOM และข้อกำหนด attribution/distribution หลักฐาน: Legal/IP review, root LICENSE/NOTICE ที่อนุมัติและรายการสิทธิ์ของแต่ละ deployable; ไม่เลือก open-source licence หรือรับรองกรรมสิทธิ์แทนเจ้าของ

### RB-012 — Android release

กำหนด signing identity, protected keystore/custody/access, recovery backup และ versioning; สร้าง release AAB/APK ที่เหมาะกับช่องทาง ตรวจ certificate และ install/update บนอุปกรณ์ตัวแทน; ตรวจ permission/store declarations สำหรับช่องทางที่จะใช้ หลักฐาน: artifact digest, signature verification, custody และ rollout/rollback record โดย Security/Release. Debug APK เดิมไม่ใช้ปิด production signing

### RB-013 — DPIA/necessity

ประเมินการเงิน สุขภาพ ตำแหน่ง biometric interface, notification/gallery, AI และ arbitrary CSV ตามข้อมูลจริงของ RB-002; ระบุ necessity, alternatives, controls, residual risk, third-party-data และการตัดสินบทบาท DPO ตามบริบทกิจการ หลักฐาน: Privacy/Legal review และ risk owner ลงชื่อ; ปัญหาที่ต้องแก้ก่อน pilot ต้องปิดหรือปิด feature พร้อมพิสูจน์ ไม่ใช้เอกสารเปล่าปิด gate

### RB-014 — Password protection

ตรวจ Dashboard/plan และผลจริงของ leaked-password protection; บันทึกการเปิดใช้หรือ compensating control ที่ Security อนุมัติพร้อมข้อจำกัด หลักฐาน config ที่ปกปิด secrets และ negative test ใน environment ที่ได้รับอนุญาต; อย่าถือว่าเปิดอยู่จาก dependency version

### RB-015 — Candidate/release governance

เลือก intended source จาก working tree ที่มีหลายงานค้างอย่าง reviewable; commit/tag ที่อนุมัติและ lockfiles/SBOM ผูก artifact; ตรวจ branch rules, PR reviewer, deployment approvals, privileged access, rollback owner และซ้อม rollback หลักฐาน repository settings + CI record + commit/artifact manifest; ไม่ commit เหมารวมทุกไฟล์เพื่อทำให้สถานะสะอาด

### RB-016 — Recovery/outage drills

ซ้อม backup/restore, encrypted account recovery, lost device, stale sync/tombstone/conflict และ provider outage บน platforms/configurations ที่จะรองรับ วัด recovery/data loss เทียบ RTO/RPO ใน RB-017 รวม restore ที่ไม่คืนข้อมูลที่ต้องลบ หลักฐาน test matrix, timestamps, expected/actual, corrective actions และ Operations/QA sign-off

### RB-017 — Support operation

ระบุ support hours, severity, response targets, contact/escalation, supported platforms และ RTO/RPO ที่ทีมรับผิดชอบจริง; ทดสอบรับเรื่องและส่งต่อ หลักฐาน policy + roster + channel test โดย COO; เป้าหมายยังไม่ใช่ SLA ลูกค้าจนผ่าน contract review และรองรับได้จริง

### RB-018 — Pilot measurement/research

กำหนด cohort/objective, notices/consent ตามกิจกรรม, event allow-list และ retention; negative tests ไม่ให้ financial values, merchants, transaction text, notes, credentials, Vault หรือข้อมูลละเอียดอ่อนจาก CSV เข้า telemetry หลักฐาน Product/Privacy review และ test captures. หากไม่ใช้ analytics ให้บันทึกการปิดและวิธีวิจัยที่อนุมัติ ไม่สร้าง KPI อ้างผลลัพธ์ก่อนมีข้อมูล

### RB-019 — Commercial boundary

อนุมัติขอบเขตฟรี/เสียเงินของ Tools/Sync/DataLens, pilot offer, ค่าใช้จ่ายและสมมติฐานที่มีแหล่งข้อมูล, ราคา/เงื่อนไข/การยกเลิกหรือคืนเงินตามข้อเสนอจริงและการตรวจ Legal หลักฐาน offer decision ของ CEO/Product/Finance ที่ส่งต่อ RB-003; pilot ฟรีกำหนดได้โดยไม่อ้างว่าได้ราคา commercial แล้ว

### RB-020 — Deployed release evidence

ผูก approved commit/build digest ของแต่ละ product กับ deployment ID และ configuration; ตรวจ smoke ของ auth/lock/sign-out, data isolation, navigation/handoff และ health ตาม surface หลัง deploy พร้อม rollback reference หลักฐาน dated run ที่ QA/Release ตรวจ. เตรียมได้ด้วย synthetic data และปิดการรับผู้ใช้จริง; จัดทำทะเบียนนี้ไม่อนุญาตให้ deploy อัตโนมัติ

### RB-021 — Supabase parity

ยืนยัน migration/schema parity, database lint, cross-user RLS negative tests, RPC permissions/rate limit/atomic backup-code redemption, auth/MFA configuration และ roles/secrets custody ของ candidate/environment ปัจจุบัน หลักฐานผลทดสอบ/config snapshots ที่ไม่เปิด secrets โดย Security/Database reviewer. ผลที่ S1 รายงานไว้ก่อนหน้าไม่แทนรอบนี้

### RB-022 — Separate deployables

ระบุ Tools/DataLens repo/commit/config/artifact; rerun checks ที่เกี่ยวข้องทั้ง frontend/backend และ auth/API/E2E; ยืนยัน public Tools เทียบ private API, media signing key separation, DataLens token/AAL2 enforcement และคำกล่าวอ้างใน UI/export หลักฐานจาก owner แต่ละ repository; การผ่าน Nexus suite อย่างเดียวไม่ครอบคลุมสองระบบนี้

### RB-023 — Security posture decisions

ทำ threat/risk decision สำหรับ plaintext backup, optional encryption และ cloud metadata, local PIN, recovery/MFA authorization และ CSP inline/broad destinations; ระบุ approved use cases, ข้อความแจ้งผู้ใช้, controls และสิ่งที่ต้อง harden ก่อนข้อมูลจริง หลักฐาน Security review พร้อม tests ที่เกี่ยวข้องกับ candidate

การพบ CSP กว้างหรือ plaintext export ไม่ได้พิสูจน์ว่ามีการโจมตีสำเร็จ และไม่แปลว่าต้องเปลี่ยน architecture โดยอัตโนมัติ ต้องกำหนดมาตรการที่เหมาะกับ data scope ใน RB-002 แล้วพิสูจน์ผล; residual risk ไม่ใช้ยกเว้น critical/high ใน RB-010

### RB-024 — Release decision

สำหรับแต่ละ pilot/launch ระบุ product/platform/cohort/data categories/providers, candidate/deployment manifest และวันที่ตรวจ; ทุก applicable RB ต้อง Closed พร้อมหลักฐาน/ผู้ตรวจ หรือ Not Applicable ที่ลงชื่อและบังคับ scope ได้จริง ไม่มี UNASSIGNED/TBD ที่จำเป็นต่อการดำเนินงานเหลือ

Release authority, Legal/Privacy, Security และ Operations ลงชื่อ GO/NO-GO แยก pilot กับ commercial พร้อมข้อจำกัดและเหตุเปิด gate ใหม่ การอนุมัติทะเบียนงานนี้ไม่ใช่การอนุมัติ release

## 5. ลำดับทำทีละงาน

งานหลัก **RB-001 — Operator และ accountable owners** ยังคง **Blocked** เพราะยังรอข้อเท็จจริง/การแต่งตั้งจากผู้ประกอบการ. ระหว่างรอ ผู้ใช้สั่งให้เดินหน้าหลักฐานทางวิศวกรรมที่ทำได้เองด้วย Luna จึงจัดทำ RB-006, RB-011, RB-012, RB-015–023 ตาม records ลงวันที่ 2026-09-13; งานเหล่านี้ยังไม่ปิดจนกว่าจะมี owner/reviewer และการอนุมัติที่กำหนด. DATA-INVENTORY-001 ส่งมอบแล้วและรอผู้ตรวจที่แต่งตั้งรับรองตามกติกา release.

ลำดับเดิมต่อไปนี้ใช้ติดตามความคืบหน้า; รายการที่ยัง Planned ไม่ได้เริ่มหรือมอบหมายจริง:

1. RB-001 — Operator และ named owners
2. RB-002 — Data Inventory / Data Flow Map: engineering deliverable completed; reviewer acceptance pending
3. RB-006 — Vendor facts
4. RB-005 — DataLens roles/DPA
5. RB-007 — Retention/rights
6. RB-023 — Security posture
7. RB-013 — DPIA/necessity
8. RB-017 — Support/recovery targets
9. RB-019 — Offer/packaging decision
10. RB-003 — Approved notices/terms
11. RB-004 — Publication/acceptance implementation
12. RB-008 — Incident staffing
13. RB-009 — Breach tabletop
14. RB-011 — IP/licensing
15. RB-015 — Source candidate/release governance
16. RB-012 — Android release signing ถ้าอยู่ใน scope
17. RB-014 — Password protection
18. RB-021 — Supabase verification
19. RB-022 — Tools/DataLens verification
20. RB-016 — Recovery/outage drills
21. RB-018 — Pilot research/analytics
22. RB-010 — Independent pentest/retest
23. RB-020 — Deployment evidence/smoke
24. RB-024 — Final decision

หากงานก่อนหน้าต้องรอเจ้าของหรือผู้ตรวจภายนอก ให้รายงานข้อที่ขาดและเสนองานถัดไปที่ dependency พร้อม แล้วหยุดรอผู้ใช้ ไม่เริ่มหลายงานพร้อมกัน

## 6. หลักฐานปิด RB และการบำรุงทะเบียน

ใช้ record ต่อไปนี้เมื่อมีหลักฐานจริง ไม่สร้างค่าลงชื่อหรือกำหนดวันแทนผู้รับผิดชอบ:

| Field | ค่าที่ต้องบันทึก |
| --- | --- |
| Blocker / status | RB-xxx / Planned, In Progress, Blocked, Closed หรือ Not Applicable |
| Scope | Product, platform, cohort, data categories, environment |
| Accountable / implementer / reviewer | ชื่อจริง บทบาท ผู้สำรอง และหลักฐานแต่งตั้ง |
| Target / review date | กำหนดส่งและวันตรวจที่เจ้าของยอมรับ |
| Evidence | Controlled document/test run URI, commit/build/deployment/config version และ timestamp |
| Acceptance result | เกณฑ์ข้อใดผ่าน/ไม่ผ่าน ข้อจำกัดและ corrective actions |
| Exclusion / residual risk | เหตุผล ผู้อนุมัติ วันทบทวน และ control ที่บังคับขอบเขต |
| Reopen trigger | ขอบเขต/source/provider เปลี่ยน, evidence หมดอายุ หรือ regression |

ตรวจจำนวนสถานะ dependency และ source links ทุกครั้งที่ปิดงาน; อัปเดต [Task Registry](../tasks/TASK_REGISTRY.md) สำหรับงานที่เริ่ม/เสร็จ โดยอ้าง RB ID นี้เพื่อไม่สร้าง backlog ที่ขัดกัน

**งาน RBR-001 ส่งมอบครบ:** ครอบคลุม P0 11/P1 7 จาก S1, เพิ่ม 6 รายการเพื่อเชื่อม data inventory และ release evidence, มี owner roles/dependencies/exit criteria และลำดับงาน ไม่มี RB ใดถูกปิดโดยไม่มีหลักฐาน
