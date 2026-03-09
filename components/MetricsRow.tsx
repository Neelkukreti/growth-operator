'use client';

import { motion } from 'framer-motion';
import { CampaignState } from '@/lib/types';
import { Users, Mail, MousePointerClick, ShieldCheck, Clock } from 'lucide-react';

function MetricCard({ label, value, icon: Icon, color, delay }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="card px-5 py-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-muted font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <motion.div
        key={String(value)}
        initial={{ y: 4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold text-foreground tracking-tight"
      >
        {value}
      </motion.div>
    </motion.div>
  );
}

export default function MetricsRow({ campaign }: { campaign: CampaignState }) {
  const leadsFound = campaign.leads.length;
  const emailsSent = campaign.leads.filter((l) => l.data.emailBody).length;
  const researched = campaign.leads.filter((l) => l.steps.research.status === 'done').length;
  const verified = campaign.leads.filter((l) => l.data.emailVerified).length;
  const ready = campaign.leads.filter((l) => l.data.outreachStatus === 'ready').length;
  const minsSaved = ready * 45;
  const timeSaved = ready === 0 ? '0m' : minsSaved >= 60 ? `${(minsSaved / 60).toFixed(1)}h` : `${minsSaved}m`;

  const metrics = [
    { label: 'Leads Found', value: leadsFound, icon: Users, color: 'bg-primary-light text-primary' },
    { label: 'Researched', value: researched, icon: MousePointerClick, color: 'bg-info-light text-info' },
    { label: 'Emails Generated', value: emailsSent, icon: Mail, color: 'bg-success-light text-success' },
    { label: 'Verified', value: verified, icon: ShieldCheck, color: 'bg-warning-light text-warning' },
    { label: 'Time Saved', value: timeSaved, icon: Clock, color: 'bg-success-light text-success' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m, i) => (
        <MetricCard key={m.label} {...m} delay={i * 0.05} />
      ))}
    </div>
  );
}
