const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createFestival, getFestivals, getActiveFestival } = require("../controllers/festivalController");

router.use(protect);
router.get("/active", getActiveFestival);
router.get("/", getFestivals);
router.post("/", createFestival);

module.exports = router;
