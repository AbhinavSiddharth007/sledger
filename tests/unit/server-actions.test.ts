import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every exported Server Action must check the session before doing anything else. This reads
// the source, so a new action that skips the check fails the suite.
const ROOT = process.cwd();

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return actionFiles(full);
    return name === "actions.ts" ? [full] : [];
  });
}

const files = actionFiles(path.join(ROOT, "app")).filter((file) =>
  readFileSync(file, "utf8").startsWith('"use server"'),
);

describe("Server Actions", () => {
  it("are found", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`check the session first in ${path.relative(ROOT, file)}`, () => {
      const source = readFileSync(file, "utf8");
      const actions = [...source.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\n([^\n]*)/g)];

      expect(actions.length).toBeGreaterThan(0);
      for (const [, name, firstLine] of actions) {
        expect(firstLine, `${name} must call requireUser() or redirectIfSignedIn() first`).toMatch(
          /await (requireUser|redirectIfSignedIn)\(\)/,
        );
      }
    });
  }
});
