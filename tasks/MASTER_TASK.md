Nexus MASTER_TASK

Execution Rules

Execute tasks sequentially.

Finish one task before starting the next.

Update TASK_REGISTRY.md.

Build, test, update docs.

OCR Tasks

# OCR-001 — Gallery Scanner System Architecture

Objective

Design a production-ready Gallery Slip Scanner architecture.

The system must automatically scan every image inside the user's gallery with a single tap.

The architecture must follow the existing Nexus Local-first architecture.

Do not implement code.

Requirements

Support:

- Scan every image automatically.
- Background scanning.
- Incremental scanning.
- Scan cache.
- Multi-thread queue.
- QR detection.
- OCR fallback.
- EMVCo payload parsing.
- Bank identification.
- Duplicate detection.
- Import preview.
- Secure local storage.
- Enterprise security.
- AI-ready architecture.

Deliver:

1. Architecture
2. Folder structure
3. Data flow
4. Module responsibilities
5. Database
6. Services
7. Repositories
8. Stores
9. Hooks
10. Performance strategy
11. Security
12. Error handling
13. Testing
14. Future extensibility

# OCR-002 — Implementation Roadmap

Based on OCR-001,

Create a complete implementation roadmap.

Break the project into implementation tasks.

Each task must contain:

- Task ID
- Goal
- Priority
- Dependencies
- Estimated complexity
- Definition of Done

Do not implement.

# OCR-003 — Database Design

Design the local database.

Support:

- Gallery cache
- Scan history
- QR cache
- OCR cache
- Duplicate cache
- Import history
- Bank metadata
- Progress state
- Worker queue

Deliver:

- Dexie schema
- Future PostgreSQL schema
- Relationships
- Indexes
- Migration strategy

# OCR-004 — API & Interface Design

Design every interface.

Include:

- DTOs
- Domain Models
- Services
- Repositories
- Stores
- Hooks
- Events

Follow existing Nexus architecture.

# OCR-005 — Gallery Permission Manager

Implement gallery permission handling.

Requirements

Support:

- Android 13+
- Android 14+
- Android 15+
- Permission recovery
- Permission denial flow

Validate:

Build
TypeScript
ESLint

# OCR-006 — Gallery Scanner

Implement automatic gallery scanning.

Requirements

- Scan every image.
- Background processing.
- Incremental scan.
- Progress reporting.
- Pause.
- Resume.
- Cancel.

# OCR-007 — Scan Queue

Implement Worker Queue.

Requirements

- Queue management
- Concurrent workers
- Dynamic batching
- Memory protection
- Retry failed jobs
- Resume interrupted scans

# OCR-008 — Scan Cache

Implement scan cache.

Cache:

- Image ID
- Hash
- Last modified
- Scan timestamp
- Scan status

Skip unchanged images.

# OCR-009 — QR Detector

Implement QR detection.

Requirements

- Scan every image.
- Detect QR.
- Ignore non-QR images.
- Background execution.
- Return QR payload.

Do not parse payload.

# OCR-010 — Payload Parser

Implement EMVCo payload parser.

Extract:

- PromptPay
- Merchant
- Bank
- Amount
- Currency
- Reference IDs
- Timestamp

Validate payload integrity.

# OCR-011 — Bank Identification

Automatically identify banks.

Support:

- SCB
- KBank
- Krungthai
- Bangkok Bank
- Krungsri
- TTB
- UOB
- GSB
- BAAC
- PromptPay

Future banks must be plug-in based.

# OCR-012 — OCR Fallback

Implement OCR.

Use OCR only when:

- QR missing
- QR damaged
- QR unreadable

Extract:

- Amount
- Date
- Time
- Reference
- Merchant

# OCR-013 — Duplicate Detection

Implement duplicate detection.

Compare:

- Payload
- Ref1
- Ref2
- Amount
- Timestamp
- Merchant
- Bank

Prevent duplicate imports.

# OCR-014 — Bank Selection Popup

Implement the bank selection popup before scanning.

Requirements

Allow users to choose which banks to scan.

Support:

- Select All
- Deselect All
- Remember previous selection
- Search bank
- Quick select

Display:

- Estimated image count
- Estimated scan time

# OCR-015 — Import Preview

Implement Import Preview.

Display:

- Thumbnail
- Bank
- Amount
- Date
- Time
- Merchant
- Duplicate status
- Confidence score

Allow:

- Select All
- Filter
- Search
- Import Selected

# OCR-016 — Smart Import

Implement Smart Import.

Requirements

- Batch import
- Transaction rollback
- Progress
- Resume
- Error recovery

# OCR-017 — Security

Implement security.

Support:

- Local encryption
- Secure cache
- Secure deletion
- Permission audit
- Import audit
- Tamper detection

# OCR-018 — Performance Optimization

Optimize:

- Memory
- CPU
- Worker Queue
- Incremental scan
- Cache hit ratio

Target:

Support over 50,000 images.

# OCR-019 — AI Validation

Implement AI validation.

Requirements

Verify:

- Amount
- Merchant
- Date
- Duplicate probability
- Confidence

AI must never modify imported data automatically.

# OCR-020 — Scanner Analytics

Create analytics.

Track:

- Images scanned
- QR detected
- OCR used
- Cache hit
- Import success
- Duplicate rate
- Average scan speed

# OCR-021 — Testing

Implement:

- Unit Tests
- Integration Tests
- Performance Tests
- Stress Tests
- Security Tests
- Memory Tests

Target:

100% critical-path coverage.

# OCR-022 — Final Review

Review the entire Gallery Scanner module.

Perform:

- Architecture Review
- Security Review
- Performance Review
- Accessibility Review
- Maintainability Review

Run:

- Build
- TypeScript
- ESLint
- All Tests

Update:

- TASK_REGISTRY.md
- ROADMAP.md
- CHANGELOG.md
- TECHNICAL_DEBT.md
- ENGINEERING_AUDIT.md

Generate the final engineering report.

# OCR-023 — Smart Scan Scheduler

Implement Smart Scan Scheduler.

Requirements

Support:

- Manual scan
- Scheduled scan
- Scan on app startup
- Scan only new images
- Battery-aware scheduling
- Charging-aware scheduling

Do not rescan previously scanned images.

# OCR-024 — Image Hash Engine

Implement image hashing.

Requirements

Generate:

- SHA-256
- Perceptual Hash (pHash)

Support:

- Duplicate image detection
- Modified image detection

# OCR-025 — Slip Validation Engine

Implement Slip Validation Engine.

Validate:

- EMVCo format
- PromptPay payload
- Amount validity
- Timestamp validity
- Merchant format
- Reference format

Assign a confidence score.

# OCR-026 — QR Recovery Engine

Implement QR Recovery.

Recover QR from:

- Rotated images
- Dark images
- Blurry images
- Low resolution
- Cropped images

Retry automatically.

# OCR-027 — Image Enhancement

Implement preprocessing.

Support:

- Auto crop
- Auto rotate
- Contrast enhancement
- Noise reduction
- Sharpen
- Grayscale conversion

Only process when necessary.

# OCR-028 — OCR Text Engine

Implement OCR Text Engine.

Extract:

- Amount
- Date
- Time
- Merchant
- Sender
- Receiver
- Reference

Provide confidence for every field.

# OCR-029 — Slip Classifier

Implement Slip Classification.

Identify:

- Bank Slip
- PromptPay
- Transfer
- Deposit
- Withdrawal
- Bill Payment
- Unknown

# OCR-030 — Bank Template Engine

Implement Bank Template Engine.

Each bank must have:

- Template
- Logo
- Colors
- Layout
- OCR Mapping
- Parser

Support future banks without changing business logic.

# OCR-031 — Smart Duplicate Engine

Implement intelligent duplicate detection.

Compare:

- QR payload
- OCR fields
- Amount
- Merchant
- Timestamp
- Image hash

Calculate duplicate probability.

# OCR-032 — Import Conflict Resolver

Implement conflict resolution.

Support:

- Replace
- Skip
- Merge
- Keep both

Allow batch resolution.

# OCR-033 — Background Worker

Implement Background Worker.

Support:

- Queue
- Retry
- Pause
- Resume
- Cancellation

Never block the UI thread.

# OCR-034 — Scan Progress Dashboard

Implement Scan Dashboard.

Display:

- Images scanned
- QR detected
- OCR processed
- Imported
- Remaining
- Speed
- ETA

Update in real time.

# OCR-035 — Import History

Implement Import History.

Store:

- Import date
- Source
- Bank
- Amount
- Status
- Duration
- Errors

Allow filtering and search.

# OCR-036 — Performance Monitor

Implement Performance Monitor.

Track:

- CPU usage
- Memory usage
- Cache hit ratio
- Scan speed
- OCR speed
- QR speed

Store metrics locally.

# OCR-037 — Recovery System

Implement Recovery System.

Recover from:

- App crash
- Device reboot
- Interrupted scan
- Failed import

Resume automatically.

# OCR-038 — Security Audit

Implement Security Audit.

Log:

- Permission changes
- Import actions
- Deletions
- Failed validations
- Suspicious activity

Store securely.

# OCR-039 — Developer Tools

Implement Developer Tools.

Support:

- Debug scanner
- Replay scans
- Export logs
- Performance profiling
- Validation reports

Development builds only.

# OCR-040 — Production Readiness

Perform a full production review.

Verify:

- Architecture
- Security
- Performance
- Accessibility
- UX
- Maintainability
- Documentation

Run:

- TypeScript
- ESLint
- Tests
- Build

Update:

- TASK_REGISTRY.md
- ROADMAP.md
- CHANGELOG.md
- TECHNICAL_DEBT.md
- SECURITY.md
- ENGINEERING_AUDIT.md

Generate a production readiness report.

# OCR-041 — AI Slip Verification

Implement AI Slip Verification.

Requirements

Validate:

- QR payload consistency
- OCR consistency
- Bank template consistency
- Timestamp consistency
- Amount consistency
- Merchant consistency

Calculate:

- Authenticity score
- Confidence score
- Risk score

Never modify imported data automatically.

# OCR-042 — Fraud Detection Engine

Implement Fraud Detection.

Detect:

- Edited slips
- Fake screenshots
- Duplicate reuse
- Impossible timestamps
- Invalid payload
- Suspicious OCR mismatch

Assign risk levels:

- Low
- Medium
- High

Generate fraud reasons.

# OCR-043 — AI Transaction Categorization

Automatically classify transactions.

Categories:

- Food
- Transport
- Shopping
- Bills
- Education
- Healthcare
- Entertainment
- Salary
- Investment
- Others

Support user corrections.

Learn from corrections.

# OCR-044 — Merchant Intelligence

Create Merchant Intelligence.

Identify:

- Merchant aliases
- Merchant chains
- Merchant locations
- Spending frequency

Merge duplicate merchants.

Generate merchant profiles.

# OCR-045 — Smart Learning Engine

Implement learning engine.

Learn:

- Preferred category
- Merchant mapping
- OCR corrections
- Bank naming
- User corrections

All learning must remain local.

No cloud AI required.

# OCR-046 — Confidence Engine

Create confidence engine.

Combine confidence from:

- QR
- OCR
- Parser
- Bank Template
- AI Validation

Generate one overall confidence score.

# OCR-047 — Transaction Linking

Automatically detect related transactions.

Examples:

- Transfer + Fee
- Split Payment
- Installments
- Refund
- Cashback

Create relationship graph.

# OCR-048 — Spending Intelligence

Generate insights.

Detect:

- Spending habits
- Frequent merchants
- Monthly trends
- Abnormal expenses

Generate AI explanations.

# OCR-049 — AI Quality Review

Review imported transactions.

Detect:

- Missing data
- Incorrect OCR
- Wrong categories
- Low confidence
- Duplicate risks

Generate review recommendations.

# OCR-050 — Financial Intelligence Report

Generate Financial Intelligence Report.

Include:

- Import accuracy
- OCR accuracy
- AI confidence
- Fraud summary
- Duplicate summary
- Merchant analysis
- Spending analysis

Export:

- PDF
- CSV
- JSON

# PLT-001 — Plugin SDK

Design a plugin architecture.

Requirements

Allow external modules to register:

- Banks
- OCR Providers
- AI Providers
- Importers
- Exporters
- Analytics
- Validators

Plugins must be sandboxed.

Do not implement.

# PLT-002 — Event Bus

Design a centralized Event Bus.

Support:

- Publish
- Subscribe
- Replay
- Event history
- Priority
- Async events

Every module must communicate through events.

# PLT-003 — Background Task Engine

Implement a background task engine.

Support:

- Priority queue
- Retry
- Scheduling
- Progress
- Cancellation
- Persistence

Must survive app restart.

# PLT-004 — File Import Framework

Create a universal import framework.

Support:

- Images
- PDF
- CSV
- Excel
- JSON

Future formats must be plugin-based.

# PLT-005 — Export Framework

Create a universal export framework.

Support:

- PDF
- CSV
- Excel
- JSON

Plugins may register new exporters.

# PLT-006 — Notification Center

Implement Notification Center.

Support:

- Success
- Warning
- Error
- Progress
- Background tasks

Notifications must be persistent.

# PLT-007 — Audit Log

Create Audit Log.

Track:

- Imports
- Exports
- Settings
- Security
- AI Decisions
- OCR Decisions

Support search and filters.

# PLT-008 — Feature Flags

Implement Feature Flags.

Support:

- Local flags
- Developer flags
- Experimental features
- Rollback

# PLT-009 — Settings Framework

Create a modular settings framework.

Every module must register its own settings.

Support:

- Import
- Export
- Versioning
- Migration

# PLT-010 — Configuration Manager

Implement centralized configuration.

Support:

- Defaults
- Validation
- Migration
- Environment profiles

# PLT-011 — Global Search

Implement global search.

Search:

- Transactions
- Merchants
- Slips
- AI Reports
- Logs
- Tasks

Support fuzzy search.

# PLT-012 — Filter Engine

Implement a reusable filtering engine.

Support:

- Date
- Amount
- Merchant
- Bank
- Category
- Status

Reusable across every module.

# PLT-013 — Table Engine

Create reusable data tables.

Support:

- Sorting
- Filtering
- Pagination
- Virtualization
- Export

# PLT-014 — Dashboard Framework

Create modular dashboards.

Widgets:

- Register dynamically
- Drag & Drop
- Resize
- Persist layout

# PLT-015 — Widget SDK

Allow modules to create widgets.

Widgets may expose:

- Charts
- KPIs
- Lists
- Actions

# PLT-016 — Local AI Gateway

Create an AI Gateway.

Support:

- Local AI
- Ollama
- LM Studio
- Future providers

The application must not depend on one provider.

# PLT-017 — AI Memory

Implement AI Memory.

Store:

- Corrections
- User preferences
- Merchant aliases
- Category mappings

Everything stays local.

# PLT-018 — Command Palette

Implement a global command palette.

Support:

- Search commands
- Navigate
- Quick actions
- AI actions

Shortcut:

Ctrl + K

# PLT-019 — Local Telemetry

Collect local metrics.

Track:

- Performance
- Errors
- Memory
- CPU
- Startup time

Never send data online.

# PLT-020 — Platform Certification

Perform a complete platform review.

Review:

- Architecture
- Security
- Performance
- Testing
- Accessibility
- Maintainability
- Documentation

Run:

- TypeScript
- ESLint
- Tests
- Build

Update:

- TASK_REGISTRY.md
- ROADMAP.md
- CHANGELOG.md
- TECHNICAL_DEBT.md
- ENGINEERING_AUDIT.md

Generate the final platform report.