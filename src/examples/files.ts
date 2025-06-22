import { Sandbox, providers } from '../index.js';

async function runExample(provider: string) {
  console.log(`\n--- Running example for: ${provider} ---`);
  const sandbox = await Sandbox.create(provider);
  
  try {
    const filename = 'testfile.txt';
    const dirname = 'testdir';
    const content = `Hello from ${provider} sandbox!`;
    const newContent = `Updated content at ${new Date().toISOString()}`;
    
    // 1. Write to file
    console.log(`1. Writing to ${filename}...`);
    await sandbox.run(`echo '${content}' > ${filename}`);
    
    // 2. Read file using sandbox's readFile method
    console.log('2. Reading file...');
    const fileContent = await sandbox.readFile(filename);
    console.log(`   File content: ${fileContent.trim()}`);
    
    // 3. Check file exists by listing files and checking if filename is in the list
    console.log('3. Checking file exists...');
    const files = await sandbox.listFiles('.');
    const fileExists = files.some(({name}) => name === filename);
    console.log(`   File ${fileExists ? 'exists' : 'not found'}`);
    
    // 4. Append to file by reading, appending, and writing back
    console.log('4. Appending to file...');
    const currentContent = await sandbox.readFile(filename);
    await sandbox.writeFile(filename, `${currentContent}\n${newContent}`);
    
    // 5. List directory using sandbox's listFiles method
    console.log('5. Listing directory contents...');
    const fileList = await sandbox.listFiles('.');
    console.log('   Directory contents:');
    fileList.forEach(({name}) => console.log(`   - ${name}`));
    
    // 6. Create directory using sandbox's createDirectory method
    console.log(`6. Creating directory ${dirname}...`);
    await sandbox.createDirectory(dirname);
    
    // 7. Move file using sandbox's moveFile method
    const newPath = `${dirname}/moved_${filename}`;
    console.log(`7. Moving file to ${newPath}...`);
    await sandbox.moveFile(filename, newPath);
    
    // 8. Check file in new location
    console.log('8. Verifying file in new location...');
    const newDirFiles = await sandbox.listFiles(dirname);
    const fileMoved = newDirFiles.some(({name}) => name === `moved_${filename}`);
    console.log(`   File ${fileMoved ? 'moved successfully' : 'move failed'}`);
    
    // 9. Delete file using sandbox's deleteFile method
    console.log('9. Deleting file...');
    await sandbox.deleteFile(newPath);
    
    // 10. Clean up directory using sandbox's deleteFile for directory
    console.log('10. Cleaning up...');
    await sandbox.deleteFile(dirname);
    
    console.log('\nAll file operations completed successfully!');
    
  } catch (err) {
    console.error(`Error running example for ${provider}:`, err);
  } finally { 
    // Stop the sandbox
    await sandbox.destroy();
    console.log(`Stopped ${provider} sandbox`);
  }
}

async function main() {
  for (const provider of providers) {
    await runExample(provider);
  }
}

main().catch(console.error);