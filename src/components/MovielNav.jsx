"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const menuItems = [
    {
      title: 'DASHBOARD',
      items: [
        { name: 'Home', icon: '🏠', path: '/' }
      ]
    },
    {
      title: 'MODULES',
      items: [
        { name: 'Market Analysis', icon: '📊', path: '/market-trends' },
        { name: 'Customer Discovery', icon: '👥', path: '/icp-creation' },
        { name: 'SWOT Analysis', icon: '⚖️', path: '/swot-analysis' },
        { name: 'Product Evolution', icon: '⭐', path: '/feature-priority' },
        { name: 'Market Expansion', icon: '📈', path: '/market-assessment' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Talk to Agents', icon: '💬', path: '/chat' }
      ]
    }
  ];

  if (!isMounted) return null;

  return (
    <div style={{ display: 'block', '@media (min-width: 768px)': { display: 'none' } }}>
      {/* Mobile Navigation Bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ 
            backgroundColor: '#1D1D1F',
            borderBottom: '1px solid rgba(147, 51, 234, 0.1)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(29, 29, 31, 0.8)'
          }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: '#9333EA',
              color: 'white'
            }}
            aria-label="Toggle menu"
          >
            <div style={{ width: '1.5rem', height: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <span style={{ 
                width: '100%',
                height: '2px',
                backgroundColor: 'white',
                borderRadius: '9999px',
                transform: isMobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none',
                transition: 'all 0.3s'
              }} />
              <span style={{ 
                width: '100%',
                height: '2px',
                backgroundColor: 'white',
                borderRadius: '9999px',
                opacity: isMobileMenuOpen ? 0 : 1,
                transition: 'all 0.3s'
              }} />
              <span style={{ 
                width: '100%',
                height: '2px',
                backgroundColor: 'white',
                borderRadius: '9999px',
                transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none',
                transition: 'all 0.3s'
              }} />
            </div>
          </button>
          <div style={{ color: 'white', fontWeight: 600 }}>Market Insight AI</div>
          <div style={{ width: '2.5rem' }}></div>
        </motion.div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 40
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu Panel */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: isMobileMenuOpen ? 0 : "100%" }}
          transition={{ type: "tween", duration: 0.3 }}
          style={{
            position: 'fixed',
            top: '57px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(29, 29, 31, 0.9)',
            backdropFilter: 'blur(16px)',
            overflow: 'auto',
            zIndex: 50
          }}
        >
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {menuItems.map((section, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <h2 style={{ 
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                  padding: '0 0.5rem'
                }}>
                  {section.title}
                </h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {section.items.map((item, itemIndex) => (
                    <motion.div
                      key={itemIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index * 0.1) + (itemIndex * 0.05) }}
                    >
                      <Link
                        href={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.75rem',
                          transition: 'all 0.2s',
                          backgroundColor: pathname === item.path ? 'rgba(147, 51, 234, 0.8)' : 'transparent',
                          color: pathname === item.path ? 'white' : '#9CA3AF',
                          boxShadow: pathname === item.path ? '0 10px 15px -3px rgba(147, 51, 234, 0.2)' : 'none',
                          backdropFilter: pathname === item.path ? 'blur(4px)' : 'none'
                        }}
                      >
                        <span style={{ 
                          fontSize: '1.25rem',
                          width: '1.5rem',
                          height: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.icon}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.name}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}