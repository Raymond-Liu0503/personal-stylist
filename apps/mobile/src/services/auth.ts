import {createClient} from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Apple from 'expo-apple-authentication';
import {createSecureStorage} from './secure-storage';
export const supabaseUrl=process.env.EXPO_PUBLIC_SUPABASE_URL??'';
export const configured=!!supabaseUrl&&!!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const secureStorage=createSecureStorage(SecureStore,Crypto.randomUUID);
export const supabase=createClient(supabaseUrl||'https://unconfigured.invalid',process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'unconfigured',{auth:{storage:secureStorage,storageKey:'stylist.session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export async function appleSignIn(){
 if(!configured)throw new Error('Configure the Supabase URL and publishable key before signing in.');
 const nonce=Crypto.randomUUID()+Crypto.randomUUID();const hashed=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce);
 const credential=await Apple.signInAsync({requestedScopes:[Apple.AppleAuthenticationScope.FULL_NAME,Apple.AppleAuthenticationScope.EMAIL],nonce:hashed});
 if(!credential.identityToken)throw new Error('Apple did not return an identity token. Please retry.');
 const result=await supabase.auth.signInWithIdToken({provider:'apple',token:credential.identityToken,nonce});if(result.error)throw new Error('Apple sign-in could not be completed. Please retry.');
 return credential;
}
export async function clearCredentials(){await supabase.auth.signOut({scope:'local'});await secureStorage.removeItem('stylist.session');}
