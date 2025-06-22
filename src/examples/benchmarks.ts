import { Sandbox } from "../index.js";

async function runExample(provider: string) {
  const times = {
    create: [] as number[],
    pause: [] as number[],
    resume: [] as number[],
    destroy: [] as number[],
  };

  for (let i = 0; i < 10; i++) {
    console.log(`\n--- Run ${i + 1} for provider: ${provider} ---`);
    const startCreate = performance.now();
    const sandbox = await Sandbox.create(provider);
    const endCreate = performance.now();
    times.create.push(endCreate - startCreate);

    try {
      const startPause = performance.now();
      await sandbox.suspend();
      const endPause = performance.now();
      times.pause.push(endPause - startPause);
      console.log(`Paused ${provider} sandbox`);

      const startResume = performance.now();
      await sandbox.resume();
      const endResume = performance.now();
      times.resume.push(endResume - startResume);
      console.log(`Resumed ${provider} sandbox`);
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
  for (const provider of Sandbox.getProvidersList()) {
    const result = await runExample(provider);
    results.push(result);
  }

  const toTwoSigFigs = (num: number): number => {
    // Format to 2 significant figures without scientific notation
    return parseInt(num.toString().replace(/\.0+$/, ""));
    //const rounded = parseFloat(num.toPrecision(2));
    //return parseInt(rounded.toString().replace(/\.0+$/, ""));
  };

  console.log("\n--- Average Times (ms) ---");
  const tableData = results.reduce(
    (acc, r) => ({
      ...acc,
      [r.provider]: {
        Create: toTwoSigFigs(r.averages.create),
        Pause: toTwoSigFigs(r.averages.pause),
        Resume: toTwoSigFigs(r.averages.resume),
        Destroy: toTwoSigFigs(r.averages.destroy),
      },
    }),
    {}
  );
  console.table(tableData);
}

main();
