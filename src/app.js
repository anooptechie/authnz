const express = require("express");

const authRoutes = require("./api/routes/auth.routes");

const app = express();

app.use(express.json());

// mount auth routes
app.use("/auth", authRoutes);

// temporary root route
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

module.exports = app;