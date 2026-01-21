import { useEffect } from 'react';

export const useYouTubeAutoPreload = () => {
  useEffect(() => {
    // Preload YouTube iframe API in background for faster video loading
    const preloadYouTubeAPI = () => {
      if (typeof window !== 'undefined' && !document.getElementById('youtube-api-preload')) {
        const link = document.createElement('link');
        link.id = 'youtube-api-preload';
        link.rel = 'preconnect';
        link.href = 'https://www.youtube.com';
        document.head.appendChild(link);

        const linkWww = document.createElement('link');
        linkWww.rel = 'preconnect';
        linkWww.href = 'https://www.youtube-nocookie.com';
        document.head.appendChild(linkWww);
      }
    };

    // Delay preload to not block initial render
    const timer = setTimeout(preloadYouTubeAPI, 2000);

    return () => clearTimeout(timer);
  }, []);
};
