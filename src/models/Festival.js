const mongoose = require("mongoose");

const festivalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Festival", festivalSchema);
