const app = require("./src/app");
const config = require("../auth-service/src/config/env");

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});