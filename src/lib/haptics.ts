let userHasInteracted = false;

if (typeof window !== 'undefined') {
    const handleInteraction = () => {
        userHasInteracted = true;
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
}

export const haptics = {
    /**
     * カチッという軽い感触
     */
    light: () => {
        if (!userHasInteracted) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    /**
     * ポロロンという達成感
     */
    success: () => {
        if (!userHasInteracted) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
        }
    }
};
