import React,{createContext,useContext,useEffect,useReducer,useRef,useState} from 'react';
import {contextForIntent,IntentSelectionSchema,type IntentPresetId} from '@stylist/contracts';
import * as Crypto from 'expo-crypto';
import {analysisReducer,initialAnalysis,type AnalysisState} from './analysis';
import {prepareImage,cleanupImages,type Photo,type Crop} from '../services/images';
import {analyze} from '../services/api';
import {useSession} from './session';
export type PreparationOutcome={status:'success';photo:Photo}|{status:'cancelled'}|{status:'failure';message:string};
const Context=createContext<{state:AnalysisState;setPrompt:(s:string)=>void;setIntent:(id:IntentPresetId)=>void;setCustomIntent:(s:string)=>void;prepare:(p:Photo,c?:Crop)=>Promise<PreparationOutcome>;timer:0|3|10;setTimer:(n:0|3|10)=>void;submit:()=>Promise<void>;cancel:(preserveBrief?:boolean)=>Promise<void>}>({state:initialAnalysis,setPrompt:()=>{},setIntent:()=>{},setCustomIntent:()=>{},prepare:async()=>({status:'cancelled'}),timer:0,setTimer:()=>{},submit:async()=>{},cancel:async()=>{}});
export const useAnalysis=()=>useContext(Context);
export function AnalysisProvider({children}:{children:React.ReactNode}){
 const [timer,setTimer]=useState<0|3|10>(0);
 const [state,dispatch]=useReducer(analysisReducer,initialAnalysis);const stateRef=useRef(state);stateRef.current=state;
 const active=useRef<AbortController|null>(null);const work=useRef<Promise<unknown>|null>(null);const {session,refresh}=useSession();
 const cancel=async(preserveBrief=false)=>{active.current?.abort();dispatch({type:'cancel'});try{await work.current?.catch(()=>{});await cleanupImages();}finally{dispatch({type:'reset',preserveBrief});}};
 useEffect(()=>{setTimer(0);if(!session)void cancel().catch(()=>{});return()=>{active.current?.abort();};},[session?.user.id]);
 const prepare=async(photo:Photo,crop?:Crop):Promise<PreparationOutcome>=>{if(active.current)return {status:'cancelled'};const controller=new AbortController();active.current=controller;dispatch({type:'prepare',photo,controller});
  const task=(async():Promise<PreparationOutcome>=>{try{const prepared=await prepareImage(photo,crop,controller.signal);if(controller.signal.aborted)return {status:'cancelled'};dispatch({type:'ready',photo:prepared,controller});return {status:'success',photo:prepared};}catch(e){if(controller.signal.aborted)return {status:'cancelled'};const message=e instanceof Error?e.message:'Photo preparation failed.';dispatch({type:'failed',message,controller});return {status:'failure',message};}finally{if(active.current===controller)active.current=null;}})();work.current=task;return task;};
 const submit=async()=>{const current=stateRef.current;if(!IntentSelectionSchema.safeParse(current.intent).success||active.current||!current.prepared||!['ready','failed'].includes(current.status))return;
  const controller=new AbortController();active.current=controller;const requestId=Crypto.randomUUID();dispatch({type:'submit',requestId,controller});
  const task=(async()=>{try{const result=await analyze(current.prepared!.uri,{schemaVersion:1,prompt:current.prompt,context:contextForIntent(current.intent)},requestId,controller.signal);if(!controller.signal.aborted)dispatch({type:'result',requestId,result});await cleanupImages().catch(()=>{});}catch(e){if(!controller.signal.aborted)dispatch({type:'failed',message:e instanceof Error?e.message:'Analysis failed.',controller});}finally{if(active.current===controller)active.current=null;void refresh().catch(()=>{});}})();work.current=task;await task;};
 return <Context.Provider value={{state,setPrompt:prompt=>dispatch({type:'prompt',prompt}),setIntent:id=>dispatch({type:'intent',id}),setCustomIntent:custom=>dispatch({type:'customIntent',custom}),prepare,submit,cancel,timer,setTimer}}>{children}</Context.Provider>;
}
