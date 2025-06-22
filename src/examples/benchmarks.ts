import { Sandbox, providers } from "../index.js";

async function runExample(provider: string) {
  const times = {
    create: [] as number[],
    pause: [] as number[],
    resume: [] as number[],
    destroy: [] as number[],
  };

  for (let i = 0; i < 5; i++) {
    console.log(`\n--- Run ${i + 1} for provider: ${provider} ---`);
    const startCreate = performance.now();
    const sandbox = await Sandbox.create(provider);
    const endCreate = performance.now();
    times.create.push(endCreate - startCreate);

    try {
      const startPause = performance.now();
      await sandbox.pause();
      const endPause = performance.now();
      times.pause.push(endPause - startPause);
      console.log(`Paused ${provider} sandbox`);

      const startResume = performance.now();
      await sandbox.resume();
      const endResume = performance.now();
      times.resume.push(endResume - startResume);
      console.log(`Resumed ${provider} sandbox`);

      console.log(await sandbox.run("echo 'hello world'"));
    } catch (err) {
      console.error(`Error running example for ${provider}:`, err);
    } finally {
      const startDestroy = performance.now();
      await sandbox.destroy();
      const endDestroy = performance.now();
      times.destroy.push(endDestroy - startDestroy);
      console.log(`Stopped ${provider} sandbox`);
    }
  }

  return {
    provider,
    averages: {
      create: average(times.create),
      pause: average(times.pause),
      resume: average(times.resume),
      destroy: average(times.destroy),
    },
  };
}

function average(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function main() {
  const results = [];
  const result = await runExample("daytona");
  results.push(result);

  console.log("\n--- Average Times (ms) ---");
  console.table(
    results.map((r) => ({
      Provider: r.provider,
      Create: r.averages.create.toFixed(2),
      Pause: r.averages.pause.toFixed(2),
      Resume: r.averages.resume.toFixed(2),
      Destroy: r.averages.destroy.toFixed(2),
    }))
  );
}

main();
