const Festival = require("../models/Festival");

// POST /api/festivals
const createFestival = async (req, res) => {
  try {
    const { name, openingBalance } = req.body;
    if (!name) return res.status(400).json({ message: "Festival name is required" });

    // Deactivate all existing festivals
    await Festival.updateMany({}, { isActive: false });

    const festival = await Festival.create({
      name,
      openingBalance: Number(openingBalance) || 0,
      isActive: true,
      createdBy: req.user._id,
    });
    res.status(201).json(festival);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/festivals
const getFestivals = async (req, res) => {
  try {
    const festivals = await Festival.find().sort({ createdAt: -1 });
    res.json(festivals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/festivals/active
const getActiveFestival = async (req, res) => {
  try {
    const festival = await Festival.findOne({ isActive: true });
    res.json(festival || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createFestival, getFestivals, getActiveFestival };
