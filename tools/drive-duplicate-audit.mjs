#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const ARCHIVE_EXTENSIONS = new Set([".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif", ".bmp", ".tif", ".tiff"]);

function parseArgs(argv) {
  const args = {
    root: null,
    outDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      args.root = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--out-dir") {
      args.outDir = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printUsage() {
  console.log([
    "Usage:",
    "  node tools/drive-duplicate-audit.mjs --root /path/to/folder [--out-dir ./audit-output]",
    "",
    "What it does:",
    "  - scans a local folder tree",
    "  - reports exact duplicate files by content hash",
    "  - reports same-name collisions",
    "  - compares archive contents against folder trees",
    "  - never deletes, moves, or renames anything",
  ].join("\n"));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function hashFile(filePath) {
  const stream = await fs.open(filePath, "r");
  try {
    const hash = createHash("sha256");
    const buffer = Buffer.alloc(1024 * 1024);

    while (true) {
      const { bytesRead } = await stream.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) {
        break;
      }
      hash.update(buffer.subarray(0, bytesRead));
    }

    return hash.digest("hex");
  } finally {
    await stream.close();
  }
}

function shouldIgnoreEntry(entryName) {
  return IGNORED_NAMES.has(entryName);
}

function isArchiveFile(fileName) {
  return ARCHIVE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function relPosix(base, fullPath) {
  return path.relative(base, fullPath).split(path.sep).join("/");
}

function createNode(name, absPath, kind) {
  return {
    name,
    absPath,
    kind,
    files: [],
    folders: [],
    hash: null,
  };
}

async function scanTree(absPath, name) {
  const node = createNode(name, absPath, "folder");
  let entries;

  try {
    entries = await fs.readdir(absPath, { withFileTypes: true });
  } catch (error) {
    return {
      ...node,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  for (const entry of entries) {
    if (shouldIgnoreEntry(entry.name)) {
      continue;
    }

    const childPath = path.join(absPath, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      const childNode = await scanTree(childPath, entry.name);
      node.folders.push(childNode);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    let stat;
    let hash = null;

    try {
      stat = await fs.stat(childPath);
      hash = await hashFile(childPath);
    } catch (error) {
      node.files.push({
        name: entry.name,
        absPath: childPath,
        relPath: relPosix(absPath, childPath),
        size: 0,
        modifiedTime: null,
        hash: null,
        ext: path.extname(entry.name).toLowerCase(),
        archive: isArchiveFile(entry.name),
        image: isImageFile(entry.name),
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    node.files.push({
      name: entry.name,
      absPath: childPath,
      relPath: relPosix(absPath, childPath),
      size: stat.size,
      modifiedTime: stat.mtime.toISOString(),
      hash,
      ext: path.extname(entry.name).toLowerCase(),
      archive: isArchiveFile(entry.name),
      image: isImageFile(entry.name),
    });
  }

  return node;
}

function collapseSingletonWrapper(node) {
  let current = node;
  while (current && current.files.length === 0 && current.folders.length === 1) {
    current = current.folders[0];
  }
  return current ?? node;
}

function computeFolderHash(node) {
  if (node.hash) {
    return node.hash;
  }

  const normalized = collapseSingletonWrapper(node);
  const fileParts = normalized.files.map((file) => [
    "F",
    file.name,
    String(file.size),
    file.hash ?? "",
  ].join("\u0001"));

  const folderParts = normalized.folders.map((folder) => [
    "D",
    folder.name,
    computeFolderHash(folder),
  ].join("\u0001"));

  const payload = [...fileParts, ...folderParts].sort().join("\n");
  normalized.hash = sha256(payload);
  return normalized.hash;
}

function walkNodes(node, visitor) {
  visitor(node);
  for (const folder of node.folders) {
    walkNodes(folder, visitor);
  }
}

async function extractArchiveToTemp(archivePath) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "alchemist-drive-audit-"));
  const result = spawnSync("bsdtar", ["-xf", archivePath, "-C", tempDir], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error((result.stderr || result.stdout || "archive extraction failed").trim());
  }

  return tempDir;
}

function summarizeTopGroups(groups, limit = 10) {
  return groups
    .slice()
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, limit);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.root) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const rootPath = path.resolve(args.root);
  const rootStat = await fs.stat(rootPath);
  if (!rootStat.isDirectory()) {
    throw new Error(`Root path is not a folder: ${rootPath}`);
  }

  const outDir = path.resolve(args.outDir ?? path.join(process.cwd(), "drive-duplicate-audit-output"));
  await fs.mkdir(outDir, { recursive: true });

  console.log(`Scanning: ${rootPath}`);
  const rootNode = await scanTree(rootPath, path.basename(rootPath));

  const fileRecords = [];
  const folderRecords = [];
  const archiveRecords = [];
  const nameGroups = new Map();
  const exactFileGroups = new Map();
  const folderHashGroups = new Map();

  walkNodes(rootNode, (node) => {
    const folderHash = computeFolderHash(node);
    const folderRecord = {
      name: node.name,
      absPath: node.absPath,
      relPath: relPosix(rootPath, node.absPath) || ".",
      hash: folderHash,
      fileCount: node.files.length,
      folderCount: node.folders.length,
      kind: node.kind,
    };

    folderRecords.push(folderRecord);
    if (!folderHashGroups.has(folderHash)) {
      folderHashGroups.set(folderHash, []);
    }
    folderHashGroups.get(folderHash).push(folderRecord);

    for (const file of node.files) {
      const record = {
        ...file,
        relPath: relPosix(rootPath, file.absPath),
      };

      fileRecords.push(record);

      const nameKey = file.name.toLowerCase();
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey).push(record);

      if (record.hash) {
        const exactKey = `${record.size}:${record.hash}`;
        if (!exactFileGroups.has(exactKey)) {
          exactFileGroups.set(exactKey, []);
        }
        exactFileGroups.get(exactKey).push(record);
      }

      if (record.archive) {
        archiveRecords.push(record);
      }
    }
  });

  const archiveMatches = [];
  for (const archive of archiveRecords) {
    try {
      const tempDir = await extractArchiveToTemp(archive.absPath);
      try {
        const extractedTree = await scanTree(tempDir, path.basename(tempDir));
        const extractedHash = computeFolderHash(extractedTree);
        const matches = folderHashGroups.get(extractedHash) ?? [];
        if (matches.length > 0) {
          archiveMatches.push({
            archive,
            extractedHash,
            matches,
          });
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      archiveMatches.push({
        archive,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const duplicateFiles = summarizeTopGroups(
    [...exactFileGroups.values()].filter((group) => group.length > 1).map((items) => ({
      items,
    }))
  );

  const duplicateNames = summarizeTopGroups(
    [...nameGroups.values()].filter((group) => group.length > 1).map((items) => ({
      items,
    }))
  );

  const duplicateFolders = summarizeTopGroups(
    [...folderHashGroups.values()].filter((group) => group.length > 1).map((items) => ({
      items,
    }))
  );

  const report = {
    scannedRoot: rootPath,
    generatedAt: new Date().toISOString(),
    totals: {
      files: fileRecords.length,
      folders: folderRecords.length,
      archives: archiveRecords.length,
      exactDuplicateFileGroups: duplicateFiles.length,
      duplicateNameGroups: duplicateNames.length,
      duplicateFolderGroups: duplicateFolders.length,
      archiveFolderMatches: archiveMatches.filter((entry) => entry.matches && entry.matches.length > 0).length,
      archiveErrors: archiveMatches.filter((entry) => entry.error).length,
    },
    exactDuplicateFileGroups: [...exactFileGroups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.map((item) => ({
        relPath: item.relPath,
        size: item.size,
        hash: item.hash,
      }))),
    sameNameGroups: [...nameGroups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.map((item) => ({
        relPath: item.relPath,
        size: item.size,
        hash: item.hash,
      }))),
    duplicateFolderGroups: [...folderHashGroups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.map((item) => ({
        relPath: item.relPath,
        hash: item.hash,
        fileCount: item.fileCount,
        folderCount: item.folderCount,
      }))),
    archiveFolderMatches: archiveMatches.map((entry) => ({
      archive: entry.archive ? {
        relPath: entry.archive.relPath,
        size: entry.archive.size,
        hash: entry.archive.hash,
      } : null,
      error: entry.error ?? null,
      matches: entry.matches?.map((match) => ({
        relPath: match.relPath,
        hash: match.hash,
      })) ?? [],
    })).filter((entry) => entry.archive),
  };

  const jsonPath = path.join(outDir, "report.json");
  const mdPath = path.join(outDir, "summary.md");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const topExact = summarizeTopGroups(
    [...exactFileGroups.values()].filter((group) => group.length > 1).map((items) => ({ items }))
  );
  const topNames = summarizeTopGroups(
    [...nameGroups.values()].filter((group) => group.length > 1).map((items) => ({ items }))
  );
  const topFolders = summarizeTopGroups(
    [...folderHashGroups.values()].filter((group) => group.length > 1).map((items) => ({ items }))
  );

  const archiveMatchLines = archiveMatches
    .filter((entry) => entry.matches && entry.matches.length > 0)
    .slice(0, 10)
    .map((entry) => `- ${entry.archive.relPath} matches ${entry.matches.map((match) => match.relPath).join(", ")}`)
    .join("\n");

  const errorLines = archiveMatches
    .filter((entry) => entry.error)
    .slice(0, 10)
    .map((entry) => `- ${entry.archive.relPath}: ${entry.error}`)
    .join("\n");

  const md = [
    `# Drive Duplicate Audit`,
    "",
    `- Root: \`${rootPath}\``,
    `- Generated: \`${report.generatedAt}\``,
    `- Files scanned: \`${report.totals.files}\``,
    `- Folders scanned: \`${report.totals.folders}\``,
    `- Archive files: \`${report.totals.archives}\``,
    `- Exact duplicate file groups: \`${report.totals.exactDuplicateFileGroups}\``,
    `- Same-name groups: \`${report.totals.duplicateNameGroups}\``,
    `- Duplicate folder tree groups: \`${report.totals.duplicateFolderGroups}\``,
    `- Archive-folder matches: \`${report.totals.archiveFolderMatches}\``,
    `- Archive extraction errors: \`${report.totals.archiveErrors}\``,
    "",
    "## Exact duplicate files",
    topExact.length > 0
      ? topExact.map((group, index) => {
          const lines = group.items.map((item) => `  - ${item.relPath} (${item.size} bytes)`).join("\n");
          return `1. Group ${index + 1}\n${lines}`;
        }).join("\n")
      : "_None found_",
    "",
    "## Same-name collisions",
    topNames.length > 0
      ? topNames.map((group, index) => {
          const lines = group.items.map((item) => `  - ${item.relPath}`).join("\n");
          return `1. Group ${index + 1}\n${lines}`;
        }).join("\n")
      : "_None found_",
    "",
    "## Archive to folder matches",
    archiveMatchLines || "_None found_",
    "",
    "## Archive extraction errors",
    errorLines || "_None found_",
    "",
    "## Theme",
    "The drive looks like a creative archive with lots of project folders, design assets, exported web builds, and older reference material. The safest cleanup path is report-first, not delete-first.",
  ].join("\n");

  await fs.writeFile(mdPath, md, "utf8");

  console.log(`Done.`);
  console.log(`Report written to: ${jsonPath}`);
  console.log(`Summary written to: ${mdPath}`);
  console.log(`Exact duplicate file groups: ${report.totals.exactDuplicateFileGroups}`);
  console.log(`Same-name groups: ${report.totals.duplicateNameGroups}`);
  console.log(`Duplicate folder tree groups: ${report.totals.duplicateFolderGroups}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
