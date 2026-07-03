import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures = [];

const allowedTriggerValues = [
  "overtrading",
  "rule_violation",
  "no_skip_discipline",
  "learning_stall",
  "record_inactivity",
];

const excludedRetentionFiles = new Set([
  path.normalize("supabase/migrations/20260212210000_intervention_management.sql"),
]);

function fail(message, details = []) {
  failures.push({ message, details });
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function walk(relativeDir, extensions) {
  const start = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(start)) return [];

  const files = [];
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(repoRoot, fullPath);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", ".git", "test-results"].includes(entry.name)) continue;
        stack.push(fullPath);
      } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        files.push(relPath);
      }
    }
  }

  return files.sort();
}

function scanFiles(files, pattern) {
  const matches = [];
  for (const file of files) {
    const content = read(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return matches;
}

function checkNoRevenueViewsInInterventionFrontend() {
  const files = [
    "src/pages/admin/InterventionManagementPage.tsx",
    ...walk("src/components/admin", [".ts", ".tsx", ".js", ".jsx"]),
  ].filter((file, index, all) => exists(file) && all.indexOf(file) === index);

  const revenuePattern = /\b(v_user_ltv|v_mrr_arr_summary|v_churn_analysis|lifetime_value|monthly_revenue|churn_reason)\b/i;
  const matches = scanFiles(files, revenuePattern);

  if (matches.length > 0) {
    fail("Intervention frontend must not reference revenue/LTV/churn views or fields.", matches);
  }
}

function checkNoRetentionInterventionTypesReintroduced() {
  const files = [
    ...walk("src", [".ts", ".tsx", ".js", ".jsx"]),
    ...walk("supabase/migrations", [".sql"]),
  ];
  const retentionPattern = /\b(retention_email|discount_offer)\b/;
  const matches = scanFiles(files, retentionPattern).filter((match) => {
    const file = path.normalize(match.split(":")[0]);
    return !excludedRetentionFiles.has(file);
  });

  if (matches.length > 0) {
    fail("Retention-oriented intervention types must not be reintroduced.", matches);
  }
}

function checkAdminLayoutRoleGuard() {
  const file = "src/layouts/AdminLayout.tsx";
  if (!exists(file)) {
    fail("AdminLayout.tsx is missing.");
    return;
  }

  const content = read(file);
  const hasRoleSource = /(is_platform_admin|platform_admins|platform_admin|profiles|role)/.test(content);
  const hasGuardFlow = /(navigate\(|return null|Access denied|Forbidden|権限|認可)/.test(content);

  if (!hasRoleSource || !hasGuardFlow) {
    fail("AdminLayout must include an admin role guard, not only login presence.", [
      `${file}: expected platform admin/profile role lookup plus denial or redirect flow.`,
    ]);
  }
}

function checkInterventionTriggerTypeEnum() {
  const migrationSql = walk("supabase/migrations", [".sql"])
    .map((file) => read(file))
    .join("\n");

  const missingValues = allowedTriggerValues.filter((value) => !new RegExp(`'${value}'`).test(migrationSql));
  const hasEnumType = /\bCREATE\s+TYPE\s+intervention_trigger_type\s+AS\s+ENUM\b/i.test(migrationSql);
  const hasTriggerTypeColumn = /\btrigger_type\s+intervention_trigger_type\s+NOT\s+NULL\b/i.test(migrationSql)
    || /\bALTER\s+COLUMN\s+trigger_type\s+SET\s+NOT\s+NULL\b/i.test(migrationSql);

  if (!hasEnumType || missingValues.length > 0 || !hasTriggerTypeColumn) {
    fail("A-2 schema check failed: governed intervention trigger enum/column is incomplete.", [
      `enum present: ${hasEnumType}`,
      `trigger_type required: ${hasTriggerTypeColumn}`,
      `missing values: ${missingValues.length > 0 ? missingValues.join(", ") : "(none)"}`,
    ]);
  }
}

function getViewNamesFromCreateStatements(sql) {
  const names = new Set();
  const pattern = /\bcreate\s+(?:or\s+replace\s+)?view\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function hasCreateViewSecurityInvoker(sql, viewName) {
  const pattern = new RegExp(
    `\\bcreate\\s+(?:or\\s+replace\\s+)?view\\s+(?:public\\.)?${viewName}\\b[\\s\\S]*?\\bas\\b`,
    "i",
  );
  const statementPrefix = sql.match(pattern)?.[0] ?? "";
  return /security_invoker\s*=\s*true/i.test(statementPrefix);
}

function checkSecurityInvokerForPublicViews() {
  const sqlFiles = [
    ...walk("supabase/migrations", [".sql"]),
    ...walk("supabase/sql", [".sql"]),
  ];
  const sql = sqlFiles.map((file) => read(file)).join("\n");
  const viewNames = getViewNamesFromCreateStatements(sql);
  const hasGenericHardening = /ALTER\s+VIEW\s+%I\.%I\s+SET\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(sql);
  const missingViews = viewNames.filter((viewName) => {
    if (hasCreateViewSecurityInvoker(sql, viewName)) return false;
    if (new RegExp(`ALTER\\s+VIEW\\s+(?:public\\.)?${viewName}\\s+SET\\s*\\(\\s*security_invoker\\s*=\\s*true\\s*\\)`, "i").test(sql)) {
      return false;
    }
    return !hasGenericHardening;
  });

  const hasPublicRevoke = /REVOKE\s+ALL\s+ON\s+TABLE[\s\S]*\bFROM\s+PUBLIC\b/i.test(sql);
  const hasAnonRevoke = /REVOKE\s+ALL\s+ON\s+TABLE[\s\S]*\bFROM\s+anon\b/i.test(sql);
  const hasAuthenticatedRevoke = /REVOKE\s+ALL\s+ON\s+TABLE[\s\S]*\bFROM\s+authenticated\b/i.test(sql);

  if (missingViews.length > 0 || !hasPublicRevoke || !hasAnonRevoke || !hasAuthenticatedRevoke) {
    fail("A-4 schema check failed: public view security_invoker or revoke hardening is incomplete.", [
      `views missing security_invoker coverage: ${missingViews.length > 0 ? missingViews.join(", ") : "(none)"}`,
      `REVOKE PUBLIC present: ${hasPublicRevoke}`,
      `REVOKE anon present: ${hasAnonRevoke}`,
      `REVOKE authenticated present: ${hasAuthenticatedRevoke}`,
    ]);
  }
}

const checks = [
  ["Appendix B: intervention frontend revenue references", checkNoRevenueViewsInInterventionFrontend],
  ["Appendix B: retention intervention type reintroduction", checkNoRetentionInterventionTypesReintroduced],
  ["Appendix B: AdminLayout role guard", checkAdminLayoutRoleGuard],
  ["A-2: governed intervention trigger enum", checkInterventionTriggerTypeEnum],
  ["A-4: public view security invoker and revokes", checkSecurityInvokerForPublicViews],
];

for (const [name, check] of checks) {
  console.log(`governance-check: ${name}`);
  check();
}

if (failures.length > 0) {
  console.error("\nGovernance checks failed:");
  failures.forEach((failure, index) => {
    console.error(`\n${index + 1}. ${failure.message}`);
    failure.details.forEach((detail) => console.error(`   - ${detail}`));
  });
  process.exit(1);
}

console.log("\nGovernance checks passed.");
