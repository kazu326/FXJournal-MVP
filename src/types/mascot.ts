export type MascotType = 'blessing' | 'greeting' | 'thinking' | 'thumbs-up' | 'wave';

export type AppEvent =
    | 'login'
    | 'loading'
    | 'gateAllClear'
    | 'gateNG'
    | 'tradeSaved'
    | 'lessonComplete'
    | 'streakUpdated'
    | 'levelUp'
    | 'logout'
    | 'sessionEnd';

export const MASCOT_MAP: Record<AppEvent, MascotType> = {
    login: 'greeting',
    loading: 'thinking',
    gateAllClear: 'thumbs-up',
    gateNG: 'thinking',
    tradeSaved: 'thumbs-up',
    lessonComplete: 'thumbs-up',
    streakUpdated: 'blessing',
    levelUp: 'blessing',
    logout: 'wave',
    sessionEnd: 'wave',
};
