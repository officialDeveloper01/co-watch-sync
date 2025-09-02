import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

const ChatPanel = ({ messages, onSendMessage, isConnected }: ChatPanelProps) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && isConnected) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getUserColor = (sender: string) => {
    if (sender === 'You') return 'text-user-1';
    return 'text-user-2';
  };

  return (
    <Card className="h-[600px] flex flex-col bg-chat-bg border-border">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Chat</h3>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="group">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`font-medium text-sm ${getUserColor(message.sender)}`}>
                          {message.sender}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="bg-message-bg rounded-lg px-3 py-2 text-sm">
                        {message.text}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={isConnected ? "Type a message..." : "Connect to chat"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              className="bg-video-bg border-border text-sm"
            />
            <Button 
              onClick={handleSend}
              disabled={!isConnected || !newMessage.trim()}
              size="sm"
              className="bg-gradient-to-r from-primary to-accent hover:from-primary-glow hover:to-primary shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <Users className="w-3 h-3" />
              Connect to start chatting with others
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatPanel;