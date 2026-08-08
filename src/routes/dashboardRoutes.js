const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getDashboardStats, getFestivalYearlySummary } = require("../controllers/dashboardController");

router.use(protect);
router.get("/stats", getDashboardStats);
router.get("/festival-yearly-summary", getFestivalYearlySummary);

module.exports = router;
