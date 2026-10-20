import type { Category } from '@/domains/categories/types/category.types';
import type { FileInfo } from '@/domains/files/types/file.types';

/**
 * 상품 목록·상세 화면이 공통으로 사용하는 상품 데이터 구조입니다.
 * 목 데이터와 향후 API 연동 결과 모두 화면에 전달할 때 이 구조를 따릅니다.
 * API 응답 구조가 다르면 데이터를 조회하는 계층에서 이 구조로 변환합니다.
 *
 * 상품은 categoryId로 소속 카테고리를 참조합니다.
 * 상위 카테고리 관계(parentId 또는 parent_id)는 카테고리 데이터가 관리하므로
 * 상품에 중복 저장하지 않습니다.
 */
export interface Product {
    /** 상품 고유 번호. 상세 페이지 주소(/products/1 등)에 사용합니다. */
    id: number;
    /** 소분류 ID. 공용 Category의 문자열 ID 타입을 재사용해 비교 오류를 방지합니다. */
    categoryId: Category['id'];
    /** 화면 표시용 분류명. categoryId가 가리키는 카테고리 이름과 일치시킵니다. */
    categoryName: string;
    /** 화면에 표시하는 상품명입니다. */
    name: string;
    /** 현재 숫자형 목 사이즈 값. 실제 사이즈·옵션 체계는 팀에서 확정 후 변경합니다. */
    size: number;
    /** 상품 설명 텍스트. 상세 이미지 정보는 images에 저장합니다. */
    detail: string;
    /** 제조·보증·세탁 및 관리 안내입니다. */
    productCare: string;
    /** 배송 및 반품 안내입니다. */
    shipping: string;
    /**
     * 공용 파일 정보 배열. product_main은 대표 이미지, product_desc는 상세 이미지입니다.
     * 대표 이미지는 location으로 선택하며 상세 이미지의 표시 순서는 seq로 관리합니다.
     */
    images: FileInfo[];
    /** 할인 전 정가(원)입니다. */
    listPrice: number;
    /** 판매가(원). 할인하지 않으면 listPrice와 같은 값입니다. */
    salePrice: number;
    /** 신상품 여부. true이면 상품 카드에 NEW 표시를 붙입니다. */
    new: boolean;
}
