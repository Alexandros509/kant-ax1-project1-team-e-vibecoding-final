'use client';
/**
 * 상품 한 개의 대표 이미지·호버 이미지·분류명·이름·가격 영역을 구성합니다.
 * ProductGrid에서 상품 객체와 정보 상시 표시 여부를 전달받습니다.
 * 이미지 전환과 정보 노출은 CSS의 group-hover로 처리하므로 별도 useState가 필요 없습니다.
 */
// Image는 Next.js의 이미지 컴포넌트, Link는 앱 내부 주소 이동에 사용하는 컴포넌트입니다.
import Image from 'next/image';
import { useShop } from '@/components/ShopRuntime';
import Link from 'next/link';
import type { Product } from '@/domains/products/types/product.types';
import ProductPrice from './ProductPrice';

interface ProductCardProps {
    /** Product 타입을 따르는 상품 하나입니다. 목록 전체가 아닌 객체 한 개를 받습니다. */
    product: Product;
    /** true: 상품 정보를 항상 표시 / false: 카드에 마우스를 올릴 때 표시합니다. */
    showInfo: boolean;
}

export default function ProductCard({ product, showInfo }: ProductCardProps) {
    const { track, raw } = useShop();
    const source = raw.find(p=>p.id===product.id);
    // find는 조건에 맞는 첫 번째 이미지 객체를 찾으며, 없으면 undefined를 반환합니다.
    // location이 product_main이고 url이 있는 파일을 대표 이미지로 선택합니다.
    // ?.url은 결과가 있을 때만 주소를 꺼내므로 찾지 못해도 속성 접근 오류가 나지 않습니다.
    // 대표 이미지가 없으면 상세 이미지로 대체하지 않고 아래의 'Image unavailable'을 표시합니다.
    const imageUrl = product.images.find(
        (image) => image.location === 'product_main' && image.url,
    )?.url;
    // product_desc 중 주소가 있는 첫 번째 항목을 호버 이미지로 사용합니다.
    // seq로 정렬하는 코드는 없으므로 현재 배열 순서에 따라 선택됩니다.
    // 상세 이미지가 없는 상품에는 호버용 Image 자체를 만들지 않습니다.
    const hoverImageUrl = product.images.find(
        (image) => image.location === 'product_desc' && image.url,
    )?.url;
    // 판매가가 정가보다 낮으면 할인 상품으로 판단합니다.
    // 판매가와 할인 정가의 표시는 ProductPrice에서 공통 처리합니다.


    // 카드 전체가 링크입니다. 상세 주소는 상품 ID로 만들며 상세 페이지 구현은 추후 작업입니다.
    // prefetch={false}는 이 링크의 자동 사전 로딩을 비활성화합니다.
    // group은 자식 요소가 카드 전체의 hover 상태를 group-hover로 사용할 수 있게 합니다.
    // 따라서 현재는 이미지뿐 아니라 아래 정보 영역에 마우스를 올려도 이미지가 전환됩니다.
    // block은 링크를 박스로 만들고 focus-visible:ring-*는 키보드 초점의 테두리를 표시합니다.
    return (
        <Link
            href={`/products/${product.id}`}
            onClick={()=>void track('select_item',product.id)}
            prefetch={false}
            className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4"
        >
            {/*
             * relative는 fill 이미지와 absolute NEW 배지의 위치 기준입니다.
             * aspect-[4/5]는 가로:세로 비율을 4:5로 유지합니다.
             * overflow-hidden은 확대된 이미지가 영역 밖으로 나가지 않게 자릅니다.
             * bg-neutral-100은 이미지 영역의 연한 회색 배경입니다.
             */}
            <div className="relative aspect-[4/5] overflow-hidden bg-white">
                {/* 대표 주소가 있으면 이미지들을, 없으면 안내 문구를 표시하는 조건문입니다. */}
                {imageUrl ? (
                    <>
                        {/*
                         * <>...</>는 여러 요소를 하나로 묶으며 별도 HTML 박스를 만들지 않습니다.
                         * fill은 부모 영역을 채우고 object-contain은 이미지 비율을 유지합니다.
                         * sizes는 브라우저가 이미지 파일 크기를 선택할 때 참고하는 예상 표시 너비입니다.
                         * sizes가 실제 카드 너비나 열 개수를 결정하는 것은 아닙니다.
                         * 현재 sizes는 고정된 안내값이며 3·4·6열 선택값에 맞춰 바뀌지는 않습니다.
                         * transition-transform·duration-300은 확대 변화를 300ms 동안 처리합니다.
                         * motion-safe는 모션 감소를 요청하지 않은 환경에서만 1.05배 확대합니다.
                         */}
                        <Image
                            unoptimized
                            src={imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1439px) 25vw, 320px"
                            className="object-contain transition-transform duration-300 motion-safe:group-hover:scale-105"
                        />
                        {/*
                         * &&는 호버 주소가 있을 때만 오른쪽 Image를 렌더링하는 조건부 표현입니다.
                         * 두 fill 이미지는 같은 부모를 기준으로 겹쳐집니다.
                         * 나중에 배치한 호버 이미지는 기본 이미지 위에 나타납니다.
                         * opacity-0으로 숨겼다가 카드 hover 시 opacity-100으로 표시합니다.
                         * transition-opacity는 불투명도 변화를 300ms 동안 부드럽게 처리합니다.
                         * 기본 이미지를 제거하거나 숨기지는 않으므로 투명한 부분에는 아래 이미지가 보입니다.
                         */}
                        {hoverImageUrl && (
                            <Image
                            unoptimized
                                src={hoverImageUrl}
                                alt={`${product.name} — alternate view`}
                                fill
                                sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                                className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            />
                        )}
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                        Image unavailable
                    </div>
                )}
                {/* 신상품일 때만 NEW 배지를 이미지 왼쪽 위에 겹쳐 표시합니다. */}
                {product.new && (
                    <span className="absolute top-3 left-3 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-coarse:opacity-100">
                        NEW
                    </span>
                )}
            </div>

            {/*
             * 상품 정보 영역입니다. showInfo가 true(3열 버튼 선택)이면 항상 표시합니다.
             * false(4·6열 버튼 선택)이면 기본적으로 숨기고 카드 hover 시 표시합니다.
             * opacity는 투명도만 바꾸므로 숨겨져도 이 영역의 자리와 링크 영역은 유지됩니다.
             * mt-4는 이미지 아래 여백, space-y-2는 내부 요소 사이 세로 간격입니다.
             * 키보드 초점에 따른 정보 노출 조건은 현재 구현 범위에 포함하지 않았습니다.
             */}
            <div
                className={`mt-4 space-y-2 transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
            >
                {/* 분류명: 작은 회색 글자와 넓은 글자 간격으로 표시합니다. */}
                <p className="text-[11px] tracking-wider text-neutral-500">
                    {product.categoryName}
                </p>
                {/* 상품명: break-keep으로 단어 중간 줄바꿈을 줄이고 카드 hover 시 밑줄을 표시합니다. */}
                <h2 className="text-sm font-medium break-keep [overflow-wrap:anywhere] group-hover:underline">
                    {product.name}
                </h2>
                <p className="text-[10px] text-neutral-500">{source?.color}{source && !source.available ? ' · SOLD OUT' : ''}</p>
                <ProductPrice salePrice={product.salePrice} listPrice={product.listPrice} />
            </div>
        </Link>
    );
}
