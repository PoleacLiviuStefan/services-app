// components/VideoSession/VideoSessionComponent.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash, 
  FaPhoneSlash, 
  FaCog,
  FaExpand,
  FaCompress,
  FaDesktop,
  FaComments
} from 'react-icons/fa';

interface SessionData {
  id: string;
  startDate: string;
  endDate?: string;
  joinUrl: string;
  counterpart: string;
  counterpartEmail: string;
  status: string;
  isProvider: boolean;
}

interface VideoSessionComponentProps {
  sessionData: SessionData;
  onLeave: () => void;
  onError: (error: string) => void;
}

export default function VideoSessionComponent({ 
  sessionData, 
  onLeave, 
  onError 
}: VideoSessionComponentProps) {
  const [callState, setCallState] = useState<'idle' | 'joining' | 'joined' | 'left' | 'error'>('idle');
  const [participants, setParticipants] = useState<any[]>([]);
  const [localVideo, setLocalVideo] = useState(true);
  const [localAudio, setLocalAudio] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [duration, setDuration] = useState(0);
  
  const callObject = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Timer pentru durata sesiunii
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'joined') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Formatează durata în MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inițializează Daily.co
  useEffect(() => {
    if (!sessionData?.joinUrl || callState !== 'idle') return;

    const initializeCall = async () => {
      try {
        setCallState('joining');

        callObject.current = DailyIframe.createCallObject({
          url: sessionData.joinUrl,
        });

        // Event listeners
        callObject.current
          .on('joined-meeting', handleJoinedMeeting)
          .on('participant-joined', handleParticipantJoined)
          .on('participant-left', handleParticipantLeft)
          .on('participant-updated', handleParticipantUpdated)
          .on('left-meeting', handleLeftMeeting)
          .on('error', handleError)
          .on('network-quality-change', handleNetworkQualityChange)
          .on('app-message', handleChatMessage);

        await callObject.current.join();

      } catch (err) {
        console.error('Eroare la inițializarea apelului:', err);
        onError('Nu s-a putut conecta la sesiunea video');
        setCallState('error');
      }
    };

    initializeCall();

    return () => {
      if (callObject.current) {
        callObject.current.destroy();
      }
    };
  }, [sessionData]);

  const handleJoinedMeeting = useCallback((event: any) => {
    console.log('S-a alăturat la meeting:', event);
    setCallState('joined');
    
    const participants = callObject.current?.participants();
    if (participants) {
      setParticipants(Object.values(participants));
    }
  }, []);

  const handleParticipantJoined = useCallback((event: any) => {
    const participants = callObject.current?.participants();
    if (participants) {
      setParticipants(Object.values(participants));
    }
  }, []);

  const handleParticipantLeft = useCallback((event: any) => {
    const participants = callObject.current?.participants();
    if (participants) {
      setParticipants(Object.values(participants));
    }
  }, []);

  const handleParticipantUpdated = useCallback((event: any) => {
    const participants = callObject.current?.participants();
    if (participants) {
      setParticipants(Object.values(participants));
    }
  }, []);

  const handleLeftMeeting = useCallback(() => {
    setCallState('left');
    onLeave();
  }, [onLeave]);

  const handleError = useCallback((error: any) => {
    console.error('Eroare Daily:', error);
    onError('A apărut o eroare în timpul sesiunii video');
    setCallState('error');
  }, [onError]);

  const handleNetworkQualityChange = useCallback((event: any) => {
    const quality = event.threshold;
    setConnectionQuality(
      quality > 0.8 ? 'good' : quality > 0.5 ? 'fair' : 'poor'
    );
  }, []);

  const handleChatMessage = useCallback((event: any) => {
    const message = {
      id: Date.now(),
      text: event.data.message,
      sender: event.fromId,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, message]);
  }, []);

  const toggleVideo = async () => {
    if (!callObject.current) return;
    
    try {
      await callObject.current.setLocalVideo(!localVideo);
      setLocalVideo(!localVideo);
    } catch (err) {
      console.error('Eroare la comutarea video:', err);
    }
  };

  const toggleAudio = async () => {
    if (!callObject.current) return;
    
    try {
      await callObject.current.setLocalAudio(!localAudio);
      setLocalAudio(!localAudio);
    } catch (err) {
      console.error('Eroare la comutarea audio:', err);
    }
  };

  const toggleScreenShare = async () => {
    if (!callObject.current) return;
    
    try {
      if (isScreenSharing) {
        await callObject.current.stopScreenShare();
      } else {
        await callObject.current.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Eroare la partajarea ecranului:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const sendChatMessage = () => {
    if (!newMessage.trim() || !callObject.current) return;

    callObject.current.sendAppMessage({ message: newMessage }, '*');
    
    const message = {
      id: Date.now(),
      text: newMessage,
      sender: 'local',
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const leaveCall = async () => {
    if (!callObject.current) return;
    
    try {
      await callObject.current.leave();
    } catch (err) {
      console.error('Eroare la părăsirea apelului:', err);
    }
  };

  if (callState === 'joining') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Se conectează la sesiune...</p>
          <p className="text-sm text-gray-300 mt-2">
            Sesiune cu {sessionData.counterpart}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Header cu informații */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center z-10">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-lg font-semibold">
              {sessionData.counterpart}
            </h1>
            <p className="text-sm text-gray-300">
              {formatDuration(duration)}
            </p>
          </div>
          
          {/* Indicator calitate conexiune */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionQuality === 'good' ? 'bg-green-500' : 
              connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-300">
              {connectionQuality === 'good' ? 'Excelent' : 
               connectionQuality === 'fair' ? 'Moderat' : 'Slab'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">
            {participants.length} participant{participants.length !== 1 ? 'i' : ''}
          </span>
          
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            title="Toggle chat"
          >
            <FaComments size={16} />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
          </button>
        </div>
      </div>

      {/* Zona video principală */}
      <div className="flex-1 relative flex">
        {/* Video container */}
        <div className={`${showChat ? 'w-3/4' : 'w-full'} relative`}>
          <div className="w-full h-full bg-black" />
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-1/4 bg-gray-800 text-white flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`text-sm ${
                  msg.sender === 'local' ? 'text-blue-300' : 'text-white'
                }`}>
                  <div className="font-medium text-xs text-gray-400 mb-1">
                    {msg.sender === 'local' ? 'Tu' : sessionData.counterpart}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Scrie un mesaj..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-sm"
                >
                  Trimite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controale video */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-3 z-10">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            localAudio ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
          } text-white`}
          title={localAudio ? 'Dezactivează microfonul' : 'Activează microfonul'}
        >
          {localAudio ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            localVideo ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
          } text-white`}
          title={localVideo ? 'Dezactivează camera' : 'Activează camera'}
        >
          {localVideo ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition-colors ${
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
          } text-white`}
          title={isScreenSharing ? 'Oprește partajarea' : 'Partajează ecranul'}
        >
          <FaDesktop size={20} />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          title="Setări"
        >
          <FaCog size={20} />
        </button>

        <button
          onClick={leaveCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors ml-4"
          title="Părăsește sesiunea"
        >
          <FaPhoneSlash size={20} />
        </button>
      </div>

      {/* Panel setări */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-20">
          <h4 className="font-semibold mb-3">Setări</h4>
          <div className="space-y-2 text-sm">
            <div>Calitate video: Auto</div>
            <div>Calitate audio: Înaltă</div>
            <div>Conexiune: {connectionQuality}</div>
            <button 
              onClick={() => setShowSettings(false)}
              className="mt-3 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
            >
              Închide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}