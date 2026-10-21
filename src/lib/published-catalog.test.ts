import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { catalog } from './shop-server';

test('Vercel public browsing serves all release products without initializing a writable DB', async () => {
    const previousVercel = process.env.VERCEL;
    const previousPath = process.env.LOCAL_DB_PATH;
    try {
        process.env.VERCEL = '1';
        // A real existing file cannot be a DB directory. Any DB initialization fails this test.
        process.env.LOCAL_DB_PATH = path.join(process.cwd(), 'package.json');
        assert.equal(globalThis.onepieceDb, undefined);
        const products = await catalog();
        assert.equal(products.length, 366);
        assert.equal(products.reduce((n, product) => n + product.variants.length, 0), 1280);
        assert.equal(new Set(products.flatMap(product => product.images)).size, 59);
        assert.ok(products.every(product => product.images.every(url => url.startsWith('/images/products/'))));
        assert.equal(globalThis.onepieceDb, undefined);
    } finally {
        if (previousVercel === undefined) delete process.env.VERCEL;
        else process.env.VERCEL = previousVercel;
        if (previousPath === undefined) delete process.env.LOCAL_DB_PATH;
        else process.env.LOCAL_DB_PATH = previousPath;
    }
});
