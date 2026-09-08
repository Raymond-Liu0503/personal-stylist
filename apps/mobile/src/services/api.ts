import {z} from 'zod';
import {File} from 'expo-file-system';
import {fetch} from 'expo/fetch';
import {AnalysisResponseSchema,ApiErrorSchema,type OutfitAnalysisMetadata} from '@stylist/contracts';
import {supabase,supabaseUrl} from './auth';
export class ClientError extends Error{constructor(public code:string,message:string){super(message);}}
async function currentSession(){
 try{
  const result=await supabase.auth.getSession();
  if(result.error||!result.data.session)throw new ClientError('UNAUTHENTICATED','Please sign in again.');
  return result.data.session;
 }catch(e){
  if(e instanceof ClientError)throw e;
  throw new ClientError('NETWORK','The sign-in connection ended. Please sign in again and retry.');
 }
}
export async function api<T>(path:string,schema:z.ZodType<T>,options:{method?:string;body?:unknown;signal?:AbortSignal;requestId?:string}={}):Promise<T>{
 const session=await currentSession();
 const controller=new AbortController();let timedOut=false;
 const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},60000);
 try{
 const multipart=options.body instanceof FormData;
 let response:Awaited<ReturnType<typeof fetch>>;try{response=await fetch(`${supabaseUrl}/functions/v1/api/${process.env.EXPO_PUBLIC_API_VERSION??'v1'}${path}`,{method:options.method??'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(!multipart?{'Content-Type':'application/json'}:{}),...(options.requestId?{'Idempotency-Key':options.requestId}:{})},body:options.body===undefined?undefined:multipart?options.body as FormData:JSON.stringify(options.body),signal:controller.signal});}catch(e){if(controller.signal.aborted)throw new ClientError(timedOut?'TIMEOUT':'CANCELLED',timedOut?'The request reached its deadline. An already-started analysis may count toward your allowance.':'The request was cancelled.');if(multipart&&e instanceof Error&&e.message.includes('Unsupported FormData'))throw new ClientError('PHOTO_UPLOAD','The photo could not be attached. No assessment was sent. Reload the app and choose the photo again.');throw new ClientError('NETWORK','The connection ended. An already-started analysis may count toward your allowance.');}
 let raw:unknown;try{raw=await response.json();}catch{throw new ClientError(timedOut?'TIMEOUT':'INVALID_OUTPUT',timedOut?'The request reached its deadline.':'The service returned an unreadable response.');}if(controller.signal.aborted)throw new ClientError('CANCELLED','The request was cancelled.');const current=await currentSession();if(current.user.id!==session.user.id)throw new ClientError('UNAUTHENTICATED','Your session changed. Please sign in again.');if(!response.ok){const parsed=ApiErrorSchema.safeParse(raw);throw new ClientError(parsed.success?parsed.data.error.code:'UNKNOWN',parsed.success?parsed.data.error.message:'The request could not be completed.');}const parsed=schema.safeParse(raw);if(!parsed.success)throw new ClientError('INVALID_OUTPUT','The response could not be validated. Start a new analysis only if you want another attempt.');return parsed.data;
 }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
export async function analyze(uri:string,metadata:OutfitAnalysisMetadata,requestId:string,signal:AbortSignal){
 if(signal.aborted)throw new ClientError('CANCELLED','The request was cancelled.');
 let file:File;
 try{file=new File(uri);if(!file.exists||file.size<=0||file.size>2*1024*1024||file.type!=='image/jpeg')throw new Error('Invalid prepared photo');}
 catch{throw new ClientError('PHOTO_UNAVAILABLE','The prepared photo is unavailable. Take or choose a new photo. No assessment was sent.');}
 const form=new FormData();form.append('metadata',JSON.stringify(metadata));
 // Expo fetch accepts File/Blob parts, not React Native's legacy {uri, type, name} descriptors.
 form.append('image',file);
 return api('/analyze/outfit',AnalysisResponseSchema,{method:'POST',body:form,requestId,signal});
}
