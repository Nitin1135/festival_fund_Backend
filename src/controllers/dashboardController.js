const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const Expense = require("../models/Expense");
const Festival = require("../models/Festival");
const { format, subMonths, startOfMonth, endOfMonth } = require("date-fns");

// GET /api/dashboard/stats?festival=
const getDashboardStats = async (req, res) => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const { festival } = req.query;

    // Resolve festival record
    const festivalRecord = festival
      ? await Festival.findOne({ name: festival })
      : await Festival.findOne({ isActive: true });

    const txMatch = festival ? { festival } : {};
    const expMatch = festival ? { festival } : {};

    const [
      totalFundsAgg,
      totalMembers,
      pendingMembers,
      todayAgg,
      totalExpenseAgg,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...txMatch, type: "collection" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Member.countDocuments(),
      Member.countDocuments({ status: "unpaid" }),
      Transaction.aggregate([
        { $match: { ...txMatch, date: today, type: "collection" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: expMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalCollection = totalFundsAgg[0]?.total || 0;
    const totalExpense = totalExpenseAgg[0]?.total || 0;
    const openingBalance = festivalRecord?.openingBalance || 0;
    // openingBalance is target amount only — excluded from balance calculation
    const currentBalance = totalCollection - totalExpense;

    // Pending amount = unpaid members' amounts
    const pendingAgg = await Member.aggregate([
      { $match: { status: "unpaid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingAmount = pendingAgg[0]?.total || 0;

    // Monthly collection — last 6 months (festival-scoped)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), "yyyy-MM-dd");
      const end = format(endOfMonth(d), "yyyy-MM-dd");
      const result = await Transaction.aggregate([
        { $match: { ...txMatch, type: "collection", date: { $gte: start, $lte: end } } },
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

    // Recent 5 transactions — festival-scoped
    const recentTransactions = await Transaction.find(txMatch)
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
      },
      monthlyData,
      paymentStatusData,
      recentTransactions,
      festivalName: festivalRecord?.name || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dashboard/festival-yearly-summary?festivalBase=Diwali (optional — if omitted returns ALL festivals)
const getFestivalYearlySummary = async (req, res) => {
  try {
    const { festivalBase } = req.query;

    // If festivalBase provided, filter by it; otherwise return ALL festivals
    const filter = festivalBase
      ? { name: { $regex: festivalBase, $options: "i" } }
      : {};

    const festivals = await Festival.find(filter).sort({ createdAt: -1 });

    if (!festivals.length) return res.json([]);

    const summary = await Promise.all(
      festivals.map(async (fest) => {
        // Extract year from festival name (e.g. "Diwali 2025" -> 2025)
        const yearMatch = fest.name.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date(fest.createdAt).getFullYear();

        const [collectionAgg, expenseAgg, totalMembers, paidMembers] = await Promise.all([
          Transaction.aggregate([
            { $match: { festival: fest.name, type: "collection" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Expense.aggregate([
            { $match: { festival: fest.name } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Member.countDocuments(),
          Transaction.aggregate([
            { $match: { festival: fest.name, type: "collection" } },
            { $group: { _id: "$memberId" } },
            { $count: "count" },
          ]),
        ]);

        const totalCollection = collectionAgg[0]?.total || 0;
        const totalExpense = expenseAgg[0]?.total || 0;
        const openingBalance = fest.openingBalance || 0;
        // openingBalance is target amount only — excluded from balance calculation
        const savingsBalance = totalCollection - totalExpense;
        const closingBalance = savingsBalance;

        // Pending = members who haven't paid in this festival
        const paidMemberIds = await Transaction.distinct("memberId", {
          festival: fest.name,
          type: "collection",
        });
        const pendingMembersCount = await Member.countDocuments({
          _id: { $nin: paidMemberIds },
          status: "unpaid",
        });
        const pendingAgg = await Member.aggregate([
          { $match: { _id: { $nin: paidMemberIds }, status: "unpaid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const pendingAmount = pendingAgg[0]?.total || 0;

        return {
          festivalName: fest.name,
          year,
          openingBalance,
          totalCollection,
          totalExpense,
          closingBalance,
          savingsBalance,
          pendingAmount,
          totalMembers,
          paidMembers: paidMembers[0]?.count || 0,
        };
      })
    );

    // Sort by year descending (latest first)
    summary.sort((a, b) => b.year - a.year);

    // Aggregate totals across all festivals
    const allFestivalsTotalSavings = summary.reduce((s, r) => s + r.savingsBalance, 0);
    const allFestivalsTotalCollection = summary.reduce((s, r) => s + r.totalCollection, 0);
    const allFestivalsTotalExpense = summary.reduce((s, r) => s + r.totalExpense, 0);

    res.json({ summary, allFestivalsTotalSavings, allFestivalsTotalCollection, allFestivalsTotalExpense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats, getFestivalYearlySummary };
