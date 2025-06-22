import { spawn } from 'child_process';
import { dirname } from 'path';

console.log("hello");

async function runCypress(featureFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const match = featureFilePath.match(/^(.*?cypress)(\\|\/)/i);
    if (match) {
      const featureDir: string = dirname(match[1]);

      const cypressProcess = spawn('npx', [
        'cypress',
        'run',
        '--spec',
        featureFilePath,
        '--reporter',
        'spec',
      ], { shell: true, cwd: featureDir });

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
          console.log('Cypress run completed successfully.');
          resolve(output);
        } else {
          output +=`Cypress exited with code ${code}`;
          resolve(output);
        }
      });
    } else {
      reject(new Error('No cypress dir found'));
    }
  });
}

(async () => {
  try {
    const fullOutput = await runCypress("C:/Users/Felix/Documents/GitHub/diva-e-cypress-tests/cypress/e2e/orchestrator/orchestrator.feature");
    console.log('\n=== Full Cypress Output Captured ===');
    console.log(fullOutput);
  } catch (err) {
    console.error('Error running Cypress:', err);
  }
})();
