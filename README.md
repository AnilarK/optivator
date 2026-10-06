# Local Student Tracking Dashboard

A fast, lightweight, and modern internal recruitment & candidate tracking dashboard built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite with Prisma ORM**.

Designed specifically as a local-only, single-user system. No external cloud databases, no cloud authentication, no third-party infrastructure required. Data persists across Next.js restarts, browser reloads, and system restarts.

---

## Features

- **Local-Only SQLite Persistence**: Database file located at `./data/students.db`.
- **Intelligent CSV Import**:
  - Drag-and-drop or file selection.
  - Preview first 15 records with row-level validation.
  - Duplicate detection: identifies candidates by `Registration No.` or `Email`.
  - Non-destructive updates: updates contact and academic details while **preserving the student's current stage and evaluation notes**.
- **Recruitment Pipeline & Stages**:
  - Stages: `New`, `Stage 1`, `Stage 2`, `Stage 3`, `Selected`, `Rejected`, `On Hold`.
  - Color-coded badges for visual clarity.
  - Quick stage update dropdown directly from the table with instant SQLite update and toast notification.
- **Search & Combinable Filters**:
  - Global search across Name, Email, Registration No., College, Branch, Contact Number.
  - Filter by Stage, College, Branch, Passing Year, Gender, Backlogs, and CGPA range.
  - Dynamic filter dropdowns auto-populated from database values.
- **Bulk Actions**:
  - Select individual rows or "Select All".
  - Move multiple candidates to any stage in bulk with confirmation dialog.
  - Bulk delete with confirmation.
- **Detailed Student Profile (`/students/[id]`)**:
  - Personal details & academic metrics (10th %, 12th %, CGPA, backlogs status).
  - External resume viewer with live embed preview and direct tab launcher.
  - Chronological evaluation notes and comments with inline editing and deletion.
- **Filtered CSV Export**:
  - Download currently filtered candidate cohorts into standard CSV format.
- **Filtered Email**:
  - Select students in the dashboard, compose a subject and message, and email only those selected students.

---

## Requirements

- **Node.js**: v18.17+ or v20+ (tested on Node.js v22 LTS)
- **npm**: v9+ or v10+

---

## Installation & Setup

1. **Clone or navigate to the directory**:
   ```bash
   cd student-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the SQLite database**:
   Run the Prisma migrations to create the database schema:
   ```bash
   npx prisma migrate dev
   ```
   *(The database file will be created at `./data/students.db`)*

4. **Seed initial test data (Optional)**:
   Populate 12 realistic dummy candidate profiles with comments across stages:
   ```bash
   npm run db:seed
   ```

5. **Start the local development server**:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

### Gmail Email Setup

To enable the email action in the selected-student bulk bar, turn on 2-Step Verification for the Gmail account, create a Gmail App Password, and add these values to `.env`:

```env
GMAIL_USER="your-gmail-address@gmail.com"
GMAIL_APP_PASSWORD="your-16-character-app-password"
```

The app password is used only by the server-side Gmail SMTP route. It is never sent to the browser. The email action sends one BCC message to the matching students, using `emailAddress` first and `emailId` as a fallback.

### HackerRank Contest Integration

Configure the HackerRank settings in the ignored `.env` file. The current contest endpoint requires an authenticated HackerRank session: set `HACKERRANK_SESSION_COOKIE` and, if required by HackerRank, `HACKERRANK_CSRF_TOKEN`. Restart the dev server after changing `.env`. Never commit or expose these credentials. This app is local-only and has no application login; do not expose its API routes to an untrusted network.

Apply the schema migration and start the app:

```bash
npx prisma migrate dev
npm run dev
```

Use **Refresh HackerRank** on the dashboard to fetch every leaderboard and submission page. The results are normalized and stored in SQLite; changing dashboard filters does not call HackerRank. A failed sync preserves the last successful snapshot. The status endpoint is `GET /api/hackerrank/sync`; refresh uses `POST /api/hackerrank/sync`.

Students can be matched by the exact HackerRank username entered in the student form or CSV. When no username is present, profiles are matched only by lowercase, whitespace-normalized full name. Duplicate profile names are marked ambiguous; no fuzzy name matching is performed. The `HackerRank Username` CSV column is accepted.

Question order is configured by `HACKERRANK_QUESTION_SLUGS`; the first two entries are used for the Q1/Q2 filters. Other challenge slugs found in contest submissions are retained in each student's question data. The first accepted in-contest submission determines each question's solve time. `time_from_start` is treated as minutes after contest start; `created_at` is used only when `HACKERRANK_CONTEST_START_AT` is set to an ISO-8601 timestamp with timezone.

Dashboard filters include match status, score range, solved-question count, individual Q1/Q2 time limits, and combined both/any question time rules. Filtered CSV exports use the same filter builder.

Run the mocked integration checks with:

```bash
npm run test:hackerrank
```

---

## Database Location & Resetting

- **Location**: The database is stored locally in the file:
  ```text
  ./data/students.db
  ```
- **Reset the Database**:
  To wipe the database clean and re-apply fresh migrations:
  ```bash
  npx prisma migrate reset
  ```
- **Inspect with Prisma Studio**:
  To explore and edit the SQLite database in a visual web interface:
  ```bash
  npx prisma studio
  ```

---

## CSV Import Format & Behavior

The CSV importer supports flexible, case-insensitive column headers commonly exported from Google Forms, Excel, or ATS exports:

| Column Name | Synonyms / Accepted Variants | Description |
| :--- | :--- | :--- |
| `Full Name` | `Name`, `Student Name`, `Candidate Name` | Candidate's name (Required) |
| `Registration No.` | `Reg No`, `Roll No`, `Student ID` | Primary unique candidate identifier |
| `Email Address` | `Email ID`, `Email`, `Mail ID` | Secondary unique candidate identifier |
| `Contact Number` | `Phone Number`, `Phone`, `Mobile` | Candidate contact number |
| `College/ Institute Name:` | `College`, `Institute Name`, `University` | Educational institution |
| `Course/ Degree:` | `Course`, `Degree`, `Program` | B.Tech, B.E., M.Tech, etc. |
| `Specialization / Branch:` | `Branch`, `Specialization`, `Department` | CSE, IT, ECE, Mechanical, etc. |
| `Passing Year` | `Graduation Year`, `Year of Passing`, `Batch` | e.g. 2024, 2025, 2026 |
| `Class 10 Percentage` | `10th %`, `SSC Percentage`, `Class 10` | e.g. 92.4% or 92.4 |
| `Class 12 Percentage` | `12th %`, `HSC Percentage`, `Class 12` | e.g. 89.6% or 89.6 |
| `Current Graduation CGPA` | `Graduation CGPA`, `CGPA`, `GPA` | e.g. 8.75 |
| `Do you have any active backlogs ?` | `Active Backlogs`, `Backlogs` | `No`, `Yes`, or detail string |
| `Resume URL` | `Resume`, `CV URL`, `Resume Link` | Direct link to resume (Google Drive, etc.) |

### Safe Idempotent Re-Import
You can safely upload the same CSV multiple times:
1. **Existing Candidates**: Matched by `Registration No.` or `Email`. Academic and contact details are refreshed.
2. **Preserved Data**: Their existing **Recruitment Stage** and **Evaluation Notes/Comments** are never overwritten.
3. **Summary**: Displays total processed, new additions, updated records, and any skipped rows.

---

## Project Structure

```text
student-tracker/
├── app/
│   ├── layout.tsx                     # Global CRM layout with Sidebar and Toast provider
│   ├── page.tsx                       # Main dashboard with cards, table, and filters
│   ├── globals.css                    # Tailwind CSS definitions
│   ├── students/
│   │   └── [id]/
│   │       └── page.tsx               # Student profile, academics, resume, comments
│   ├── import/
│   │   └── page.tsx                   # CSV upload, preview verification, import commit
│   └── api/
│       ├── students/                  # GET (filter/sort/paginate), POST (create)
│       │   ├── [id]/                  # GET, PATCH, DELETE candidate
│       │   └── bulk-stage/            # PATCH bulk stage updates
│       ├── comments/                  # POST create comment
│       │   └── [id]/                  # PATCH, DELETE comment
│       ├── import/                    # POST parse, preview, and commit CSV import
│       └── export/                    # GET export filtered students to CSV
├── components/
│   ├── layout/                        # Sidebar, Header
│   ├── dashboard/                     # StageStatsCards, MetricsCards, StudentTable, FilterPanel, BulkActionBar, Pagination
│   ├── students/                      # PersonalInfoCard, AcademicInfoCard, ResumeViewer, CommentsSection, EditStudentModal
│   └── ui/                            # Modal, ConfirmDialog, StageBadge, ToastContext
├── lib/
│   ├── prisma.ts                      # Singleton PrismaClient
│   ├── types.ts                       # TypeScript interfaces
│   ├── stages.ts                      # Stage definitions and color badges
│   └── csv.ts                         # Fuzzy column parser and CSV export generator
├── prisma/
│   ├── schema.prisma                  # SQLite schema (Student, Comment)
│   ├── migrations/                    # Migration history
│   └── seed.ts                        # Seed data script
├── data/
│   └── students.db                    # Local SQLite database file
├── sample_students.csv                # Sample CSV for testing
└── package.json
```
