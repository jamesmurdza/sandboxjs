import { readdir, access, constants, readFile } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import * as dockerFileParser from 'docker-file-parser';

export interface Dockerfile {
  entrypoint: string | null;
  content: string;
}

export interface Template {
  dockerfile: Dockerfile;
  otherPathNames: string[];
}

export function parseDockerfile(content: string): Dockerfile {
  const instructions = dockerFileParser.parse(content, { includeComments: true });
  let entrypoint: string | null = null;

  if (instructions.length > 0) {
    const last = instructions[instructions.length - 1];
    if (last.name === 'CMD' || last.name === 'ENTRYPOINT') {
      if (Array.isArray(last.args)) {
        entrypoint = last.args.join(' ');
      } else if (typeof last.args === 'string') {
        entrypoint = last.args.trim();
      } else {
        throw new Error(`Unsupported CMD/ENTRYPOINT format: ${last.args}`);
      }
      instructions.pop();
    }
  }

  return {
    entrypoint,
    content: instructions.map((i) => i.raw).join('\n')
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Read template directory to find Dockerfile and other files
export async function readTemplate(directory: string): Promise<Template> {
  if (!await pathExists(directory)) {
    throw new Error(`Template directory does not exist: ${directory}`);
  }

  let dockerfilePath = join(directory, 'Dockerfile');
  let otherPathNames: string[] = [];
  if (!await pathExists(dockerfilePath)) {
    const entries = await readdir(directory, { withFileTypes: true });
    const dockerfiles = entries.filter(file => file.name.endsWith('.Dockerfile'));
    
    if (dockerfiles.length === 0) {
      throw new Error(`No Dockerfile found in template directory: ${directory}`);
    }
    
    if (dockerfiles.length > 1) {
      throw new Error(`Multiple .Dockerfile files found in template directory: ${directory}: ${dockerfiles.join(', ')}. Please use exactly one Dockerfile.`);
    }
    
    const dockerfileName = dockerfiles[0].name;
    dockerfilePath = join(directory, dockerfileName);
    otherPathNames = entries
      .filter(entry => entry.name !== dockerfileName)
      .map(entry => entry.name);
  }
  
  return {
    dockerfile: parseDockerfile(await readFile(dockerfilePath, 'utf-8')),
    otherPathNames
  };
}

// Execute CLI commands with real-time logging and proper error handling
export async function executeCommand(command: string, args: string[], cwd?: string): Promise<void> {
  console.log(`Executing: ${command} ${args.join(' ')}${cwd ? ` (in ${cwd})` : ''}`);
  
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe', cwd });
    
    process.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start command '${command}': ${error.message}`));
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });
  });
}
