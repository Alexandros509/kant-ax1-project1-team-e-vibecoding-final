import { catalogSource } from './catalog-source';

export function imageStoragePath(productId: number, publicUrl: string) {
    const name = publicUrl.match(/^\/images\/products\/([A-Za-z0-9_-]+\.png)$/)?.[1];
    if (!name || !Number.isSafeInteger(productId) || productId < 1)
        throw new Error('Invalid local product image.');
    // Unique logical object paths satisfy the ERD while local HTTP URLs share 59 actual files.
    return `products/${productId}/${name}`;
}

export async function imagePublicUrl(storagePath: string) {
    const match = storagePath.match(/^products\/([1-9][0-9]*)\/([A-Za-z0-9_-]+\.png)$/);
    if (!match) throw new Error('Invalid product image storage path.');
    const product = (await catalogSource()).products[Number(match[1]) - 1];
    const url = '/images/products/' + match[2];
    if (!product?.image_references.some(image => image.url === url))
        throw new Error('The product image is not in the current catalog.');
    return url;
}
