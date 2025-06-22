import { Sandbox, providers } from "../providers/index.js";

async function runExample(provider: string) {
  console.log(`\n--- Running example for: ${provider} ---`);
  const sandbox = await Sandbox.create(provider);

  try {
    const terminal = await sandbox.createTerminal((output) => {
      console.log(output);
    });

    await terminal.write("ls -la\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await terminal.kill();
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

main().catch(console.error);
