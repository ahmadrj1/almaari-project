import fs from "node:fs";
import { execSync } from "node:child_process";
import config from "../pr-config.json" with { type: "json" };

const today = new Intl.DateTimeFormat("en-GB")
  .format(new Date())
  .replaceAll("/", "-");

const baseBranch = process.env.PR_BASE || config.mainBranch;

const commits = execSync(
  `git log origin/${baseBranch}..HEAD --pretty=format:"%s"`,
  {
    encoding: "utf-8",
  },
)
  .split("\n")
  .filter(Boolean);

const sections = {
  features: [],
  fixes: [],
  refactors: [],
  performance: [],
  documentation: [],
  tests: [],
  ci: [],
  chores: [],
};

const cleanMessage = (message) => {
  return message
    .replace(/^(feat|fix|refactor|perf|docs|test|ci|chore|style):\s*/i, "")
    .replace(/^./, (char) => char.toUpperCase());
};

for (const commit of commits) {
  const lower = commit.toLowerCase();
  const message = cleanMessage(commit);

  if (lower.startsWith("feat:")) {
    sections.features.push(message);
  } else if (lower.startsWith("fix:")) {
    sections.fixes.push(message);
  } else if (lower.startsWith("refactor:")) {
    sections.refactors.push(message);
  } else if (lower.startsWith("perf:")) {
    sections.performance.push(message);
  } else if (lower.startsWith("docs:")) {
    sections.documentation.push(message);
  } else if (lower.startsWith("test:")) {
    sections.tests.push(message);
  } else if (lower.startsWith("ci:")) {
    sections.ci.push(message);
  } else {
    sections.chores.push(message);
  }
}

const createSection = (title, items) => {
  if (!items.length) return "";

  return `
### ${title}

${items.map((item) => `- ${item}`).join("\n")}
`;
};

const body = `
## 🧠 Introduction

\`${config.projectName}\` is an E-Commerce store project built using ${config.framework}. We have used ${config.database} as our database.

The main branch for this project is \`${config.mainBranch}\`.

---

## 🚀 Changes

Following changes have been made to the project:

${createSection("✨ New Features/Changes", sections.features)}

${createSection("🪲 Bug Fixes and Improvements", sections.fixes)}

${createSection("♻️ Refactoring", sections.refactors)}

${createSection("⚡ Performance", sections.performance)}

${createSection("📝 Documentation", sections.documentation)}

${createSection("✅ Tests", sections.tests)}

${createSection("⚙️ CI/CD", sections.ci)}

${createSection("🔧 Chores", sections.chores)}

---

## 📌 Additional Notes

**_Any major changes or notes will be added here in the later stages of development_**

Generated: ${today}
`;

fs.writeFileSync("pr-body.md", body.trim());

console.log("PR body generated successfully");
