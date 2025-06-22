import { Sandbox, providers } from '../index.js';

async function runExample(provider: string) {
  console.log(`\n--- Running example for: ${provider} ---`);
  const sandbox = await Sandbox.create(provider);
  try {

    await sandbox.pause();
    console.log(`Paused ${provider} sandbox`);

    await sandbox.resume();
    console.log(`Resumed ${provider} sandbox`);

    console.log(await sandbox.run("echo 'hello world'"));

  } catch (err) {
    console.error(`Error running example for ${provider}:`, err);
  } finally { 
    // Stop the sandbox
    await sandbox.destroy();
    console.log(`Stopped ${provider} sandbox`);
  }
}

async function main() {
  for (const provider of providers) {
    await runExample(provider);
  }
}

main();