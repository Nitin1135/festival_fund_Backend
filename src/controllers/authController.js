const User = require("../models/User");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
} = require("../utils/generateTokens");

// @POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    await User.create({ name, email, password, isVerified: true });

    res.status(201).json({ message: "Signup successful." });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// @POST /api/auth/logout
const logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: "" });
  }
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

// @POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token)
      return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(403).json({ message: "Refresh token expired or invalid" });
  }
};

// @GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    verifyEmailToken: hashedToken,
    verifyEmailExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired verification link" });

  user.isVerified = true;
  user.verifyEmailToken = undefined;
  user.verifyEmailExpire = undefined;
  await user.save();

  res.json({ message: "Email verified successfully. You can now log in." });
};

// @POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: "No account with that email" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: `<p>Click below to reset your password:</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>Link expires in 1 hour. Ignore if you didn't request this.</p>`,
      });
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
      console.log("[DEV] Reset URL:", resetUrl);
    }

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: "Password reset successful. You can now log in." });
};

// @GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { signup, login, logout, refreshToken, verifyEmail, forgotPassword, resetPassword, getMe };
