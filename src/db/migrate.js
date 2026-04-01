const fs = require("fs");
const path = require("path");
const db = require("./postgres");

const runMigrations = async () => {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Running migration: ${file}`);
    await db.query(sql);
  }

  console.log("All migrations completed");
  process.exit(0);
};

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});