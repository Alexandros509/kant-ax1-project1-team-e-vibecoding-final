'use client';

import useCounterStore from '@/shared/store/useCounterStore';

export default function useCartActions() {
    const setCartItems = useCounterStore((state) => state.setCartItems);

    function handleIncreaseQuantity(cartItemId: number) {
        // 연속 클릭에도 직전 상태를 기준으로 수량을 계산한다.
        setCartItems((previousItems) =>
            previousItems.map((item) =>
                item.id === cartItemId
                    ? // 원본 객체를 직접 바꾸지 않고 선택한 상품만 새 객체로 만든다.
                      { ...item, quantity: Math.min(10, item.quantity + 1) }
                    : item,
            ),
        );
    }
    function handleDecreaseQuantity(cartItemId: number) {
        // 버튼 상태와 별개로, 상태 변경 로직에서도 최소 수량 1개를 보장한다.
        setCartItems((previousItems) =>
            previousItems.map((item) =>
                item.id === cartItemId
                    ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                    : item,
            ),
        );
    }

    function handleRemoveItem(cartItemId: number) {
        // 원본 배열을 직접 바꾸지 않고, 삭제할 상품을 제외한 목록으로 갱신한다.
        setCartItems((previousItems) =>
            previousItems.filter((item) => item.id !== cartItemId),
        );
    }

    return {
        handleIncreaseQuantity,
        handleDecreaseQuantity,
        handleRemoveItem,
    };
}
