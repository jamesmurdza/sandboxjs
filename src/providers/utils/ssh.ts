import { Client } from 'ssh2';
import { RunCommandOptions } from '../../sandbox.js';

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
}

export class SSHClient {
  private conn: Client;

  constructor() {
    this.conn = new Client();
  }

  connect(config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conn.on('ready', () => {
        console.log('SSH Connection established');
        resolve();
      });

      this.conn.on('error', (err) => {
        reject(err);
      });

      this.conn.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });
    });
  }

  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background?: false }
  ): Promise<{ exitCode: number; output: string }>;
  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background: true }
  ): Promise<{ pid: number }>;
  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background?: boolean }
  ): Promise<{ exitCode: number; output: string } | { pid: number }> {
    return new Promise((resolve, reject) => {
      // For background execution, append nohup and & to run in background
      const finalCommand = options?.background ? `nohup sh -c '${command}' > /dev/null 2>&1 & echo $!` : command;
      
      this.conn.exec(finalCommand, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        if (options?.background) {
          // For background commands, we just need the PID
          let pidOutput = '';
          
          stream
            .on('close', () => {
              const pid = parseInt(pidOutput.trim());
              if (isNaN(pid)) {
                reject(new Error('Failed to get process PID'));
              } else {
                resolve({ pid });
              }
            })
            .on('data', (data: Buffer) => {
              pidOutput += data.toString();
            });
        } else {
          // For foreground commands, collect output and wait for completion
          let output = '';
          let errorOutput = '';
          let exitCode = 0;

          stream
            .on('close', () => {
              resolve({ 
                exitCode: exitCode, 
                output: output + (errorOutput ? '\nSTDERR:\n' + errorOutput : '')
              });
            })
            .on('exit', (code: number) => {
              exitCode = code || 0;
            })
            .on('data', (data: Buffer) => {
              output += data.toString();
            })
            .stderr.on('data', (data: Buffer) => {
              errorOutput += data.toString();
            });
        }
      });
    });
  }

  disconnect(): void {
    this.conn.end();
    console.log('SSH Connection closed');
  }
}
