import { catalogSource, sourceCategory, sourceOption } from './catalog-source';
import { catalogCategoryId, storefrontProductName } from './catalog-adapter';
import type { CatalogProduct } from './shop-model';

// Public, immutable release data: browsing never creates a writable DB on Vercel.
// Member rows and payment writes continue to require the real persistence layer.
export async function publishedCatalog(): Promise<CatalogProduct[]> {
    const source = await catalogSource();
    let variantId = 0;
    return source.products.map((product, index) => {
        const id = index + 1;
        const category = sourceCategory(product);
        const price = Math.min(...product.variants.map(variant => Number(variant.price)));
        if (!Number.isSafeInteger(price) || price < 0)
            throw new Error('Invalid catalog price.');
        const variants = product.variants.map(variant => {
            const option = sourceOption(product, variant);
            return {id: ++variantId, productId: id, sku: variant.sku,
                color: option.color, size: option.size, price, available: variant.available};
        });
        return {
            id, name: storefrontProductName(product.title), brand: 'ONEPIECE', category,
            categoryId: Number(catalogCategoryId(category)),
            color: sourceOption(product, product.variants[0]).color,
            price, listPrice: price, available: variants.some(variant => variant.available),
            images: product.image_references.map(image => image.url),
            description: product.material_origin_facts.join('\n'),
            careInfo: 'Refer to the care label attached to each garment.',
            shippingInfo: 'Test orders only. No real charges or shipping.',
            isNew: false, sizeGuide: product.size_guide || {columns: [], rows: []},
            variants, sourceUrl: product.source_url || '',
        };
    });
}
