const express = require("express");

const {
  signup,
  login,
  refresh,
  me,
  forgotPassword,
  resetPassword
} = require("../controllers/auth.controller");

const authenticate = require("../middleware/authenticate");

const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/signup", authLimiter, signup);

router.post("/login", authLimiter, login);

router.post("/refresh", authLimiter, refresh);

router.post("/forgot-password", authLimiter, forgotPassword);

router.post("/reset-password", authLimiter, resetPassword);

router.get("/me", authenticate, me);

module.exports = router;