import { listProviders, getProvider } from "./registry.js";

export type FileEntry = {
  type: "directory" | "file";
  name: string;
};

export interface CreateSandboxOptions {
  template?: string;
  envs?: Record<string, string>;
}

export interface RunCommandOptions {
  background?: boolean;
  cwd?: string;
  envs?: Record<string, string>;
  timeoutMs?: number;
}

export abstract class Sandbox {
  // Create a new sandbox instance
  static async create(provider: string, options?: CreateSandboxOptions) {
    const Provider = getProvider(provider);
    const instance = new Provider();
    await instance.init(undefined, options);
    return instance;
  }

  // Connect to an existing sandbox instance
  static async connect(provider: string, id: string) {
    const Provider = getProvider(provider);
    const instance = new Provider();
    await instance.init(id);
    return instance;
  }

  // Get the list of available providers
  static getProvidersList(): Array<string> {
    return listProviders();
  }

  // Create a new sandbox or connect to an existing one
  protected abstract init(id?: string, createOptions?: CreateSandboxOptions): Promise<void>;

  /**
   * Start a new command and wait until it finishes executing.
   * 
   * @param command Command to run
   * @param options Options for running the command
   */
  abstract runCommand(
    command: string,
    options?: RunCommandOptions & { background?: false }
  ): Promise<{ exitCode: number; output: string }>;
  /**
   * Start a new command in background and return its process ID.
   * 
   * @param command Command to run
   * @param options Options for running the command
   */
  abstract runCommand(
    command: string,
    options?: RunCommandOptions & { background: true }
  ): Promise<{ pid: number }>;

  // Get the sandbox ID
  abstract id(): string;

  // Pause the sandbox
  abstract suspend(): Promise<void>;

  // Resume the sandbox
  abstract resume(): Promise<void>;

  // Stop and destroy the sandbox
  abstract destroy(): Promise<void>;

  // File operations
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract listFiles(path: string): Promise<Array<FileEntry>>;
  abstract moveFile(path: string, newPath: string): Promise<void>;
  abstract deleteFile(path: string): Promise<void>;
  abstract createDirectory(path: string): Promise<void>;

  // Preview URL
  abstract getPreviewUrl(port: number): Promise<string>;

  // Terminal operations
  abstract createTerminal(
    onOutput: (output: string) => void
  ): Promise<Terminal>;
}

export abstract class Terminal {
  abstract write(data: string): Promise<void>;
  abstract resize(cols: number, rows: number): Promise<void>;
  abstract kill(): Promise<void>;
}
