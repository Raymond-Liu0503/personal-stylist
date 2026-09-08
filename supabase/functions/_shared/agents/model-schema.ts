import { z } from 'zod';
import { ReportSchema, RetakeSchema } from '../../../../packages/contracts/src/index.ts';
export const ModelReportSchema = ReportSchema.pick({summary:true,criteria:true,strengths:true,suggestions:true,limitations:true}).extend({kind:z.literal('report'),suggestions:ReportSchema.shape.suggestions.max(3),intentEvidence:z.string().trim().min(1).max(1000).nullable()}).strict();
export const ModelOutputSchema = z.union([ModelReportSchema,RetakeSchema]);
// Explicit provider schema avoids effects/unions silently weakening strict structured output.
const boundedText={type:'string',minLength:1,maxLength:700};
export const outputJsonSchema = {type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['report','retake']},summary:{type:['string','null'],minLength:1,maxLength:700},criteria:{type:'array',maxItems:5,items:{type:'object',additionalProperties:false,properties:{id:{type:'string',enum:['silhouette','colour','coherence','finishing','intent']},applicable:{type:'boolean'},score:{type:['integer','null'],minimum:0,maximum:5},observation:{...boundedText,maxLength:500},explanation:boundedText},required:['id','applicable','score','observation','explanation']}},strengths:{type:'array',maxItems:5,items:{...boundedText,maxLength:500}},suggestions:{type:'array',maxItems:3,items:{type:'object',additionalProperties:false,properties:{observation:{...boundedText,maxLength:500},action:{...boundedText,maxLength:500},reason:{...boundedText,maxLength:500}},required:['observation','action','reason']}},limitations:{type:'array',maxItems:6,items:{...boundedText,maxLength:500}},intentEvidence:{type:['string','null'],minLength:1,maxLength:1000},issues:{type:'array',maxItems:6,items:{type:'string',enum:['no_outfit','multiple_people','too_dark','blurred','too_cropped','unsupported_content']}},instructions:{type:'array',maxItems:6,items:{...boundedText,maxLength:350}}},required:['kind','summary','criteria','strengths','suggestions','limitations','intentEvidence','issues','instructions']};
export function parseModelOutput(raw:unknown) {
  // Providers with strict mode require a fixed envelope. Public/internal discriminants stay narrow.
  if(raw && typeof raw==='object' && 'issues' in raw && 'summary' in raw) {
    const x=raw as Record<string,unknown>;
    const allowed=Object.keys((outputJsonSchema as {properties:object}).properties);
    if(Object.keys(x).some(k=>!allowed.includes(k))) return ModelOutputSchema.parse(raw);
    if(x.kind==='retake' && x.summary===null && x.intentEvidence===null && ['criteria','strengths','suggestions','limitations'].every(k=>Array.isArray(x[k]) && (x[k] as unknown[]).length===0)) return ModelOutputSchema.parse({kind:x.kind,issues:x.issues,instructions:x.instructions});
    if(x.kind==='report' && Array.isArray(x.issues) && x.issues.length===0 && Array.isArray(x.instructions) && x.instructions.length===0) {
      const {issues:_i,instructions:_n,...report}=x; return ModelOutputSchema.parse(report);
    }
  }
  return ModelOutputSchema.parse(raw);
}
