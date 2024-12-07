"use client";

import { Inter } from 'next/font/google';
import './globals.css';
import MobileNav from '@/components/MovielNav';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black`}>
        {/* Mobile Navigation - Only visible on screens < 760px */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        <div className="flex">
          {/* Sidebar - Hidden on screens < 760px */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <main className="flex-1 min-h-screen bg-black p-6">
            {/* Add top padding on mobile to account for mobile nav */}
            <div className="md:hidden h-[57px]"></div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}