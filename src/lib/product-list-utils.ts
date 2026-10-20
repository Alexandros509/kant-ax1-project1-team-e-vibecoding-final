export type ProductSort = 'default' | 'price-asc' | 'price-desc';
type PricedProduct = { salePrice?: unknown; listPrice?: unknown };

export function validProductPrice(product: PricedProduct): product is { salePrice: number; listPrice: number } {
    return typeof product.salePrice === 'number' && Number.isFinite(product.salePrice) && product.salePrice >= 0
        && typeof product.listPrice === 'number' && Number.isFinite(product.listPrice) && product.listPrice >= 0
        && product.salePrice <= product.listPrice;
}

export function normalizeProductSort(value: string | null): ProductSort {
    return value === 'price-asc' || value === 'price-desc' ? value : 'default';
}

export function sortProducts<T extends PricedProduct>(products: readonly T[], sort: ProductSort): T[] {
    if (sort === 'default') return [...products];
    return products.map((product, index) => ({ product, index })).sort((a, b) => {
        const aValid = validProductPrice(a.product), bValid = validProductPrice(b.product);
        if (!aValid || !bValid) return aValid ? -1 : bValid ? 1 : a.index - b.index;
        const delta = (a.product.salePrice as number) - (b.product.salePrice as number);
        return (sort === 'price-asc' ? delta : -delta) || a.index - b.index;
    }).map(entry => entry.product);
}

export function productListUrl(query: string, change: { category?: string | null; sort?: ProductSort }): string {
    const params = new URLSearchParams(query);
    if ('category' in change) { if (change.category) params.set('category', change.category); else params.delete('category'); }
    if (change.sort !== undefined) { if (change.sort === 'default') params.delete('sort'); else params.set('sort', change.sort); }
    const suffix = params.toString();
    return '/products' + (suffix ? '?' + suffix : '');
}
