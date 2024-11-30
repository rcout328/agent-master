"use client";

import { useState } from 'react';

export default function ChatDialog({ currentPage }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
      >
        <span>💬</span>
        <span>{isOpen ? 'Close Chat' : 'Chat with Agent'}</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-[400px] h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="w-full h-full">
            <iframe
              src="http://127.0.0.1:7860/?__theme=dark"
              className="w-full h-full"
              frameBorder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
} 