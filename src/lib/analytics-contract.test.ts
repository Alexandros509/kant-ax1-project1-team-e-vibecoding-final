import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsPageLocation,reportEventsForTarget,isReportEvent} from './analytics-contract';

test('report contract separates purchase attempts, successful adds and automatic Google events',()=>{
 assert.deepEqual(reportEventsForTarget('add_to_cart'),['add_to_cart_attempt']);
 assert.deepEqual(reportEventsForTarget('select_size'),['select_variant']);
 assert.deepEqual(reportEventsForTarget('nav_bag'),['navigation_click','view_cart_click']);
 assert.deepEqual(reportEventsForTarget('checkout_open'),['checkout_click']);
 for(const name of ['session_start','first_visit','user_engagement','scroll','purchase'])assert.equal(isReportEvent(name),false);
 assert.deepEqual(reportEventsForTarget('arbitrary-private-label'),[]);
});
test('page locations retain the actual origin and exclude callback/query/hash data',()=>{
 assert.equal(analyticsPageLocation('https://example.test','/checkout/success?paymentKey=private&amount=1#secret'),'https://example.test/checkout/success');
 assert.equal(analyticsPageLocation('http://localhost:3000','/products/366'),'http://localhost:3000/products/366');
 assert.throws(()=>analyticsPageLocation('https://example.test','//another.test/path'));
 assert.throws(()=>analyticsPageLocation('file:///private','/products'));
});
