import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  url: string;
  onPlayerEvent: (event: string, data?: any) => void;
}

const YouTubePlayer = ({ url, onPlayerEvent }: YouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(url);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setIsAPIReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
    };

    return () => {
      // Cleanup function
      if (window.onYouTubeIframeAPIReady) {
        delete window.onYouTubeIframeAPIReady;
      }
    };
  }, []);

  // Listen for sync events from WebRTC
  useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      const { action, data } = event.detail;
      
      if (!playerRef.current) return;

      switch (action) {
        case 'play':
          if (data.currentTime) {
            playerRef.current.seekTo(data.currentTime, true);
          }
          playerRef.current.playVideo();
          break;
        case 'pause':
          if (data.currentTime) {
            playerRef.current.seekTo(data.currentTime, true);
          }
          playerRef.current.pauseVideo();
          break;
        case 'seek':
          playerRef.current.seekTo(data.currentTime, true);
          break;
        case 'loadVideo':
          if (data.videoId) {
            playerRef.current.loadVideoById(data.videoId, data.currentTime || 0);
          }
          break;
      }
    };

    window.addEventListener('youtube-sync', handleSync as EventListener);
    return () => window.removeEventListener('youtube-sync', handleSync as EventListener);
  }, []);

  // Initialize player
  useEffect(() => {
    if (!isAPIReady || !videoId || !containerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '360',
        width: '640',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            console.log('YouTube player ready');
          },
          onStateChange: (event: any) => {
            const state = event.data;
            const currentTime = event.target.getCurrentTime();
            
            switch (state) {
              case window.YT.PlayerState.PLAYING:
                onPlayerEvent('play', { currentTime, videoId });
                break;
              case window.YT.PlayerState.PAUSED:
                onPlayerEvent('pause', { currentTime, videoId });
                break;
            }
          },
          onError: (event: any) => {
            setError('Failed to load video. Please check the URL and try again.');
            setIsLoading(false);
          }
        }
      });
    } catch (err) {
      setError('Failed to initialize video player');
      setIsLoading(false);
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying YouTube player:', e);
        }
      }
    };
  }, [isAPIReady, videoId, onPlayerEvent]);

  if (error) {
    return (
      <Card className="p-8 text-center bg-destructive/10 border-destructive/20">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold mb-2 text-destructive">Video Error</h3>
        <p className="text-muted-foreground">{error}</p>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="aspect-video bg-video-bg rounded-lg overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-video-bg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading video...</p>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          style={{ minHeight: '360px' }}
        />
      </div>

      {videoId && (
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="secondary" className="font-mono text-xs">
            Video ID: {videoId}
          </Badge>
          <Badge 
            className={`${isLoading ? 'bg-warning' : 'bg-success'} text-white`}
          >
            {isLoading ? 'Loading...' : 'Ready'}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;