"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      section: "DASHBOARD",
      items: [
        { name: "Home", path: "/", icon: "🏠" }
      ]
    },
    {
      section: "MODULES",
      items: [
        { name: "Market Analysis", path: "/market-analysis", icon: "📊" },
        { name: "Customer Discovery", path: "/customer-discovery", icon: "👥" },
        { name: "Competitive Intelligence", path: "/competitive-intelligence", icon: "🎯" },
        { name: "Product Evolution", path: "/product-evolution", icon: "📈" },
        { name: "Market Expansion", path: "/market-expansion", icon: "🌐" }
      ]
    },
    {
      section: "OPERATIONS",
      items: [
        { name: "Talk to Agents", path: "/agents", icon: "💬" }
      ]
    }
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#131314] border-r border-gray-800 z-50">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8">
            <Image 
              src="/logo.svg" 
              alt="Logo" 
              width={32} 
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold text-white">Cogent</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-8">
        {navigationItems.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-4 px-2">
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <Link
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${pathname === item.path 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-purple-600/20'}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
            <Image 
              src="/avatar.jpg" 
              alt="User" 
              width={32} 
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              crazyboi_14dz
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 