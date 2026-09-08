import type {AnalysisResponse} from '@stylist/contracts';
import type {Photo} from './photo';
export type AnalysisState={status:'idle'|'preparing'|'ready'|'submitting'|'result'|'failed'|'cancelled';selected:Photo|null;prepared:Photo|null;prompt:string;requestId:string|null;controller:AbortController|null;result:AnalysisResponse|null;error:string|null};
export const initialAnalysis:AnalysisState={status:'idle',selected:null,prepared:null,prompt:'',requestId:null,controller:null,result:null,error:null};
export type AnalysisAction={type:'prepare';photo:Photo;controller:AbortController}|{type:'ready';photo:Photo;controller:AbortController}|{type:'prompt';prompt:string}|{type:'submit';requestId:string;controller:AbortController}|{type:'result';result:AnalysisResponse;requestId:string}|{type:'failed';message:string;controller:AbortController}|{type:'cancel'}|{type:'reset'};
export function analysisReducer(state:AnalysisState,action:AnalysisAction):AnalysisState{
 switch(action.type){
 case 'prepare':return {...initialAnalysis,prompt:state.prompt,status:'preparing',selected:action.photo,controller:action.controller};
 case 'ready':return state.status==='preparing'&&state.controller===action.controller?{...state,status:'ready',prepared:action.photo,controller:null}:state;
 case 'prompt':return ['idle','ready','failed'].includes(state.status)?{...state,prompt:action.prompt.slice(0,1000)}:state;
 case 'submit':return ['ready','failed'].includes(state.status)&&state.prepared?{...state,status:'submitting',requestId:action.requestId,controller:action.controller,error:null}:state;
 case 'result':return state.status==='submitting'&&state.requestId===action.requestId?{...state,status:'result',result:action.result,selected:null,prepared:null,controller:null}:state;
 case 'failed':return state.controller===action.controller?{...state,status:'failed',error:action.message,controller:null}:state;
 case 'cancel':return {...initialAnalysis,status:'cancelled'};
 case 'reset':return {...initialAnalysis};
 }
}
