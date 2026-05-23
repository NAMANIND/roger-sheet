/** Marketing / landing page plan cards — keep in sync with docs/PLANS.md */
export type PublicPlan = {
  slug: string;
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  highlighted?: boolean;
  features: string[];
};

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    price: '$0',
    description: 'For side projects and evaluation',
    features: [
      '2 pipelines · 10 actions',
      '2,000 Ping runs / month',
      '50 Full runs / month',
      '10 schedules (min every 5 min)',
      '3 team members · 7-day history',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: '$29',
    priceNote: '/ month',
    description: 'For production workloads',
    highlighted: true,
    features: [
      '10 pipelines · 50 actions',
      '50,000 Ping runs / month',
      '2,000 Full runs / month',
      '100 schedules · 5 members',
      '90-day history · email support',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'Dedicated capacity & SLA',
    features: [
      'Unlimited pipelines & actions',
      'Custom Ping / Full volume',
      'Unlimited schedules & members',
      '1-year+ retention · SSO (roadmap)',
      'Invoice billing · dedicated support',
    ],
  },
];
