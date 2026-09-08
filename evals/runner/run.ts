import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {MetadataSchema} from '../../packages/contracts/src/index.ts';
import {MockProvider} from '../../supabase/functions/_shared/providers/mock.ts';
import {OpenRouterProvider} from '../../supabase/functions/_shared/providers/openrouter.ts';
import {runOutfit} from '../../supabase/functions/_shared/agents/runtime.ts';
import {sanitizeJpeg} from '../../supabase/functions/_shared/security/input.ts';
const [manifestPath,imageRoot,outputPath]=process.argv.slice(2);
if(!manifestPath||!imageRoot||!outputPath)throw new Error('Usage: node --import tsx evals/runner/run.ts MANIFEST IMAGE_ROOT OUTPUT');
const live=process.env.EVAL_LIVE==='true';
if(live&&(process.env.OPENROUTER_CONFIG_APPROVED!=='true'||process.env.EVAL_RIGHTS_CONFIRMED!=='true'))throw new Error('Live evaluation requires provider approval and image-rights confirmation');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));const results=[];
for(const c of manifest.cases){
 if(typeof c.rights!=='string'||c.rights.includes('REPLACE'))throw new Error('Supply actual image rights records');
 const path=resolve(imageRoot,c.image);if(relative(resolve(imageRoot),path).startsWith('..'))throw new Error('Image path must remain under the external image root');
 const image=sanitizeJpeg(new Uint8Array(await readFile(path))).bytes;
 const provider=live?new OpenRouterProvider(process.env.OPENROUTER_API_KEY??'',(process.env.OPENROUTER_PROVIDERS??'').split(',').filter(Boolean)):new MockProvider();
 let costMicrodollars:number|null=0;const start=performance.now();
 const result=await runOutfit(provider,{runId:crypto.randomUUID(),metadata:MetadataSchema.parse(c.metadata),image,signal:AbortSignal.timeout(45000)},u=>{costMicrodollars=costMicrodollars===null||u.costMicrodollars===null?null:costMicrodollars+u.costMicrodollars;});
 results.push({id:c.id,model:provider.model,latencyMs:Math.round(performance.now()-start),costMicrodollars,result});
}
// Evaluations use consented test fixtures only. Output is outside git and contains reviewable prose.
await writeFile(outputPath,JSON.stringify({cases:results},null,2));
