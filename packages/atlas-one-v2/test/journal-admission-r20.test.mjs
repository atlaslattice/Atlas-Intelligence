/**
 * R20 exact-source-derived local journal-admission regressions, Cupwake Work #136.
 * This is NOT a hosted/D1/receiver authorization or CI test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
const F=()=>join(mkdtempSync(join(tmpdir(),'atlas-r20-')),'journal.json');
const entry={runId:'run-r20',inputDigest:'d'.repeat(64),requestId:'request-r20',step:'PREPARED',detail:{checkpoint:true}};
const original=()=>{const f=F();new AtomicJournal(f).record(entry);return f;};
function holdWithoutMutation(label,transform,expected='JOURNAL_CORRUPT'){
 test(label,()=>{
   const f=original();writeFileSync(f,transform(readFileSync(f,'utf8')));
   const b=readFileSync(f);
   for(const opts of [{readOnly:true},{}]){
     assert.throws(()=>new AtomicJournal(f,opts),e=>e?.name==='AtlasHold'&&e?.code===expected,`open ${JSON.stringify(opts)}`);
     assert.deepEqual(readFileSync(f),b,'failed admission must not rewrite source bytes');
   }
 });
}
const nesting='['.repeat(12000)+'0'+']'.repeat(12000);
// JSON.parse succeeds on this 24KB fixture but recursively ordered canonical
// previously threw a generic RangeError before schema admission.
holdWithoutMutation('R20 oversized nesting fails with controlled HOLD',_=>'{"runs":{},"version":3,"z":'+nesting+'}\n');
// JSON.parse turns 1e400 into Infinity; old code surfaced NONCANONICAL_VALUE.
holdWithoutMutation('R20 nonfinite exponent is mapped to journal corruption HOLD',_=>'{"runs":{},"version":3,"z":1e400}\n');
holdWithoutMutation('R20 raw size limit applies before parse',_=>' '.repeat(2_000_001));
holdWithoutMutation('R20 unterminated string remains controlled corruption',_=>' { "runs": { "abc": ');
holdWithoutMutation('R19 noncanonical raw byte classification is preserved',s=>s.replace('"version":3','"version":3,"version":3'),'JOURNAL_RAW_NONCANONICAL');
test('R20 re-checks preflight on post-open reads and write admission',()=>{
 const f=original(),j=new AtomicJournal(f),invalid='{"runs":{},"version":3,"z":'+nesting+'}\n';
 writeFileSync(f,invalid);const b=readFileSync(f);
 assert.throws(()=>j.list(),e=>e?.code==='JOURNAL_CORRUPT');
 assert.throws(()=>j.inspect(entry.runId),e=>e?.code==='JOURNAL_CORRUPT');
 assert.throws(()=>j.record({...entry,requestId:'request-extra'}),e=>e?.code==='JOURNAL_CORRUPT');
 assert.deepEqual(readFileSync(f),b);
});
test('R20 quoted/escaped brackets do not consume nesting allowance',()=>{
 const f=F(), j=new AtomicJournal(f),
   text='['.repeat(8000)+'\\\\\\"'+'}'.repeat(8000)+'\\'.repeat(100);
 assert.equal(j.record({...entry,detail:{text}}).replayed,false);
 assert.equal(new AtomicJournal(f,{readOnly:true}).inspect(entry.runId).events[0].detail.text,text);
});
test('R20 normal first-party journal and explicitly opted-in legacy remain loadable',()=>{
 const f=original(),w=new AtomicJournal(f);assert.equal(w.record(entry).replayed,true);
 const lf=F();writeFileSync(lf,'{"version":2, "runs":{}}\n');
 assert.deepEqual(new AtomicJournal(lf,{readOnly:true,legacyRead:true}).list(),[]);
});
