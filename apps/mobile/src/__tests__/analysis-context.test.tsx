import React from 'react';
import {render,act,waitFor} from '@testing-library/react-native';
const mockAnalyze=jest.fn(),mockCleanup=jest.fn(),mockRefresh=jest.fn();
let mockSession:{user:{id:string}}|null={user:{id:'user'}};
jest.mock('expo-crypto',()=>({randomUUID:()=> 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'}));
jest.mock('../services/images',()=>({prepareImage:async(p:unknown)=>p,cleanupImages:()=>mockCleanup()}));
jest.mock('../services/api',()=>({analyze:(...args:unknown[])=>mockAnalyze(...args)}));
jest.mock('../state/session',()=>({useSession:()=>({session:mockSession,refresh:mockRefresh})}));
import {AnalysisProvider,useAnalysis} from '../state/analysis-context';
let current:ReturnType<typeof useAnalysis>;
function Probe(){current=useAnalysis();return null;}
beforeEach(()=>{mockSession={user:{id:'user'}};mockCleanup.mockReset().mockResolvedValue(undefined);mockRefresh.mockReset().mockResolvedValue(undefined);mockAnalyze.mockReset().mockResolvedValue({kind:'retake',issues:['too_dark'],instructions:['Use more light.']});});
it('blocks empty Custom, sends the preserved question and selected context, and retains retake intent',async()=>{
 render(<AnalysisProvider><Probe/></AnalysisProvider>);
 act(()=>{current.setPrompt('Actually this is casual');current.setIntent('custom');});
 await act(async()=>{await current.prepare({uri:'file:///photo.jpg',width:100,height:100});});
 await act(async()=>{await current.submit();});expect(mockAnalyze).not.toHaveBeenCalled();
 act(()=>current.setCustomIntent('More polished'));
 await act(async()=>{await current.submit();});
 expect(mockAnalyze.mock.calls[0][1]).toEqual({schemaVersion:1,prompt:'Actually this is casual',context:{desiredStyle:'More polished'}});
 await act(async()=>{await current.cancel(true);});expect(current.state.intent).toEqual({id:'custom',custom:'More polished'});expect(current.state.prompt).toBe('Actually this is casual');
 await act(async()=>{await current.cancel();});expect(current.state.intent.id).toBe('general');expect(current.state.prompt).toBe('');
});
it('resets on sign-out even if image cleanup fails, and on provider restart',async()=>{
 const view=render(<AnalysisProvider><Probe/></AnalysisProvider>);act(()=>current.setIntent('date'));
 mockCleanup.mockRejectedValueOnce(Error('cleanup failed'));mockSession=null;
 view.rerender(<AnalysisProvider><Probe/></AnalysisProvider>);
 await waitFor(()=>expect(current.state.intent.id).toBe('general'));
 mockSession={user:{id:'user'}};view.rerender(<AnalysisProvider><Probe/></AnalysisProvider>);act(()=>current.setIntent('work'));view.unmount();
 render(<AnalysisProvider><Probe/></AnalysisProvider>);expect(current.state.intent.id).toBe('general');
});
