/**
 * REST API Routes for Tally Dashboard
 * -----------------------------------
 * Ekhane shob REST API endpoints define kora hoyeche:
 * 1. GET    /api/companies           - Shob company-r metadata list return kore
 * 2. GET    /api/dashboard/:role     - Specific role-er (CEO, CFO, Accounts, Purchase, Sales) dashboard data pathay
 * 3. GET    /api/ledger/:ledger_id   - Particular ledger-er full statement return kore
 * 4. POST   /api/reset-demo          - Demo data reset kore fresh seed data insert kore
 * 5. POST   /api/upload              - 5GB porjonto Tally XML export file disk-stream kore process kore
 * 6. GET    /api/tally/status        - Live Tally sync/import status check kore
 * 7. DELETE /api/tally               : Imported Tally data remove kore
 */

const express = require('express');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../config/db');
const seedData = require('../utils/seedData');
const { parseTallyXmlFile, mergeVouchers, buildFromVouchers } = require('../utils/tallyParser');

const router = express.Router();

// 5GB size limit in bytes (5 * 1024 * 1024 * 1024)
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Disk Storage: 5GB file uploads RAM-e na rekhe temporary disk-e stream kora hoy
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tally-upload-' + uniqueSuffix + path.extname(file.originalname || '.xml'));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

/**
 * Helper: Find company by company_id
 */
async function getCompany(companyId) {
  const db = getDB();
  const doc = await db.collection('company_data').findOne(
    { company_id: companyId },
    { projection: { _id: 0 } }
  );
  return doc;
}

/**
 * 1. Root API Endpoint
 * GET /api/
 */
router.get('/', (req, res) => {
  res.json({ message: "Tally Dashboards API (Node.js & Express)" });
});

/**
 * 2. Get All Companies
 * GET /api/companies
 */
router.get('/companies', async (req, res, next) => {
  try {
    const db = getDB();
    const docs = await db.collection('company_data')
      .find({}, { projection: { meta: 1, _id: 0 } })
      .limit(100)
      .toArray();

    const companiesMeta = docs.map(d => d.meta);
    res.json(companiesMeta);
  } catch (error) {
    next(error);
  }
});

/**
 * 3. Get Role Dashboard Data
 * GET /api/dashboard/:role?company_id=...
 */
router.get('/dashboard/:role', async (req, res, next) => {
  try {
    const { role } = req.params;
    const companyId = req.query.company_id;

    if (!companyId) {
      return res.status(400).json({ detail: "company_id query parameter is required" });
    }

    const validRoles = ["ceo", "cfo", "accounts", "purchase", "sales"];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(404).json({ detail: "Unknown dashboard role" });
    }

    const doc = await getCompany(companyId);
    if (!doc) {
      return res.status(404).json({ detail: "Company not found" });
    }

    const roleData = doc[role.toLowerCase()];
    if (!roleData) {
      return res.status(404).json({ detail: "Dashboard data unavailable for this role" });
    }

    res.json({
      meta: doc.meta,
      data: roleData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Get Ledger Drill-down Statement
 * GET /api/ledger/:ledger_id?company_id=...
 */
router.get('/ledger/:ledger_id', async (req, res, next) => {
  try {
    const { ledger_id } = req.params;
    const companyId = req.query.company_id;

    if (!companyId) {
      return res.status(400).json({ detail: "company_id query parameter is required" });
    }

    const doc = await getCompany(companyId);
    if (!doc) {
      return res.status(404).json({ detail: "Company not found" });
    }

    const statement = doc.ledger_statements ? doc.ledger_statements[ledger_id] : null;
    if (!statement) {
      return res.status(404).json({ detail: "Ledger not found" });
    }

    res.json({
      meta: doc.meta,
      statement: statement
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. Reset Demo Data
 * POST /api/reset-demo
 */
router.post('/reset-demo', async (req, res, next) => {
  try {
    const db = getDB();

    // Delete non-demo data
    await db.collection('company_data').deleteMany({ "meta.source": { $ne: "Demo Data" } });

    // Generate fresh demo data
    const docs = seedData.buildAll();
    for (const d of docs) {
      await db.collection('company_data').replaceOne(
        { company_id: d.company_id },
        d,
        { upsert: true }
      );
    }

    res.json({
      status: "ok",
      message: "Demo data restored successfully",
      companies: docs.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. Upload Tally XML File (Up to 5GB Streaming Upload)
 * POST /api/upload
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  const tempFilePath = req.file ? req.file.path : null;

  try {
    if (!req.file || !tempFilePath) {
      return res.status(400).json({ detail: "Please provide an XML file to upload." });
    }

    const filename = (req.file.originalname || "").toLowerCase();
    if (!filename.endsWith(".xml")) {
      return res.status(400).json({
        detail: "Please upload a Tally XML export (Daybook/Voucher export as XML)."
      });
    }

    const mode = req.query.mode || "merge";
    
    // Stream parse the file from disk (handles 5GB easily)
    const { companyName, vouchers, ledgers } = await parseTallyXmlFile(tempFilePath);

    if (vouchers.length === 0 && ledgers.length === 0) {
      return res.status(400).json({
        detail: "No vouchers or ledger masters found in the XML. Please export Daybook with vouchers from Tally."
      });
    }

    const db = getDB();
    const companyId = "tally-import";
    const existing = await db.collection('company_data').findOne({ company_id: companyId });

    let merged = vouchers;
    let added = vouchers.length;

    if (existing && mode === "merge" && vouchers.length > 0) {
      const prior = existing.raw_vouchers || [];
      merged = mergeVouchers(prior, vouchers);
      added = Math.max(merged.length - prior.length, 0);
    }

    // Build computed dashboards from parsed data
    const doc = buildFromVouchers(companyId, companyName || "Tally Live Company", merged, ledgers);

    await db.collection('company_data').replaceOne(
      { company_id: companyId },
      doc,
      { upsert: true }
    );

    res.json({
      status: "ok",
      new_vouchers: added,
      total_vouchers: merged.length,
      total_ledgers: doc.meta.ledger_count || ledgers.length,
      import_type: doc.meta.import_type || "vouchers",
      company_id: companyId,
      meta: doc.meta
    });
  } catch (error) {
    next(error);
  } finally {
    // Clean up temporary uploaded file from disk
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to remove temp file:', e.message);
      }
    }
  }
});

/**
 * 7. Tally Connection Status
 * GET /api/tally/status
 */
router.get('/tally/status', async (req, res, next) => {
  try {
    const db = getDB();
    const doc = await db.collection('company_data').findOne(
      { company_id: "tally-import" },
      { projection: { meta: 1, _id: 0 } }
    );

    if (!doc) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      meta: doc.meta
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 8. Disconnect/Delete Tally Import Data
 * DELETE /api/tally
 */
router.delete('/tally', async (req, res, next) => {
  try {
    const db = getDB();
    await db.collection('company_data').deleteOne({ company_id: "tally-import" });
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
