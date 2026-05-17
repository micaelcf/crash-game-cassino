#!/usr/bin/env bun
// Cross-runtime compose dispatcher. Prefers docker; falls back to podman.
// Override with COMPOSE_RUNTIME=docker|podman.

const override = process.env.COMPOSE_RUNTIME?.toLowerCase();
const runtime =
  override === "docker" || override === "podman"
    ? override
    : Bun.which("docker")
      ? "docker"
      : Bun.which("podman")
        ? "podman"
        : null;

if (!runtime) {
  console.error("compose: neither docker nor podman found in PATH");
  process.exit(127);
}

const proc = Bun.spawn([runtime, "compose", ...process.argv.slice(2)], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await proc.exited);
