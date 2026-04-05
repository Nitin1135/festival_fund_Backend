const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const { format } = require("date-fns");

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { memberId, amount, paymentMode, date } = req.body;

    if (!memberId || !amount || !paymentMode || !date)
      return res.status(400).json({ message: "All fields are required" });

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    const time = format(new Date(), "hh:mm a");

    const transaction = await Transaction.create({
      memberId,
      memberName: member.name,
      amount: Number(amount),
      paymentMode,
      date,
      time,
      createdBy: req.user._id,
    });

    // Auto-update member status to paid and set lastPayment date
    await Member.findByIdAndUpdate(memberId, {
      status: "paid",
      lastPayment: date,
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/transactions/stats
const getTransactionStats = async (req, res) => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    const todayTotal = await Transaction.aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const overallTotal = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const cashTotal = await Transaction.aggregate([
      { $match: { paymentMode: "cash" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const upiTotal = await Transaction.aggregate([
      { $match: { paymentMode: "upi" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      todayTotal: todayTotal[0]?.total || 0,
      overallTotal: overallTotal[0]?.total || 0,
      cashTotal: cashTotal[0]?.total || 0,
      upiTotal: upiTotal[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTransactions, createTransaction, deleteTransaction, getTransactionStats };
