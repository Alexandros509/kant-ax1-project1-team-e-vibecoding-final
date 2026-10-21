import AppFlowPreview from '@/components/AppFlowPreview';
import { appPreviewScreen } from '@/lib/checkout-context';
export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ screen?: string }>;
}) {
    const params = await searchParams;
    return <AppFlowPreview screen={appPreviewScreen(params.screen)} />;
}
