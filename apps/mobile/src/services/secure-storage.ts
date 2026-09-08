export interface SecureBackend {getItemAsync(key:string):Promise<string|null>;setItemAsync(key:string,value:string):Promise<void>;deleteItemAsync(key:string):Promise<void>}
// Copy-on-write chunks avoid SecureStore's per-value limits without plaintext fallback.
// The small manifest switches only after all new chunks have been written.
export function createSecureStorage(backend:SecureBackend,uuid:()=>string){
 const size=1500,maxChunks=128;let queue=Promise.resolve();
 const serial=<T>(fn:()=>Promise<T>)=>{const task=queue.then(fn,fn);queue=task.then(()=>{},()=>{});return task;};
 const parse=(raw:string|null)=>{if(!raw)return null;const x=JSON.parse(raw);if(typeof x.g!=='string'||!/^[a-zA-Z0-9-]+$/.test(x.g)||!Number.isInteger(x.n)||x.n<1||x.n>maxChunks)throw new Error('Secure session storage is damaged.');return x as {g:string;n:number};};
 const clean=async(k:string,m:{g:string;n:number}|null)=>{if(m)for(let i=0;i<m.n;i++)await backend.deleteItemAsync(`${k}.${m.g}.${i}`);};
 return {
 getItem:(k:string)=>serial(async()=>{const m=parse(await backend.getItemAsync(k));if(!m)return null;let result='';for(let i=0;i<m.n;i++){const chunk=await backend.getItemAsync(`${k}.${m.g}.${i}`);if(chunk===null)throw new Error('Secure session storage is incomplete. Please sign in again.');result+=chunk;}return decodeURIComponent(result);}),
 setItem:(k:string,value:string)=>serial(async()=>{const encoded=encodeURIComponent(value);const n=Math.max(1,Math.ceil(encoded.length/size));if(n>maxChunks)throw new Error('This session exceeds secure storage capacity.');const old=parse(await backend.getItemAsync(k));const m={g:uuid(),n};try{for(let i=0;i<n;i++)await backend.setItemAsync(`${k}.${m.g}.${i}`,encoded.slice(i*size,(i+1)*size));await backend.setItemAsync(k,JSON.stringify(m));}catch{await clean(k,m).catch(()=>{});throw new Error('Unable to save your session securely. Check device storage and sign in again.');}await clean(k,old);}),
 removeItem:(k:string)=>serial(async()=>{const m=parse(await backend.getItemAsync(k));await clean(k,m);await backend.deleteItemAsync(k);})
 };
}
