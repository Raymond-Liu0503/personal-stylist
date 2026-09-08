import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import expoMultipart from '../node_modules/expo/src/winter/fetch/convertFormData.ts';
import {AnalysisResponseSchema,BootstrapSchema} from '../packages/contracts/src/index.ts';

// Local transport smoke test. Only a generated 1px gray JPEG is sent; no user photos.
// Run: node --import tsx scripts/test-upload.mjs
const status=JSON.parse(execFileSync(process.platform==='win32'?'npx.cmd':'npx',['supabase','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','inherit']}));
const {convertFormDataAsync}=expoMultipart;
const base=new URL(status.API_URL);
assert.equal(base.protocol,'http:');assert.ok(['127.0.0.1','localhost'].includes(base.hostname));assert.equal(base.port,'54321');
const admin=createClient(base.href,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const client=createClient(base.href,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let userId;
const segment=(marker,payload)=>[255,marker,(payload.length+2)>>8,(payload.length+2)&255,...payload];
const jpeg=new Uint8Array([255,216,
 ...segment(219,[0,...Array(64).fill(1)]),
 ...segment(192,[8,0,1,0,1,1,1,0x11,0]),
 ...segment(196,[0,1,...Array(15).fill(0),0,16,1,...Array(15).fill(0),0]),
 ...segment(218,[1,1,0,0,63,0]),0x3f,255,217]);
try{
 const email=`upload-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;userId=created.data.user.id;
 const signed=await client.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;
 const authorization=`Bearer ${signed.data.session.access_token}`;
 const request=async(path,options={})=>fetch(`${base.origin}/functions/v1/api/v1${path}`,{...options,headers:{Authorization:authorization,...options.headers},signal:AbortSignal.timeout(60000)});
 const bootstrap=await request('/bootstrap');assert.equal(bootstrap.status,200);const account=BootstrapSchema.parse(await bootstrap.json());assert.equal(account.analysisMode,'mock','This smoke test must never invoke a paid provider.');
 const beta=await admin.from('beta_access').insert({user_id:userId,enabled:true});if(beta.error)throw beta.error;
 const consent=await request('/consents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policyVersion:'2026-09-01',accepted:true,adultConfirmed:true})});assert.equal(consent.status,200);
 const form=new FormData();form.append('metadata',JSON.stringify({schemaVersion:1}));form.append('image',new File([jpeg],'fixture.jpg',{type:'image/jpeg'}));
 const {body,boundary}=await convertFormDataAsync(form);
 const started=Date.now(),requestId=randomUUID();
 const options={method:'POST',headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`,'Idempotency-Key':requestId},body};
 const response=await request('/analyze/outfit',options);const raw=await response.json();assert.equal(response.status,200,JSON.stringify(raw));const result=AnalysisResponseSchema.parse(raw);assert.equal(result.kind,'report');assert.ok(result.receipt);
 const duplicate=await request('/analyze/outfit',options);assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).error.code,'DUPLICATE_FINISHED');
 const quota=BootstrapSchema.parse(await (await request('/bootstrap')).json());assert.equal(quota.remainingQuota,2);
 const saved=await request('/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report:result.report,receipt:result.receipt})});assert.equal(saved.status,201);
 const history=await request('/reports');assert.equal(history.status,200);assert.equal((await history.json()).items.length,1);
 console.log(`PASS: Expo multipart upload, validated mock report, receipt, duplicate prevention, quota, Save/history (${Date.now()-started} ms).`);
}finally{
 if(userId){const deleted=await admin.auth.admin.deleteUser(userId);if(deleted.error)throw deleted.error;}
}
