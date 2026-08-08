const Transaction = require("../models/Transaction");
const Member = require("../models/Member");

// GET /api/reports?from=&to=&memberId=&festival=
const getReport = async (req, res) => {
  try {
    const { from, to, memberId, festival } = req.query;
    const query = {};

    if (from && to) query.date = { $gte: from, $lte: to };
    else if (from) query.date = { $gte: from };
    else if (to) query.date = { $lte: to };

    if (memberId && memberId !== "all") query.memberId = memberId;
    if (festival && festival !== "all") query.festival = festival;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    const totalMembers = await Member.countDocuments();

    const totalCollection = transactions.reduce((s, t) => s + t.amount, 0);
    const contributingMembers = new Set(transactions.map((t) => t.memberId.toString())).size;
    const averagePayment = transactions.length > 0 ? Math.round(totalCollection / transactions.length) : 0;

    res.json({ transactions, totalCollection, contributingMembers, averagePayment, totalMembers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/export/csv?from=&to=&memberId=&festival=
const exportCSV = async (req, res) => {
  try {
    const { from, to, memberId, festival } = req.query;
    const query = {};

    if (from && to) query.date = { $gte: from, $lte: to };
    if (memberId && memberId !== "all") query.memberId = memberId;
    if (festival && festival !== "all") query.festival = festival;

    const transactions = await Transaction.find(query).sort({ date: -1 });

    const rows = [
      ["Transaction ID", "Member Name", "Festival", "Amount", "Payment Mode", "Date", "Time"],
      ...transactions.map((t) => [
        t._id.toString().slice(-6).toUpperCase(),
        t.memberName,
        t.festival || "-",
        t.amount,
        t.paymentMode.toUpperCase(),
        t.date,
        t.time,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=report.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getReport, exportCSV };
