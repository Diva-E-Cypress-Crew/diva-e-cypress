import { spawn } from 'child_process';
import { resolve } from 'path';

/**
 * Runs Cypress via spawn inside Node.js (safe from Electron context).
 */
export async function runCypress(featureFilePath: string): Promise<string> {
  return new Promise((resolvePromise) => {
    const projectRoot = process.cwd();
    console.log(`📁 Cypress working directory: ${projectRoot}`);

    const cypressProcess = spawn(
      'npx',
      [
        'cypress',
        'run',
        '--spec',
        featureFilePath,
        '--reporter',
        'spec',
      ],
      { shell: true, cwd: projectRoot }
    );

    let output = '';

    cypressProcess.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
    });

    cypressProcess.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      output += text;
    });

    cypressProcess.on('close', (code) => {
      if (code === 0) {
        resolvePromise(output);
      } else {
        output += `\nCypress exited with code ${code}`;
        resolvePromise(output);
      }
    });
  });
}

/**
 * If this file is run directly via `node cypressRunner.ts <path>`, execute it.
 */
if (require.main === module) {
  const featurePath = process.argv[2];
  if (!featurePath) {
    console.error('❌ No feature file path provided.');
    process.exit(1);
  }

  runCypress(featurePath)
    .then((log) => {
      console.log('\n=== CYPRESS OUTPUT START ===');
      console.log(log);
      console.log('=== CYPRESS OUTPUT END ===\n');
    })
    .catch((err) => {
      console.error('Error running Cypress:', err);
      process.exit(1);
    });
}
