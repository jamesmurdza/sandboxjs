# Feature: Unified Template Building Interface

## Requirements Summary

Create a unified interface that takes a project directory containing a Dockerfile and builds provider-specific templates. Focus on E2B and Daytona providers initially, with the template name serving as the identifier for creating sandbox instances.

## User Experience Goals

Based on GitWit's use cases:
1. **Input**: Project directory with Dockerfile (like GitWit templates or E2B Desktop template)
2. **Command**: Single command to (re)build and deploy template to any provider

## Provider CLI Analysis

### E2B Template Building
**Command**: `e2b template build [options] [template]`

**Key Options for Our Use Case:**
- `-p, --path <path>`: Change root directory (we'll use project directory)
- `-d, --dockerfile <file>`: Specify Dockerfile path
- `-n, --name <template-name>`: Template name for SDK usage (lowercase, letters/numbers/dashes/underscores)
- `-c, --cmd <start-command>`: Command executed on sandbox start
- `--ready-cmd <ready-command>`: Command that must exit 0 for template to be ready
- `--cpu-count <cpu-count>`: CPU allocation (default: 2)
- `--memory-mb <memory-mb>`: Memory in MB (default: 512, must be even)
- `--build-arg <args...>`: Build arguments format: `<varname>=<value>`
- `--no-cache`: Skip build cache
- `-t, --team <team-id>`: Team ID from E2B dashboard

**Critical Requirements:**
- CMD/ENTRYPOINT instructions in Dockerfile are ignored by E2B
- Must parse last CMD/ENTRYPOINT and pass to `-c` flag
- Template name used with SDK: `Sandbox.create("e2b", { template: "template-name" })`

### Daytona Snapshot Creation
**Command**: `daytona snapshot create [SNAPSHOT] [flags]`

**Key Options for Our Use Case:**
- `-f, --dockerfile <path>`: Path to Dockerfile to build
- `-c, --context`: Files/directories for build context (can be specified multiple times)
- `-e, --entrypoint`: The entrypoint command for snapshot
- `--cpu`: CPU cores allocated (default: 1)
- `--memory`: Memory in GB (default: 1)  
- `--disk`: Disk space in GB (default: 3)
- `-i, --image`: Image name for snapshot

**Key Differences:**
- Uses snapshot name as first argument: `daytona snapshot create my-snapshot`
- Supports entrypoint command via `-e` flag
- Resource allocation in GB (not MB like E2B)

## Unified Interface Design

### Abstract Method with Generics
```typescript
// In src/sandbox.ts
export abstract class Sandbox {
  // Existing methods...
  
  // Abstract template building method with generic options
  static abstract buildTemplate<T = any>(
    projectDirectory: string,
    templateName: string,
    options?: T
  ): Promise<void>;
}
```

### Provider-Specific Options Interfaces
```typescript
// E2B build options
interface E2BBuildOptions {
  cpuCount?: number;        // Default: 2
  memoryMB?: number;        // Default: 512, must be even
  buildArgs?: Record<string, string>; // Format: <varname>=<value>
  noCache?: boolean;        // Skip build cache
  teamId?: string;          // Team ID from E2B dashboard
  readyCommand?: string;    // Command that must exit 0 for readiness
}

// Daytona build options
interface DaytonaBuildOptions {  
  cpu?: number;             // Default: 1 (cores)
  memory?: number;          // Default: 1 (GB)
  disk?: number;            // Default: 3 (GB)
  image?: string;           // Image name for snapshot
  // Note: context is automatically set to all top-level files/directories in project
}
```

## Implementation Strategy

### ENTRYPOINT/CMD Parsing Strategy
Both providers require parsing the last ENTRYPOINT or CMD instruction from Dockerfile, then removing that line from the Dockerfile:

```typescript
interface DockerfileParsedResult {
  startCommand: string | null;
  modifiedDockerfile: string;
}

function parseAndCleanDockerfile(dockerfile: string): DockerfileParsedResult {
  const lines = dockerfile.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  
  let startCommand = null;
  
  // Check if last line is CMD or ENTRYPOINT
  if (lastLine.startsWith('CMD [') || lastLine.startsWith('ENTRYPOINT [')) {
    // JSON array format: CMD ["npm", "start"] -> npm start
    const jsonMatch = lastLine.match(/(?:CMD|ENTRYPOINT)\s+(\[.*\])/);
    if (jsonMatch) {
      const cmdArray = JSON.parse(jsonMatch[1]);
      startCommand = cmdArray.join(' ');
    }
  } else if (lastLine.startsWith('CMD ') || lastLine.startsWith('ENTRYPOINT ')) {
    // Shell format: CMD npm start -> npm start
    startCommand = lastLine.replace(/^(?:CMD|ENTRYPOINT)\s+/, '');
  }
  
  // Remove last line if it was CMD/ENTRYPOINT
  const modifiedLines = startCommand ? lines.slice(0, -1) : lines;
  
  return {
    startCommand,
    modifiedDockerfile: modifiedLines.join('\n')
  };
}

// Get all top-level files and directories for Daytona context
async function getProjectContext(projectDirectory: string): Promise<string[]> {
  const { readdir } = await import('fs/promises');
  const entries = await readdir(projectDirectory, { withFileTypes: true });
  
  return entries
    .filter(entry => !entry.name.startsWith('.')) // Skip hidden files
    .map(entry => entry.name);
}
```

### Provider Implementation Structure

#### E2B Implementation
```typescript
// In src/providers/e2b.ts
export class E2BSandbox extends Sandbox {
  static async buildTemplate(
    projectDirectory: string,
    templateName: string,
    options?: E2BBuildOptions
  ): Promise<void> {
    // 1. Validate directory and Dockerfile
    await validateProjectDirectory(projectDirectory);
    
    // 2. Parse Dockerfile and extract start command
    const dockerfilePath = join(projectDirectory, 'Dockerfile');
    const dockerfile = await readFile(dockerfilePath, 'utf-8');
    const { startCommand, modifiedDockerfile } = parseAndCleanDockerfile(dockerfile);
    
    // 3. Write modified Dockerfile (without CMD/ENTRYPOINT) to temp location
    const tempDockerfilePath = join(projectDirectory, 'Dockerfile.e2b');
    await writeFile(tempDockerfilePath, modifiedDockerfile);
    
    // 4. Build CLI command arguments
    const buildArgs = [
      'template', 'build',
      '-p', projectDirectory,
      '-d', tempDockerfilePath, // Use modified Dockerfile
      '-n', templateName,
      ...(startCommand ? ['-c', startCommand] : []),
      ...(options?.cpuCount ? ['--cpu-count', options.cpuCount.toString()] : []),
      ...(options?.memoryMB ? ['--memory-mb', options.memoryMB.toString()] : []),
      ...(options?.readyCommand ? ['--ready-cmd', options.readyCommand] : []),
      ...(options?.teamId ? ['-t', options.teamId] : []),
      ...(options?.noCache ? ['--no-cache'] : []),
      // Add build arguments
      ...(options?.buildArgs ? 
        Object.entries(options.buildArgs).flatMap(([k, v]) => ['--build-arg', `${k}=${v}`]) : [])
    ];
    
    // 4. Execute E2B CLI
    await executeCommand('e2b', buildArgs);
  }
}
```

#### Daytona Implementation
```typescript
// In src/providers/daytona.ts
export class DaytonaSandbox extends Sandbox {
  static async buildTemplate(
    projectDirectory: string,
    templateName: string,
    options?: DaytonaBuildOptions
  ): Promise<void> {
    // 1. Validate directory and Dockerfile
    await validateProjectDirectory(projectDirectory);
    
    // 2. Parse Dockerfile and extract entrypoint command
    const dockerfilePath = join(projectDirectory, 'Dockerfile');
    const dockerfile = await readFile(dockerfilePath, 'utf-8');
    const { startCommand: entrypoint, modifiedDockerfile } = parseAndCleanDockerfile(dockerfile);
    
    // 3. Write modified Dockerfile (without CMD/ENTRYPOINT) to temp location
    const tempDockerfilePath = join(projectDirectory, 'Dockerfile.daytona');
    await writeFile(tempDockerfilePath, modifiedDockerfile);
    
    // 4. Get all top-level files and directories for context
    const contextPaths = await getProjectContext(projectDirectory);
    
    // 5. Build CLI command arguments
    const buildArgs = [
      'snapshot', 'create', templateName,
      '-f', tempDockerfilePath, // Use modified Dockerfile
      ...(entrypoint ? ['-e', entrypoint] : []),
      ...(options?.cpu ? ['--cpu', options.cpu.toString()] : []),
      ...(options?.memory ? ['--memory', options.memory.toString()] : []),
      ...(options?.disk ? ['--disk', options.disk.toString()] : []),
      ...(options?.image ? ['-i', options.image] : []),
      // Add all top-level files/directories as context
      ...contextPaths.flatMap(ctx => ['-c', ctx])
    ];
    
    // 4. Execute Daytona CLI
    await executeCommand('daytona', buildArgs);
  }
}
```

### Utility Functions
```typescript
// Validate project directory structure
async function validateProjectDirectory(projectDir: string): Promise<void> {
  if (!await pathExists(projectDir)) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }
  
  const dockerfilePath = join(projectDir, 'Dockerfile');
  if (!await pathExists(dockerfilePath)) {
    throw new Error(`Dockerfile not found in project directory: ${projectDir}`);
  }
}

// Execute CLI commands with real-time logging and proper error handling
async function executeCommand(command: string, args: string[]): Promise<void> {
  const { spawn } = await import('child_process');
  
  console.log(`Executing: ${command} ${args.join(' ')}`);
  
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe' });
    
    process.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start command '${command}': ${error.message}`));
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Command completed successfully: ${command}`);
        resolve();
      } else {
        console.error(`❌ Command failed with exit code ${code}: ${command} ${args.join(' ')}`);
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });
  });
}
```

## Usage Examples

### E2B Template Building
```typescript
import { E2BSandbox } from '@gitwit/sandbox';

// Build template from GitWit desktop template
await E2BSandbox.buildTemplate(
  './templates/desktop',
  'gitwit-desktop',
  {
    cpuCount: 4,
    memoryMB: 2048,
    buildArgs: { 
      NODE_ENV: 'production',
      DISPLAY: ':1'
    },
    readyCommand: 'pgrep -f "x11vnc"'
  }
);

// Create sandbox using built template
const sandbox = await E2BSandbox.create({ template: 'gitwit-desktop' });
```

### Daytona Template Building
```typescript
import { DaytonaSandbox } from '@gitwit/sandbox';

// Build template with resource specifications
await DaytonaSandbox.buildTemplate(
  './templates/python-ai',
  'python-ai-env',
  {
    cpu: 2,
    memory: 4,
    disk: 10,
    image: 'python-ai-base'
    // Note: context automatically includes all top-level files/directories
  }
);

// Create sandbox using built template
const sandbox = await DaytonaSandbox.create({ template: 'python-ai-env' });
```

## Directory Structure Requirements

### Project Directory Structure
```
project-directory/
├── Dockerfile  # Required
├── some-dir/               
├── package.json
└── requirements.txt        
```

### Expected Dockerfile Format
```dockerfile
FROM node:18-alpine

# Install dependencies
RUN npm install -g typescript
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# This will be parsed and passed to provider CLI
ENTRYPOINT ["npm", "start"]
```