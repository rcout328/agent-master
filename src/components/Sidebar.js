"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('Market Analysis Agent');

  const menuItems = [
    {
      title: 'MODULES', 
      items: [
        { name: 'Market Analysis', icon: '📊', path: '/market-trends' },
        { name: 'Customer Discovery', icon: '👥', path: '/icp-creation' },
        { name: 'Product Evolution', icon: '⭐', path: '/feature-priority' },
        { name: 'Market Expansion', icon: '📈', path: '/market-assessment' },
        { name: 'Pro Report Mode', icon: '🚀', path: '/pro-mode' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { 
          name: 'Talk to Agents', 
          icon: '💬', 
          path: '/chat',
          query: {
            prompt: 'Talk to Market Analysis Agent'
          }
        }
      ]
    }
  ];

  return (
    <>
      <div style={{ 
        width: '256px',
        minHeight: '100vh', 
        background: 'black',
        color: 'white',
        padding: '24px',
        borderRight: '1px solid #1D1D1F',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        display: 'block'
      }}>
       
        {/* Navigation Sections */}
        {menuItems.map((section, index) => (
          <div key={index} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '8px', paddingRight: '8px' }}>
              {section.title}
            </h2>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex} 
                  onMouseEnter={() => setTooltipVisible(true)} 
                  onMouseLeave={() => setTooltipVisible(false)}
                  style={{ position: 'relative' }}
                >
                  <Link
                    href={{
                      pathname: item.path,
                      query: item.name === 'Talk to Agents' ? {
                        prompt: `Talk to ${selectedAgent}`
                      } : undefined
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center', 
                      padding: '10px 12px',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      backgroundColor: pathname === item.path ? '#1D1D1F' : 'transparent',
                      color: pathname === item.path ? 'white' : '#9CA3AF',
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1D1D1F'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = pathname === item.path ? '#1D1D1F' : 'transparent'}
                  >
                    <span style={{ fontSize: '24px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                  </Link>
                  {tooltipVisible && item.tooltip && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '100%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#333',
                      color: 'white',
                      padding: '8px',
                      borderRadius: '4px',
                      zIndex: 1,
                      whiteSpace: 'nowrap'
                    }}>
                      {item.tooltip}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        ))}

        {/* User Profile */}
      
      </div>
    </>
  );
}