const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["decoration", "food", "sound", "transport", "venue", "printing", "other"],
      required: true,
    },
    paymentMode: { type: String, enum: ["cash", "upi"], required: true },
    date: { type: String, required: true },
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
