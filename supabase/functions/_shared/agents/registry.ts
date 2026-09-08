import { outfitSkill } from '../skills/bundle.ts';
export interface SpecialistDefinition {id:string;version:string;inputSchemaVersion:number;outputSchemaVersion:number;skillBundle:typeof outfitSkill;toolNames:readonly string[];modelConfig:{model:string;maxOutputTokens:number};maxModelRounds:number;maxToolCalls:number}
export const outfit:SpecialistDefinition={id:'outfit',version:'2.0.0',inputSchemaVersion:1,outputSchemaVersion:1,skillBundle:outfitSkill,toolNames:['lookup_clothing_guidance'],modelConfig:{model:'google/gemini-3.1-flash-lite',maxOutputTokens:2400},maxModelRounds:2,maxToolCalls:3};
export const registry:Readonly<Record<string,SpecialistDefinition>>=Object.freeze({outfit});
