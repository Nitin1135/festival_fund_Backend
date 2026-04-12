const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const Expense = require("../models/Expense");
const Festival = require("../models/Festival");
const { format, subMonths, startOfMonth, endOfMonth } = require("date-fns");

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    const [
      totalFundsAgg,
      totalMembers,
      pendingMembers,
      todayAgg,
      totalExpenseAgg,
      activeFestival,
    ] = await Promise.all([
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Member.countDocuments(),
      Member.countDocuments({ status: "unpaid" }),
      Transaction.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Festival.findOne({ isActive: true }),
    ]);

    const totalCollection = totalFundsAgg[0]?.total || 0;
    const totalExpense = totalExpenseAgg[0]?.total || 0;
    const openingBalance = activeFestival?.openingBalance || 0;
    const currentBalance = openingBalance + totalCollection - totalExpense;

    // Pending amount = sum of unpaid members' amounts
    const pendingAgg = await Member.aggregate([
      { $match: { status: "unpaid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingAmount = pendingAgg[0]?.total || 0;

    // Monthly collection — last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), "yyyy-MM-dd");
      const end = format(endOfMonth(d), "yyyy-MM-dd");
      const result = await Transaction.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      monthlyData.push({ month: format(d, "MMM"), amount: result[0]?.total || 0 });
    }

    // Payment status pie
    const paid = await Member.countDocuments({ status: "paid" });
    const unpaid = await Member.countDocuments({ status: "unpaid" });
    const paymentStatusData = [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Unpaid", value: unpaid, color: "#ef4444" },
    ];

    // Recent 5 transactions — already have festival, category, type from model
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      kpi: {
        openingBalance,
        currentBalance,
        totalFunds: totalCollection,
        totalExpense,
        pendingAmount,
        totalMembers,
        todayCollection: todayAgg[0]?.total || 0,
        pendingPayments: pendingMembers,
        balance: totalCollection - totalExpense,
      },
      monthlyData,
      paymentStatusData,
      recentTransactions,
      festivalName: activeFestival?.name || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats };
