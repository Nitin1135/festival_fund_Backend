const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    memberName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ["cash", "upi"], required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
