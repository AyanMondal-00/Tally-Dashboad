# Silicon Tally Dashboard (TallyPulse)

A full-stack MERN application designed for Tally ERP 9 and TallyPrime business intelligence and analytics.

---

## 📁 Project Structure

```text
Silicon-Tally-dashboard/
├── .env                  # Unified Environment Configuration (Backend & Frontend)
├── .gitignore            # Git ignore configuration
├── QUICKSTART.txt        # Quick start instructions & REST endpoints guide
├── README.md             # Project documentation
│
├── backend/              # Express.js REST API Server
│   ├── package.json      # Backend dependencies & scripts
│   ├── server.js         # Backend entry point
│   └── src/
│       ├── config/       # MongoDB connection config (db.js)
│       ├── routes/       # API endpoints (api.routes.js)
│       └── utils/        # XML parser (tallyParser.js) & demo data (seedData.js)
│
└── frontend/             # React Dashboard Client (Tailwind CSS, Radix UI, Recharts)
    ├── craco.config.js   # Craco webpack configuration
    ├── package.json      # Frontend dependencies & scripts
    ├── public/           # Static assets (index.html, favicon.svg)
    └── src/
        ├── components/   # UI components (layout, shared, ui)
        ├── context/      # React global context (AppContext.js)
        ├── hooks/        # Custom hooks (useDashboard.js, use-toast.js)
        ├── lib/          # Utilities & API client (api.js, format.js)
        ├── pages/        # Dashboard role views (CEO, CFO, Accounts, Purchase, Sales)
        ├── App.js        # Main React component
        ├── index.css     # Global styles and Tailwind directives
        └── index.js      # React DOM entry point
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ & npm
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

### 2. Configure Environment (`.env`)
The single root `.env` controls both frontend and backend configurations:
```env
# Backend Environment Variables
PORT=8000
MONGO_URL=mongodb://localhost:27017
DB_NAME=tally_pulse_db
CORS_ORIGINS=*

# Frontend Environment Variables
REACT_APP_BACKEND_URL=http://localhost:8000
```

### 3. Run Backend
```bash
cd backend
npm install
npm start
# Server starts on http://localhost:8000
```

### 4. Run Frontend
```bash
cd frontend
npm install
npm start
# Client starts on http://localhost:3000
```
