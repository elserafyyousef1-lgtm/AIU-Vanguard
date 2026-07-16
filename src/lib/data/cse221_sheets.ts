// src/lib/data/cse221_sheets.ts — CSE221 Database Systems study sheets.
// Full scientific content ported from the legacy CSE221 study hub (all 36 topic cards,
// including the complete midterm worked solution, RA tree representation, union
// compatibility and database-index cards). Moved out of LecturesTab.tsx to match the
// aie121_sheets.ts / mat312_sheets.ts data-file pattern.
/* eslint-disable */
export const CSE221_HTML: Record<number, string> = {
  1: `<div class="card"><h3>What is a Database?</h3><ul><li>A <strong>collection of related data</strong> representing some aspect of the real world</li><li>Managed by a <strong>DBMS (Database Management System)</strong></li><li>Main benefits: <strong>efficient storage</strong> of large data + <strong>fast retrieval/updating</strong></li></ul></div>
<div class="lec-grid2">
  <div class="card"><h3>Core Terminology</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><td>Table / Relation</td><td>Data in rows &amp; columns</td></tr><tr><td>Row / Record / Tuple</td><td>One entry in a table</td></tr><tr><td>Column / Field / Attribute</td><td>A property stored per row</td></tr></table></div></div>
  <div class="card"><h3>Redundancy vs. Inconsistency</h3><ul><li><strong>Redundancy</strong> — same data stored more than once → wasted storage</li><li><strong>Inconsistency</strong> — two or more different/conflicting values for the same item</li><li>Redundancy causes inconsistency — they are related but not the same</li></ul></div>
</div>
<div class="card"><h3>Why Split Data Across Tables?</h3><p>One flat table causes redundancy and inconsistency. Splitting into multiple tables:</p><ul style="margin-top:8px"><li>Reduces wasted storage</li><li>Allows single-place edits (no maintenance across multiple rows)</li><li>Avoids inconsistency — one source of truth</li></ul><div class="lec-tip"><strong>Exam tip:</strong> Know the difference. Redundancy = repeated data. Inconsistency = conflicting values. Redundancy leads to inconsistency.</div></div>`,

  2: `<div class="card"><h3>What is an ER Diagram?</h3><ul><li>A <strong>graphical representation</strong> of data in a database</li><li>Shows <strong>entities</strong>, <strong>relationships</strong>, and <strong>attributes</strong></li><li>No expert knowledge required to read it</li></ul></div>
<div class="card"><h3>Chen Notation Shapes</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Shape</th><th>Represents</th></tr><tr><td>Rectangle</td><td>Entity (e.g. Student, Course)</td></tr><tr><td>Ellipse / Oval</td><td>Attribute of an entity</td></tr><tr><td>Diamond</td><td>Relationship between entities</td></tr><tr><td>Double ellipse</td><td>Multi-valued attribute</td></tr><tr><td>Dashed ellipse</td><td>Derived attribute (calculated)</td></tr><tr><td>Double rectangle</td><td>Weak entity</td></tr><tr><td>Single line</td><td>Partial participation (optional)</td></tr><tr><td>Double line</td><td>Total participation (mandatory)</td></tr></table></div></div>
<div class="card"><h3>Relationship Properties</h3>
  <div class="lec-sub-label">1 · Degree</div><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><td>Unary (1)</td><td>One entity type relates to itself — e.g. Employee manages Employee</td></tr><tr><td>Binary (2)</td><td>Two entity types — most common</td></tr><tr><td>Ternary (3)</td><td>Three entity types in one relationship</td></tr></table></div>
  <div class="lec-sub-label" style="margin-top:14px">2 · Cardinality Ratio</div><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Ratio</th><th>Meaning</th><th>Example</th></tr><tr><td>1:1</td><td>One A ↔ one B</td><td>Employee manages Department</td></tr><tr><td>1:N</td><td>One A → many B</td><td>Department has Employees</td></tr><tr><td>M:N</td><td>Many A ↔ many B</td><td>Student enrolls Course</td></tr></table></div>
  <div class="lec-sub-label" style="margin-top:14px">3 · Participation</div><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><td>Total (double line)</td><td>Every instance MUST participate — mandatory</td></tr><tr><td>Partial (single line)</td><td>Some instances may NOT participate — optional</td></tr></table></div>
  <div class="lec-tip"><strong>How to determine cardinality:</strong> Ask both directions — "Can one A have many B's?" and "Can one B have many A's?"</div>
  <div class="lec-tip" style="margin-top:8px"><strong>How to determine participation:</strong> "Can an X exist without this relationship?" If yes → partial. If no → total.</div>
</div>
<div class="card"><h3>Relationship Attributes</h3><ul><li>Placed on the <strong>diamond</strong> in the ER diagram</li><li>Common in <strong>M:N relationships</strong> — e.g. Grade on Student–enrolls–Course</li><li>Two entities can have <strong>more than one relationship</strong> between them</li></ul></div>
<div class="card"><h3>Crow's Foot Notation</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Symbol</th><th>Meaning</th></tr><tr><td>Fork (three-pronged)</td><td>Many</td></tr><tr><td>Single vertical line</td><td>One</td></tr><tr><td>Circle</td><td>Zero / Optional</td></tr></table></div></div>`,

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
<div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>ER Element</th><th>Maps to</th><th>FK Placement</th></tr><tr><td>Entity</td><td>Table</td><td>—</td></tr><tr><td>Attribute</td><td>Column</td><td>—</td></tr><tr><td>1:1 relationship</td><td>FK in one table</td><td>Total participation side</td></tr><tr><td>1:N relationship</td><td>FK in many-side table</td><td>N-side table</td></tr><tr><td>M:N relationship</td><td>New junction table</td><td>Both FKs in junction</td></tr><tr><td>Relationship attr (1:N)</td><td>Column in many-side table</td><td>—</td></tr><tr><td>Relationship attr (M:N)</td><td>Column in junction table</td><td>—</td></tr></table></div>
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
<div class="card"><h3>Normal Forms Summary</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Form</th><th>Requirement</th><th>Removes</th></tr><tr><td>1NF</td><td>Atomic values, PK defined, no duplicates</td><td>Multi-valued cells</td></tr><tr><td>2NF</td><td>1NF + no partial dependencies</td><td>Partial deps on composite PK</td></tr><tr><td>3NF</td><td>2NF + no transitive dependencies</td><td>Non-key → non-key deps</td></tr><tr><td>BCNF (3.5NF)</td><td>Every determinant is a superkey</td><td>Remaining anomalies</td></tr></table></div></div>
<div class="card">
      <h3>Midterm Example — Full Worked Solution</h3>
      <p style="margin-bottom:10px">Table: <span class="mono">(PROJ_NUM, PROJ_NAME, EMP_NUM, EMP_NAME, JOB_CLASS, CHG_HOUR, HOURS)</span><br>PK = (PROJ_NUM, EMP_NUM) · Given: already in 1NF</p>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Step 1 — 2NF: Remove partial dependencies</div>
      <ul><li>PROJ_NAME depends only on PROJ_NUM → <strong>Project</strong>(PROJ_NUM, PROJ_NAME)</li><li>EMP_NAME, JOB_CLASS, CHG_HOUR depend only on EMP_NUM → <strong>Employee</strong>(EMP_NUM, EMP_NAME, JOB_CLASS, CHG_HOUR)</li><li>HOURS depends on both keys → <strong>Proj_Hours</strong>(PROJ_NUM, EMP_NUM, HOURS)</li></ul>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.1em;margin:12px 0 8px">Step 2 — 3NF: Remove transitive dependencies</div>
      <ul><li>In Employee: JOB_CLASS → CHG_HOUR (transitive!) → split further</li><li><strong>Employee</strong>(EMP_NUM, EMP_NAME, JOB_CLASS)</li><li><strong>Job_Hour_Rates</strong>(JOB_CLASS, CHG_HOUR)</li></ul>
      <div class="lec-tip" style="margin-top:12px"><strong>Final 3NF tables:</strong> Project · Employee · Job_Hour_Rates · Proj_Hours</div>
    </div>`,

  6: `<div class="card"><h3>What is Relational Algebra?</h3><ul><li>A <strong>mathematical language</strong> for querying/processing data</li><li><strong>Theoretical foundation of SQL</strong></li><li>Each operation: input = one or more relations → output = a new relation</li><li>Operations can be <strong>chained</strong></li></ul></div>
<div class="card"><h3>Relational Algebra vs. SQL</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Property</th><th>Relational Algebra</th><th>SQL</th></tr><tr><td>Type</td><td>Procedural (defines steps)</td><td>Declarative (defines what)</td></tr><tr><td>Semantics</td><td>Set — no duplicates, unordered</td><td>Bag — may return duplicates</td></tr><tr><td>Role</td><td>Theoretical foundation</td><td>Practical language</td></tr></table></div></div>
<div class="card"><h3>Core Operations</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Operation</th><th>Symbol</th><th>Description</th></tr><tr><td>Selection</td><td><code>σ (sigma)</code></td><td>Filter ROWS based on condition — horizontal filtering</td></tr><tr><td>Projection</td><td><code>π (pi)</code></td><td>Select specific COLUMNS — vertical filtering, removes duplicates</td></tr><tr><td>Union</td><td><code>∪</code></td><td>Combine rows from two union-compatible relations — no duplicates</td></tr><tr><td>Intersection</td><td><code>∩</code></td><td>Rows that exist in BOTH relations</td></tr><tr><td>Difference</td><td><code>−</code></td><td>Rows in first relation but NOT in second</td></tr><tr><td>Cartesian Product</td><td><code>×</code></td><td>Every row of R combined with every row of S</td></tr><tr><td>Join</td><td><code>⋈</code></td><td>Combine rows from two relations based on a condition</td></tr><tr><td>Rename</td><td><code>ρ (rho)</code></td><td>Rename a relation or its attributes</td></tr></table></div>
<div class="lec-tip"><strong>Key distinction:</strong> σ (Selection) filters ROWS. π (Projection) filters COLUMNS.</div>
</div>
<div class="card"><h3>Tree Representation</h3><ul><li>Algebraic expressions are represented as a <strong>tree</strong></li><li>Leaves = base tables · Root = final result</li><li>Execution: <strong>bottom-up, leaves to root</strong></li><li>Helps understand order of execution — used by query optimizers</li></ul></div>
<div class="card"><h3>Worked Examples</h3>
<div class="lec-sub-label">Example 1 — Find names of employees in Dept 5</div>
<div class="lec-code">π<sub>Name</sub>( σ<sub>DeptNo=5</sub>(Employee) )</div>
<div class="lec-sub-label" style="margin-top:12px">Example 2 — Join Employee with Department</div>
<div class="lec-code">Employee ⋈<sub>DeptNo=DeptID</sub> Department</div>
<div class="lec-tip" style="margin-top:12px"><strong>Read order:</strong> Inner-most operation first. σ filters rows before π projects columns.</div>
</div>
<div class="card"><h3>Union Compatibility</h3><ul><li>For ∪, ∩, − operations: both relations must be <strong>union-compatible</strong></li><li>Union-compatible means: same number of attributes AND matching data types in corresponding positions</li><li>Column names do <strong>not</strong> need to match — only structure and types</li></ul></div>`,

  7: `<div class="card"><h3>SQL Categories</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Category</th><th>Full Name</th><th>Commands</th></tr><tr><td>DDL</td><td>Data Definition Language</td><td>CREATE, ALTER, DROP — database objects</td></tr><tr><td>DML</td><td>Data Manipulation Language</td><td>INSERT, SELECT, UPDATE, DELETE — CRUD on data</td></tr></table></div><div class="lec-tip" style="margin-top:12px"><strong>CRUD:</strong> Create=INSERT · Read=SELECT · Update=UPDATE · Delete=DELETE</div></div>
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
<div class="card"><h3>Database Index</h3><ul><li>A <strong>lookup table</strong> for faster data retrieval</li><li>Stores indexed column in <strong>sorted order</strong> with pointers to actual rows</li><li><strong>Auto-generated</strong> for the Primary Key</li><li><strong>Tradeoff:</strong> faster reads ↔ extra storage (column stored twice) + slightly slower writes</li></ul><div class="lec-rule">Without an index → full table scan needed (read every row). With an index → scan the small sorted index → jump directly to the row via pointer.</div><div class="lec-tip"><strong>CREATE INDEX idx_name ON Table(Column);</strong> — manually create an index on any frequently queried column.</div></div>
<div class="card"><h3>SQL Query Life Cycle</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>SQL Parser</strong> — tokenizes query string, checks syntax, builds parse tree</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Query Analyzer</strong> — semantic checks: valid table/column names? correct data types?</div></div>
<div class="lec-step"><div class="lec-step-n">3</div><div class="lec-step-t"><strong>Query Optimizer</strong> — enumerates alternative plans, estimates cost, selects <strong>minimum cost plan</strong></div></div>
<div class="lec-step"><div class="lec-step-n">4</div><div class="lec-step-t"><strong>Execution Engine</strong> — executes the chosen plan, returns results</div></div>
<div class="lec-tip"><strong>Order to memorize:</strong> Parser → Analyzer → Optimizer → Execution Engine</div>
</div>`,

  8: `<div class="card"><h3>Join Algorithms — Comparison</h3><div class="lec-tbl-wrap"><table class="lec-tbl"><tr><th>Algorithm</th><th>How it works</th><th>Best when</th><th>Speed</th></tr><tr><td>Nested Loop Join (NLJ)</td><td>For every outer row, scan entire inner table</td><td>Small tables only</td><td>Worst — O(outer × inner)</td></tr><tr><td>Index NLJ</td><td>Like NLJ but uses index on inner table</td><td>Index exists on inner join column</td><td>Better than NLJ</td></tr><tr><td>Merge Join</td><td>Both sorted → single pass each</td><td>Both inputs already sorted / large data</td><td>Fastest for sorted data</td></tr><tr><td>Hash Join</td><td>Build hash table from inner → probe with outer</td><td>Large unsorted tables</td><td>Single pass — efficient</td></tr></table></div></div>
<div class="lec-grid2">
<div class="card"><h3>Merge Join</h3><ul><li>Requires <strong>both inputs sorted</strong> on join column</li><li>Scans each input <strong>exactly once</strong></li><li>If not sorted, sort first then merge</li><li>Fastest for large sorted datasets</li></ul></div>
<div class="card"><h3>Hash Join</h3>
<div class="lec-step"><div class="lec-step-n">1</div><div class="lec-step-t"><strong>Build:</strong> scan inner (smaller) table → build hash table</div></div>
<div class="lec-step"><div class="lec-step-n">2</div><div class="lec-step-t"><strong>Probe:</strong> scan outer table → probe hash table for matches</div></div>
<p style="margin-top:8px;font-size:13px;color:var(--t2)">Optimizer always puts <strong>smaller table as inner</strong> to fit in memory.</p>
</div>
</div>
<div class="lec-tip"><strong>NLJ tip:</strong> Use smaller table as outer to minimize inner scans. <strong>Merge vs Hash:</strong> Both single-pass. Merge needs sorted data. Hash works on unsorted.</div>`,

  9: `<div class="card"><h3>Aggregation</h3><p>Combining and <strong>summarizing multiple records</strong> into a single result based on criteria.</p><div class="lec-tbl-wrap"><table class="lec-tbl" style="margin-top:12px"><tr><th>Function</th><th>Description</th></tr><tr><td>COUNT()</td><td>Count rows / non-null values</td></tr><tr><td>SUM()</td><td>Total sum of a numeric column</td></tr><tr><td>AVG()</td><td>Average value</td></tr><tr><td>MIN()</td><td>Minimum value</td></tr><tr><td>MAX()</td><td>Maximum value</td></tr></table></div></div>
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
