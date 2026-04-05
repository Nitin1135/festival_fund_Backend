const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getReport, exportCSV } = require("../controllers/reportController");

router.use(protect);
router.get("/", getReport);
router.get("/export/csv", exportCSV);

module.exports = router;
