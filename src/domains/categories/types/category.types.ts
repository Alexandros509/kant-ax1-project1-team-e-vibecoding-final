// 계층형 구조를 갖는 다중 중첩 카테고리 인터페이스
export interface Category {
    id: string;
    parent_id: string | null;
    name: string;
    depth: number;
    sort_order: number;
    children?: Category[];
}