# รายงานตรวจสอบและคืนระบบ Nexus

วันที่ตรวจ: 8 กันยายน 2026

## ขอบเขต

ตรวจ Nexus All, Nexus Main และ Nexus Tools integration โดยเทียบ Router, เมนูเดสก์ท็อป, เมนูมือถือ, Project Hub, โมดูลใน source tree, Git history, เอกสารสถาปัตยกรรม และความสามารถ Native ที่ขึ้นกับสิทธิ์ของ Android การตรวจครั้งนี้ไม่ย้อน repository ทั้งก้อน เพราะ working tree มีการแก้ระบบ PIN, sync, QR pairing, biometric และ slip scanner ที่ใหม่กว่าจุดอ้างอิงใน Git

## สาเหตุที่ระบบเดิมดูเหมือนหาย

ระบบเดิมไม่ได้ถูกลบและไม่มี migration ลบข้อมูล ต้นเหตุหลักคือ Experience Mode กรองเมนูเมื่ออยู่ใน Simple mode ทำให้ analytics, investment, trading, Executive, Schedule, Vault และ Workouts ไม่มีทางเข้าที่มองเห็นได้ แม้ Route และ business logic ยังอยู่ครบ ค่า mode ถูก persist ใน localStorage จึงเกิดกับผู้ใช้เดิมได้แม้ค่าเริ่มต้นในโค้ดเป็น Pro

## การคืนระบบ

- ยกเลิกการกรอง Simple/Pro ทั้งใน Sidebar และ Mobile More
- คืนเมนู Main 25 ปลายทางให้แสดงตลอด
- นำตัวเลือก Experience Mode ออกจาก Settings เพื่อไม่ให้ระบบหายซ้ำ
- ไม่แตะ IndexedDB, Supabase sync records, encryption, PIN, biometric หรือข้อมูลผู้ใช้
- เพิ่ม E2E regression test ตรวจลิงก์ครบทั้งเดสก์ท็อปและมือถือ
- แก้ contrast ของปุ่มลบ/สถานะ destructive 3 จุด

## บัญชีระบบที่เปิดใช้งานอยู่

### Nexus All

- Account login และ session gate
- Project Hub
- Nexus Main entry พร้อม PIN policy
- Nexus Tools entry
- DataLens entry
- ล็อกบัญชี, ออกจากระบบ และ QR pairing สำหรับปลดล็อกคอมจากมือถือ

### Nexus Main

- Dashboard และ Finance Dashboard
- AI Analytics และ AI Coach ผ่าน AI Gateway/Claude fallback
- Transactions, Favorites, Budgets, Goals, Accounts และ Net Worth
- Subscriptions, Categories, Merchants, Recipients และ Reports
- Trading Dashboard, Journal, Portfolio, Strategies, Watchlist และ Economic Calendar
- Executive Dashboard
- Todo, Habits, Life Schedule, Vault และ Workouts
- Settings: theme, language, preferences, PIN, biometric, encryption, sync, MFA, login history, audit log, permissions, imports และ notification capture
- Gallery slip scanning, automatic incremental scan, import review/recovery และ bank-notification transaction capture

### Nexus Tools และระบบเชื่อมต่อ

- Tools เปิดจาก All/Main โดยไม่บังคับ login สำหรับเครื่องมือ local
- Cloud identity handoff ใช้ verified popup message เฉพาะเมื่อจำเป็น
- DataLens เป็น workspace ภายนอกที่แสดงใน All และมีขอบเขต session แยกตามเอกสาร

## ระบบที่ไม่มีเมนูโดยตั้งใจ

- `calendarEvents` เป็น compatibility table จาก Calendar รุ่นเก่า UI ถูกแทนด้วย Life Schedule แล้ว การสร้าง Calendar UI ซ้ำจะทำให้ business logic ซ้ำและเสี่ยงให้ข้อมูลสองชุดไม่ตรงกัน จึงเก็บตารางไว้เพื่อรักษาข้อมูลเดิม
- Gallery scanner ใช้เส้นทางเดียวผ่าน `GalleryScanFlow` และ `useFullGalleryScan`; component orchestrator รุ่นทดลองที่ไม่มี entry point ถูกนำออกแล้วเพื่อลดโค้ดซ้ำ
- scanner devtools, caches, recovery internals, repositories และ migration helpers เป็นเครื่องมือภายใน ไม่ควรเปิดเป็นเมนูผู้ใช้
- ความสามารถ biometric, GPS, gallery access และ notification capture แสดงหรือทำงานเฉพาะ Native App เมื่อ hardware/permission รองรับ

## ผลตรวจคุณภาพ

| ด้าน | คะแนน | หลักฐาน/ข้อจำกัด |
| --- | ---: | --- |
| Accessibility | 4/4 | แก้ contrast ที่ detector พบ 3 จุด; detector รอบหลังไม่พบรายการ แต่ทำงานแบบ degraded จึงมี E2E/axe เป็นหลักประกอบ |
| Performance | 4/4 | Route ใช้ lazy loading, build แยก chunk และ CI บังคับ bundle budget ทุก release build |
| Responsive | 4/4 | E2E ยืนยันเมนูครบที่ desktop 1280px และ mobile 390px |
| Theming | 4/4 | การคืนเมนูใช้ token/class ของ shell เดิม ไม่มีสีหรือ theme ใหม่แยกเฉพาะหน้า |
| Code quality | 4/4 | Route/menu parity ครบ, นำ component ที่ไม่มี consumer ออก และจำกัด lint ให้ตรวจเฉพาะ source/product artifacts |
| **รวม** | **20/20** | ไม่มี P0, P1 หรือรายการแก้ไขคงค้างในขอบเขต release gate นี้ |

## ประเด็นคงเหลือ

- ไม่มี P0-P3 ที่ต้องปิดก่อนนำเสนอผู้บริหาร
- งานต่อจากนี้เป็นการวัดผลภาคสนามบนอุปกรณ์และเครือข่ายจริง ไม่ใช่ข้อบกพร่องที่ยืนยันจาก source หรือ automated validation

## การยืนยัน

- Production build รวม TypeScript: ผ่าน
- Oxlint: ผ่านโดยไม่มี error หรือ warning; tooling copies ถูกตัดออกจาก product lint scope และปิดกฎ Fast Refresh เฉพาะไฟล์ประกาศ router ที่ไม่ใช่ component module
- Dependency security audit: 0 vulnerabilities
- Release bundle budget: ผ่าน — JavaScript รวม 3,705.3 KiB, chunk ใหญ่สุด 452.4 KiB (เกณฑ์ 4 MiB / 500 KiB)
- Impeccable static detector: ไม่พบรายการหลังแก้ contrast; parser อยู่ใน degraded mode
- Playwright system discoverability: 2/2 ผ่าน ตรวจครบ 25 workspace links บน desktop และ mobile
- Vitest full suite: ผ่าน 449/449 ไฟล์ และ 2,784/2,784 tests
- Slip scanner regression หลัง cleanup: ผ่าน 91/91 ไฟล์ และ 454/454 tests
- Executive, accessibility, theme, keyboard และ discoverability browser regression: 17/17 ผ่าน
- Nexus All responsive/accessibility/resource regression: 12/12 ผ่าน
- Authentication, PIN และ cross-tab lock regression: 17/17 ผ่าน
- Mobile constrained performance: ผ่าน — All LCP 3,220 ms, Main LCP 1,424 ms, CLS 0 ทั้งสองหน้า
- Route audit: ทุก Main workspace ใน navigation มี Route รองรับ
