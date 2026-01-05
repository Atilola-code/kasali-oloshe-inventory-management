"use client";
import { useState } from "react";
import { Eye, TrendingUp, TrendingDown, EyeClosed } from "lucide-react";

interface ToggleStatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  isCurrency?: boolean;
  showEyeToggle?: boolean;
  responsive?: boolean; // ✅ This prop exists
  change?: number;
  changeLabel?: string;
  showChange?: boolean;
}

export default function ToggleStatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  isCurrency = false,
  showEyeToggle = true,
  responsive = false, // ✅ Added default value
  change = 0,
  changeLabel = "vs last month",
  showChange = false
}: ToggleStatsCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  const formatValue = () => {
    if (!isVisible) return "••••••";
    if (isCurrency && typeof value === 'number') {
      return `₦${new Intl.NumberFormat('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value))}`;
    }
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value;
  };

  const formatChange = () => {
    if (change >= 0) return `+${change.toFixed(1)}%`;
    return `${change.toFixed(1)}%`;
  };

  return (
    // ✅ Fixed the responsive condition
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition ${responsive ? 'md:p-6' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-left gap-x-4 mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {showEyeToggle && (
              <button
                onClick={() => setIsVisible(!isVisible)}
                className="p-1 rounded-lg transition"
                title={isVisible ? "Hide value" : "Show value"}
              >
                {isVisible ? (
                  <Eye className="w-5 h-5 text-gray-500" />
                ) : (
                  <EyeClosed className="w-5 h-5 text-gray-500" />
                )}
              </button>
            )}
          </div>
          <p className={`text-2xl font-bold ${isVisible ? color : 'text-gray-900'} mb-3`}>
            {formatValue()}
          </p>
          
          {/* Percentage Change Section */}
          {showChange && (
            <div className="flex items-center gap-2">
              {change >= 0 ? (
                <TrendingUp className="text-green-600" size={16} />
              ) : (
                <TrendingDown className="text-red-600" size={16} />
              )}
              <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatChange()}
              </span>
              <span className="text-sm text-gray-500">{changeLabel}</span>
            </div>
          )}
          
          {/* Subtitle Section */}
          {!showChange && subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          
          {/* For cards that show both change and subtitle */}
          {showChange && subtitle && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`${bgColor} p-3 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
}