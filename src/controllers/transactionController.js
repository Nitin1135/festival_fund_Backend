const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const Festival = require("../models/Festival");
const { format } = require("date-fns");

// GET /api/transactions?festival=
const getTransactions = async (req, res) => {
  try {
    const { festival } = req.query;
    const query = {};
    if (festival && festival !== "all") query.festival = festival;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { memberId, amount, paymentMode, date, festival } = req.body;

    if (!memberId || !amount || !paymentMode || !date)
      return res.status(400).json({ message: "All fields are required" });

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    // Use festival from body if provided, else fallback to active festival
    let festivalName = festival || "";
    if (!festivalName) {
      const activeFestival = await Festival.findOne({ isActive: true });
      festivalName = activeFestival?.name || "";
    }

    const time = format(new Date(), "hh:mm a");

    const transaction = await Transaction.create({
      memberId,
      memberName: member.name,
      amount: Number(amount),
      paymentMode,
      date,
      time,
      festival: festivalName,
      category: member.category || "",
      type: "collection",
      createdBy: req.user._id,
    });

    await Member.findByIdAndUpdate(memberId, {
      status: "paid",
      lastPayment: date,
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const { memberId, amount, paymentMode, date, festival } = req.body;

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        memberId,
        memberName: member.name,
        amount: Number(amount),
        paymentMode,
        date,
        festival: festival || "",
        category: member.category || "",
      },
      { new: true, runValidators: true }
    );

    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    await Member.findByIdAndUpdate(memberId, {
      status: "paid",
      lastPayment: date,
    });

    res.json(transaction);
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

// GET /api/transactions/stats?festival=
const getTransactionStats = async (req, res) => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const { festival } = req.query;
    const baseMatch = festival && festival !== "all" ? { festival } : {};

    const [todayTotal, overallTotal, cashTotal, upiTotal] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...baseMatch, date: today } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { ...baseMatch, paymentMode: "cash" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { ...baseMatch, paymentMode: "upi" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
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

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionStats };
