import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMascotStore } from '../../store/mascotStore';

const MascotOverlay: React.FC = () => {
    const { isVisible, currentEvent, currentMascot, hideMascot } = useMascotStore();

    // イベントに応じて自動的に消えるタイマーの設定など
    useEffect(() => {
        if (!isVisible || !currentEvent) return;

        // 常駐するイベントの場合は自動で消さない（あるいは別でhideMascotを呼ぶ）
        // loading, gateNG は呼び出し元がhideMascotする想定とする
        const persistentEvents = ['loading', 'gateNG'];

        if (!persistentEvents.includes(currentEvent)) {
            // 一定時間後に自動で隠す（アニメーション時間＋余韻）
            const timer = setTimeout(() => {
                hideMascot();
            }, 3000); // デフォルト3秒で消滅
            return () => clearTimeout(timer);
        }
    }, [isVisible, currentEvent, hideMascot]);

    if (!isVisible || !currentMascot) return null;

    // マスコット画像のパス
    const mascotImgSrc = `/animations/${currentMascot}.png`;

    // イベントごとのアニメーション・位置設定を定義
    const getAnimationConfig = () => {
        switch (currentEvent) {
            case 'login':
                // 中央出現 → 右下へスライドして消える（Exitでスライド）
                return {
                    initial: { opacity: 0, scale: 0.5, x: '-50%', y: '-50%' },
                    animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' },
                    exit: { opacity: 0, scale: 0.5, x: '50vw', y: '50vh', transition: { duration: 0.8 } },
                    className: 'fixed top-1/2 left-1/2 w-48 h-48 z-50 pointer-events-none',
                };
            case 'loading':
                // 中央でゆったり点滅（ローディング代替）
                return {
                    initial: { opacity: 0, x: '-50%', y: '-50%' },
                    animate: { opacity: [0.5, 1, 0.5], x: '-50%', y: '-50%', transition: { repeat: Infinity, duration: 1.5 } },
                    exit: { opacity: 0, scale: 0.8 },
                    className: 'fixed top-1/2 left-1/2 w-48 h-48 z-50 pointer-events-none',
                };
            case 'gateAllClear':
                // 右下からポップ
                return {
                    initial: { opacity: 0, y: 100, x: 0 },
                    animate: { opacity: 1, y: 0, x: 0, type: 'spring', bounce: 0.5 },
                    exit: { opacity: 0, y: 50 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-none',
                };
            case 'gateNG':
                // 右下に小さく常駐（要望によりサイズアップして位置を少し上に。揺れを削除。）
                return {
                    initial: { opacity: 0, scale: 0 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-auto cursor-pointer',
                };
            case 'tradeSaved':
                // 右下からにょっと出て消える
                return {
                    initial: { opacity: 0, y: 150 },
                    animate: { opacity: 1, y: 0, type: 'spring', stiffness: 100 },
                    exit: { opacity: 0, y: 150 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-none',
                };
            case 'lessonComplete':
                // 講義完了
                return {
                    initial: { opacity: 0, scale: 0.5 },
                    animate: { opacity: 1, scale: 1, type: 'spring' },
                    exit: { opacity: 0, scale: 0.5 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-none',
                };
            case 'streakUpdated':
                // バナー横（今回は上部中央寄りに配置）
                return {
                    initial: { opacity: 0, y: -50 },
                    animate: { opacity: 1, y: 0, type: 'spring' },
                    exit: { opacity: 0, y: -50 },
                    className: 'fixed top-24 left-1/2 -translate-x-1/2 w-40 h-40 z-50 pointer-events-none',
                };
            case 'levelUp':
                // フルスクリーン演出（画面中央で大きく）
                return {
                    initial: { opacity: 0, scale: 0.2, x: '-50%', y: '-50%' },
                    animate: { opacity: 1, scale: [0.5, 1.2, 1], x: '-50%', y: '-50%', transition: { duration: 0.8 } },
                    exit: { opacity: 0, scale: 0, x: '-50%', y: '-50%' },
                    className: 'fixed top-1/2 left-1/2 w-64 h-64 z-[100] pointer-events-none',
                };
            case 'logout':
                // 画面中央でバイバイ
                return {
                    initial: { opacity: 0, x: '-50%', y: '-50%' },
                    animate: { opacity: 1, x: '-50%', y: '-50%', rotate: [-10, 10, -10, 10, 0], transition: { duration: 1.5 } },
                    exit: { opacity: 0, scale: 0.8, x: '-50%', y: '-50%' },
                    className: 'fixed top-1/2 left-1/2 w-48 h-48 z-50 pointer-events-none',
                };
            case 'sessionEnd':
                // 右下からバイバイ
                return {
                    initial: { opacity: 0, x: 100, y: 100 },
                    animate: { opacity: 1, x: 0, y: 0, rotate: [-10, 10, -10, 0], transition: { duration: 1.5 } },
                    exit: { opacity: 0, x: 100, y: 100 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-none',
                };
            default:
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    className: 'fixed bottom-24 right-8 w-40 h-40 z-50 pointer-events-none',
                };
        }
    };

    const config = getAnimationConfig();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="mascot-overlay"
                    initial={config.initial}
                    animate={config.animate}
                    exit={config.exit}
                    className={config.className}
                    onClick={() => {
                        if (currentEvent === 'gateNG') {
                            hideMascot(); // タップで消せるように
                        }
                    }}
                >
                    <img
                        src={mascotImgSrc}
                        alt={`Mascot - ${currentMascot}`}
                        className="w-full h-full object-contain filter drop-shadow-lg"
                        onError={(e) => {
                            // プレースホルダー画像がない場合のフォールバック（透明な代替表示等）
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2NjYyIgLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMzMzMiPk1hc2NvdDwvdGV4dD48L3N2Zz4=';
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MascotOverlay;
