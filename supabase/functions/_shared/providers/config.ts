import { ApiError } from '../security/errors.ts';
import { readLimited } from '../security/input.ts';
import { MockProvider } from './mock.ts';
import { OpenRouterProvider } from './openrouter.ts';
import { productionModel } from '../agents/model-config.ts';
export const MODEL=productionModel.id;
export const REQUIRED_PARAMETERS=['tools','tool_choice','response_format','structured_outputs','max_tokens','reasoning','temperature'];
type Env=(name:string)=>string|undefined;
const disabled=()=>new ApiError('DISABLED',503,'The analysis provider configuration could not be verified.');
export function providerConfig(env:Env){
 const mode=env('AI_PROVIDER')??'mock';
 if(mode==='mock'){if(env('APP_ENV')!=='local')throw disabled();return {mode:'mock' as const};}
 const key=env('OPENROUTER_API_KEY')?.trim();const model=env('OPENROUTER_MODEL')??MODEL;
 const providers=(env('OPENROUTER_PROVIDERS')??'').split(',').map(s=>s.trim());
 if(mode!=='openrouter'||!key||/\s/.test(key)||model!==MODEL||env('OPENROUTER_CONFIG_APPROVED')!=='true'||!providers.length||providers.some(p=>!['google-vertex/global','google-vertex/us','google-vertex/eu'].includes(p))||new Set(providers).size!==providers.length)throw disabled();
 return {mode:'live' as const,key,providers,model};
}
export function validateRoute(model:unknown,zdr:unknown,providers:string[]){
 const data=model as {data?:{id?:string;architecture?:{input_modalities?:string[]};endpoints?:{tag:string;model_id:string;status:number;supported_parameters:string[];max_completion_tokens:number}[]}};
 const privacy=zdr as {data?:{tag:string;model_id:string}[]};
 if(data.data?.id!==MODEL||!data.data.architecture?.input_modalities?.includes('image')||!Array.isArray(data.data.endpoints)||!Array.isArray(privacy.data))throw disabled();
 for(const tag of providers){const endpoint=data.data.endpoints.find(e=>e.tag===tag&&e.model_id===MODEL);
  if(!endpoint||endpoint.status!==0||endpoint.max_completion_tokens<productionModel.maxOutputTokens||!REQUIRED_PARAMETERS.every(p=>endpoint.supported_parameters?.includes(p))||!privacy.data.some(e=>e.tag===tag&&e.model_id===MODEL))throw disabled();
 }
}
// Cache only successful checks briefly; changed configuration always forces a fresh check.
let cached:{key:string;providers:string;expires:number}|undefined;
export async function configuredProvider(env:Env,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const config=providerConfig(env);if(config.mode==='mock')return new MockProvider(env('MOCK_SCENARIO')??'success');
 const providers=config.providers.join(',');
 if(!cached||cached.key!==config.key||cached.providers!==providers||cached.expires<Date.now()){
  const bounded=AbortSignal.any([signal,AbortSignal.timeout(8000)]);
  const get=async(path:string,auth=false)=>{const response=await fetcher(`https://openrouter.ai/api/v1/${path}`,{signal:bounded,headers:auth?{Authorization:`Bearer ${config.key}`}:{}});if(!response.ok){await response.body?.cancel();throw disabled();}return JSON.parse(new TextDecoder().decode(await readLimited(response.body,4*1024*1024,bounded)));};
  try{const [model,zdr,credentials]=await Promise.all([get(`models/${MODEL}/endpoints`),get('endpoints/zdr'),get('key',true)]);validateRoute(model,zdr,config.providers);if(!credentials.data||credentials.data.limit_remaining!==null&&typeof credentials.data.limit_remaining!=='undefined'&&credentials.data.limit_remaining<=0)throw disabled();}
  catch{throw disabled();}
  cached={key:config.key,providers,expires:Date.now()+300000};
 }
 return new OpenRouterProvider(config.key,config.providers,fetcher);
}
