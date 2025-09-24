import { readdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import * as dockerFileParser from 'docker-file-parser';

export interface Dockerfile {
  content: string;
  entrypoint: string | null;
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

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Find Dockerfile name from the template directory
export async function findDockerfileName(directory: string): Promise<string> {
  if (!await pathExists(directory)) {
    throw new Error(`Template directory does not exist: ${directory}`);
  }

  let dockerfileName = 'Dockerfile';
  if (!await pathExists(join(directory, dockerfileName))) {
    const entries = await readdir(directory, { withFileTypes: true });
    const dockerfiles = entries.filter(file => file.name.endsWith('.Dockerfile'));
    
    if (dockerfiles.length === 0) {
      throw new Error(`No Dockerfile found in template directory: ${directory}`);
    }
    
    if (dockerfiles.length > 1) {
      throw new Error(`Multiple .Dockerfile files found in template directory: ${directory}: ${dockerfiles.join(', ')}. Please use exactly one Dockerfile.`);
    }
    
    dockerfileName = dockerfiles[0].name;
  }
  
  return dockerfileName;
}

// Execute CLI commands with real-time logging and proper error handling
export async function executeCommand(
  command: string, args: string[], options?: {
    cwd?: string;
    onLogs?: (chunk: string) => void;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe', cwd: options?.cwd });

    const onLogs = options?.onLogs;
    if (onLogs !== undefined) {
      process.stdout.on('data', (data) => onLogs(data.toString().trim()));
      process.stderr.on('data', (data) => onLogs(data.toString().trim()));
    }
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start command '${command} ${args.join(' ')}': ${error.message}`));
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
