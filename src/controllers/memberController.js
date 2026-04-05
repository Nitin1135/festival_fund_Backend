const Member = require("../models/Member");

// GET /api/members
const getMembers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") query.status = status;

    const members = await Member.find(query).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/members
const createMember = async (req, res) => {
  try {
    const { name, mobile, amount, status } = req.body;
    if (!name || !mobile || !amount)
      return res.status(400).json({ message: "All fields are required" });

    const member = await Member.create({
      name,
      mobile,
      amount: Number(amount),
      status: status || 'unpaid',
      createdBy: req.user._id,
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/members/:id
const updateMember = async (req, res) => {
  try {
    const { name, mobile, amount, status, lastPayment } = req.body;
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { name, mobile, amount: Number(amount), status, lastPayment },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/members/stats
const getMemberStats = async (req, res) => {
  try {
    const total = await Member.countDocuments();
    const paid = await Member.countDocuments({ status: "paid" });
    const unpaid = await Member.countDocuments({ status: "unpaid" });
    res.json({ total, paid, unpaid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMembers, createMember, updateMember, deleteMember, getMemberStats };
