import { Sandbox } from "../providers/index.js";

async function createAndResumeSandboxes() {
  const createTimes: number[] = [];
  const resumeTimes: number[] = [];
  const sandboxes = [];

  console.log("Creating 5 E2B sandboxes...");

  // Create 5 sandboxes
  for (let i = 0; i < 5; i++) {
    const startCreate = performance.now();
    const sandbox = await Sandbox.create("e2b");
    const endCreate = performance.now();

    createTimes.push(endCreate - startCreate);
    sandboxes.push(sandbox);
    console.log(`Created sandbox ${i + 1}/5`);
  }

  console.log("\nWaiting 10 seconds before resuming...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // hello world
  for (let i = 0; i < 5; i++) {
    const sandbox = sandboxes[i];
    await sandbox.run("echo 'Hello World'");
  }

  console.log("Resuming sandboxes...\n");

  // Resume all sandboxes
  for (let i = 0; i < sandboxes.length; i++) {
    const sandbox = sandboxes[i];
    const startResume = performance.now();
    await sandbox.resume();
    const endResume = performance.now();

    resumeTimes.push(endResume - startResume);
    console.log(`Resumed sandbox ${i + 1}/5`);
  }

  // Clean up
  console.log("\nCleaning up sandboxes...");
  await Promise.all(sandboxes.map((sandbox) => sandbox.destroy()));
  console.log("All sandboxes destroyed");

  return {
    averageCreateTime:
      createTimes.reduce((a, b) => a + b, 0) / createTimes.length,
    averageResumeTime:
      resumeTimes.reduce((a, b) => a + b, 0) / resumeTimes.length,
  };
}

async function main() {
  try {
    const { averageCreateTime, averageResumeTime } =
      await createAndResumeSandboxes();

    console.log("\n--- Benchmark Results (ms) ---");
    console.table({
      "Average Create Time": averageCreateTime.toFixed(2),
      "Average Resume Time": averageResumeTime.toFixed(2),
    });
  } catch (error) {
    console.error("Error during benchmark:", error);
    process.exit(1);
  }
}

main();
