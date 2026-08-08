const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");

// GET /api/expenses?festival=&category=
const getExpenses = async (req, res) => {
  try {
    const { category, festival, from, to } = req.query;
    const query = {};
    if (category && category !== "all") query.category = category;
    if (festival && festival !== "all") query.festival = festival;
    if (from && to) query.date = { $gte: from, $lte: to };

    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMode, date, note, festival } = req.body;
    if (!title || !amount || !category || !paymentMode || !date)
      return res.status(400).json({ message: "All fields are required" });

    const expense = await Expense.create({
      title,
      amount: Number(amount),
      category,
      paymentMode,
      date,
      note: note || "",
      festival: festival || "",
      createdBy: req.user._id,
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMode, date, note, festival } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount: Number(amount), category, paymentMode, date, note, festival: festival || "" },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/expenses/stats?festival=
const getExpenseStats = async (req, res) => {
  try {
    const { festival } = req.query;
    const expMatch = festival && festival !== "all" ? { festival } : {};
    const txMatch = festival && festival !== "all" ? { festival, type: "collection" } : { type: "collection" };

    const [totalExpenseAgg, totalCollectionAgg, categoryBreakdown] = await Promise.all([
      Expense.aggregate([
        { $match: expMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: txMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: expMatch },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalExpense = totalExpenseAgg[0]?.total || 0;
    const totalCollection = totalCollectionAgg[0]?.total || 0;
    const balance = totalCollection - totalExpense;

    res.json({ totalExpense, totalCollection, balance, categoryBreakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseStats };
