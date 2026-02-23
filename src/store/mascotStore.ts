import { create } from 'zustand';
import { MASCOT_MAP, type AppEvent, type MascotType } from '../types/mascot';

interface MascotState {
    isVisible: boolean;
    currentEvent: AppEvent | null;
    currentMascot: MascotType | null;
    showMascot: (event: AppEvent) => void;
    hideMascot: () => void;
}

export const useMascotStore = create<MascotState>((set) => ({
    isVisible: false,
    currentEvent: null,
    currentMascot: null,
    showMascot: (event: AppEvent) => {
        // 既に表示中で同じイベントなら何もしないか、あるいは再表示するか
        // ここではアニメーションをリセット・連続発火させるために一度リセットするなどの処理も考えられますが、
        // シンプルにstateを上書きします
        const mascot = MASCOT_MAP[event];
        set({
            isVisible: true,
            currentEvent: event,
            currentMascot: mascot,
        });
    },
    hideMascot: () => {
        set({
            isVisible: false,
            currentEvent: null,
            currentMascot: null,
        });
    },
}));
