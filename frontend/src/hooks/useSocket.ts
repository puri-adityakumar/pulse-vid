import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';

export interface ProcessingProgress {
  videoId: string;
  progress: number;
}

export interface ProcessingComplete {
  videoId: string;
  processedPath: string;
  thumbnailPath: string;
}

export interface ProcessingFailed {
  videoId: string;
  error: string;
}

export const useSocket = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [processingComplete, setProcessingComplete] = useState<ProcessingComplete | null>(null);
  const [processingFailed, setProcessingFailed] = useState<ProcessingFailed | null>(null);
  const [processingStarted, setProcessingStarted] = useState<{ videoId: string; status: string } | null>(null);

  useEffect(() => {
    socketService.connect();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    if (userId && isConnected) {
      socketService.joinUserRoom(userId);
    }
  }, [userId, isConnected]);

  const onProcessingProgress = useCallback((callback: (data: ProcessingProgress) => void) => {
    socketService.on('video:processing:progress', callback);
    return () => socketService.off('video:processing:progress', callback);
  }, []);

  const onProcessingComplete = useCallback((callback: (data: ProcessingComplete) => void) => {
    socketService.on('video:processing:complete', callback);
    return () => socketService.off('video:processing:complete', callback);
  }, []);

  const onProcessingFailed = useCallback((callback: (data: ProcessingFailed) => void) => {
    socketService.on('video:processing:failed', callback);
    return () => socketService.off('video:processing:failed', callback);
  }, []);

  const onProcessingStarted = useCallback((callback: (data: { videoId: string; status: string }) => void) => {
    socketService.on('video:processing:started', callback);
    return () => socketService.off('video:processing:started', callback);
  }, []);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const handleProgress = (data: ProcessingProgress) => {
      setProcessingProgress(data);
    };
    unsubscribes.push(onProcessingProgress(handleProgress));

    const handleComplete = (data: ProcessingComplete) => {
      setProcessingComplete(data);
    };
    unsubscribes.push(onProcessingComplete(handleComplete));

    const handleFailed = (data: ProcessingFailed) => {
      setProcessingFailed(data);
    };
    unsubscribes.push(onProcessingFailed(handleFailed));

    const handleStarted = (data: { videoId: string; status: string }) => {
      setProcessingStarted(data);
    };
    unsubscribes.push(onProcessingStarted(handleStarted));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [onProcessingProgress, onProcessingComplete, onProcessingFailed, onProcessingStarted]);

  const clearProcessingState = useCallback(() => {
    setProcessingProgress(null);
    setProcessingComplete(null);
    setProcessingFailed(null);
    setProcessingStarted(null);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  return {
    isConnected,
    processingProgress,
    processingComplete,
    processingFailed,
    processingStarted,
    clearProcessingState,
    disconnect,
    onProcessingProgress,
    onProcessingComplete,
    onProcessingFailed,
    onProcessingStarted
  };
};
