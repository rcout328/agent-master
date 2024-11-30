"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { ANALYSIS_PROMPTS } from '../config/prompts';

let socket;

const BusinessContext = createContext();

export function BusinessProvider({ children }) {
  const [userInput, setUserInput] = useState('');
  const [analysisResults, setAnalysisResults] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAnalyses, setActiveAnalyses] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const responseTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const MAX_RETRIES = 3;
  const RESPONSE_TIMEOUT = 60000; // 60 seconds timeout

  const initializeSocket = () => {
    if (typeof window !== 'undefined') {
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }

      socket = io('http://localhost:5002', {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: MAX_RETRIES,
        reconnectionDelay: 1000,
        timeout: 60000,
        pingTimeout: 60000,
        pingInterval: 25000,
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setRetryCount(0);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        // Attempt to reconnect
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            initializeSocket();
          }, 1000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        if (retryCount >= MAX_RETRIES) {
          socket.close();
          alert('Unable to connect to server. Please refresh the page.');
        }
      });

      socket.on('receive_message', (data) => {
        console.log('Received message:', data);
        if (data.type === 'error') {
          console.error('Error:', data.content);
          alert(`Error: ${data.content}`);
          setIsLoading(false);
          return;
        }

        // Clear any existing timeout
        if (responseTimeoutRef.current) {
          clearTimeout(responseTimeoutRef.current);
        }

        if (data.analysisType) {
          setAnalysisResults(prev => ({
            ...prev,
            [data.analysisType]: data.content
          }));
          setIsLoading(false);
        }
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        setIsLoading(false);
        alert('An error occurred. Please try again.');
      });

      // Keep connection alive with periodic pings
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit('ping');
        }
      }, 20000);
    }
  };

  useEffect(() => {
    initializeSocket();

    // Cleanup function
    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e, analysisType) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    if (!isConnected) {
      alert('Not connected to server. Please wait or refresh the page.');
      return;
    }
    if (!analysisType || !ANALYSIS_PROMPTS[analysisType]) {
      alert('Invalid analysis type selected.');
      return;
    }

    setIsLoading(true);
    try {
      setAnalysisResults(prev => ({
        ...prev,
        [analysisType]: null
      }));
      
      const promptConfig = ANALYSIS_PROMPTS[analysisType];
      const prompt = promptConfig.prompt(userInput);
      
      // Set a timeout for the response
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      
      responseTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        alert('Request timed out. Please try again.');
        // Attempt to reconnect if timeout occurs
        initializeSocket();
      }, RESPONSE_TIMEOUT);

      // Send message and wait for response
      socket.emit('send_message', {
        message: prompt,
        agent: 'MarketInsightCEO',
        analysisType: analysisType
      });

      // Handle response in the receive_message event listener
      socket.on('receive_message', (data) => {
        if (data.analysisType === analysisType) {
          if (data.type === 'error') {
            console.error('Error:', data.content);
            alert(`Error: ${data.content}`);
            setIsLoading(false);
            return;
          }

          setAnalysisResults(prev => ({
            ...prev,
            [analysisType]: data.content
          }));
          setIsLoading(false);

          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
        }
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        userInput,
        setUserInput,
        analysisResults,
        setAnalysisResults,
        isConnected,
        setIsConnected,
        isLoading,
        setIsLoading,
        activeAnalyses,
        setActiveAnalyses,
        handleSubmit
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}