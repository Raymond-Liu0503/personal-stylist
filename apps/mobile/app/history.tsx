import React,{useState,useCallback} from 'react';
import {Text,Alert} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {z} from 'zod';
import {HistorySchema,type OutfitReport} from '@stylist/contracts';
import {Page,Card,Button,ErrorText,styles} from '../src/components/ui';
import {ReportView} from '../src/components/report';
import {api} from '../src/services/api';
import {useSession} from '../src/state/session';
type Row={id:string;created_at:string;report:OutfitReport};
export default function History(){const {session}=useSession();const [items,setItems]=useState<Row[]>([]),[cursor,setCursor]=useState<string|null>(null),[selected,setSelected]=useState<Row|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const load=async(next?:string)=>{setBusy(true);try{const data=await api(`/reports${next?`?cursor=${encodeURIComponent(next)}`:''}`,HistorySchema);setItems(old=>next?[...old,...data.items]:data.items);setCursor(data.nextCursor);setError(null);}catch(e){setError(e instanceof Error?e.message:'Unable to load reports.');}finally{setBusy(false);}};
 useFocusEffect(useCallback(()=>{if(session)void load();return()=>{setItems([]);setSelected(null);};},[session?.user.id]));
 const remove=(row:Row)=>Alert.alert('Delete saved report?','This removes the saved text assessment.',[{text:'Keep',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{setBusy(true);void api(`/reports/${row.id}`,z.object({deleted:z.boolean()}),{method:'DELETE'}).then(()=>{setSelected(null);setItems(old=>old.filter(r=>r.id!==row.id));}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}]);
 return <Page title="Your saved perspectives."><ErrorText message={error}/>{selected?<><ReportView report={selected.report}/><Button title="Delete report" disabled={busy} onPress={()=>remove(selected)}/><Button title="Back to history" secondary onPress={()=>setSelected(null)}/></>:<><Text style={styles.muted}>Text only. Photos are never saved to your history.</Text>{!items.length&&<Text style={styles.text}>{busy?'Loading your reports…':'Reports you choose to save will appear here.'}</Text>}{items.map(row=><Card key={row.id}><Text style={styles.muted}>{new Date(row.created_at).toLocaleDateString()}</Text><Text style={styles.text}>{row.report.summary}</Text><Button title="Read report" secondary onPress={()=>setSelected(row)}/></Card>)}{cursor&&<Button title="Load older reports" disabled={busy} onPress={()=>void load(cursor)}/>}<Button title="Refresh history" secondary disabled={busy} onPress={()=>void load()}/></>}</Page>;
}
