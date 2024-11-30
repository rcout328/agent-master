import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const pages = [
    { name: 'Market Trends', path: '/market-trends', icon: '📈' },
    { name: 'Competitor Tracking', path: '/competitor-tracking', icon: '🔍' },
    { name: 'ICP Creation', path: '/icp-creation', icon: '👥' },
    { name: 'Journey Mapping', path: '/journey-mapping', icon: '🗺️' },
    { name: 'SWOT Analysis', path: '/swot-analysis', icon: '⚖️' },
    { name: 'Gap Analysis', path: '/gap-analysis', icon: '🎯' },
    { name: 'Feedback Collection', path: '/feedback-collection', icon: '📝' },
    { name: 'Feature Priority', path: '/feature-priority', icon: '⭐' },
    { name: 'Market Assessment', path: '/market-assessment', icon: '📊' },
    { name: 'Compliance Check', path: '/compliance-check', icon: '📋' },
    { name: 'Impact Assessment', path: '/impact-assessment', icon: '⚡' }
  ];

  return (
    <nav className="bg-white shadow-lg p-4 mb-8 overflow-x-auto">
      <div className="flex flex-wrap gap-2 justify-center min-w-max">
        <Link
          href="/"
          className={`px-4 py-2 rounded-lg transition-colors ${
            pathname === '/'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
        >
          <span className="mr-2">🏠</span>
          Dashboard
        </Link>
        {pages.map((page) => (
          <Link
            key={page.path}
            href={page.path}
            className={`px-4 py-2 rounded-lg transition-colors ${
              pathname === page.path
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <span className="mr-2">{page.icon}</span>
            {page.name}
          </Link>
        ))}
      </div>
    </nav>
  );
} 