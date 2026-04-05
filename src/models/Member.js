const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    lastPayment: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);
