'use client'
// src/app/dev/components/page.tsx
// Internal living style guide for the Vanguard design system (not linked in nav).
// Used to visually QA every primitive across breakpoints during the redesign.
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { RolePill, Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, Search, Trash2, BookOpen, Inbox } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 44 }}>
      <div className="sec-kicker">{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>{children}</div>
    </section>
  )
}

export default function ComponentsShowcase() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 20px 120px', position: 'relative', zIndex: 2 }}>
      <div className="sec-kicker">Design System</div>
      <h1 className="sec-title">AIU Vanguard — Components</h1>
      <p style={{ color: 'var(--t2)', marginTop: 10 }}>Internal style guide · Step 2 primitives</p>

      <Section title="Buttons">
        <Button icon={<Plus size={15} />}>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="subtle" icon={<Search size={15} />}>Subtle</Button>
        <Button variant="danger" icon={<Trash2 size={15} />}>Delete</Button>
        <Button size="sm" variant="subtle">Small</Button>
        <Button size="lg">Large</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Cards">
        <Card style={{ width: 280 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t)', marginBottom: 6 }}>Glass card</h3>
          <p style={{ color: 'var(--t2)', fontSize: 13.5, lineHeight: 1.6 }}>Hover me — crimson spotlight follows the cursor and the card lifts.</p>
        </Card>
        <Card hover={false} style={{ width: 280 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t)', marginBottom: 6 }}>Flat card</h3>
          <p style={{ color: 'var(--t2)', fontSize: 13.5, lineHeight: 1.6 }}>Content card — no lift on hover.</p>
        </Card>
      </Section>

      <Section title="Inputs">
        <div style={{ width: 260 }}><Field label="Full name" placeholder="Yousef Elserafy" /></div>
        <div style={{ width: 260 }}><Field label="Search" icon={<Search size={15} />} placeholder="Search courses…" /></div>
        <div style={{ width: 260 }}><Field label="Email" error="That doesn't look right" defaultValue="bad@" /></div>
      </Section>

      <Section title="Badges & role pills">
        {['owner', 'admin', 'doctor', 'master', 'guider', 'student'].map(r => <RolePill key={r} role={r} />)}
        <Badge color="#10b981">Published</Badge>
        <Badge color="#f59e0b">Draft</Badge>
      </Section>

      <Section title="Loading — skeletons & spinner">
        <Card hover={false} style={{ width: 280 }}>
          <Skeleton h={120} radius={12} style={{ marginBottom: 14 }} />
          <SkeletonText lines={3} />
        </Card>
        <Card hover={false} style={{ width: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner label="Loading…" />
        </Card>
      </Section>

      <Section title="Empty state">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <EmptyState
            icon={<Inbox size={30} />}
            title="No assignments yet"
            description="When your instructor publishes work, it'll show up right here."
            action={<Button icon={<BookOpen size={15} />}>Browse courses</Button>}
          />
        </div>
      </Section>
    </main>
  )
}
