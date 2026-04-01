const express = require("express");

const app = express();

app.use(express.json());

// temporary root route
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

module.exports = app;