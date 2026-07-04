import { Metadata } from 'next';
import { DecadeLeadersClient } from './decade-leaders-client';

export const metadata: Metadata = {
  title: 'Decade Leaders',
  description: 'See which teams dominated each decade based on ELO ratings.',
  openGraph: {
    title: 'Decade Leaders — International Football Stats',
    description: 'See which teams dominated each decade based on ELO ratings.',
  },
};

export default function DecadeLeadersPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <DecadeLeadersClient />
    </div>
  );
}
