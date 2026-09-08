import * as FS from 'expo-file-system/legacy';
import * as Manipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import type {Photo} from "../state/photo";
export type {Photo} from "../state/photo";
export type Crop={originX:number;originY:number;width:number;height:number};
const directory=()=>`${FS.cacheDirectory}stylist-private/`;
const manifest=()=>`${directory()}copies.json`;
const tracked=new Set<string>();let queue=Promise.resolve();
const serial=<T>(fn:()=>Promise<T>)=>{const task=queue.then(fn,fn);queue=task.then(()=>{},()=>{});return task;};
// Some native/polyfilled AbortSignals expose `aborted` without throwIfAborted.
// Check the flag directly so cancellation works across Expo Go runtimes.
function checkCancellation(signal?:AbortSignal){
 if(!signal?.aborted)return;
 if(signal.reason!==undefined)throw signal.reason;
 const error=new Error('Photo preparation was cancelled.');error.name='AbortError';throw error;
}
async function persist(){await FS.makeDirectoryAsync(directory(),{intermediates:true});await FS.writeAsStringAsync(manifest(),JSON.stringify([...tracked]));}
async function remove(uri:string){if(FS.cacheDirectory&&uri.startsWith(FS.cacheDirectory))await FS.deleteAsync(uri,{idempotent:true});}
export async function trackTemporary(uri:string){return serial(async()=>{if(!FS.cacheDirectory||!uri.startsWith(FS.cacheDirectory))throw new Error('The photo could not be copied into temporary storage.');tracked.add(uri);await persist();});}
export async function discardTemporary(uri:string){return serial(async()=>{if(!tracked.has(uri))return;await remove(uri);tracked.delete(uri);await persist();});}
export async function cleanupImages(){return serial(async()=>{let failed=false;for(const uri of tracked){try{await remove(uri);tracked.delete(uri);}catch{failed=true;}}if(failed){await persist();throw new Error('Temporary-photo cleanup failed. Please restart before taking another photo.');}await FS.deleteAsync(directory(),{idempotent:true});});}
export async function sweepImages(){return serial(async()=>{
 const info=await FS.getInfoAsync(manifest());if(info.exists){const values=JSON.parse(await FS.readAsStringAsync(manifest()));if(!Array.isArray(values))throw new Error('Temporary-photo manifest is invalid.');for(const uri of values){if(typeof uri==='string')await remove(uri);}}
 // Native modules create a copy before JS can journal it. This app exclusively owns these caches.
 if(FS.cacheDirectory)for(const name of ['ImagePicker','ImageManipulator','Camera'])await FS.deleteAsync(`${FS.cacheDirectory}${name}`,{idempotent:true});
 tracked.clear();await FS.deleteAsync(directory(),{idempotent:true});await FS.makeDirectoryAsync(directory(),{intermediates:true});
 });}
export async function prepareImage(photo:Photo,crop?:Crop,signal?:AbortSignal):Promise<Photo>{
 try{
  checkCancellation(signal);
  const width=crop?.width??photo.width,height=crop?.height??photo.height;
  if(!width||!height)throw new Error('The photo dimensions could not be read.');
  const resize=width>=height?{width:Math.min(1600,width)}:{height:Math.min(1600,height)};
  for(const quality of [0.85,0.7,0.5,0.3]){
   const result=await Manipulator.manipulateAsync(photo.uri,[...(crop?[{crop}]:[]),{resize}],{format:Manipulator.SaveFormat.JPEG,compress:quality});
   await trackTemporary(result.uri);checkCancellation(signal);
   // Re-encoding removes source metadata. Edge independently strips JPEG APP/COM segments.
   const info=await FS.getInfoAsync(result.uri);if(info.exists&&info.size<=2*1024*1024){
    const owned=`${directory()}${Crypto.randomUUID()}.jpg`;await trackTemporary(owned);await FS.copyAsync({from:result.uri,to:owned});checkCancellation(signal);return {uri:owned,width:result.width,height:result.height};
   }
   await discardTemporary(result.uri);
  }
  throw new Error('This photo is still too large. Try a simpler crop or another photo.');
 }catch(e){await cleanupImages().catch(()=>{});throw e;}
}
