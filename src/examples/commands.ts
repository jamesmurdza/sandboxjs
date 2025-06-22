import { Sandbox } from "../index.js";

async function runExample(provider: string) {
  console.log(`\n--- Running example for: ${provider} ---`);
  const sandbox = await Sandbox.create(provider);
  try {
    const filename = "testfile.txt";
    const content = `Hello from ${provider} sandbox!`;

    // Write to file
    console.log(`Writing to ${filename} in ${provider} sandbox...`);
    await sandbox.run(`echo '${content}' > ${filename}`);

    // Connect to the same sandbox
    const sandbox2 = await Sandbox.connect(provider, sandbox.id());
    console.log(`Reading from ${filename} in connected ${provider} sandbox...`);

    // Read from file
    const output2 = await sandbox2.run(`cat ${filename}`);
    console.log("File content from connected sandbox:", output2);
  } catch (err) {
    console.error(`Error running example for ${provider}:`, err);
  } finally {
    // Stop the sandbox
    await sandbox.destroy();
    console.log(`Stopped ${provider} sandbox`);
  }
}

async function main() {
  for (const provider of Sandbox.getProvidersList()) {
    await runExample(provider);
  }
}

main();
