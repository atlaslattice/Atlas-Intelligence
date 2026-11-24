#!/usr/bin/env node
/** Read-only entry point into the existing source-defined engineering program. */
import {excellenceAction} from '../programs/excellence1728/integrations/excellence-host.mjs';

const [action = 'status', ...args] = process.argv.slice(2);
const fail = () => { throw new TypeError('Usage: run_excellence1728.mjs status | task EX.W01.C01.P01 | query words | ready [1..144] | prepare TASK_ID WORK_ROOM_ID'); };
try {
  let result;
  if (action === 'status' && args.length === 0) result = await excellenceAction('excellence_status');
  else if (action === 'task' && args.length === 1) result = await excellenceAction('excellence_task', {taskId:args[0]});
  else if (action === 'query' && args.length) result = await excellenceAction('excellence_query', {text:args.join(' '),limit:12});
  else if (action === 'ready' && args.length <= 1) {
    if (args.length && !/^[0-9]{1,3}$/.test(args[0])) fail();
    result = await excellenceAction('excellence_ready', {limit:args.length ? Number(args[0]) : 12});
  } else if (action === 'prepare' && args.length === 2) result = await excellenceAction('excellence_prepare', {taskId:args[0],roomId:args[1]});
  else fail();
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch (error) {
  process.stderr.write(JSON.stringify({error:error.code || error.name,message:error.message})+'\n');
  process.exitCode = 2;
}
