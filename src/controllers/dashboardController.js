const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const Expense = require("../models/Expense");
const { format, subMonths, startOfMonth, endOfMonth } = require("date-fns");

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    // KPI counts
    const [totalFunds, totalMembers, pendingPayments, todayAgg, totalExpenseAgg] = await Promise.all([
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Member.countDocuments(),
      Member.countDocuments({ status: "unpaid" }),
      Transaction.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const totalCollection = totalFunds[0]?.total || 0;
    const totalExpense = totalExpenseAgg[0]?.total || 0;

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
      monthlyData.push({
        month: format(d, "MMM"),
        amount: result[0]?.total || 0,
      });
    }

    // Payment status pie
    const paid = await Member.countDocuments({ status: "paid" });
    const unpaid = await Member.countDocuments({ status: "unpaid" });
    const paymentStatusData = [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Unpaid", value: unpaid, color: "#ef4444" },
    ];

    // Recent 5 transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      kpi: {
        totalFunds: totalCollection,
        totalMembers,
        pendingPayments,
        todayCollection: todayAgg[0]?.total || 0,
        totalExpense,
        balance: totalCollection - totalExpense,
      },
      monthlyData,
      paymentStatusData,
      recentTransactions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats };
