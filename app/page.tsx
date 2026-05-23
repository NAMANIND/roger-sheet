'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, GitFork, Zap, Webhook, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand';
import { PUBLIC_PLANS } from '@/lib/plans-public';
import { cn } from '@/lib/utils';

const NAV = [
  { id: 'product', label: 'Product' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
] as const;

export default function LandingPage() {
  const [active, setActive] = useState<string>('product');

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(id);
    }
  }, []);

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5] }
    );
    sections.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              D
            </div>
            <span className="font-semibold tracking-tight">{PRODUCT_NAME}</span>
          </Link>

          <nav className="flex md:hidden items-center gap-1 overflow-x-auto pb-1 -mb-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors',
                  active === item.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  active === item.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Open app
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/30 to-background">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="text-sm font-medium text-primary mb-3">{PRODUCT_TAGLINE}</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl leading-[1.1]">
              Job queues &amp; schedules without running your own worker
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Pipelines, actions, and cron-style schedules with a fast dashboard.
              High-volume <strong className="font-medium text-foreground">Ping</strong> webhooks
              and rich <strong className="font-medium text-foreground">Full</strong> runs for scripts and debugging.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg">Get started free</Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => scrollTo('pricing')}>
                View pricing
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Immediate jobs run in about 1–2 minutes · Recurring schedules from every 5 minutes
            </p>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="scroll-mt-16 py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Built for real automation</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Dispatch gives you Trigger.dev-style ergonomics: define actions once, enqueue jobs,
              and let the platform handle execution and history.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Webhook,
                  title: 'Ping mode',
                  body: 'Fire webhooks at scale from the platform. No waiting for status codes — mark dispatched and move on.',
                },
                {
                  icon: Layers,
                  title: 'Full mode',
                  body: 'Scripts and HTTP with logs, results, and retries. Best for workflows you need to inspect.',
                },
                {
                  icon: CalendarClock,
                  title: 'Schedules',
                  body: 'Run once, or repeat every 5 minutes and up. Immediate jobs typically land in 1–2 minutes.',
                },
                {
                  icon: GitFork,
                  title: 'Pipelines',
                  body: 'Group work by pipeline, pause queues, and see queue + history stats in one dashboard.',
                },
                {
                  icon: Zap,
                  title: 'Actions',
                  body: 'Reusable HTTP or script handlers with parameter templates — test before you ship.',
                },
                {
                  icon: ArrowRight,
                  title: 'Hosted runtime',
                  body: 'No worker to deploy. You configure jobs; we run the shared execution backend.',
                },
              ].map((f) => (
                <Card key={f.title} className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <f.icon className="h-5 w-5 text-primary mb-2" strokeWidth={1.75} />
                    <CardTitle className="text-base font-medium">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 py-20 md:py-24 bg-muted/40 border-y border-border/60">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Define actions',
                  body: 'Create Ping (webhook) or Full (script / detailed HTTP) actions with parameters.',
                },
                {
                  step: '2',
                  title: 'Enqueue jobs',
                  body: 'Add to a pipeline immediately (1–2 min) or on a schedule (min every 5 minutes).',
                },
                {
                  step: '3',
                  title: 'Track history',
                  body: 'Dashboard shows queue, completions, and failures. Ping jobs record dispatched status.',
                },
              ].map((s) => (
                <li key={s.step} className="relative">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {s.step}
                  </span>
                  <h3 className="mt-4 font-medium text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">
              Ping and Full runs metered separately. Upgrade when you need more volume or retention.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PUBLIC_PLANS.map((plan) => (
                <Card
                  key={plan.slug}
                  className={cn(
                    'relative flex flex-col border-border/80',
                    plan.highlighted && 'border-primary shadow-md ring-1 ring-primary/20'
                  )}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Popular
                    </span>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="pt-3 text-3xl font-semibold tracking-tight">
                      {plan.price}
                      {plan.priceNote && (
                        <span className="text-base font-normal text-muted-foreground">{plan.priceNote}</span>
                      )}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className="text-primary shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/dashboard" className="mt-6 block">
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? 'default' : 'outline'}
                      >
                        {plan.slug === 'enterprise' ? 'Contact sales' : 'Start free'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 py-20 md:py-24 bg-muted/40 border-t border-border/60">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
            <dl className="mt-10 space-y-8">
              {[
                {
                  q: 'How fast are immediate jobs?',
                  a: 'Immediate jobs typically run within 1–2 minutes, depending on sync worker timing and queue depth.',
                },
                {
                  q: 'What is the fastest schedule?',
                  a: 'Recurring schedules start at every 5 minutes. Shorter intervals are not supported on the shared platform.',
                },
                {
                  q: 'Ping vs Full?',
                  a: 'Ping fires your webhook from the platform without waiting for a response — great for notifications. Full runs capture logs and results for scripts and debugging.',
                },
                {
                  q: 'Do I deploy Apps Script?',
                  a: 'No. Dispatch is hosted — you use the dashboard; we operate the execution backend.',
                },
              ].map((item) => (
                <div key={item.q}>
                  <dt className="font-medium text-foreground">{item.q}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to dispatch?</h2>
            <p className="mt-2 text-muted-foreground">Start on Free, upgrade when you outgrow it.</p>
            <Link href="/dashboard" className="mt-6 inline-block">
              <Button size="lg">Open dashboard</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {PRODUCT_NAME}. Job queue &amp; automation.</p>
      </footer>
    </div>
  );
}
