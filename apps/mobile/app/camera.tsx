import React,{useRef,useState,useEffect,useCallback} from 'react';
import {Text,View,AppState,AccessibilityInfo} from 'react-native';
import {CameraView,useCameraPermissions,type CameraType} from 'expo-camera';
import {router,useFocusEffect} from 'expo-router';
import {Button,Page,ErrorText,styles} from '../src/components/ui';
import {useAnalysis} from '../src/state/analysis-context';
import {trackTemporary,discardTemporary} from '../src/services/images';
export default function Camera(){
 const [permission,requestPermission]=useCameraPermissions();const camera=useRef<CameraView>(null);
 const [facing,setFacing]=useState<CameraType>('front'),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[count,setCount]=useState<number|null>(null),[error,setError]=useState<string|null>(null);
 const [visible,setVisible]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active'),[cameraAttempt,setCameraAttempt]=useState(0),[startupError,setStartupError]=useState<string|null>(null);
 const {prepare,cancel,timer,setTimer}=useAnalysis();const latest=useRef({prepare,cancel});latest.current={prepare,cancel};
 const mounted=useRef(true),focused=useRef(false),moving=useRef(false),locked=useRef(false),generation=useRef(0),timeout=useRef<ReturnType<typeof setTimeout>|null>(null),capturing=useRef(false);
 const stop=useCallback(()=>{generation.current++;if(timeout.current)clearTimeout(timeout.current);timeout.current=null;if(mounted.current){setCount(null);if(!capturing.current){locked.current=false;setBusy(false);}}void latest.current.cancel().catch(()=>{});},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useFocusEffect(useCallback(()=>{focused.current=true;setReady(false);setStartupError(null);setVisible(true);return()=>{focused.current=false;setVisible(false);setReady(false);if(!moving.current)stop();};},[stop]));
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{setForeground(state==='active');if(state!=='active'){setReady(false);stop();}else setStartupError(null);});return()=>subscription.remove();},[stop]);
 useEffect(()=>{if(!permission?.granted){setReady(false);stop();}},[permission?.granted,stop]);
 const showCamera=visible&&foreground&&permission?.granted;
 useEffect(()=>{if(!showCamera||ready||startupError)return;const deadline=setTimeout(()=>setStartupError('The camera is taking too long to start. Tap Restart camera to try again.'),8000);return()=>clearTimeout(deadline);},[showCamera,ready,startupError,cameraAttempt,facing]);
 const restart=()=>{if(locked.current)return;setReady(false);setStartupError(null);setError(null);setCameraAttempt(n=>n+1);};
 // iOS emits onCameraReady once per native view, not on every facing change.
 // Remount for switches/restarts, and release the view when this screen is inactive.
 const cameraKey=`${facing}:${cameraAttempt}`;
 const start=()=>{
  if(locked.current||!ready||!permission?.granted||!focused.current)return;
  locked.current=true;setBusy(true);setError(null);const token=++generation.current;
  const valid=()=>mounted.current&&focused.current&&generation.current===token&&AppState.currentState==='active';
  const capture=async()=>{if(!valid())return;setCount(null);capturing.current=true;
   try{const photo=await camera.current?.takePictureAsync({quality:1,exif:false,skipProcessing:false});if(!photo)throw new Error('The camera did not capture a photo.');await trackTemporary(photo.uri);
    if(!valid()){await discardTemporary(photo.uri);return;}
    const outcome=await latest.current.prepare(photo);if(!valid())return;
    if(outcome.status==='success'){moving.current=true;router.replace('/review');}else if(outcome.status==='failure')setError(outcome.message);
   }catch(e){if(valid())setError(e instanceof Error?e.message:'Capture failed.');}
   finally{capturing.current=false;locked.current=false;if(mounted.current)setBusy(false);}
  };
  const tick=(seconds:number)=>{if(!valid())return;if(seconds===0){void capture();return;}setCount(seconds);AccessibilityInfo.announceForAccessibility(`${seconds}`);timeout.current=setTimeout(()=>tick(seconds-1),1000);};tick(timer);
 };
 if(!permission?.granted)return <Page title="Camera access"><Text style={styles.text}>Allow camera access to take an outfit photo, or choose one from your library.</Text><Button title="Allow camera" onPress={()=>void requestPermission()}/><Button title="Back" secondary onPress={()=>router.back()}/></Page>;
 return <View style={[styles.page,{padding:16,gap:14}]}><Text style={styles.text}>Keep the outfit in frame. Stand in even light.</Text><View style={{flex:1,minHeight:280}}>{showCamera&&<CameraView key={cameraKey} ref={camera} facing={facing} mirror={false} onCameraReady={()=>{setReady(true);setStartupError(null);}} onMountError={()=>{setReady(false);stop();setStartupError('The camera could not start. Tap Restart camera to try again.');}} style={{flex:1}}/>}{count!==null&&<View pointerEvents="none" style={{position:'absolute',inset:0,alignItems:'center',justifyContent:'center'}}><Text accessibilityRole="timer" style={{fontSize:96,color:'white',fontWeight:'bold',backgroundColor:'#0008',paddingHorizontal:24}}>{count}</Text></View>}</View><ErrorText message={startupError??error}/>{startupError&&<Button title="Restart camera" secondary disabled={busy} onPress={restart}/>}<View style={styles.row}>{([0,3,10] as const).map(value=><Button key={value} title={`Timer ${value===0?'Off':`${value}s`}${timer===value?' ✓':''}`} secondary disabled={busy} onPress={()=>setTimer(value)}/>)}</View><Button title="Switch camera" secondary disabled={busy} onPress={()=>{if(locked.current)return;setReady(false);setStartupError(null);setFacing(facing==='back'?'front':'back');}}/><Button title={busy?'Preparing photo…':ready?'Capture outfit':startupError?'Camera unavailable':'Starting camera…'} disabled={busy||!ready} onPress={start}/><Button title={busy?'Cancel':'Back'} secondary onPress={()=>{stop();if(!busy)router.back();}}/></View>;
}
