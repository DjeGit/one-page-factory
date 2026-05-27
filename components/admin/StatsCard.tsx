interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'primary' | 'green' | 'orange' | 'blue';
}

const colorMap = {
  primary: 'bg-primary-50 text-primary-600 ring-primary-100',
  green: 'bg-green-50 text-green-600 ring-green-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-black text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}

          {trend && (
            <div
              className={`inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-1 rounded-full ${
                trend.value >= 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <svg
                className={`w-3 h-3 ${trend.value >= 0 ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>

        <div
          className={`w-12 h-12 rounded-xl ring-8 flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
