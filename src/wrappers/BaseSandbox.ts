export type FileEntry = {
  type: "directory" | "file";
  name: string;
};

export interface BaseSandbox {
  // Execute a command in the sandbox and return its output
  run(command: string): Promise<string>;

  // Get the sandbox ID
  id(): string;

  // Initialize a new sandbox instance
  initialize(id?: string): Promise<void>;

  // Pause the sandbox
  pause(): Promise<void>;

  // Resume the sandbox
  resume(): Promise<void>;

  // Stop and destroy the sandbox
  destroy(): Promise<void>;

  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(path: string): Promise<Array<FileEntry>>;
  moveFile(path: string, newPath: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;

  // Preview URL
  getPreviewUrl(port: number): Promise<string>;

  // Terminal operations
  createTerminal(onOutput: (output: string) => void): Promise<BaseTerminal>;
}

export interface BaseTerminal {
  write(data: string): Promise<void>;
  resize(cols: number, rows: number): Promise<void>;
  kill(): Promise<void>;
}
