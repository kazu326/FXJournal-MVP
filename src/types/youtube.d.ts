declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          events?: {
            onReady?: (event: { target: { getCurrentTime(): number; getDuration(): number; destroy(): void } }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => { getCurrentTime(): number; getDuration(): number; destroy(): void };
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        UNSTARTED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export {};
