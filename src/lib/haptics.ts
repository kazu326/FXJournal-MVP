export const haptics = {
    /**
     * カチッという軽い感触
     */
    light: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    /**
     * ポロロンという達成感
     */
    success: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
        }
    }
};
