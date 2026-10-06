'use client';

import React, { useState, useRef, useEffect } from 'react';
import { STAGES, getStageConfig } from '@/lib/stages';
import { ChevronDown, Loader2 } from 'lucide-react';

interface StageBadgeProps {
  stage: string;
  isInteractive?: boolean;
  onStageChange?: (newStage: string) => Promise<void> | void;
  size?: 'sm' | 'md' | 'lg';
}

export function StageBadge({
  stage,
  isInteractive = false,
  onStageChange,
  size = 'md',
}: StageBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = getStageConfig(stage);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (newStage: string) => {
    if (newStage === stage || !onStageChange) {
      setIsOpen(false);
      return;
    }
    try {
      setIsLoading(true);
      await onStageChange(newStage);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  if (!isInteractive) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full border ${config.badgeClass} ${sizeClasses[size]}`}
        title={stage}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <span>{stage}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        aria-label="Change candidate stage"
        title={`Current stage: ${stage}`}
        className={`inline-flex items-center font-medium rounded-full border transition-all cursor-pointer shadow-sm ${config.badgeClass} ${sizeClasses[size]} ${
          isOpen ? 'ring-2 ring-indigo-500/20' : ''
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        )}
        <span>{stage}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div
          className="absolute z-40 mt-1 min-w-[140px] bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Stage
          </div>
          {STAGES.map((s) => {
            const itemConfig = getStageConfig(s);
            const isSelected = s === stage;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  isSelected ? 'font-semibold text-slate-900 bg-slate-50/80' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${itemConfig.dotColor}`} />
                  <span>{s}</span>
                </div>
                {isSelected && <span className="text-indigo-600 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
