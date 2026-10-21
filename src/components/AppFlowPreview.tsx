import { APP_FLOW_FRAME } from '@/lib/app-flow';
import styles from './AppFlowPreview.module.scss';
import { appPreviewScreen } from '@/lib/checkout-context';

export default function AppFlowPreview({ screen }: { screen?: string }) {
    return (
        <main className={styles.page} aria-label="OnePiece mobile app preview">
            <iframe
                name={APP_FLOW_FRAME}
                src={appPreviewScreen(screen)}
                title="OnePiece interactive app flow"
                className={styles.frame}
            />
        </main>
    );
}
