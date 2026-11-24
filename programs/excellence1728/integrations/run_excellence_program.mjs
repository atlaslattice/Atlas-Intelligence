#!/usr/bin/env node
/** Read an explicitly selected source program. No step action is executed. */
import {readFile,stat} from 'node:fs/promises';
import {createExcellenceProgram} from './excellence-program.mjs';
const [file,sha,command='status',value=''] = process.argv.slice(2);
try {
  if (!file || !sha || !['status','task','search','ready'].includes(command)) throw Error('Usage: node run_excellence_program.mjs PLAN_JSON EXPECTED_SHA256 [status|task|search|ready] [selection]');
  if ((await stat(file)).size > 48*1024*1024) throw Error('PLAN_TOO_LARGE');
  const program = await createExcellenceProgram(await readFile(file),sha);
  const result = command==='status' ? program.descriptor() : command==='task' ? program.task(value) : command==='search' ? program.query({text:value}) : program.ready({limit:value ? Number(value) : 24});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch(error) { process.stderr.write((error.code||error.message)+'\n');process.exitCode=1; }
