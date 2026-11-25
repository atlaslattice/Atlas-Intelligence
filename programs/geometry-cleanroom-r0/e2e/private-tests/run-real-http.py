import os,subprocess,sys,json,hashlib,urllib.request,urllib.error,time,secrets,pathlib,signal
ROOT=pathlib.Path(__file__).resolve().parents[1]
TOKEN=secrets.token_urlsafe(42)
ENV=os.environ.copy();ENV.update(ATLAS_OWNER_LOCAL_TOKEN=TOKEN,
 ATLAS_OWNER_WORKSPACE=os.environ.get('ATLAS_OWNER_WORKSPACE',''),
 ATLAS_OWNER_R06=os.environ.get('ATLAS_OWNER_R06',''),
 ATLAS_PYTHON=sys.executable,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',MKL_NUM_THREADS='1')
assert ENV['ATLAS_OWNER_WORKSPACE'] and ENV['ATLAS_OWNER_R06'], 'Set private restored model and verified R06 source environment paths'
server=subprocess.Popen(['node',str(ROOT/'src/run-local.mjs')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=ENV,text=True,bufsize=1)
try:
 line=server.stdout.readline().strip()
 if not line: raise RuntimeError('Server exited before readiness: '+str(server.poll()))
 ready=json.loads(line);assert ready['status']=='READY_LOCAL_LOOPBACK',ready
 print('READY',json.dumps({k:ready[k] for k in ['status','bind','publicDeployment','remoteRights']}))
 url=f"http://127.0.0.1:{ready['port']}/v1/neural-inspect"
 def send(payload,token=TOKEN):
  b=json.dumps(payload,separators=(',',':')).encode();r=urllib.request.Request(url,data=b,method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
  try:
   with urllib.request.urlopen(r,timeout=90) as s:return s.status,json.load(s)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 base=dict(query='Describe the source evidence, geometric identity and six-line symbolic navigation in the Atlas 12 by 12 by 12 architecture.',
           k=12,sourceSha256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',sourceEdition='ariadne-original-v0.7',scope='WORK')
 a=dict(base,requestId='actual-selected-03-cupwake',yijingEdition='atlas.yijing.cupwake-r01')
 b=dict(base,requestId='actual-selected-03-symbiosis',yijingEdition='atlas.yijing.symbiosis-v03')
 unauth=send(a,token='bad');assert unauth[0]==401 and unauth[1]['status']=='HOLD'
 s1,r1=send(a);s2,r2=send(b)
 assert s1==200 and s2==200,(s1,r1,s2,r2)
 assert r1['status']==r2['status']=='LOCAL_AUTHENTICATED_INSPECTION'
 assert r1['scoreSha256']==r2['scoreSha256'] and r1['embeddingSha256']==r2['embeddingSha256']
 assert [x['hsn'] for x in r1['top']]==[x['hsn'] for x in r2['top']]
 assert all(len(x['coefficients'])==9 for x in r1['top'])
 assert r1['singleNeuralExecution'] and r2['singleNeuralExecution']
 assert not r1['releaseAuthorized'] and not r2['currentExternalRightsVerified'] and not r1['hostedPublic']
 assert r1['yijingEdition']!=r2['yijingEdition']
 print('REAL_HTTP_ACCEPTANCE',json.dumps({'http':[s1,s2],'unauthorizedHttp':unauth[0],'head':r1['headStateSha256'],
  'scoreSha256':r1['scoreSha256'],'embeddingSha256':r1['embeddingSha256'], 'topHSN':[x['hsn'] for x in r1['top']],
  'symbolicCodeExample':{'cupwake':[r1['top'][0]['hexagramCode'],r1['top'][0]['ternaryContext']],
                         'symbiosis':[r2['top'][0]['hexagramCode'],r2['top'][0]['ternaryContext']]},
  'singleNeuralExecutionPerRequest':True,'externalRights':False,'internetDeployment':False},sort_keys=True))
 report={'schema':'atlas.e2e.actual-model-loopback-acceptance/v1','sourceRelease':'atlas-flat180-0.3.0',
 'headSha256':r1['headStateSha256'],'modelExecuted':True,'loopbackHostExecuted':True,
 'oneEncoderOneHeadPerRequest':True,'authenticatedLocalBearer':True,
 'bearerNegative':401,'sameScoreDigestAcrossSymbolicEditions':True,
 'noRankChange':True,'sourceSha256':base['sourceSha256'],'scoreSha256':r1['scoreSha256'],
 'embeddingSha256':r1['embeddingSha256'],'topHSN':[x['hsn'] for x in r1['top']],
 'remoteSourceEntitlementsVerified':False,'externalHostedDeployment':False,
 'independentRequiredClosureSatisfied':False,'genuineIndependentHumanPanel':False,
 'physicalCymaticMappingExperimentPerformed':False,'trainingUpdates':0}
 path=ROOT/'evidence/REAL_HTTP_LOCAL_PRIVATE_INSPECTION_RECEIPT.json';path.write_text(json.dumps(report,indent=2)+'\n')
 print('WROTE_PRIVATE_RECEIPT',path)
finally:
 server.terminate()
 try:server.wait(timeout=8)
 except subprocess.TimeoutExpired:server.kill()
