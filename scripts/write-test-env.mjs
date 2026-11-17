// Writes .env.test.local from the running local Supabase stack, so the tests and the app can reach it.
// Usage: npm run db:start && npm run db:env

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const output = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" });
const status = Object.fromEntries(
  output
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
    }),
);

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
];

writeFileSync(".env.test.local", `${lines.join("\n")}\n`);
console.log("Wrote .env.test.local");
