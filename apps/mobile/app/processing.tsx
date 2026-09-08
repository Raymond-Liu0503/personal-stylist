import React,{useEffect,useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Page,Button,Busy,ErrorText,styles} from '../src/components/ui';
import {useAnalysis} from '../src/state/analysis-context';
export default function Processing(){const {state,submit,cancel}=useAnalysis();const [error,setError]=useState<string|null>(null);useEffect(()=>{if(state.status==='result')router.replace('/results');},[state.status]);
 return <Page title={state.status==='failed'?'The assessment did not finish':'Looking at the whole look.'}>{state.status!=='failed'&&<Busy text="Assessing visible details and preparing suggestions…"/>}<Text style={styles.text}>This usually takes a few moments. You can cancel at any time.</Text><Text style={styles.muted}>A request already sent to the AI provider may still count toward your daily allowance.</Text><ErrorText message={error??state.error}/>{state.status==='failed'&&state.prepared&&<Button title="Start a new analysis (uses allowance)" onPress={()=>void submit()}/>}<Button title="Cancel and clear photo" secondary onPress={()=>{void cancel().then(()=>router.replace('/')).catch(e=>setError(e.message));}}/></Page>;
}
