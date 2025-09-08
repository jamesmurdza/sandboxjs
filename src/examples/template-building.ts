import { buildTemplate, Sandbox } from "../index.js";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import * as readline from 'readline';

function pressEnterToContinue(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Press Enter to continue...', () => {
      rl.close();
      resolve();
    });
  });
}

async function createExampleProject(projectName: string): Promise<string> {
  const templateDir = join(tmpdir(), `sandbox-example-${projectName}-${Date.now()}`);
  
  await mkdir(templateDir, { recursive: true });
  
  // Create a simple Dockerfile
  const dockerfile = `FROM node:18

COPY ./start-server.sh /start-server.sh
RUN chmod +x /start-server.sh
  
WORKDIR /home/user

# Copy package files
COPY package*.json ./
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
    message: 'Hello from ${projectName} template!',
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
  
  console.log(`✅ Created example project at: ${templateDir}`);
  return templateDir;
}

async function runE2BExample() {
  console.log(`\n--- E2B Template Building Example ---`);
  
  try {
    const templateDir = await createExampleProject('e2b');
    const templateName = `example-${Date.now().toString().slice(-6)}`;
    
    console.log(`Building E2B template: ${templateName}`);
    console.log(`Project directory: ${templateDir}`);
    
    await buildTemplate('e2b', templateDir, templateName, {
      cpuCount: 1,
      memoryMB: 512,
      teamId: "<TEAM ID>",
      buildArgs: {
        NODE_ENV: 'production'
      }
    });
    
    console.log(`✅ Successfully built E2B template: ${templateName}`);
    return templateName;
  } catch (error) {
    console.error('❌ E2B template building failed:', error instanceof Error ? error.message : error);
  }
}

async function runDaytonaExample() {
  console.log(`\n--- Daytona Template Building Example ---`);
  
  try {
    const templateDir = await createExampleProject('daytona');
    const templateName = `sandbox-example-daytona-${Date.now()}`;
    
    console.log(`Building Daytona snapshot: ${templateName}`);
    console.log(`Project directory: ${templateDir}`);
    
    await buildTemplate('daytona', templateDir, templateName, {
      cpu: 1,
      memory: 1,
      disk: 3
    });
    
    console.log(`✅ Successfully built Daytona snapshot: ${templateName}`);
  } catch (error) {
    console.error('❌ Daytona template building failed:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('🚀 Template Building Examples\n');
  
  // Note: These examples require the respective CLI tools to be installed and configured:
  // - E2B: npm install -g @e2b/cli && e2b login
  // - Daytona: Install Daytona CLI and authenticate
  
  console.log('📋 Prerequisites:');
  console.log('- E2B: Install @e2b/cli globally and authenticate with e2b login');
  console.log('- Daytona: Install Daytona CLI and authenticate');
  console.log('- Ensure you have proper API keys/tokens configured\n');
  
  // Uncomment the examples you want to run:
  
  const templateName = await runE2BExample();
  // const templateName = await runDaytonaExample();
  if (templateName) {
    const sandbox = await Sandbox.create('e2b', { template: templateName });
    // const sandbox = await Sandbox.create('daytona', { template: templateName });
    console.log(`✅ Successfully created E2B sandbox: ${sandbox.id()}`);
    console.log(`App URL: ${await sandbox.getPreviewUrl(3000)}`);

    await pressEnterToContinue();
    
    await sandbox.destroy();
    console.log(`✅ Successfully destroyed E2B sandbox: ${sandbox.id()}`);
  }
}

main().catch(console.error);