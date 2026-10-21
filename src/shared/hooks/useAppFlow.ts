'use client';
import { useSyncExternalStore } from 'react';
import { browserExecutionSurface } from '@/lib/app-flow';
const subscribe = () => () => {};
const snapshot = () => browserExecutionSurface();
const serverSnapshot = () => 'web' as const;
export default function useAppFlow() {
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
