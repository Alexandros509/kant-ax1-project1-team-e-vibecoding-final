export interface CartItem {
    id: number;
    cartId: number;
    productVariantId: number;
    quantity: number;
    unitPriceAtAdded: number;
    productNameAtAdded: string;
    optionTextAtAdded: string | null;
    imageUrlAtAdded: string | null;
}
