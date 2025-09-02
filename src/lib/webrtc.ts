import { io, Socket } from 'socket.io-client';

export interface WebRTCCallbacks {
  onConnectionChange: (status: 'disconnected' | 'connecting' | 'connected', peersCount: number) => void;
  onMessage: (message: { text: string; sender: string; timestamp: Date }) => void;
  onPlayerSync: (data: { action: string; videoId?: string; currentTime?: number }) => void;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomId: string;
  private isHost: boolean;
  private callbacks: WebRTCCallbacks | null = null;
  private username: string;
  private peersCount = 0;

  constructor(roomId: string, isHost: boolean) {
    this.roomId = roomId;
    this.isHost = isHost;
    this.username = `User${Math.floor(Math.random() * 1000)}`;
  }

  async initialize(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
    
    try {
      // Connect to signaling server
      this.socket = io('http://localhost:3001');
      
      this.socket.on('connect', () => {
        console.log('Connected to signaling server');
        this.callbacks?.onConnectionChange('connecting', 0);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        this.callbacks?.onConnectionChange('disconnected', 0);
      });

      // Set up WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Set up data channel for chat (only host creates it)
      if (this.isHost) {
        this.dataChannel = this.peerConnection.createDataChannel('chat', {
          ordered: true
        });
        this.setupDataChannel(this.dataChannel);
      } else {
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannel(this.dataChannel);
        };
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket?.emit('ice-candidate', {
            roomId: this.roomId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('Connection state:', state);
        
        if (state === 'connected') {
          this.callbacks?.onConnectionChange('connected', this.peersCount);
        } else if (state === 'disconnected' || state === 'failed') {
          this.callbacks?.onConnectionChange('disconnected', 0);
        }
      };

      // Set up signaling handlers
      this.setupSignalingHandlers();

      // Join or create room
      this.socket.emit('join-room', {
        roomId: this.roomId,
        isHost: this.isHost,
        username: this.username
      });

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  private setupDataChannel(dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.callbacks?.onConnectionChange('connected', this.peersCount);
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.callbacks?.onConnectionChange('disconnected', 0);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'chat') {
          this.callbacks?.onMessage({
            text: message.text,
            sender: message.sender,
            timestamp: new Date(message.timestamp)
          });
        } else if (message.type === 'player-sync') {
          this.callbacks?.onPlayerSync(message.data);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  }

  private setupSignalingHandlers() {
    if (!this.socket) return;

    this.socket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      this.peersCount = data.peersCount - 1; // Subtract self
    });

    this.socket.on('peer-joined', (data) => {
      console.log('Peer joined:', data);
      this.peersCount = data.peersCount - 1;
      this.callbacks?.onConnectionChange('connecting', this.peersCount);
    });

    this.socket.on('peer-left', (data) => {
      console.log('Peer left:', data);
      this.peersCount = Math.max(0, data.peersCount - 1);
      this.callbacks?.onConnectionChange(
        this.peersCount > 0 ? 'connected' : 'disconnected', 
        this.peersCount
      );
    });

    this.socket.on('offer', async (data) => {
      try {
        await this.peerConnection?.setRemoteDescription(data.offer);
        const answer = await this.peerConnection?.createAnswer();
        await this.peerConnection?.setLocalDescription(answer);
        
        this.socket?.emit('answer', {
          roomId: this.roomId,
          answer: answer
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    this.socket.on('answer', async (data) => {
      try {
        await this.peerConnection?.setRemoteDescription(data.answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    this.socket.on('ice-candidate', async (data) => {
      try {
        await this.peerConnection?.addIceCandidate(data.candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    this.socket.on('ready-to-connect', async () => {
      if (this.isHost && this.peerConnection) {
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          
          this.socket?.emit('offer', {
            roomId: this.roomId,
            offer: offer
          });
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      }
    });
  }

  sendMessage(text: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'chat',
        text,
        sender: this.username,
        timestamp: new Date().toISOString()
      };
      
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  syncPlayer(action: string, data?: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const syncMessage = {
        type: 'player-sync',
        data: {
          action,
          ...data
        }
      };
      
      this.dataChannel.send(JSON.stringify(syncMessage));
    }
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.callbacks?.onConnectionChange('disconnected', 0);
  }
}

export default WebRTCManager;