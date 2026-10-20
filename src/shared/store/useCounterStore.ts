'use client';

import { create } from 'zustand';
import type { CartItem } from '@/domains/cart/types/cart.types';

interface CartStore {
    cartItems: CartItem[];
    setCartItems: (update: (previousItems: CartItem[]) => CartItem[]) => void;
}

const useCounterStore = create<CartStore>((set) => ({
    cartItems: [],

    // 상품 목록과 Header가 같은 변경 결과를 읽도록 공통 상태를 갱신한다.
    setCartItems: (update) => {
        set((state) => ({
            cartItems: update(state.cartItems),
        }));
    },
}));

export default useCounterStore;
