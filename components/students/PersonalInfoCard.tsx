'use client';

import React from 'react';
import { StudentRecord } from '@/lib/types';
import { User, Mail, Phone, Calendar, Hash, Clock } from 'lucide-react';

interface PersonalInfoCardProps {
  student: StudentRecord;
}

export function PersonalInfoCard({ student }: PersonalInfoCardProps) {
  const items = [
    {
      label: 'Full Name',
      value: student.fullName,
      icon: User,
    },
    {
      label: 'Registration Number',
      value: student.registrationNo || 'Not provided',
      icon: Hash,
      mono: true,
    },
    {
      label: 'Email Address',
      value: student.emailAddress || student.emailId || 'Not provided',
      icon: Mail,
      isEmail: true,
    },
    {
      label: 'Contact Number',
      value: student.contactNumber || 'Not provided',
      icon: Phone,
      isPhone: true,
    },
    {
      label: 'Gender',
      value: student.gender || 'Not specified',
      icon: User,
    },
    {
      label: 'Date of Birth',
      value: student.dob || 'Not provided',
      icon: Calendar,
    },
    {
      label: 'Added to Database',
      value: new Date(student.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      icon: Clock,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span>Personal Information</span>
        </h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.label}</span>
              </span>
              <p
                className={`font-semibold text-slate-800 ${
                  item.mono ? 'font-mono text-slate-900' : ''
                }`}
              >
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
