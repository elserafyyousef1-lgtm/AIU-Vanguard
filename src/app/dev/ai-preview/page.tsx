'use client'
// src/app/dev/ai-preview/page.tsx — DEV ONLY: visual harness for the AI answer presentation.
// Renders the RichText renderer inside a replica of the AIPanel assistant bubble so we can
// polish typography, math, code, lists, tables, and callouts without needing auth or the API.
import { RichText } from '@/components/ai/RichText'
import { FileText, Sparkles } from 'lucide-react'

const LINALG = `## حل النظام خطوة بخطوة

النظام المعطى:

$$\\begin{cases} 2x + y + z = 1 \\\\ 6x + 2y + z = -1 \\\\ -2x + 2y + z = 7 \\end{cases}$$

**الخطوة 1 — المصفوفة الموسّعة (Augmented Matrix).** نكتب المعاملات:

$$\\left[\\begin{array}{ccc|c} 2 & 1 & 1 & 1 \\\\ 6 & 2 & 1 & -1 \\\\ -2 & 2 & 1 & 7 \\end{array}\\right]$$

**الخطوة 2 — تصفير أول عمود.** نعمل $R_2 \\to R_2 - 3R_1$ لأن $6 - 3(2) = 0$، و $R_3 \\to R_3 + R_1$:

$$\\left[\\begin{array}{ccc|c} 2 & 1 & 1 & 1 \\\\ 0 & -1 & -2 & -4 \\\\ 0 & 3 & 2 & 8 \\end{array}\\right]$$

**الخطوة 3 — الحل بالتعويض العكسي (Back Substitution).** من الصف الأخير $-4z = -4$، إذن:

$$\\boxed{x = -1, \\quad y = 2, \\quad z = 1}$$

نصيحة للامتحان: لو آخر صف بقى $[0\\; 0\\; 0 \\,|\\, 5]$ فده معناه **No Solution**؛ ولو بقى كله أصفار فده **Infinite Solutions**.`

const MIXED = `عشان تعمل **JOIN** بين جدولين في SQL بتربط بالـ \`PRIMARY KEY\`. مثال:

\`\`\`sql
SELECT s.name, c.title
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
WHERE c.code = 'CSE221';
\`\`\`

أنواع الـ JOIN المهمة للامتحان:

1. **INNER JOIN** — الصفوف اللي ليها مطابقة في الجدولين بس.
2. **LEFT JOIN** — كل صفوف الجدول الشمال + المطابق من اليمين.
3. **RIGHT JOIN** — العكس.

الفرق بين \`WHERE\` و \`HAVING\`:

| Clause | بيفلتر إمتى | بيشتغل على |
|---|---|---|
| \`WHERE\` | قبل التجميع | الصفوف الأصلية |
| \`HAVING\` | بعد \`GROUP BY\` | نتيجة التجميع |

> ملحوظة للامتحان: مينفعش تستخدم \`HAVING\` من غير \`GROUP BY\` إلا مع دوال التجميع زي \`COUNT\`.`

const ENGLISH = `# Gradient Descent — the idea

We minimise a cost $J(\\theta)$ by stepping *against* its gradient:

$$\\theta := \\theta - \\alpha \\, \\nabla_\\theta J(\\theta)$$

- $\\alpha$ is the **learning rate** — too big overshoots, too small crawls.
- The closed-form solution for linear regression is $\\theta = (X^T X)^{-1} X^T y$.

Exam tip: if features aren't scaled, convergence is slow — normalise first.`

function Bubble({ content, sources, ungrounded }: { content: string; sources?: { title: string; page: number }[]; ungrounded?: boolean }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, marginBottom:18 }}>
      <div style={{
        maxWidth:'85%', padding:'10px 14px', borderRadius:14, borderBottomLeftRadius:4,
        background:'var(--s3)', border:'1px solid var(--br)', color:'var(--t)',
        fontSize:13.5, lineHeight:1.6, whiteSpace:'normal', wordBreak:'break-word',
      }}>
        <RichText content={content} />
      </div>
      {sources && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:1, maxWidth:'85%' }}>
          {sources.map((s, i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, color:'var(--t3)', background:'var(--s2)', border:'1px solid var(--br)', borderRadius:7, padding:'2px 7px' }}>
              <FileText size={10} /> {s.title} · p.{s.page}
            </span>
          ))}
        </div>
      )}
      {ungrounded && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:1, fontSize:10.5, color:'#d9a441', background:'rgba(217,164,65,0.10)', border:'1px solid rgba(217,164,65,0.28)', borderRadius:7, padding:'2px 8px' }}>
          <Sparkles size={10} /> معلومة عامة — مش من مواد المادة
        </div>
      )}
    </div>
  )
}

export default function AIPreview() {
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', padding:'32px 16px' }}>
      <div style={{ maxWidth:460, margin:'0 auto' }}>
        <h1 style={{ fontSize:18, fontWeight:800, color:'var(--t)', marginBottom:4 }}>AI answer presentation — preview</h1>
        <p style={{ fontSize:12.5, color:'var(--t3)', marginBottom:24 }}>DEV harness · assistant bubbles at panel width</p>
        <Bubble content={LINALG} sources={[{ title:'DE_Systems.pdf', page:12 }]} />
        <Bubble content={MIXED} sources={[{ title:'CSE221_SQL.pdf', page:7 }]} />
        <Bubble content={ENGLISH} ungrounded />
      </div>
    </div>
  )
}
