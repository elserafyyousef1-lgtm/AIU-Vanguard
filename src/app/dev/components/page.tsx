'use client'
// src/app/dev/components/page.tsx
// Internal living style guide for the Vanguard design system (not linked in nav).
// Used to visually QA every primitive across breakpoints during the redesign.
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { RolePill, Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Dropdown } from '@/components/ui/Dropdown'
import { Table, Th, Td } from '@/components/ui/Table'
import { Tabs } from '@/components/ui/Tabs'
import { Plus, Search, Trash2, BookOpen, Inbox, MoreHorizontal, Pencil, Layers, FileText, Award } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 44 }}>
      <div className="sec-kicker">{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>{children}</div>
    </section>
  )
}

export default function ComponentsShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState('overview')

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

      <Section title="Tabs">
        <div style={{ width: '100%' }}>
          <Tabs active={tab} onChange={setTab} tabs={[
            { id: 'overview', label: 'Overview', icon: <Layers size={14} /> },
            { id: 'assignments', label: 'Assignments', icon: <FileText size={14} /> },
            { id: 'grades', label: 'Grades', icon: <Award size={14} /> },
          ]} />
        </div>
      </Section>

      <Section title="Select & action menu">
        <div style={{ width: 240 }}>
          <Select label="Category"><option>Quizzes</option><option>Midterm</option><option>Final</option></Select>
        </div>
        <div style={{ paddingTop: 26 }}>
          <Dropdown
            trigger={<><MoreHorizontal size={15} /> Actions</>}
            items={[
              { label: 'Edit', icon: <Pencil size={14} />, onClick: () => {} },
              { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {}, danger: true },
            ]}
          />
        </div>
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

      <Section title="Table">
        <div style={{ width: '100%' }}>
          <Table minWidth={420}>
            <thead><tr><Th>Student</Th><Th align="center">Quiz</Th><Th align="center">Final</Th><Th align="right">Total</Th></tr></thead>
            <tbody>
              <tr><Td>Maged Ali</Td><Td align="center">8/10</Td><Td align="center">75/100</Td><Td align="right">85%</Td></tr>
              <tr><Td>Sara Hany</Td><Td align="center">9/10</Td><Td align="center">88/100</Td><Td align="right">90%</Td></tr>
              <tr><Td>Omar Tarek</Td><Td align="center">6/10</Td><Td align="center">—</Td><Td align="right">60%</Td></tr>
            </tbody>
          </Table>
        </div>
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

      <Section title="Empty state & modal">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <EmptyState
            icon={<Inbox size={30} />}
            title="No assignments yet"
            description="When your instructor publishes work, it'll show up right here."
            action={<Button icon={<BookOpen size={15} />} onClick={() => setModalOpen(true)}>Open modal demo</Button>}
          />
        </div>
      </Section>

      {modalOpen && (
        <Modal
          title="Create assignment"
          subtitle="A quick demo of the modal primitive"
          onClose={() => setModalOpen(false)}
          footer={<>
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Title" placeholder="Assignment 1" />
            <Select label="Submission type"><option>File upload</option><option>Text entry</option></Select>
          </div>
        </Modal>
      )}
    </main>
  )
}
