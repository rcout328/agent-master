"use client";

import { BusinessProvider } from '../context/BusinessContext';

export default function Providers({ children }) {
  return (
    <BusinessProvider>
      {children}
    </BusinessProvider>
  );
} 