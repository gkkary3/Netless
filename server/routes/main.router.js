const express = require("express");
const mainRouter = express.Router();
const {
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../middlewares/auth");
mainRouter.get("/", checkAuthenticated, (req, res) => {
  res.render("index");
});
mainRouter.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("auth/login");
});
mainRouter.get("/signup", checkNotAuthenticated, (req, res) => {
  res.render("auth/signup");
});

module.exports = mainRouter;
