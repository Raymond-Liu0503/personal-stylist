import { z } from 'zod';
import { outfitSkill } from '../skills/bundle.ts';
import { ApiError } from '../security/errors.ts';
export const guidanceArgs = z.object({topic:z.enum(['proportion','colour','finishing'])}).strict();
export const guidanceTool = {type:'function',function:{name:'lookup_clothing_guidance',description:'Reviewed additional clothing guidance',parameters:{type:'object',additionalProperties:false,properties:{topic:{type:'string',enum:['proportion','colour','finishing']}},required:['topic']}}};
export function lookupGuidance(name:string,args:unknown) {
  if(name!=='lookup_clothing_guidance') throw new ApiError('INVALID_MODEL_OUTPUT',502);
  const parsed=guidanceArgs.safeParse(args);
  if(!parsed.success) throw new ApiError('INVALID_MODEL_OUTPUT',502);
  const entry=outfitSkill.knowledge.entries.find(e=>e.topic===parsed.data.topic)!;
  return JSON.stringify(entry).slice(0,2000);
}
