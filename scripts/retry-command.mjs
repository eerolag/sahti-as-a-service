import { spawn } from "node:child_process";

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const separatorIndex = process.argv.indexOf("--");
const command = separatorIndex === -1 ? [] : process.argv.slice(separatorIndex + 1);
const attempts = readOption("--attempts", 3);
const delayMs = readOption("--delay-ms", 10_000);

if (!command.length) {
  console.error("Usage: node scripts/retry-command.mjs --attempts 3 -- command [args...]");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runOnce(attempt) {
  return new Promise((resolve) => {
    console.log(`[retry-command] attempt ${attempt}/${attempts}: ${command.join(" ")}`);
    const child = spawn(command[0], command.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("close", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });

    child.on("error", (error) => {
      console.error(`[retry-command] failed to start command: ${error.message}`);
      resolve({ code: 1, signal: null });
    });
  });
}

let lastCode = 1;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await runOnce(attempt);
  lastCode = result.code;

  if (result.signal) {
    console.error(`[retry-command] command exited from signal ${result.signal}`);
  }

  if (result.code === 0) {
    process.exit(0);
  }

  if (attempt < attempts) {
    console.warn(`[retry-command] command failed with code ${result.code}; retrying in ${delayMs} ms`);
    await sleep(delayMs);
  }
}

process.exit(lastCode);
