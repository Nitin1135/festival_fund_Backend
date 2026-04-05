const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  getMemberStats,
} = require("../controllers/memberController");

router.use(protect); // all routes protected

router.get("/stats", getMemberStats);
router.get("/", getMembers);
router.post("/", createMember);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);

module.exports = router;
