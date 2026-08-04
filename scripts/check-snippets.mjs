import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const referencesDir = join(root, "references");
const outDir = join(root, "._snippets");

/** Exact reviewed executable blocks. Ordinals include non-executable fences. */
const EXPECTED_SNIPPETS = new Map([
  ["errors.md#1", "ts"],
  ["errors.md#2", "python"],
  ["errors.md#3", "ts"],
  ["errors.md#4", "python"],
  ["nextjs.md#1", "ts"],
  ["nextjs.md#2", "tsx"],
  ["nextjs.md#3", "ts"],
  ["nextjs.md#4", "ts"],
  ["node.md#1", "ts"],
  ["node.md#2", "ts"],
  ["node.md#3", "ts"],
  ["node.md#4", "ts"],
  ["node.md#5", "ts"],
  ["node.md#6", "ts"],
  ["python.md#1", "python"],
  ["python.md#2", "python"],
  ["python.md#3", "python"],
  ["python.md#4", "python"],
  ["python.md#5", "python"],
  ["python.md#6", "python"],
  ["react.md#1", "tsx"],
  ["react.md#2", "tsx"],
  ["react.md#3", "tsx"],
  ["react.md#4", "tsx"],
  ["test-data.md#2", "ts"],
  ["webhooks.md#3", "ts"],
  ["webhooks.md#4", "python"],
  ["webhooks.md#5", "ts"],
]);

function firstExisting(paths, label) {
  const found = paths.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`Missing ${label}. Tried: ${paths.join(", ")}`);
  }
  return found;
}

const pythonSdk = firstExisting(
  [resolve(root, "../kicbac-python/sdk-python"), resolve(root, "kicbac-python/sdk-python")],
  "kicbac-python checkout",
);
const jsSdk = firstExisting([resolve(root, "../kicbac-js"), resolve(root, "kicbac-js")], "kicbac-js checkout");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "globals.d.ts"), 'declare module "*.css";\ndeclare module "*.css?raw";\n');

function findTypePackage(packageName) {
  const encoded = packageName.replace("/", "+");
  const pnpmDir = join(jsSdk, "node_modules", ".pnpm");
  const candidates = readdirSync(pnpmDir)
    .filter((entry) => entry.startsWith(`${encoded}@`))
    .sort()
    .reverse()
    .map((entry) => join(pnpmDir, entry, "node_modules", packageName))
    .filter((path) => existsSync(path));
  return firstExisting(candidates, packageName);
}

const typeRoot = join(outDir, "node_modules", "@types");
mkdirSync(typeRoot, { recursive: true });
for (const [name, packageName] of [
  ["node", "@types/node"],
  ["react", "@types/react"],
]) {
  const source = findTypePackage(packageName);
  const dest = join(typeRoot, name);
  try {
    symlinkSync(source, dest, "dir");
  } catch {
    cpSync(source, dest, { recursive: true });
  }
}

const results = new Map();
const tsFiles = [];
const pyFiles = [];
const checkedSources = new Map();
const unmarkedExecutable = [];
const fencePattern = /```([A-Za-z0-9_-]+)\n([\s\S]*?)```/g;

for (const file of readdirSync(referencesDir).filter((name) => name.endsWith(".md")).sort()) {
  const text = readFileSync(join(referencesDir, file), "utf8");
  const stats = { checked: 0, skipped: 0 };
  let index = 0;
  for (const match of text.matchAll(fencePattern)) {
    index += 1;
    const lang = match[1].toLowerCase();
    const code = match[2].replace(/\s+$/, "\n");
    const firstLine = code.split(/\r?\n/, 1)[0]?.trim();
    const isTs = lang === "ts" || lang === "tsx";
    const isPy = lang === "py" || lang === "python";
    const checked =
      (isTs && firstLine === "// @snippet-check") ||
      (isPy && firstLine === "# @snippet-check");
    const source = `${file}#${index}`;
    if (!checked) {
      stats.skipped += 1;
      if (isTs || isPy) unmarkedExecutable.push(source);
      continue;
    }
    stats.checked += 1;
    checkedSources.set(source, isTs ? lang : "python");
    const stem = `${basename(file, ".md")}-${index}`;
    if (isTs) {
      const outPath = join(outDir, `${stem}.tsx`);
      writeFileSync(outPath, code);
      tsFiles.push({ source, path: outPath });
    } else {
      const outPath = join(outDir, `${stem}.py`);
      writeFileSync(outPath, code);
      pyFiles.push({ source, path: outPath });
    }
  }
  results.set(file, stats);
}

const failures = [];

for (const source of unmarkedExecutable) {
  failures.push(`Executable snippet is missing its @snippet-check marker: ${source}`);
}
for (const [source, expectedLanguage] of EXPECTED_SNIPPETS) {
  const actualLanguage = checkedSources.get(source);
  if (actualLanguage === undefined) {
    failures.push(`Expected checked snippet is missing: ${source}`);
  } else if (actualLanguage !== expectedLanguage) {
    failures.push(
      `Checked snippet language changed: ${source} expected ${expectedLanguage}, got ${actualLanguage}`,
    );
  }
}
for (const source of checkedSources.keys()) {
  if (!EXPECTED_SNIPPETS.has(source)) {
    failures.push(`Checked snippet is not in the reviewed manifest: ${source}`);
  }
}
if (checkedSources.size !== EXPECTED_SNIPPETS.size) {
  failures.push(
    `Checked snippet count changed: expected ${EXPECTED_SNIPPETS.size}, got ${checkedSources.size}`,
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
    env: { ...process.env, ...options.env },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

if (tsFiles.length > 0) {
  const tsc = firstExisting(
    [join(jsSdk, "node_modules", ".bin", "tsc")],
    "kicbac-js TypeScript compiler",
  );
  const status = run(tsc, [
    "--noEmit",
    "--jsx",
    "react-jsx",
    "--module",
    "esnext",
    "--moduleResolution",
    "bundler",
    "--strict",
    "--skipLibCheck",
    "--pretty",
    "false",
    "-p",
    "scripts/tsconfig.snippets.json",
  ]);
  if (status !== 0) failures.push("TypeScript snippets failed");
  else for (const item of tsFiles) console.log(`OK ts ${item.source}`);
}

const pythonCandidates = [
  join(pythonSdk, ".venv", "bin", "python"),
  "python3",
];
const python = pythonCandidates.find((candidate) => candidate === "python3" || existsSync(candidate));
for (const item of pyFiles) {
  const status = run(python, ["-m", "mypy", "--strict", item.path], {
    env: { MYPYPATH: join(pythonSdk, "src") },
  });
  if (status !== 0) failures.push(`Python snippet failed: ${item.source}`);
  else console.log(`OK python ${item.source}`);
}

for (const [file, stats] of results) {
  console.log(`${file}: checked ${stats.checked}, skipped ${stats.skipped}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
