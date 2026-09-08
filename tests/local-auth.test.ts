import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowsLocalLogin} from '../apps/mobile/src/services/local-auth.ts';
test('local test login requires a development runtime and local environment',()=>{
 assert.equal(allowsLocalLogin(true,'local','http://10.0.0.122:54321'),true);
 assert.equal(allowsLocalLogin(true,'local','http://127.0.0.1:54321'),true);
 assert.equal(allowsLocalLogin(false,'local','http://10.0.0.122:54321'),false);
 assert.equal(allowsLocalLogin(true,'beta','http://10.0.0.122:54321'),false);
});
test('hosted and unrelated backends cannot expose local test login',()=>{
 for(const url of ['https://project.supabase.co','http://example.com:54321','http://10.0.0.122:8081','invalid'])assert.equal(allowsLocalLogin(true,'local',url),false);
});
