# 🔍 TrustWatch

**Automated vendor security monitoring with evidence verification**

TrustWatch tracks vendor trust claims (SOC2, privacy policies, SLA commitments) and alerts you when they change - with proof. Stop manually checking vendor websites. Get automatic alerts with diffs, page numbers, and parsed compliance PDFs.

---

## 🎯 The Problem

Companies make security promises on their websites: "SOC2 Type II certified", "We never sell your data", "99.99% uptime guaranteed". 

**These promises change silently.** 

When a vendor loses their SOC2 certification or weakens their privacy policy, you don't find out until your next audit - or worse, during a breach.

---

## ✨ The Solution

**TrustWatch monitors your vendors 24/7** and alerts you the moment something changes:

- ✅ **Automatic Crawling** - Monitors security, privacy, and compliance pages every 6 hours
- ✅ **Smart Detection** - Identifies REMOVED, WEAKENED, or CHANGED claims using semantic analysis
- ✅ **Instant Alerts** - Email notifications for critical changes with diffs and proof
- ✅ **PDF Verification** - Automatically parses SOC2 reports and ISO certificates to verify claims
- ✅ **Audit Trail** - Complete history with timestamps, page numbers, and original documents

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB Atlas** account (or local MongoDB)
- **API Keys**: Firecrawl, Resend, Reducto

### Installation

```bash
# 1. Clone and install
git clone https://github.com/yourusername/trustwatch.git
cd trustwatch
npm install
npm run install:all

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys and MongoDB URI

# 3. Start the app
npm run dev
```

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:5000

---

## 🎬 Demo Mode

TrustWatch includes a **one-click demo** that shows the system in action:

### Option 1: Quick Demo Button
1. Go to `http://localhost:3000/dashboard`
2. Click **"Demo Critical Risks"** button
3. Instantly see a company with critical security issues

### Option 2: Full Demo Flow
1. Navigate to `http://localhost:3000/demo`
2. Click **"Run Demo"**
3. Watch the system:
   - Add "Acme Demo Company"
   - Crawl baseline security page
   - Crawl modified version
   - Detect 3 critical changes:
     - ❌ SOC2 Type II **removed**
     - ⚠️ Privacy policy **weakened** ("never sell" → "may share")
     - 📉 Uptime **decreased** (99.99% → 99.9%)
   - Send alert email
4. View dashboard for critical issues with diffs

---

## 📋 Key Features

### 1. **Intelligent Claim Extraction**

Automatically detects and tracks:

**Compliance Certifications:**
- SOC 2 Type II / Type I
- ISO 27001
- HIPAA, GDPR, PCI DSS
- FedRAMP, StateRAMP

**Privacy Policies:**
- "Do not sell data"
- Data retention periods
- Third-party sharing policies
- Cookie usage

**SLA Commitments:**
- Uptime percentages (99.9%, 99.99%, etc.)
- Response time guarantees
- Data backup frequencies

### 2. **Smart Change Detection**

**Event Types:**
- 🔴 **REMOVED** (Critical) - Claim disappeared entirely
- 🔴 **WEAKENED** (Critical) - Language softened ("never" → "may")
- 🟡 **NUMBER_CHANGED** (Medium) - Metrics decreased (99.99% → 99.9%)
- 🔵 **ADDED** (Info) - New claim appeared
- 🟡 **REVERSED** (Medium) - Contradicts previous claim

**Severity Classification:**
- **Critical**: SOC2/ISO removed, privacy weakened, encryption downgraded
- **Medium**: SLA decreased, terms updated, data retention reduced
- **Info**: New claims added, pages restructured

### 3. **Evidence Verification** ⭐ (Key Differentiator)

Most monitoring tools just track text changes. **TrustWatch goes deeper:**

- 🔍 **Finds compliance PDFs** automatically (SOC2 reports, ISO certificates, security whitepapers)
- 📄 **Parses PDFs** using Reducto AI - extracts auditor, period, scope
- 📌 **Shows page numbers** - "Found on page 1" for audit trail
- ✅ **Verifies claims** - Cross-references PDF content with website promises
- 🔗 **Provides links** - Click to open original documents

**Example:**
```
Evidence: Airtable ISO 27001 Certificate
Status: ✅ Verified
Auditor: BSI Group
Period: Jan 2024 - Dec 2024
Found on: Page 1
```

### 4. **Real-Time Alerts**

- 📧 Email notifications for critical changes via Resend
- 📊 Dashboard feed with Recent Changes
- 🔔 Severity-based prioritization
- ⏱️ Rate-limited (max 5 critical emails/company/hour)

### 5. **Risk Scoring**

Automatic 0-100 risk score per company:
- +40 for SOC2/ISO removed
- +40 for privacy policy weakened
- +10 for SLA/uptime decreased
- Cap at 100

### 6. **Complete Audit Trail**

- 📅 Full claim history with timestamps
- 🔄 Before/after text diffs
- 🌐 Source URL + page snapshot
- 📎 Linked evidence documents
- ✅ Acknowledgement workflow

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** (App Router) - Modern React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library

### Backend
- **Node.js + Express** - REST API server
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database & ORM
- **JWT** - Authentication
- **Node-cron** - Scheduled crawls
- **Winston** - Logging

### Integrations
- **Firecrawl** - Web scraping & content extraction
- **Reducto** - PDF parsing with OCR
- **Resend** - Email alerts
- **MongoDB Atlas** - Cloud database

---

## 📊 Data Model

### Core Collections

**Companies** → Vendors you're monitoring  
**CrawlTargets** → URLs to crawl per company  
**Claims** → Current state of each security promise  
**ClaimVersions** → Full history of claim changes  
**ChangeEvents** → Detected changes with severity  
**Evidence** → Parsed PDF documents  

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/signup      # Create account
POST   /api/auth/login       # Login
POST   /api/auth/logout      # Logout
GET    /api/auth/me          # Get current user
```

### Companies
```
POST   /api/companies        # Add company to watchlist
GET    /api/companies        # List all companies
GET    /api/companies/:id    # Get company details
DELETE /api/companies/:id    # Remove company
```

### Crawling
```
POST   /api/crawl/run        # Trigger manual crawl
GET    /api/crawl/status     # Get crawl progress
```

### Claims & Events
```
GET    /api/claims           # List all claims
GET    /api/claims/:id       # Claim details
GET    /api/events           # List change events
GET    /api/events/:id       # Event details + diff
POST   /api/events/:id/ack   # Acknowledge event
```

### Evidence
```
GET    /api/evidence         # List evidence documents
```

### Testing
```
GET    /api/test/mongodb     # Test DB connection
POST   /api/test/firecrawl   # Test web scraping
POST   /api/test/resend      # Test email sending
POST   /api/test/reducto     # Test PDF parsing
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` in root and backend directories:

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trustwatch

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-key-change-in-production

# API Keys
FIRECRAWL_API_KEY=fc-xxx
REDUCTO_API_KEY=xxx
RESEND_API_KEY=re_xxx

# App URLs
APP_BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Email (for alerts)
ALERT_TO_EMAIL=your-email@example.com
ALERT_FROM_EMAIL=alerts@trustwatch.com

# Optional
DEMO_MODE=true  # Enable demo adapter for localhost crawling
```

### Scheduled Crawls

Default: Every 6 hours  
Configure in: `backend/src/jobs/crawlScheduler.ts`

```typescript
// Cron expression: "0 */6 * * *" = Every 6 hours
const schedule = '0 */6 * * *';
```

---

## 🧪 Testing

### Test All API Keys

```bash
# Test MongoDB connection
curl http://localhost:5000/api/test/mongodb

# Test Firecrawl scraping
curl -X POST http://localhost:5000/api/test/firecrawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stripe.com/security"}'

# Test Resend email
curl -X POST http://localhost:5000/api/test/resend \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'

# Test Reducto PDF parsing
curl -X POST http://localhost:5000/api/test/reducto \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}'
```

---

## 📈 How We Use Sponsor APIs

### 🔥 Firecrawl (Ingestion Layer)

**Purpose:** Web scraping & content extraction

**How we use it:**
1. Scrape security, privacy, SLA pages
2. Extract clean markdown from HTML
3. Auto-discover additional relevant pages
4. Compute content hashes for change detection

```typescript
const response = await firecrawl.scrape(url);
const cleanText = response.markdown;
const hash = crypto.createHash('sha256').update(cleanText).digest('hex');
```

**Get API Key:** [firecrawl.dev](https://firecrawl.dev)

---

### 🍃 MongoDB Atlas (System of Record)

**Purpose:** Versioned claims database

**How we use it:**
- Store companies, claims, and change events
- Track full history with `ClaimVersions` collection
- Enable temporal queries ("show changes this week")
- Support high-cardinality data (millions of versions)

**Key Collections:**
- `Claims` - Current state
- `ClaimVersions` - Full history
- `ChangeEvents` - Diffs with severity

**Get Started:** [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)

---

### 📧 Resend (Alert Delivery)

**Purpose:** Email notifications for critical changes

**How we use it:**
- Send immediate alerts for critical events
- HTML templates with event summary + diff link
- Rate-limited to prevent spam

**Triggers:**
- SOC2/ISO removed
- Privacy weakened
- SLA decreased

**Get API Key:** [resend.com](https://resend.com)

---

### 📄 Reducto (Evidence Parsing)

**Purpose:** PDF document analysis ⭐ **Key Differentiator**

**How we use it:**
1. Find PDF links in scraped content
2. Parse SOC2 reports, ISO certificates, security whitepapers
3. Extract structured fields:
   - Report type
   - Audit period (dates)
   - Auditor name
   - Page-level content
4. Link evidence to claims for verification
5. Show page numbers for audit trail

```typescript
const result = await reducto.parse(pdfUrl);
// Extracts: "SOC 2 Type II | Jan-Dec 2024 | Deloitte | Page 1"
```

**Get API Key:** [reducto.ai](https://reducto.ai)

---

## 🎨 Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/auth/signup` | Create account |
| `/auth/login` | Sign in |
| `/dashboard` | Main dashboard (protected) |
| `/companies/:id` | Company details (Claims, Changes, Evidence tabs) |
| `/claims/:id` | Claim timeline |
| `/events/:id` | Change event diff viewer |
| `/demo` | One-click demo |

---

## ⚠️ Known Limitations

1. **Extraction Accuracy**: Rule-based extraction may have false positives from marketing language
2. **PDF Access**: Some PDFs are behind authentication (customer portals) - we show clear error messages
3. **Rate Limits**: Large companies may hit API limits - use scheduled crawls
4. **First Crawl "Changes"**: Initial crawl creates "ADDED" events - this establishes baseline
5. **Demo Mode**: Demo sites run on localhost with `DEMO_MODE=true` adapter

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy
```
Set environment variables in Vercel dashboard.

### Backend (Render / Fly.io)
```bash
cd backend
# Deploy to your preferred platform
# Set all environment variables in hosting config
```

**Environment Variables Required:**
- All vars from `.env.example`
- Update `APP_BASE_URL`, `BACKEND_URL`, `FRONTEND_URL` to production URLs

---

## 📝 Logging

Comprehensive logging for debugging:

- **Console logs**: Development debugging
- **File logs**: 
  - `backend/logs/app.log` (all logs)
  - `backend/logs/error.log` (errors only)
- **Crawl logs**: Each crawl run with stats
- **Event logs**: All change events tracked

**Log levels:** `error`, `warn`, `info`, `debug`

---

## 🎯 Project Structure

```
TrustWatch/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   │   ├── firecrawl.ts    # Web scraping
│   │   │   ├── reducto.ts      # PDF parsing
│   │   │   ├── email.ts        # Alerts
│   │   │   └── claimExtractor.ts # Claim detection
│   │   ├── jobs/            # Scheduled tasks
│   │   └── utils/           # Helpers
│   └── logs/                # Log files
├── frontend/
│   ├── src/
│   │   └── app/             # Next.js pages
│   │       ├── dashboard/   # Main dashboard
│   │       ├── companies/   # Company details
│   │       └── auth/        # Login/signup
│   └── public/              # Static assets
├── demo-sites/              # Static demo pages
├── .env                     # Environment variables
└── README.md                # This file
```

---

## 🤝 Contributing

This is a YC hackathon project. For production use, consider:

- [ ] Add comprehensive test suite
- [ ] Implement queue system (BullMQ + Redis)
- [ ] Add webhook integrations (Slack, Jira, PagerDuty)
- [ ] Improve extraction with LLM-based parsing
- [ ] Add claim dispute/verification workflow
- [ ] White-label options for enterprises
- [ ] API for programmatic access

---

## 📜 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with amazing sponsor APIs:
- **Firecrawl** for intelligent web scraping
- **MongoDB Atlas** for scalable database
- **Resend** for reliable email delivery
- **Reducto** for advanced PDF parsing

---

## 💬 Questions?

**Need help?** Check logs in `backend/logs/app.log`

**Ready to demo?** Visit `http://localhost:3000/demo` 🚀

**Want to monitor a vendor?** Add them at `http://localhost:3000/dashboard`

---

<div align="center">

**🔍 TrustWatch - We watch your vendors so you don't have to.**

Built for YC Hackathon 2026

</div>
