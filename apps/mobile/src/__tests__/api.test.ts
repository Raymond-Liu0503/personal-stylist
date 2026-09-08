import {z} from 'zod';
import {convertFormDataAsync} from 'expo/src/winter/fetch/convertFormData';

const mockFetch=jest.fn(),mockGetSession=jest.fn();
const mockPhotos=new Map<string,Uint8Array>();
jest.mock('expo/fetch',()=>({fetch:(...args:unknown[])=>mockFetch(...args)}));
jest.mock('../services/auth',()=>({supabaseUrl:'http://localhost:54321',supabase:{auth:{getSession:()=>mockGetSession()}}}));
jest.mock('expo-file-system',()=>({File:class {
 constructor(public uri:string){}
 get exists(){return mockPhotos.has(this.uri);}
 get size(){return mockPhotos.get(this.uri)?.length??0;}
 get type(){return 'image/jpeg';}
 get name(){return 'prepared.jpg';}
 async bytes(){return mockPhotos.get(this.uri)!;}
}}));
import {analyze,api} from '../services/api';
const uri='file:///cache/stylist-private/prepared.jpg';
const metadata={schemaVersion:1 as const,prompt:'Does this work?'};
const requestId='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const result={kind:'retake',issues:['no_outfit'],instructions:['Include the outfit in the photo.']};
const originalFormData=global.FormData;
beforeAll(()=>{
 // jest-expo stubs this patch and uses web FormData; exercise the native implementation.
 const {installFormDataPatch}=jest.requireActual('expo/src/winter/FormData');
 const NativeFormData=jest.requireActual('react-native/Libraries/Network/FormData').default;
 global.FormData=installFormDataPatch(NativeFormData);
});
afterAll(()=>{global.FormData=originalFormData;});
beforeEach(()=>{jest.clearAllMocks();mockPhotos.clear();mockPhotos.set(uri,new Uint8Array([255,216,10,20,30,255,217]));mockGetSession.mockResolvedValue({data:{session:{access_token:'test-token',user:{id:'test-user'}}},error:null});mockFetch.mockResolvedValue({ok:true,json:async()=>result});});
afterEach(()=>{jest.useRealTimers();});

it('reproduces Expo rejecting the old URI-only upload before network dispatch',async()=>{
 const form=new FormData();form.append('image',{uri,type:'image/jpeg',name:'outfit.jpg'} as unknown as Blob);
 await expect(convertFormDataAsync(form)).rejects.toThrow('Unsupported FormDataPart implementation');
});
it('encodes the exact prepared bytes and metadata with Expo multipart serialization',async()=>{
 mockFetch.mockImplementationOnce(async(url,options)=>{
  expect(url).toBe('http://localhost:54321/functions/v1/api/v1/analyze/outfit');
  expect(options.headers.Authorization).toBe('Bearer test-token');
  expect(options.headers['Idempotency-Key']).toBe(requestId);
  expect(options.headers['Content-Type']).toBeUndefined();
  const {body,boundary}=await convertFormDataAsync(options.body,'test-boundary');
  expect(boundary).toBe('test-boundary');
  const prefix=new TextEncoder().encode('--test-boundary\r\ncontent-disposition: form-data; name="metadata"\r\n\r\n'+JSON.stringify(metadata)+'\r\n--test-boundary\r\ncontent-disposition: form-data; name="image"; filename="prepared.jpg"\r\ncontent-type: image/jpeg\r\n\r\n');
  expect(body.slice(0,prefix.length)).toEqual(prefix);
  expect(body.slice(prefix.length,prefix.length+7)).toEqual(mockPhotos.get(uri));
  expect(new TextDecoder().decode(body.slice(prefix.length+7))).toBe('\r\n--test-boundary--\r\n');
  return {ok:true,json:async()=>result};
 });
 await expect(analyze(uri,metadata,requestId,new AbortController().signal)).resolves.toEqual(result);
 expect(mockFetch).toHaveBeenCalledTimes(1);
});
it('reports a missing prepared image without dispatching',async()=>{mockPhotos.clear();await expect(analyze(uri,metadata,requestId,new AbortController().signal)).rejects.toMatchObject({code:'PHOTO_UNAVAILABLE'});expect(mockFetch).not.toHaveBeenCalled();});
it('does not submit an already cancelled assessment',async()=>{const controller=new AbortController();controller.abort();await expect(analyze(uri,metadata,requestId,controller.signal)).rejects.toMatchObject({code:'CANCELLED'});expect(mockFetch).not.toHaveBeenCalled();});
it('does not retry ambiguous connection failures',async()=>{mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));await expect(analyze(uri,metadata,requestId,new AbortController().signal)).rejects.toMatchObject({code:'NETWORK'});expect(mockFetch).toHaveBeenCalledTimes(1);});
it('distinguishes local multipart encoding failures from a network failure',async()=>{mockFetch.mockRejectedValueOnce(new Error('Unsupported FormDataPart implementation'));await expect(analyze(uri,metadata,requestId,new AbortController().signal)).rejects.toMatchObject({code:'PHOTO_UPLOAD'});expect(mockFetch).toHaveBeenCalledTimes(1);});
it('keeps provider failures distinct from connectivity errors',async()=>{mockFetch.mockResolvedValueOnce({ok:false,json:async()=>({error:{code:'PROVIDER_UNAVAILABLE',message:'The analysis service is unavailable.'}})});await expect(analyze(uri,metadata,requestId,new AbortController().signal)).rejects.toMatchObject({code:'PROVIDER_UNAVAILABLE'});});
it('discards a response that arrives after cancellation',async()=>{const controller=new AbortController();mockFetch.mockImplementationOnce(async()=>{controller.abort();return {ok:true,json:async()=>result};});await expect(analyze(uri,metadata,requestId,controller.signal)).rejects.toMatchObject({code:'CANCELLED'});});
it('continues to send JSON for account requests',async()=>{mockFetch.mockResolvedValueOnce({ok:true,json:async()=>({accepted:true})});await api('/consents',z.object({accepted:z.boolean()}),{method:'POST',body:{accepted:true}});expect(mockFetch.mock.calls[0][1].body).toBe('{"accepted":true}');expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');});
