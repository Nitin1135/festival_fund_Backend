const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getTransactionStats,
} = require("../controllers/transactionController");

router.use(protect);

router.get("/stats", getTransactionStats);
router.get("/", getTransactions);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
