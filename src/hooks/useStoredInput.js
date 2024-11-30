"use client";

import { useState, useEffect } from 'react';

export function useStoredInput() {
  const [userInput, setUserInput] = useState('');

  // Load stored input on component mount
  useEffect(() => {
    const storedInput = localStorage.getItem('businessInput');
    if (storedInput) {
      setUserInput(storedInput);
    }
  }, []);

  // Update stored input whenever it changes
  const updateUserInput = (value) => {
    setUserInput(value);
    localStorage.setItem('businessInput', value);
  };

  return [userInput, updateUserInput];
} 