<div align="center">

# ⚡ SNAP
### Smart Network for Attendance and Presence

**A dual-factor, fraud-resistant attendance system built for modern classrooms.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Patent Pending](https://img.shields.io/badge/Patent-Pending-gold?style=for-the-badge)]()

</div>

---

## 🧠 What is SNAP?

Traditional attendance systems are trivially easy to game — a friend marks you present, or you sign a sheet and walk out. **SNAP eliminates proxy attendance** by requiring two independent verifications that cannot be faked simultaneously:

1. **📍 Live GPS Location** — The student must be physically present within the classroom's geofence.
2. **📷 Time-Bound QR Code** — The student must scan a rotating QR code displayed on the teacher's screen, which regenerates every 5 seconds.

Both factors must pass for attendance to be recorded. Miss either one, and the attempt is rejected.

> 🔐 *Patent Pending — Co-invented as part of academic research at Manipal University Jaipur.*

---

## ✨ Features

### For Students
- **Secure Login** — Authenticate with your official university email credentials. New accounts are auto-provisioned on first login.
- **One-Tap Attendance** — Tap "Mark My Presence", allow location access, and point your camera at the teacher's QR code. Done.
- **Real-Time Camera Scanner** — A live viewfinder with a scanning animation reads the QR code instantly using your device camera.
- **Instant Feedback** — Success or failure is shown immediately with a clear message, including server-side duplicate-submission detection.
- **Logout Cooldown** — A 10-minute cooldown after logout prevents session-sharing abuse between students.

### For the System
- **Rotating QR Codes** — Session QR codes expire every 5 seconds, making screenshots useless for proxy attendance.
- **Server-Side Validation** — Attendance is processed through a PostgreSQL stored procedure (`submit_attendance`) that checks session validity, expiry, and duplicate submissions atomically.
- **Row Level Security (RLS)** — Supabase RLS policies ensure students can only access their own records.
- **Profile Auto-Detection** — Registration numbers are automatically extracted from university email addresses (e.g. `name.registration@muj.manipal.edu`).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Student App (This Repo)              │
│                       Next.js 15 (PWA-ready)                │
│                                                             │
│  ┌────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ Login Page │───▶│ Complete     │───▶│   Dashboard    │  │
│  │            │    │ Profile Page │    │                │  │
│  │ Firebase   │    │ Firebase +   │    │ 1. Get GPS     │  │
│  │ Auth       │    │ Supabase     │    │ 2. Scan QR     │  │
│  └────────────┘    └──────────────┘    │ 3. Submit →    │  │
│                                        │    Supabase    │  │
│                                        └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
  ┌───────────────┐                    ┌──────────────────────┐
  │  Firebase     │                    │  Supabase (PostgreSQL)│
  │  Auth         │                    │                      │
  │  - Student    │                    │  sessions table       │
  │    sign-in    │                    │  attendance table     │
  │  - UID mgmt   │                    │  students table       │
  └───────────────┘                    │  submit_attendance()  │
                                       │  (stored procedure)   │
                                       └──────────────────────┘
```

**Teacher's side** (separate application) generates a session in the `sessions` table and displays a rotating QR code. When a student scans it, the student app reads the `sessionId` and `qrId` from the QR payload, bundles it with their GPS coordinates and Firebase UID, and calls `submit_attendance()` — which validates everything server-side before writing the record.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5 | Type safety across the codebase |
| **Authentication** | Firebase Auth | Student login & UID management |
| **Database** | Supabase (PostgreSQL) | Attendance records, sessions, RLS |
| **Styling** | Tailwind CSS + shadcn/ui | UI components and design system |
| **QR Scanning** | jsQR | In-browser QR code decoding from camera feed |
| **Forms** | React Hook Form + Zod | Form handling and schema validation |
| **Deployment** | Firebase App Hosting | Cloud deployment |

---

## 📂 Project Structure

```
snap-main/
├── src/
│   ├── app/
│   │   ├── login/              # Authentication page
│   │   ├── complete-profile/   # First-time profile setup
│   │   ├── dashboard/          # Main attendance flow
│   │   └── forgot-password/    # Password reset
│   ├── firebase/
│   │   ├── config.ts           # Firebase project config
│   │   ├── auth/               # Auth provider & hooks
│   │   └── provider.tsx        # Firebase context
│   ├── lib/
│   │   └── supabaseClient.ts   # Supabase client init
│   └── components/ui/          # shadcn/ui component library
├── docs/
│   └── blueprint.md            # App concept & style guide
├── schema.sql                  # Full Supabase schema + RLS policies
├── apphosting.yaml             # Firebase App Hosting config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://firebase.google.com/) project with **Email/Password Auth** enabled
- A [Supabase](https://supabase.com/) project

### 1. Clone the Repository

```bash
git clone https://github.com/CodemasterAman/snap.git
cd snap
npm install
```

### 2. Set Up Supabase

Run the schema in your Supabase SQL editor:

```bash
# Open schema.sql in this repo and execute it in your Supabase dashboard
# This creates: students, attendance, sessions tables + RLS policies + submit_attendance()
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase (from your Firebase project settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

> ⚠️ The credentials currently hardcoded in `src/firebase/config.ts` and `src/lib/supabaseClient.ts` are from the development environment. Move these to environment variables before deploying your own instance.

### 4. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:9002`.

### 5. Deploy to Firebase App Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## 🗄️ Database Schema

SNAP uses three core tables in Supabase:

```sql
-- Students: profile information
students (id, full_name, email, registration_number, phone_number, ...)

-- Sessions: teacher-created attendance windows
sessions (id, teacher_id, is_active, expires_at, ...)

-- Attendance: a record for each student check-in
attendance (id, session_id, student_id, latitude, longitude, qr_id, scan_timestamp)
```

The `submit_attendance()` stored procedure handles all validation atomically:
- ✅ Checks the session is active and not expired
- ✅ Checks the student hasn't already submitted for this session
- ✅ Inserts the attendance record
- ✅ Returns a success/failure message with context

---

## 🔒 Security Model

| Threat | How SNAP Addresses It |
|---|---|
| Proxy attendance (marking for absent friend) | GPS + QR both required simultaneously |
| Screenshot/replay of QR code | QR regenerates every 5 seconds |
| Duplicate submissions | Server-side check in `submit_attendance()` |
| Unauthorized data access | Supabase Row Level Security (RLS) on all tables |
| Session sharing after logout | 10-minute login cooldown enforced client-side |
| Invalid QR formats | JSON payload validated before submission |

---

## 🗺️ Roadmap

- [ ] Teacher web dashboard (session creation + live attendance view)
- [ ] Geofencing validation server-side (compare GPS against classroom coordinates)
- [ ] Attendance history view for students
- [ ] Export attendance to CSV/Excel
- [ ] Push notifications for class session start

---

## 👨‍💻 Author

**Aman** — [GitHub @CodemasterAman](https://github.com/CodemasterAman)

*B.Tech Computer Science & Engineering, Manipal University Jaipur*

---

## 📄 License

This project is protected under a pending patent. All rights reserved.
The source code is shared for academic and demonstration purposes only.
Unauthorized commercial use is prohibited.

---

<div align="center">
  <sub>Built with ❤️ to make attendance honest.</sub>
</div>
