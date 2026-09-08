import { ReportSchema, promptFor, type OutfitAnalysisMetadata } from '../../../../packages/contracts/src/index.ts';
import type { Provider, Message, Usage, Generation } from '../providers/types.ts';
import { outfit } from './registry.ts';
import { parseModelOutput, outputJsonSchema } from './model-schema.ts';
import { calculateOutfitScore } from './scoring.ts';
import { guidanceTool, lookupGuidance } from '../tools/guidance.ts';
import { ApiError } from '../security/errors.ts';
export async function runOutfit(provider:Provider,input:{runId:string;metadata:OutfitAnalysisMetadata;image:Uint8Array;signal:AbortSignal},onUsage:(usage:Usage)=>void=()=>{}) {
  const messages:Message[]=[{role:'system',content:outfit.skillBundle.instructions},{role:'user',content:JSON.stringify({prompt:promptFor(input.metadata),context:input.metadata.context??{}})}];
  let usedTools=false;
  for(let round=0;round<outfit.maxModelRounds;round++) {
    input.signal.throwIfAborted();
    let response:Generation;
    try{response=await provider.generate({messages,image:input.image,tools:round===0?[guidanceTool]:[],schema:outputJsonSchema,signal:input.signal,maxOutputTokens:outfit.modelConfig.maxOutputTokens});}catch(e){if(input.signal.aborted||e instanceof ApiError)throw e;throw new ApiError('PROVIDER_UNAVAILABLE',503,'The analysis service is unavailable.');}
    onUsage(response.usage);
    if(response.toolCalls?.length) {
      if(round!==0 || usedTools || response.toolCalls.length>outfit.maxToolCalls || new Set(response.toolCalls.map(c=>c.id)).size!==response.toolCalls.length) throw new ApiError('INVALID_MODEL_OUTPUT',502);
      usedTools=true;
      messages.push({role:'assistant',content:null,tool_calls:response.toolCalls});
      for(const call of response.toolCalls) {
        if(!outfit.toolNames.includes(call.function.name) || call.function.arguments.length>1000) throw new ApiError('INVALID_MODEL_OUTPUT',502);
        let args;try{args=JSON.parse(call.function.arguments);}catch{throw new ApiError('INVALID_MODEL_OUTPUT',502);}
        messages.push({role:'tool',tool_call_id:call.id,content:lookupGuidance(call.function.name,args)});
      }
      continue;
    }
    try {
      const output=parseModelOutput(response.output);
      if(output.kind==='retake') return output;
      const {kind:_kind,intentEvidence,...content}=output;
      const {coverage:_coverage,...scoring}=calculateOutfitScore(content.criteria,input.metadata,intentEvidence);
      return {kind:'report' as const,report:ReportSchema.parse({...content,...scoring,schemaVersion:1,runId:input.runId,versions:{agent:outfit.version,skill:outfit.skillBundle.version,rubric:'2',model:provider.model}})};
    } catch {
      if(round===1) throw new ApiError('INVALID_MODEL_OUTPUT',502,'The assessment could not be validated. Please try a new analysis.');
      // Do not echo unvalidated provider text back into trusted messages or logging.
      messages.push({role:'user',content:'Return a final valid schema object. Check criterion uniqueness, visibility, and exact intent evidence. No tools remain.'});
    }
  }
  throw new ApiError('INVALID_MODEL_OUTPUT',502);
}
