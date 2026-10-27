/**
 * Unified Test Runner for AeroCheck (UH Crew Training Level)
 * Executes all unit and integration test suites via Node's native test runner.
 */
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
  path.join(__dirname, 'test_compliance.mjs'),
  path.join(__dirname, 'test_data_merger.mjs'),
  path.join(__dirname, 'test_flight_logic.mjs')
];

console.log('🚀 Running AeroCheck Test Suite...');
console.log(`📁 Test files: ${testFiles.length}\n`);

const testStream = run({
  files: testFiles
});

testStream
  .compose(new spec())
  .pipe(process.stdout);

testStream.on('test:fail', () => {
  process.exitCode = 1;
});
