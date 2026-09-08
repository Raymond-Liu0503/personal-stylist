import React from 'react';
import {Stack} from 'expo-router';
import {SessionProvider} from '../src/state/session';
import {AnalysisProvider} from '../src/state/analysis-context';
export default function Layout(){return <SessionProvider><AnalysisProvider><Stack screenOptions={{headerStyle:{backgroundColor:'#FAF7F2'},headerTintColor:'#252C26',headerBackButtonDisplayMode:'minimal'}}><Stack.Screen name="index" options={{title:'Personal Stylist'}}/><Stack.Screen name="camera" options={{title:'Outfit photo'}}/><Stack.Screen name="review" options={{title:'Review photo'}}/><Stack.Screen name="processing" options={{title:'Analysing',headerBackVisible:false,gestureEnabled:false}}/><Stack.Screen name="results" options={{title:'Your assessment',headerBackVisible:false}}/><Stack.Screen name="history" options={{title:'Saved reports'}}/><Stack.Screen name="settings" options={{title:'Settings'}}/></Stack></AnalysisProvider></SessionProvider>;}
