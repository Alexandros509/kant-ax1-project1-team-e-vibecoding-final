import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProductSort,productListUrl,sortProducts,validProductPrice} from './product-list-utils';

test('valid prices include zero, reject missing/negative/nonfinite/reversed values',()=>{
 for(const p of [{salePrice:0,listPrice:0},{salePrice:128000,listPrice:158000}])assert.equal(validProductPrice(p),true);
 for(const p of [{},{salePrice:-1,listPrice:10},{salePrice:10,listPrice:1},{salePrice:NaN,listPrice:10},{salePrice:0,listPrice:Infinity},{salePrice:'10',listPrice:10}])assert.equal(validProductPrice(p),false);
});

test('sorting uses sale price, preserves ties, puts invalid last in both directions without mutation',()=>{
 const products=[{id:'discount',salePrice:20,listPrice:100},{id:'same',salePrice:20,listPrice:20},{id:'zero',salePrice:0,listPrice:0},{id:'invalid'},{id:'reversed',salePrice:50,listPrice:40},{id:'higher',salePrice:30,listPrice:30}];
 const before=structuredClone(products);
 assert.deepEqual(sortProducts(products,'price-asc').map(p=>p.id),['zero','discount','same','higher','invalid','reversed']);
 assert.deepEqual(sortProducts(products,'price-desc').map(p=>p.id),['higher','discount','same','zero','invalid','reversed']);
 assert.deepEqual(sortProducts(products,'default'),products);assert.deepEqual(products,before);
 assert.deepEqual(sortProducts([],'price-desc'),[]);assert.deepEqual(sortProducts(products.slice(0,1),'price-asc'),products.slice(0,1));
});

test('category and sort URLs preserve other filters; defaults normalize safely',()=>{
 assert.equal(productListUrl('category=11&sort=price-asc&preview=B&utm=lesson',{category:'2'}),'/products?category=2&sort=price-asc&preview=B&utm=lesson');
 assert.equal(productListUrl('category=11&sort=price-desc&preview=B',{category:null}),'/products?sort=price-desc&preview=B');
 assert.equal(productListUrl('category=2&sort=price-desc&utm=lesson',{sort:'default'}),'/products?category=2&utm=lesson');
 assert.equal(normalizeProductSort('wrong'),'default');assert.equal(normalizeProductSort('default'),'default');assert.equal(normalizeProductSort(null),'default');
});
