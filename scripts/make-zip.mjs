import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const SESSION_ID = "96ff08";
const LOG_PATH = path.join(process.cwd(), "debug-96ff08.log");

function log(hypothesisId, message, data) {
  // Never log secrets.
  const payload = {
    sessionId: SESSION_ID,
    runId: "zip",
    hypothesisId,
    location: "scripts/make-zip.mjs",
    message,
    data,
    timestamp: Date.now(),
  };
  fs.appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`, "utf-8").catch(() => {});
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function runPwsh(command, cwd) {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", command],
      { cwd, windowsHide: true },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += String(d)));
    child.stderr.on("data", (d) => (err += String(d)));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

async function main() {
  const cwd = process.cwd();
  const zipPath = path.join(cwd, "ai-feedback-analyzer.zip");

  // Hypotheses:
  // H1: We are not in the project directory when creating zip.
  // H2: Compress-Archive fails (not available / errors / path issues).
  // H3: Zip is created but excluded by glob path mismatch.

  log("H1", "zip_start", { cwd, zipPath });

  if (await exists(zipPath)) {
    await fs.rm(zipPath, { force: true });
    log("H3", "removed_existing_zip", { zipPath });
  }

  const cmd = [
    "$ErrorActionPreference='Stop';",
    "$exclude=@('node_modules','dist','.wrangler','.git','ai-feedback-analyzer.zip');",
    "$items=Get-ChildItem -Force | Where-Object { $exclude -notcontains $_.Name };",
    "Compress-Archive -Path $items.FullName -DestinationPath 'ai-feedback-analyzer.zip' -Force;",
    "if(!(Test-Path 'ai-feedback-analyzer.zip')){ throw 'zip not created' };",
    "$i=Get-Item 'ai-feedback-analyzer.zip';",
    "[pscustomobject]@{Name=$i.Name;Bytes=$i.Length;FullName=$i.FullName} | ConvertTo-Json -Compress",
  ].join(" ");

  const res = await runPwsh(cmd, cwd);
  log("H2", "powershell_result", { code: res.code, out: res.out.slice(0, 8000), err: res.err.slice(0, 8000) });

  const ok = await exists(zipPath);
  const stat = ok ? await fs.stat(zipPath) : null;
  log("H3", "zip_exists_after", { ok, bytes: stat?.size ?? null });
}

await main();

