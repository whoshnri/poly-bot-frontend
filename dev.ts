/**
 * Starts the React Vite dev server via pnpm in the frontend workspace.
 * Intended to be spawned as a separate Bun process from the root dev launcher.
 */
const frontendDir = import.meta.dir;

function ensurePnpmInstalled(): void {
  const check = Bun.spawnSync(["pnpm", "--version"], {
    cwd: frontendDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (check.exitCode !== 0) {
    console.error("[ui] pnpm is required. Install it: https://pnpm.io/installation");
    process.exit(1);
  }
}

function ensureDependenciesInstalled(): void {
  const reactPkg = Bun.file(`${frontendDir}/node_modules/react/package.json`);
  if (reactPkg.size !== null) {
    return;
  }

  console.log("[ui] Installing frontend dependencies with pnpm...");
  const install = Bun.spawnSync(["pnpm", "install"], {
    cwd: frontendDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (install.exitCode !== 0) {
    console.error("[ui] pnpm install failed.");
    process.exit(install.exitCode ?? 1);
  }
}

ensurePnpmInstalled();
ensureDependenciesInstalled();

console.log("[ui] Starting Vite dev server (pnpm dev)...");

const vite = Bun.spawn(["pnpm", "dev"], {
  cwd: frontendDir,
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`[ui] Received ${signal}, stopping Vite...`);
  vite.kill();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const exitCode = await vite.exited;
process.exit(exitCode);
