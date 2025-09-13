import { Sandbox } from "../index.js";
import { E2BSandbox } from "../providers/e2b.js";
import { DaytonaSandbox } from "../providers/daytona.js";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function createExampleTemplate(
  provider: string
): Promise<{ templateDir: string, templateName: string }> {
  const templateDir = join(tmpdir(), `sandbox-example-${provider}-${Date.now()}`);
  
  await mkdir(templateDir, { recursive: true });
  
  // Create a simple Dockerfile
  const dockerfile = `FROM node:18

COPY ./start-server.sh /start-server.sh
RUN chmod +x /start-server.sh
  
WORKDIR /home/user

# Copy package files
COPY package*.json .
RUN npm install

# Copy source code
COPY . .

# Start command
CMD ["/start-server.sh"]
`;

  // Create a simple package.json
  const packageJson = {
    "name": "example-app",
    "version": "1.0.0",
    "description": "Example Node.js app for template building",
    "main": "index.js",
    "scripts": {
      "start": "node index.js"
    },
    "dependencies": {
      "express": "^4.18.0"
    }
  };

  // Create a simple Express app
  const appCode = `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from ${provider} example template!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

  // Create a simple start-server.sh
  const startServerScript = `#!/bin/bash

# Start the Node.js server
npm start
`;

  await writeFile(join(templateDir, 'Dockerfile'), dockerfile);
  await writeFile(join(templateDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  await writeFile(join(templateDir, 'index.js'), appCode);
  await writeFile(join(templateDir, 'start-server.sh'), startServerScript);
  
  return { templateDir, templateName: `example-${Date.now().toString().slice(-6)}` };
}

async function buildAndTestExampleTemplate(provider: string, options?: any) {
  let buildFn = null;
  switch (provider) {
    case 'e2b':
      buildFn = E2BSandbox.buildTemplate;
      break;
    case 'daytona':
      buildFn = DaytonaSandbox.buildTemplate;
      break;
    default:
      throw new Error(`Template building not supported for provider: ${provider}`);
  }
  console.log(`\n==============================================`)
  const { templateDir, templateName } = await createExampleTemplate(provider);
  console.log(`Building ${provider} example template '${templateName}' from ${templateDir}`);

  try {
    await buildFn(templateDir, templateName, options);
    console.log(`✅ Successfully built ${provider} example template '${templateName}'`);
  } catch (error) {
    throw new Error(`❌ Failed to build ${provider} example template '${templateName}': ${error instanceof Error ? error.message : error}`);
  }

  let sandbox: Sandbox | null = null;
  let sandboxId: string | null = null;
  try {
    sandbox = await Sandbox.create(provider, { template: templateName });
    sandboxId = sandbox.id();
    console.log(`✅ Successfully created ${provider} sandbox: ${sandboxId}`);
  } catch (error) {
    throw new Error(`❌ Failed to create ${provider} sandbox: ${error instanceof Error ? error.message : error}`);
  }
    
  try {
    const appUrl = await sandbox.getPreviewUrl(3000);
    console.log(`App URL: ${appUrl}`);
    const response = await fetch(appUrl);
    const data = await response.json();
    const expectedMessage = `Hello from ${provider} example template!`;
    
    if (data.message === expectedMessage) {
      console.log(`✅ App is working correctly - received expected message`);
    } else {
      throw new Error(`❌ App response doesn't match expected message. \nExpected: "${expectedMessage}" \nReceived: "${data.message}"`);
    }
  } catch (error) {
    throw new Error(`❌ Failed to test app: ${error instanceof Error ? error.message : error}`);
  }

  await sandbox.destroy();
  console.log(`✅ Successfully destroyed ${provider} sandbox: ${sandboxId}`);
}


async function main() {
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error('DAYTONA_API_KEY environment variable is required');
  }
  try {
    await buildAndTestExampleTemplate('daytona', { cpu: 1, memory: 1, disk: 1 });
  } catch (error) {
    console.log(error);
    return;
  }

  if (!process.env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY environment variable is required');
  }

  try {
    await buildAndTestExampleTemplate('e2b', {
      cpuCount: 1,
      memoryMB: 512,
      teamId: undefined,
      buildArgs: {
        NODE_ENV: 'production'
      }
    });
  } catch (error) {
    console.log(error);
    return;
  }
}

main().catch(console.error);