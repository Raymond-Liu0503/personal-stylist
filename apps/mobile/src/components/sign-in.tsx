import React,{useEffect,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import * as Apple from 'expo-apple-authentication';
import {Button,styles} from './ui';
import {supabase,supabaseUrl} from '../services/auth';
import {allowsLocalLogin} from '../services/local-auth';

export function SignIn({disabled,onApple,onLocal}:{disabled:boolean;onApple:()=>void;onLocal:(login:()=>Promise<void>)=>void}){
 const local=allowsLocalLogin(__DEV__,process.env.EXPO_PUBLIC_ENVIRONMENT,supabaseUrl);
 const [available,setAvailable]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 useEffect(()=>{let active=true;void Apple.isAvailableAsync().then(value=>{if(active)setAvailable(value);}).catch(()=>{});return()=>{active=false;};},[]);
 // Local Expo Go testing avoids depending on the native Apple button registration.
 const nativeButton=available&&!local;
 return <View style={{gap:12}}>
  {nativeButton?<Apple.AppleAuthenticationButton buttonType={Apple.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{height:54,width:'100%'}} onPress={()=>{if(!disabled)onApple();}}/>:!local?<Text style={styles.text}>Apple sign-in is unavailable in this runtime. Use a compatible iOS development build with Apple sign-in configured.</Text>:null}
  {local&&<><Text style={styles.heading}>Local test login</Text><Text style={styles.muted}>Use the account printed by npm run local:user. Age confirmation and consent are still required.</Text>
   <TextInput accessibilityLabel="Local test email" style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Test email"/>
   <TextInput accessibilityLabel="Local test password" style={styles.input} secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} placeholder="Test password"/>
   <Button title="Sign in for local testing" disabled={disabled||!email.trim()||!password} onPress={()=>onLocal(async()=>{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw new Error('Local login failed. Check the test credentials and local Supabase connection.');setPassword('');})}/>
  </>}
 </View>;
}
