"use client";

import { useState, useEffect, useRef } from 'react';
import { callGroqApi } from '@/utils/groqApi';
import { useRouter } from 'next/navigation';

export default function StartupChatbot({ onClose, setUserInput }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasEnoughInfo, setHasEnoughInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
  }, []);

  useEffect(() => {
    if (messages.length >= 6) {
      const userMessages = messages.filter(m => m.role === 'user');
      const totalLength = userMessages.reduce((acc, msg) => acc + msg.content.length, 0);
      
      if (totalLength > 200 && !hasEnoughInfo) {
        setHasEnoughInfo(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I think I have a good understanding of your startup now. You can continue sharing more details or type 'end' when you're ready for me to create a comprehensive summary.",
          timestamp: new Date().toISOString()
        }]);
      }
    }
  }, [messages, hasEnoughInfo]);

  const startConversation = async () => {
    setIsLoading(true);
    try {
      const response = await callGroqApi([{
        role: "system",
        content: `You are an expert startup consultant conducting an interview to gather information about a startup. 
        Your goal is to ask relevant questions one at a time to understand the startup thoroughly.
        Start with a friendly introduction and your first question.
        Keep your responses conversational and engaging.
        Ask follow-up questions based on the user's responses.
        Cover important aspects like:
        - Problem being solved
        - Target market
        - Solution/product
        - Business model
        - Competition
        - Current stage
        - Team
        - Growth plans`
      }]);

      setMessages([{
        role: 'system',
        content: "👋 Welcome! I'll help you describe your startup idea. Type 'end' whenever you feel you've shared all the important details.",
        timestamp: new Date().toISOString()
      }, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateStartupDescription = async (conversation) => {
    try {
      const response = await callGroqApi([
        {
          role: "system",
          content: "You are an expert at creating comprehensive startup descriptions. Based on the interview conversation provided, create a well-structured description that covers all key aspects of the startup."
        },
        {
          role: "user",
          content: `Based on this conversation, create a detailed but concise startup description:
          ${conversation.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
        }
      ]);

      return response;
    } catch (error) {
      console.error('Error generating description:', error);
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = inputMessage.trim();
    setInputMessage('');

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    if (userMessage.toLowerCase() === 'end') {
      const description = await generateStartupDescription(messages);
      if (description) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Great! I've created a description of your startup. Here it is:\n\n" + description,
          timestamp: new Date().toISOString()
        }]);

        localStorage.setItem('businessInput', description);
        if (setUserInput) setUserInput(description);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I've added this description to the manual input field. You can now close this chat and click 'Start Analysis' to begin the analysis, or edit the description first if you'd like to make any changes.",
          timestamp: new Date().toISOString()
        }]);

        setIsComplete(true);
        
        setTimeout(() => {
          onClose();
          window.dispatchEvent(new Event('storage'));
        }, 5000);
      }
    } else {
      try {
        const response = await callGroqApi([
          {
            role: "system",
            content: `You are an expert startup consultant conducting an interview.
            Ask relevant follow-up questions based on the conversation history.
            Keep your responses conversational and engaging.
            Ask one question at a time.
            If you have gathered enough information about a topic, move on to other important aspects.`
          },
          ...messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          {
            role: "user",
            content: userMessage
          }
        ]);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }]);
      }
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    router.refresh();
    onClose();
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const storedInput = localStorage.getItem('businessInput');
      if (storedInput) {
        setUserInput(storedInput);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '800px', background: 'linear-gradient(to bottom, rgba(128, 0, 128, 0.1), transparent)', padding: '1px', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
      <div style={{ backgroundColor: 'rgba(29, 29, 31, 0.9)', padding: '32px', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', background: 'linear-gradient(to right, #A855F7, #6D28D9)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            AI Assistant
          </h2>
          <button
            onClick={onClose}
            style={{ color: '#A0AEC0', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A0AEC0'}
          >
            ✕
          </button>
        </div>

        <div style={{ height: '400px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((message, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px', borderRadius: '12px',
                background: message.role === 'user' ? 'linear-gradient(to right, #6D28D9, #4F46E5)' : message.role === 'system' ? 'rgba(255, 0, 0, 0.1)' : '#1A1A1B',
                color: message.role === 'user' ? 'white' : message.role === 'system' ? '#F56565' : '#E2E8F0'
              }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                <span style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px', display: 'block' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ backgroundColor: '#1A1A1B', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#A855F7', borderRadius: '50%', animation: 'bounce 0.6s infinite' }}></div>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#A855F7', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.1s' }}></div>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#A855F7', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {isComplete ? (
          <button
            onClick={handleBack}
            style={{
              width: '100%', padding: '16px 24px', borderRadius: '12px', fontWeight: '500', transition: 'all 0.2s',
              background: 'linear-gradient(to right, #6D28D9, #4F46E5)', color: 'white', boxShadow: '0 4px 10px rgba(128, 0, 128, 0.25)'
            }}
          >
            Back to Input
          </button>
        ) : (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isComplete ? "Interview complete!" : "Type your message..."}
              style={{
                flex: '1', padding: '12px', backgroundColor: '#1A1A1B', color: '#E2E8F0', borderRadius: '12px', border: '1px solid rgba(128, 0, 128, 0.2)',
                placeholder: { color: '#A0AEC0' }, outline: 'none', transition: 'border 0.2s', borderColor: isComplete || isLoading ? 'rgba(128, 0, 128, 0.2)' : 'rgba(128, 0, 128, 0.5)'
              }}
              disabled={isComplete || isLoading}
            />
            <button
              type="submit"
              disabled={isComplete || isLoading || !inputMessage.trim()}
              style={{
                padding: '12px 24px', borderRadius: '12px', fontWeight: '500', transition: 'all 0.2s',
                background: isComplete || isLoading || !inputMessage.trim() ? '#4A5568' : 'linear-gradient(to right, #6D28D9, #4F46E5)', color: 'white'
              }}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 