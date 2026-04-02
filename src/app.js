const express = require("express");

const authRoutes = require("./api/routes/auth.routes");

const authenticate = require("./api/middlewares/authenticate");


const app = express();

app.use(express.json());

// mount auth routes
app.use("/auth", authRoutes);

// temporary root route
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

module.exports = app;