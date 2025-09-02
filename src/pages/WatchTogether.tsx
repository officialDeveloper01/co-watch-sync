import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Wifi, WifiOff, Play, Pause } from 'lucide-react';
import YouTubePlayer from '@/components/YouTubePlayer';
import ChatPanel from '@/components/ChatPanel';
import { WebRTCManager } from '@/lib/webrtc';

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  peersCount: number;
}

const WatchTogether = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    peersCount: 0
  });
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: string;
    timestamp: Date;
  }>>([]);

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const { toast } = useToast();

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleCreateRoom = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube video URL",
        variant: "destructive"
      });
      return;
    }

    const newRoomId = Math.random().toString(36).substr(2, 9);
    setRoomId(newRoomId);
    setIsHost(true);
    setConnectionStatus({ status: 'connecting', peersCount: 0 });

    try {
      webrtcRef.current = new WebRTCManager(newRoomId, true);
      await webrtcRef.current.initialize({
        onConnectionChange: (status, peersCount) => {
          setConnectionStatus({ status, peersCount });
        },
        onMessage: (message) => {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: message.text,
            sender: message.sender,
            timestamp: new Date()
          }]);
        },
        onPlayerSync: (data) => {
          // Handle player synchronization
          window.dispatchEvent(new CustomEvent('youtube-sync', { detail: data }));
        }
      });

      toast({
        title: "Room created!",
        description: `Share room ID: ${newRoomId}`
      });
    } catch (error) {
      toast({
        title: "Failed to create room",
        variant: "destructive"
      });
      setConnectionStatus({ status: 'disconnected', peersCount: 0 });
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      toast({
        title: "Please enter a room ID",
        variant: "destructive"
      });
      return;
    }

    setConnectionStatus({ status: 'connecting', peersCount: 0 });

    try {
      webrtcRef.current = new WebRTCManager(roomId, false);
      await webrtcRef.current.initialize({
        onConnectionChange: (status, peersCount) => {
          setConnectionStatus({ status, peersCount });
        },
        onMessage: (message) => {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: message.text,
            sender: message.sender,
            timestamp: new Date()
          }]);
        },
        onPlayerSync: (data) => {
          window.dispatchEvent(new CustomEvent('youtube-sync', { detail: data }));
          if (data.videoId && !videoUrl) {
            setVideoUrl(`https://www.youtube.com/watch?v=${data.videoId}`);
          }
        }
      });

      toast({
        title: "Joined room!",
        description: `Connected to room ${roomId}`
      });
    } catch (error) {
      toast({
        title: "Failed to join room",
        variant: "destructive"
      });
      setConnectionStatus({ status: 'disconnected', peersCount: 0 });
    }
  };

  const handleSendMessage = (text: string) => {
    if (webrtcRef.current && text.trim()) {
      webrtcRef.current.sendMessage(text);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text,
        sender: 'You',
        timestamp: new Date()
      }]);
    }
  };

  const handlePlayerEvent = useCallback((event: string, data?: any) => {
    if (webrtcRef.current) {
      webrtcRef.current.syncPlayer(event, data);
    }
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'bg-success';
      case 'connecting': return 'bg-warning';
      default: return 'bg-destructive';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <Wifi className="w-4 h-4 animate-pulse" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Play className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Watch Together
                </h1>
              </div>
              {roomId && (
                <Badge variant="secondary" className="font-mono">
                  Room: {roomId}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor()} text-white flex items-center gap-2`}>
                {getStatusIcon()}
                {connectionStatus.status}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {connectionStatus.peersCount + 1}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Connection Setup */}
        {connectionStatus.status === 'disconnected' && (
          <Card className="mb-6 p-6 bg-gradient-to-br from-card to-muted/50">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Join the Party</h2>
                <p className="text-muted-foreground">Start watching together or join an existing room</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Create New Room</h3>
                  <Input
                    placeholder="Paste YouTube URL here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="bg-video-bg border-border"
                  />
                  <Button 
                    onClick={handleCreateRoom} 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary-glow hover:to-primary"
                  >
                    Create Room & Start Watching
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Join Existing Room</h3>
                  <Input
                    placeholder="Enter Room ID..."
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="bg-video-bg border-border"
                  />
                  <Button 
                    onClick={handleJoinRoom}
                    variant="outline"
                    className="w-full"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content */}
        {connectionStatus.status !== 'disconnected' && videoUrl && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden bg-video-bg">
                <YouTubePlayer 
                  url={videoUrl}
                  onPlayerEvent={handlePlayerEvent}
                />
              </Card>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-1">
              <ChatPanel 
                messages={messages}
                onSendMessage={handleSendMessage}
                isConnected={connectionStatus.status === 'connected'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchTogether;