import React,{useReducer} from 'react';
import {render,screen,fireEvent} from '@testing-library/react-native';
import {TextInput} from 'react-native';
import {analysisReducer,initialAnalysis} from '../state/analysis';
let mockAnalysis:unknown;
jest.mock('../state/analysis-context',()=>({useAnalysis:()=>mockAnalysis}));
import {IntentControl} from '../components/intent';
function Harness(){const [state,dispatch]=useReducer(analysisReducer,{...initialAnalysis,prompt:'Keep my shoes'});mockAnalysis={state,setIntent:(id:typeof state.intent.id)=>dispatch({type:'intent',id}),setCustomIntent:(custom:string)=>dispatch({type:'customIntent',custom})};return <><IntentControl/><TextInput accessibilityLabel="Question" value={state.prompt}/></>;}
it('selects one preset, preserves question and validates Custom',()=>{render(<Harness/>);expect(screen.getByRole('radio',{name:'General'})).toBeChecked();fireEvent.press(screen.getByRole('radio',{name:'Custom'}));expect(screen.getByText('Enter a plain-text intent (1–160 characters).')).toBeTruthy();fireEvent.changeText(screen.getByLabelText('Custom styling intent'),'More playful');expect(screen.queryByText('Enter a plain-text intent (1–160 characters).')).toBeNull();fireEvent.press(screen.getByRole('radio',{name:'Work'}));expect(screen.getByRole('radio',{name:'Work'})).toBeChecked();expect(screen.getByRole('radio',{name:'General'})).not.toBeChecked();expect(screen.getByLabelText('Question').props.value).toBe('Keep my shoes');expect(screen.queryByLabelText('Custom styling intent')).toBeNull();});
