const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getExpenses, createExpense, updateExpense, deleteExpense, getExpenseStats,
} = require("../controllers/expenseController");

router.use(protect);
router.get("/stats", getExpenseStats);
router.get("/", getExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
