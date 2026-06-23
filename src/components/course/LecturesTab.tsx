'use client'
// src/components/course/LecturesTab.tsx
import { useState } from 'react'
import type { Lecture, Course } from '@/types'

// ─── Raw HTML lecture content extracted directly from source files ───────────

const CSE221_HTML: Record<number, string> = {
  1: `<div class="card"><h3>What is a Database?</h3><ul><li>A <strong>collection of related data</strong> representing some aspect of the real world</li><li>Managed by a <strong>DBMS (Database Management System)</strong></li><li>Main benefits: <strong>efficient storage</strong> of large data + <strong>fast retrieval/updating</strong></li></ul></div>
<div class="lec-grid2">
  <div class="card"><h3>Core Terminology</h3><table class="lec-tbl"><tr><td>Table / Relation</td><td>Data in rows &amp; columns</td></tr><tr><td>Row / Record / Tuple</td><td>One entry in a table</td></tr><tr><td>Column / Field / Attribute</td><td>A property stored per row</td></tr></table></div>
  <div class="card"><h3>Redundancy vs. Inconsistency</h3><ul><li><strong>Redundancy</strong> — same data stored more than once → wasted storage</li><li><strong>Inconsistency</strong> — two or more different/conflicting values for the same item</li><li>Redundancy causes inconsistency — they are related but not the same</li></ul></div>
</div>
<div class="card"><h3>Why Split Data Across Tables?</h3><p>One flat table causes redundancy and inconsistency. Splitting into multiple tables:</p><ul style="margin-top:8px"><li>Reduces wasted storage</li><li>Allows single-place edits (no maintenance across multiple rows)</li><li>Avoids inconsistency — one source of truth</li></ul><div class="lec-tip"><strong>Exam tip:</strong> Know the difference. Redundancy = repeated data. Inconsistency = conflicting values. Redundancy leads to inconsistency.</div></div>`,

  2: `<div class="card"><h3>What is an ER Diagram?</h3><ul><li>A <strong>graphical representation</strong> of data in a database</li><li>Shows <strong>entities</strong>, <strong>relationships</strong>, and <strong>attributes</strong></li><li>No expert knowledge required to read it</li></ul></div>
<div class="card"><h3>Chen Notation Shapes</h3><table class="lec-tbl"><tr><th>Shape</th><th>Represents</th></tr><tr><td>Rectangle</td><td>Entity (e.g. Student, Course)</td></tr><tr><td>Ellipse / Oval</td><td>Attribute of an entity</td></tr><tr><td>Diamond</td><td>Relationship between entities</td></tr><tr><td>Double ellipse</td><td>Multi-valued attribute</td></tr><tr><td>Dashed ellipse</td><td>Derived attribute (calculated)</td></tr><tr><td>Double rectangle</td><td>Weak entity</td></tr><tr><td>Single line</td><td>Partial participation (optional)</td></tr><tr><td>Double line</td><td>Total participation (mandatory)</td></tr></table></div>
<div class="card"><h3>Relationship Properties</h3>
  <div class="lec-sub-label">1 · Degree</div><table class="lec-tbl"><tr><td>Unary (1)</td><td>One entity type relates to itself — e.g. Employee manages Employee</td></tr><tr><td>Binary (2)</td><td>Two entity types — most common</td></tr><tr><td>Ternary (3)</td><td>Three entity types in one relationship</td></tr></table>
  <div class="lec-sub-label" style="margin-top:14px">2 · Cardinality Ratio</div><table class="lec-tbl"><tr><th>Ratio</th><th>Meaning</th><th>Example</th></tr><tr><td>1:1</td><td>One A ↔ one B</td><td>Employee manages Department</td></tr><tr><td>1:N</td><td>One A → many B</td><td>Department has Employees</td></tr><tr><td>M:N</td><td>Many A ↔ many B</td><td>Student enrolls Course</td></tr></table>
  <div class="lec-sub-label" style="margin-top:14px">3 · Participation</div><table class="lec-tbl"><tr><td>Total (double line)</td><td>Every instance MUST participate — mandatory</td></tr><tr><td>Partial (single line)</td><td>Some instances may NOT participate — optional</td></tr></table>
  <div class="lec-tip"><strong>How to determine cardinality:</strong> Ask both directions — "Can one A have many B's?" and "Can one B have many A's?"</div>
  <div class="lec-tip" style="margin-top:8px"><strong>How to determine participation:</strong> "Can an X exist without this relationship?" If yes → partial. If no → total.</div>
</div>
<div class="card"><h3>Relationship Attributes</h3><ul><li>Placed on the <strong>diamond</strong> in the ER diagram</li><li>Common in <strong>M:N relationships</strong> — e.g. Grade on Student–enrolls–Course</li><li>Two entities can have <strong>more than one relationship</strong> between them</li></ul></div>
<div class="card"><h3>Crow's Foot Notation</h3><table class="lec-tbl"><tr><th>Symbol</th><th>Meaning</th></tr><tr><td>Fork (three-pronged)</td><td>Many</td></tr><tr><td>Single vertical line</td><td>One</td></tr><tr><td>Circle</td><td>Zero / Optional</td></tr></table></div>`,

  3: `<div class="card"><h3>Key Hierarchy</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>Superkey</strong> — any set of attributes that can uniquely identify a row. Many superkeys can exist.</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Candidate key</strong> — a <em>minimal</em> superkey. Removing any attribute would break uniqueness.</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t"><strong>Primary key (PK)</strong> — the chosen candidate key. Must be unique, NOT NULL, and stable.</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t"><strong>Alternate key</strong> — any candidate key NOT chosen as the PK.</div></div>
<div class="lec-rule"><strong>Superkey vs Candidate Key:</strong> {StudentID, Name} is a superkey but NOT a candidate key if StudentID alone is sufficient. A candidate key is the leanest possible unique identifier.</div>
</div>
<div class="lec-grid2">
  <div class="card"><h3>Surrogate Key</h3><ul><li>Artificially generated (e.g. auto-increment ID)</li><li><strong>No real-world meaning</strong> outside the database</li><li>Used when no suitable natural candidate key exists</li></ul></div>
  <div class="card"><h3>Natural Key</h3><ul><li>Has meaning <strong>outside the database</strong></li><li>Examples: National ID, passport, email</li><li>Preferred when stable and unique</li></ul></div>
</div>
<div class="card"><h3>Foreign Key (FK)</h3><ul><li>References the <strong>PK (or candidate key) of a parent table</strong></li><li>Enforces <strong>referential integrity</strong> — no orphaned records</li><li>A FK <strong>can be NULL</strong></li><li>A FK <strong>does NOT need to be unique</strong></li></ul><div class="lec-tip"><strong>PK rules:</strong> Unique · NOT NULL · Stable. <strong>FK rules:</strong> References parent PK · Can be NULL · Not required to be unique.</div></div>`,

  4: `<div class="card"><h3>Building an ER Diagram</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>Extract nouns</strong> → Entities</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Extract verbs</strong> → Relationships</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Determine <strong>cardinality ratio</strong> and <strong>participation</strong></div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Identify <strong>attributes</strong> for each entity and relationship</div></div>
<div class="lec-step"><div class="lec-step-n">5</div><div class="lec-step-t">Choose a <strong>primary key</strong> for each entity</div></div>
</div>
<div class="card"><h3>ER-to-Relational Mapping Rules</h3>
<table class="lec-tbl"><tr><th>ER Element</th><th>Maps to</th><th>FK Placement</th></tr><tr><td>Entity</td><td>Table</td><td>—</td></tr><tr><td>Attribute</td><td>Column</td><td>—</td></tr><tr><td>1:1 relationship</td><td>FK in one table</td><td>Total participation side</td></tr><tr><td>1:N relationship</td><td>FK in many-side table</td><td>N-side table</td></tr><tr><td>M:N relationship</td><td>New junction table</td><td>Both FKs in junction</td></tr><tr><td>Relationship attr (1:N)</td><td>Column in many-side table</td><td>—</td></tr><tr><td>Relationship attr (M:N)</td><td>Column in junction table</td><td>—</td></tr></table>
<div class="lec-tip" style="margin-top:12px"><strong>1:1 trap:</strong> Always put FK on total participation side to minimize NULLs.</div>
<div class="lec-tip" style="margin-top:8px"><strong>M:N always = new junction table.</strong> Junction PK = composite of both FKs.</div>
</div>`,

  5: `<div class="card"><h3>What is Normalization?</h3><ul><li>Important part of <strong>database logical design</strong></li><li>Aims to <strong>minimize redundancy</strong> and <strong>improve integrity</strong></li><li>Usually involves splitting large tables into smaller ones</li><li>Ensures tables conform to <strong>normal forms (1NF, 2NF, 3NF, BCNF)</strong></li></ul></div>
<div class="card"><h3>First Normal Form (1NF)</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>No multi-valued cells</strong> — each cell must contain a single atomic value.</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>No row ordering to convey information</strong> — meaning must not depend on row order.</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t"><strong>No duplicate rows</strong> — define a primary key.</div></div>
<div class="lec-tip"><strong>Fix multi-valued cells:</strong> Make each value its own row with a proper PK.</div>
</div>
<div class="card"><h3>Second Normal Form (2NF)</h3><ul><li>Must already be in <strong>1NF</strong></li><li><strong>No partial dependencies</strong> — every non-key attribute must depend on the <em>whole</em> composite PK</li><li>Only relevant when PK is <strong>composite (2+ columns)</strong></li></ul>
<div class="lec-rule"><strong>Partial dependency:</strong> Non-key attribute depends on only PART of the composite PK.<br/><strong>Fix:</strong> Split — move partially dependent attributes into a new table.</div>
<div class="lec-tip"><strong>Single-column PK = automatically 2NF</strong> — can't have partial dependencies with a single-column PK.</div>
</div>
<div class="card"><h3>Third Normal Form (3NF)</h3><ul><li>Must already be in <strong>2NF</strong></li><li><strong>No transitive dependencies</strong> — non-key attributes must NOT depend on other non-key attributes</li></ul>
<div class="lec-rule"><strong>Transitive dependency:</strong> Non-key A → Non-key B (B depends on A, not directly on PK).<br/><strong>Fix:</strong> Create a new table with A as PK containing A and B.</div>
</div>
<div class="card"><h3>Normal Forms Summary</h3><table class="lec-tbl"><tr><th>Form</th><th>Requirement</th><th>Removes</th></tr><tr><td>1NF</td><td>Atomic values, PK defined, no duplicates</td><td>Multi-valued cells</td></tr><tr><td>2NF</td><td>1NF + no partial dependencies</td><td>Partial deps on composite PK</td></tr><tr><td>3NF</td><td>2NF + no transitive dependencies</td><td>Non-key → non-key deps</td></tr><tr><td>BCNF (3.5NF)</td><td>Every determinant is a superkey</td><td>Remaining anomalies</td></tr></table></div>
<div class="card"><h3>Midterm Example — Full Worked Solution</h3>
<p style="margin-bottom:10px">Table: <code>PROJ_NUM, PROJ_NAME, EMP_NUM, EMP_NAME, JOB_CLASS, CHG_HOUR, HOURS</code><br/>PK = (PROJ_NUM, EMP_NUM)</p>
<div class="lec-sub-label">Step 1 — 2NF: Remove partial dependencies</div>
<ul><li>PROJ_NAME → only on PROJ_NUM → <strong>Project</strong>(PROJ_NUM, PROJ_NAME)</li><li>EMP_NAME, JOB_CLASS, CHG_HOUR → only on EMP_NUM → <strong>Employee</strong>(EMP_NUM, EMP_NAME, JOB_CLASS, CHG_HOUR)</li><li>HOURS → both keys → <strong>Proj_Hours</strong>(PROJ_NUM, EMP_NUM, HOURS)</li></ul>
<div class="lec-sub-label" style="margin-top:12px">Step 2 — 3NF: Remove transitive dependencies</div>
<ul><li>In Employee: JOB_CLASS → CHG_HOUR (transitive!) → split further</li><li><strong>Employee</strong>(EMP_NUM, EMP_NAME, JOB_CLASS) &nbsp;+&nbsp; <strong>Job_Hour_Rates</strong>(JOB_CLASS, CHG_HOUR)</li></ul>
<div class="lec-tip" style="margin-top:12px"><strong>Final 3NF tables:</strong> Project · Employee · Job_Hour_Rates · Proj_Hours</div>
</div>`,

  6: `<div class="card"><h3>What is Relational Algebra?</h3><ul><li>A <strong>mathematical language</strong> for querying/processing data</li><li><strong>Theoretical foundation of SQL</strong></li><li>Each operation: input = one or more relations → output = a new relation</li><li>Operations can be <strong>chained</strong></li></ul></div>
<div class="card"><h3>Relational Algebra vs. SQL</h3><table class="lec-tbl"><tr><th>Property</th><th>Relational Algebra</th><th>SQL</th></tr><tr><td>Type</td><td>Procedural (defines steps)</td><td>Declarative (defines what)</td></tr><tr><td>Semantics</td><td>Set — no duplicates, unordered</td><td>Bag — may return duplicates</td></tr><tr><td>Role</td><td>Theoretical foundation</td><td>Practical language</td></tr></table></div>
<div class="card"><h3>Core Operations</h3><table class="lec-tbl"><tr><th>Operation</th><th>Symbol</th><th>Description</th></tr><tr><td>Selection</td><td><code>σ (sigma)</code></td><td>Filter ROWS based on condition — horizontal filtering</td></tr><tr><td>Projection</td><td><code>π (pi)</code></td><td>Select specific COLUMNS — vertical filtering, removes duplicates</td></tr><tr><td>Union</td><td><code>∪</code></td><td>Combine rows from two union-compatible relations — no duplicates</td></tr><tr><td>Intersection</td><td><code>∩</code></td><td>Rows that exist in BOTH relations</td></tr><tr><td>Difference</td><td><code>−</code></td><td>Rows in first relation but NOT in second</td></tr><tr><td>Cartesian Product</td><td><code>×</code></td><td>Every row of R combined with every row of S</td></tr><tr><td>Join</td><td><code>⋈</code></td><td>Combine rows from two relations based on a condition</td></tr><tr><td>Rename</td><td><code>ρ (rho)</code></td><td>Rename a relation or its attributes</td></tr></table>
<div class="lec-tip"><strong>Key distinction:</strong> σ (Selection) filters ROWS. π (Projection) filters COLUMNS.</div>
</div>
<div class="card"><h3>Worked Examples</h3>
<div class="lec-sub-label">Example 1 — Find names of employees in Dept 5</div>
<div class="lec-code">π<sub>Name</sub>( σ<sub>DeptNo=5</sub>(Employee) )</div>
<div class="lec-sub-label" style="margin-top:12px">Example 2 — Join Employee with Department</div>
<div class="lec-code">Employee ⋈<sub>DeptNo=DeptID</sub> Department</div>
<div class="lec-tip" style="margin-top:12px"><strong>Read order:</strong> Inner-most operation first. σ filters rows before π projects columns.</div>
</div>
<div class="card"><h3>Union Compatibility</h3><ul><li>For ∪, ∩, − operations: both relations must be <strong>union-compatible</strong></li><li>Same number of attributes AND matching data types in corresponding positions</li><li>Column names do <strong>not</strong> need to match — only structure and types</li></ul></div>`,

  7: `<div class="card"><h3>SQL Categories</h3><table class="lec-tbl"><tr><th>Category</th><th>Full Name</th><th>Commands</th></tr><tr><td>DDL</td><td>Data Definition Language</td><td>CREATE, ALTER, DROP — database objects</td></tr><tr><td>DML</td><td>Data Manipulation Language</td><td>INSERT, SELECT, UPDATE, DELETE — CRUD on data</td></tr></table><div class="lec-tip" style="margin-top:12px"><strong>CRUD:</strong> Create=INSERT · Read=SELECT · Update=UPDATE · Delete=DELETE</div></div>
<div class="card"><h3>SQL Examples — DDL vs DML</h3>
<div class="lec-sub-label">DDL — Define Structure</div>
<pre class="lec-pre">CREATE TABLE Student (
  StudentID INT PRIMARY KEY,
  Name      VARCHAR(100),
  Email     VARCHAR(100) UNIQUE
);
ALTER TABLE Student ADD COLUMN GPA FLOAT;
DROP TABLE Student;</pre>
<div class="lec-sub-label" style="margin-top:12px">DML — Manipulate Data</div>
<pre class="lec-pre">INSERT INTO Student VALUES (1, 'Ahmed', 'a@uni.edu');
SELECT * FROM Student WHERE GPA &gt; 3.0;
UPDATE Student SET GPA = 3.5 WHERE StudentID = 1;
DELETE FROM Student WHERE StudentID = 1;</pre>
</div>
<div class="card"><h3>Database Index</h3><ul><li>A <strong>lookup table</strong> for faster data retrieval</li><li>Stores indexed column in <strong>sorted order</strong> with pointers to actual rows</li><li><strong>Auto-generated</strong> for the Primary Key</li><li><strong>Tradeoff:</strong> faster reads ↔ extra storage + slightly slower writes</li></ul><div class="lec-rule">Without an index → full table scan needed. With an index → scan the small sorted index → jump directly to the row.</div><div class="lec-tip"><code>CREATE INDEX idx_name ON Table(Column);</code></div></div>
<div class="card"><h3>SQL Query Life Cycle</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>SQL Parser</strong> — tokenizes query string, checks syntax, builds parse tree</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Query Analyzer</strong> — semantic checks: valid table/column names? correct data types?</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t"><strong>Query Optimizer</strong> — enumerates alternative plans, estimates cost, selects <strong>minimum cost plan</strong></div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t"><strong>Execution Engine</strong> — executes the chosen plan, returns results</div></div>
<div class="lec-tip"><strong>Order to memorize:</strong> Parser → Analyzer → Optimizer → Execution Engine</div>
</div>`,

  8: `<div class="card"><h3>Join Algorithms — Comparison</h3><table class="lec-tbl"><tr><th>Algorithm</th><th>How it works</th><th>Best when</th><th>Speed</th></tr><tr><td>Nested Loop Join (NLJ)</td><td>For every outer row, scan entire inner table</td><td>Small tables only</td><td>Worst — O(outer × inner)</td></tr><tr><td>Index NLJ</td><td>Like NLJ but uses index on inner table</td><td>Index exists on inner join column</td><td>Better than NLJ</td></tr><tr><td>Merge Join</td><td>Both sorted → single pass each</td><td>Both inputs already sorted / large data</td><td>Fastest for sorted data</td></tr><tr><td>Hash Join</td><td>Build hash table from inner → probe with outer</td><td>Large unsorted tables</td><td>Single pass — efficient</td></tr></table></div>
<div class="lec-grid2">
<div class="card"><h3>Merge Join</h3><ul><li>Requires <strong>both inputs sorted</strong> on join column</li><li>Scans each input <strong>exactly once</strong></li><li>If not sorted, sort first then merge</li><li>Fastest for large sorted datasets</li></ul></div>
<div class="card"><h3>Hash Join</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>Build:</strong> scan inner (smaller) table → build hash table</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Probe:</strong> scan outer table → probe hash table for matches</div></div>
<p style="margin-top:8px;font-size:13px;color:var(--t2)">Optimizer always puts <strong>smaller table as inner</strong> to fit in memory.</p>
</div>
</div>
<div class="lec-tip"><strong>NLJ tip:</strong> Use smaller table as outer to minimize inner scans. <strong>Merge vs Hash:</strong> Both single-pass. Merge needs sorted data. Hash works on unsorted.</div>`,

  9: `<div class="card"><h3>Aggregation</h3><p>Combining and <strong>summarizing multiple records</strong> into a single result based on criteria.</p><table class="lec-tbl" style="margin-top:12px"><tr><th>Function</th><th>Description</th></tr><tr><td>COUNT()</td><td>Count rows / non-null values</td></tr><tr><td>SUM()</td><td>Total sum of a numeric column</td></tr><tr><td>AVG()</td><td>Average value</td></tr><tr><td>MIN()</td><td>Minimum value</td></tr><tr><td>MAX()</td><td>Maximum value</td></tr></table></div>
<div class="lec-grid2">
<div class="card"><h3>Sort-based Aggregation</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Sort by the <strong>grouping key</strong></div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Single table scan</strong> — groups are contiguous after sorting</div></div>
</div>
<div class="card"><h3>Hash-based Aggregation</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>Single scan</strong> — apply hash function on grouping key, build hash table</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Scan hash table to get aggregated results</div></div>
</div>
</div>
<div class="lec-tip"><strong>Sort-based:</strong> Sort first → scan once. <strong>Hash-based:</strong> Scan once → build hash table → scan hash table. Hash avoids the sort cost.</div>`,
}

// ─── MAT312 lecture content (overview per sheet) ────────────────────────────
const MAT312_OVERVIEWS: Record<number, string> = {
  1: `<div class="card"><h3>Classification of DEs</h3><table class="lec-tbl"><tr><th>Property</th><th>Definition</th><th>Example</th></tr><tr><td>Order</td><td>Highest derivative present</td><td>y''+y=0 → 2nd order</td></tr><tr><td>Degree</td><td>Power of that highest derivative</td><td>(y'')³+y=0 → degree 3</td></tr><tr><td>Linear</td><td>y and all derivatives appear to power 1 only</td><td>y''+3y'+2y=eˣ ✓</td></tr><tr><td>Non-linear</td><td>y², yy', sin y, etc. appear</td><td>yy'=x, y''+y²=0 ✗</td></tr></table><div class="lec-tip">A DE of order n has n arbitrary constants in its general solution.</div></div>
<div class="card"><h3>Separable Equations</h3><div class="lec-rule">dy/dx = f(x)·g(y) → dy/g(y) = f(x)dx → integrate both sides</div>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Write DE as dy/dx = f(x)·g(y)</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Separate: dy/g(y) = f(x)dx</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Integrate both sides; add +C on one side</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Solve for y if possible; apply IC if given</div></div>
<div class="lec-tip"><strong>Singular solutions:</strong> If g(y₀)=0, then y=y₀ is a possible singular solution — check separately.</div>
</div>`,

  2: `<div class="card"><h3>Linear 1st-Order DE</h3><div class="lec-rule">Form: y' + P(x)y = Q(x)</div>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Find integrating factor: μ = e^(∫P dx)</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Multiply both sides by μ</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Left side becomes d/dx[μy]</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Integrate: μy = ∫μQ dx + C → y = (1/μ)(∫μQ dx + C)</div></div>
</div>
<div class="card"><h3>Bernoulli Equation</h3><div class="lec-rule">Form: y' + P(x)y = Q(x)yⁿ</div>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Substitution: z = y^(1-n) → z' = (1-n)y^(-n)y'</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">New linear DE: z' + (1-n)P(x)z = (1-n)Q(x)</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Solve for z, then y = z^(1/(1-n))</div></div>
</div>`,

  3: `<div class="card"><h3>Exactness Test</h3><div class="lec-rule">M dx + N dy = 0 is exact if: ∂M/∂y = ∂N/∂x</div>
<p>If exact, there exists F(x,y) such that ∂F/∂x = M and ∂F/∂y = N</p>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Check exactness: compute ∂M/∂y and ∂N/∂x</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Find F: integrate M with respect to x → F = ∫M dx + g(y)</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Find g(y): differentiate F w.r.t. y, set = N, solve for g'(y)</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Solution: F(x,y) = C</div></div>
</div>`,

  4: `<div class="card"><h3>Homogeneous DE</h3><div class="lec-rule">f(tx, ty) = f(x, y) — degree 0 homogeneous function</div>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Substitution: v = y/x → y = vx, y' = v + xv'</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Substitute into DE → separable DE in v and x</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Solve the separable DE for v</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Back-substitute: y = vx</div></div>
</div>
<div class="card"><h3>Clairaut's Equation</h3><div class="lec-rule">Form: y = xy' + f(y')</div>
<p>Differentiate both sides w.r.t. x. Either y'' = 0 (→ y=cx+f(c)) or solve the bracket for a singular solution.</p>
</div>`,

  5: `<div class="card"><h3>2nd-Order Constant Coefficients</h3><div class="lec-rule">ay'' + by' + cy = 0 → characteristic equation: ar² + br + c = 0</div>
<table class="lec-tbl"><tr><th>Discriminant</th><th>Roots</th><th>General Solution</th></tr><tr><td>b²-4ac &gt; 0</td><td>r₁, r₂ real distinct</td><td>y = C₁e^(r₁x) + C₂e^(r₂x)</td></tr><tr><td>b²-4ac = 0</td><td>r repeated</td><td>y = (C₁+C₂x)e^(rx)</td></tr><tr><td>b²-4ac &lt; 0</td><td>r = α±βi complex</td><td>y = e^(αx)(C₁cos βx + C₂sin βx)</td></tr></table>
</div>
<div class="card"><h3>Undetermined Coefficients (yₚ)</h3><table class="lec-tbl"><tr><th>f(x)</th><th>Guess yₚ</th></tr><tr><td>xⁿ</td><td>Aₙxⁿ+···+A₀</td></tr><tr><td>e^(ax)</td><td>Ae^(ax)</td></tr><tr><td>sin(bx) or cos(bx)</td><td>A cos(bx) + B sin(bx)</td></tr><tr><td>e^(ax)sin(bx)</td><td>e^(ax)(A cos bx + B sin bx)</td></tr></table>
<div class="lec-tip"><strong>Modification rule:</strong> If your guess is part of yc, multiply by x (or x² for repeated root).</div>
</div>
<div class="card"><h3>Wronskian &amp; Variation of Parameters</h3>
<div class="lec-rule">W(y₁,y₂) = y₁y₂' - y₂y₁' ≠ 0 for linearly independent solutions</div>
<p>yₚ = -y₁∫(y₂g/W)dx + y₂∫(y₁g/W)dx &nbsp; [use when f(x) not in undetermined coefficients list]</p>
</div>`,

  6: `<div class="card"><h3>Cauchy-Euler Equation</h3><div class="lec-rule">ax²y'' + bxy' + cy = 0 — Substitution: y = x^m</div>
<p>Substituting gives characteristic equation: am(m-1) + bm + c = 0</p>
<table class="lec-tbl"><tr><th>Roots</th><th>Solution</th></tr><tr><td>m₁ ≠ m₂ real</td><td>y = C₁x^(m₁) + C₂x^(m₂)</td></tr><tr><td>m repeated</td><td>y = x^m(C₁ + C₂ ln x)</td></tr><tr><td>m = α ± βi</td><td>y = x^α[C₁cos(β ln x) + C₂sin(β ln x)]</td></tr></table>
</div>
<div class="card"><h3>Reduction of Order</h3><div class="lec-rule">Given one solution y₁, find y₂ = v(x)·y₁</div>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Substitute y₂ = vy₁ into the DE</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Let w = v' → 1st-order DE in w</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Solve for w, integrate to get v, then y₂ = vy₁</div></div>
<div class="lec-tip">Formula: v = ∫e^(-∫P dx) / y₁² dx (from Abel's formula)</div>
</div>`,

  7: `<div class="card"><h3>Standard Laplace Transforms</h3><table class="lec-tbl"><tr><th>f(t)</th><th>F(s) = L{f(t)}</th></tr><tr><td>1</td><td>1/s</td></tr><tr><td>t^n</td><td>n!/s^(n+1)</td></tr><tr><td>e^(at)</td><td>1/(s-a)</td></tr><tr><td>sin(at)</td><td>a/(s²+a²)</td></tr><tr><td>cos(at)</td><td>s/(s²+a²)</td></tr><tr><td>sinh(at)</td><td>a/(s²-a²)</td></tr><tr><td>cosh(at)</td><td>s/(s²-a²)</td></tr></table></div>
<div class="card"><h3>Transforms of Derivatives &amp; s-Shifting</h3>
<div class="lec-rule">L{f'} = sF(s) - f(0) &nbsp;·&nbsp; L{f''} = s²F(s) - sf(0) - f'(0)</div>
<div class="lec-rule">s-Shifting: L{e^(at)f(t)} = F(s-a)</div>
<div class="lec-rule">Linearity: L{af+bg} = aF(s) + bG(s)</div>
</div>
<div class="card"><h3>Solving IVPs with Laplace</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Take L of both sides of the DE</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Apply initial conditions → algebraic equation in Y(s)</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Solve for Y(s)</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Take inverse Laplace L⁻¹{Y(s)} to get y(t)</div></div>
</div>`,

  8: `<div class="card"><h3>Fourier Series on [-L, L]</h3>
<div class="lec-rule">f(x) = a₀/2 + Σ[aₙcos(nπx/L) + bₙsin(nπx/L)]</div>
<table class="lec-tbl"><tr><td>a₀</td><td>(1/L)∫₋ₗᴸ f(x) dx</td></tr><tr><td>aₙ</td><td>(1/L)∫₋ₗᴸ f(x)cos(nπx/L) dx</td></tr><tr><td>bₙ</td><td>(1/L)∫₋ₗᴸ f(x)sin(nπx/L) dx</td></tr></table>
<div class="lec-tip"><strong>Even function:</strong> f(-x) = f(x) → bₙ = 0, cosine series only.<br/><strong>Odd function:</strong> f(-x) = -f(x) → aₙ = a₀ = 0, sine series only.</div>
</div>
<div class="card"><h3>Inverse Laplace &amp; Convolution</h3>
<div class="lec-rule">Convolution Theorem: L{(f*g)(t)} = F(s)·G(s)</div>
<p>Use partial fractions to decompose Y(s), then match to standard forms for L⁻¹.</p>
<div class="lec-tip"><strong>Complete the square</strong> for (s+a)²+b² form → e^(-at)sin(bt) or e^(-at)cos(bt).</div>
</div>`,

  9: `<div class="card"><h3>Ordinary vs Singular Points</h3>
<div class="lec-rule">For y'' + P(x)y' + Q(x)y = 0:</div>
<table class="lec-tbl"><tr><th>Type</th><th>Condition</th><th>Solution Method</th></tr><tr><td>Ordinary Point</td><td>P and Q analytic at x₀</td><td>Power series y = Σaₙ(x-x₀)ⁿ</td></tr><tr><td>Regular Singular</td><td>(x-x₀)P and (x-x₀)²Q analytic at x₀</td><td>Frobenius: y = xʳΣaₙxⁿ</td></tr><tr><td>Irregular Singular</td><td>Does not meet regular singular conditions</td><td>More advanced methods needed</td></tr></table>
</div>
<div class="card"><h3>Power Series Method</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t">Assume y = Σaₙxⁿ, compute y' and y''</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t">Substitute into DE</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t">Shift indices to align powers of x</div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t">Set coefficients equal to zero → recurrence relation</div></div>
<div class="lec-tip">Radius of convergence ≥ distance to nearest singular point from x₀.</div>
</div>`,
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  lectures: Lecture[]
  course: { slug: string; color: string }
}

const LECTURE_NAMES: Record<string, Record<number, string>> = {
  CSE221: {
    1:'Intro to DBs', 2:'ER Diagrams', 3:'Keys',
    4:'ER-to-Relational', 5:'Normalization', 6:'Relational Algebra',
    7:'Indexes & SQL', 8:'Join Algorithms', 9:'Aggregation',
  },
  MAT312: {
    1:'Separable Equations', 2:'Linear 1st-Order & Bernoulli',
    3:'Exact Equations', 4:'Homogeneous DEs',
    5:'2nd-Order Const. Coeff.', 6:'Cauchy-Euler & Reduction',
    7:'Laplace Transforms', 8:'Inverse Laplace & Fourier',
    9:'Power Series',
  },
}

export function LecturesTab({ lectures, course }: Props) {
  const [active, setActive] = useState(1)
  const htmlMap = course.slug === 'CSE221' ? CSE221_HTML : MAT312_OVERVIEWS
  const nameMap = LECTURE_NAMES[course.slug] || {}

  return (
    <div>
      {/* Tab strip */}
      <div style={{
        display:'flex', gap:6, flexWrap:'wrap', marginBottom:24,
      }}>
        {lectures.map(lec => (
          <button
            key={lec.number}
            onClick={() => setActive(lec.number)}
            style={{
              padding:'7px 14px', borderRadius:9, fontSize:12.5, fontWeight:500,
              background: active === lec.number ? course.color : 'var(--s3)',
              color: active === lec.number ? 'white' : 'var(--t2)',
              border: `1px solid ${active === lec.number ? course.color : 'var(--br)'}`,
              cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)',
              boxShadow: active === lec.number ? `0 2px 10px ${course.color}40` : 'none',
            }}
          >
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, opacity:0.75 }}>
              {course.slug === 'CSE221' ? `L${lec.number}` : `S${lec.number}`}
            </span>
            {' '}
            {nameMap[lec.number] || lec.title}
          </button>
        ))}
      </div>

      {/* Lecture title */}
      <div style={{ marginBottom:20 }}>
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:10,
          color:course.color, textTransform:'uppercase', letterSpacing:'0.08em',
        }}>
          {course.slug === 'CSE221' ? `Lecture ${active}` : `Sheet ${active}`}
        </span>
        <h2 style={{
          fontSize:'clamp(18px,2.5vw,24px)', fontWeight:700,
          color:'var(--t)', letterSpacing:'-0.02em', marginTop:4,
        }}>{nameMap[active]}</h2>
      </div>

      {/* Content */}
      <div
        className="lec-content"
        dangerouslySetInnerHTML={{ __html: htmlMap[active] || '<p style="color:var(--t2)">Content loading...</p>' }}
      />

      {/* Inline styles for lecture content */}
      <style>{`
        .lec-content { display:flex; flex-direction:column; gap:16px; }
        .lec-content .card {
          background:var(--s2); border:1px solid var(--br); border-radius:14px; padding:20px;
        }
        .lec-content h3 { font-size:15px; font-weight:700; color:var(--t); margin-bottom:12px; letter-spacing:-0.01em; }
        .lec-content p { font-size:13.5px; color:var(--t2); line-height:1.6; }
        .lec-content ul { padding-left:16px; display:flex; flex-direction:column; gap:6px; }
        .lec-content li { font-size:13.5px; color:var(--t2); line-height:1.55; }
        .lec-content strong { color:var(--t); font-weight:600; }
        .lec-content em { color:var(--accent); font-style:italic; }
        .lec-content code { font-family:var(--font-mono); font-size:12px; background:var(--s4); padding:2px 6px; border-radius:5px; color:var(--t2); }
        .lec-tbl { width:100%; border-collapse:collapse; font-size:12.5px; margin-top:4px; }
        .lec-tbl th { text-align:left; padding:7px 10px; border-bottom:1px solid var(--br2); color:var(--t3); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; }
        .lec-tbl td { padding:7px 10px; border-bottom:1px solid var(--br); color:var(--t2); vertical-align:top; }
        .lec-tbl tr:last-child td { border-bottom:none; }
        .lec-grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; }
        .lec-step { display:flex; gap:12px; align-items:flex-start; margin-bottom:10px; }
        .lec-step-n { width:24px; height:24px; border-radius:7px; background:var(--accent); color:white; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
        .lec-step-t { font-size:13.5px; color:var(--t2); line-height:1.55; }
        .lec-tip { background:rgba(99,102,241,.07); border:1px solid rgba(99,102,241,.2); border-radius:10px; padding:10px 14px; font-size:12.5px; color:var(--t2); margin-top:12px; }
        .lec-tip strong { color:var(--accent); }
        .lec-rule { background:var(--s3); border-left:3px solid var(--accent); padding:10px 14px; border-radius:0 8px 8px 0; font-size:13px; color:var(--t2); margin:10px 0; line-height:1.55; }
        .lec-sub-label { font-family:var(--font-mono); font-size:10px; color:var(--accent); text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; }
        .lec-code { font-family:var(--font-mono); font-size:14px; background:var(--s3); border:1px solid var(--br); border-radius:8px; padding:10px 14px; color:var(--t2); }
        .lec-pre { background:var(--s3); border:1px solid var(--br); border-radius:8px; padding:12px 14px; font-family:var(--font-mono); font-size:12px; color:var(--t2); overflow-x:auto; line-height:1.7; white-space:pre; }
      `}</style>
    </div>
  )
}
