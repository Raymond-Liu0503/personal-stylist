import React,{createContext,useContext,useEffect,useState,useCallback} from 'react';
import {AppState} from 'react-native';
import type {Session} from '@supabase/supabase-js';
import {BootstrapSchema,type Bootstrap} from '@stylist/contracts';
import {supabase,clearCredentials} from '../services/auth';
import {api} from '../services/api';
import {sweepImages,cleanupImages} from '../services/images';
import {Page,Button,ErrorText} from '../components/ui';
const Context=createContext<{session:Session|null;bootstrap:Bootstrap|null;loading:boolean;error:string|null;refresh:()=>Promise<void>;signOut:()=>Promise<void>}>({session:null,bootstrap:null,loading:true,error:null,refresh:async()=>{},signOut:async()=>{}});
export const useSession=()=>useContext(Context);
export function SessionProvider({children}:{children:React.ReactNode}){
 const [startupError,setStartupError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 const [session,setSession]=useState<Session|null>(null),[bootstrap,setBootstrap]=useState<Bootstrap|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const refresh=useCallback(async()=>{try{setBootstrap(await api('/bootstrap',BootstrapSchema));setError(null);}catch(e){setBootstrap(null);setError(e instanceof Error?e.message:'Unable to load your account.');throw e;}},[]);
 useEffect(()=>{let active=true;let subscription:ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription']|undefined;
  void (async()=>{try{await sweepImages();if(!active)return;const restored=await supabase.auth.getSession();if(restored.error)throw restored.error;setSession(restored.data.session);
   subscription=supabase.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);if(!s)setBootstrap(null);}}).data.subscription;
  }catch(e){if(active)setStartupError(e instanceof Error?e.message:'Secure startup failed.');}finally{if(active)setLoading(false);}})();
  const app=AppState.addEventListener('change',s=>{if(s==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});return()=>{active=false;subscription?.unsubscribe();app.remove();};
 },[attempt]);
 useEffect(()=>{if(session)void refresh().catch(()=>{});},[session?.user.id,refresh]);
 const signOut=async()=>{setSession(null);setBootstrap(null);const results=await Promise.allSettled([cleanupImages(),clearCredentials()]);const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;};
 if(startupError)return <Page title="Private startup could not finish"><ErrorText message={startupError}/><Button title="Retry secure startup" onPress={()=>{setStartupError(null);setLoading(true);setAttempt(n=>n+1);}}/></Page>;
 return <Context.Provider value={{session,bootstrap,loading,error,refresh,signOut}}>{children}</Context.Provider>;
}
