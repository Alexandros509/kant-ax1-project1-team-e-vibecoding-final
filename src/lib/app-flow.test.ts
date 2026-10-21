import test from 'node:test';
import assert from 'node:assert/strict';
import {APP_FLOW_FRAME,executionSurface,flowParameters,uiClickParameters} from './app-flow';
test('app simulation and real Android shell have distinct analytics surfaces',()=>{
 assert.equal(executionSurface('Chrome Mobile',''),'web');
 assert.equal(executionSurface('Chrome Mobile',APP_FLOW_FRAME),'app_preview');
 assert.equal(executionSurface('OnePieceAndroid/1.0.0',APP_FLOW_FRAME),'android_webview');
 assert.equal(executionSurface('OnePieceAndroidFake/1',''),'web');
 assert.deepEqual(flowParameters('app_preview'),{execution_surface:'app_preview',is_test:1,flow_id:'onepiece_app_flow_v1'});
 assert.equal('flow_id' in flowParameters('web'),false);
});
test('click analytics accepts controlled identifiers and excludes arbitrary labels or query data',()=>{
 assert.deepEqual(uiClickParameters('open_product','/products/187?email=private@example.test'),{ui_target:'open_product',screen_path:'/products/187'});
 assert.equal(uiClickParameters('private@example.test','/login'),null);
 assert.equal(uiClickParameters('payment_start','javascript:alert(1)'),null);
 assert.equal(uiClickParameters('payment_start','x'.repeat(250)),null);
});
