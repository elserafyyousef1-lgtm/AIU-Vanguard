// src/lib/data/cse221.ts
// Complete Database Systems content — extracted from CSE221-Premium_ULTRA

import type { Lecture, Question, FlashCard } from '@/types'

// ═══════════════════════════════════════════════════════════
// AI SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════
export const CSE221_AI_PROMPT = `You are a helpful AI assistant specialized in CSE221 Database Systems at Alamein International University, taught by Dr. Abdallah Hassan.

You help students understand:
- Database concepts (relations, tuples, attributes, redundancy, inconsistency)
- ER Diagrams (Chen notation, cardinality, participation, degree, entity types)
- Keys (superkey, candidate key, primary key, alternate key, foreign key, surrogate key, natural key)
- ER-to-Relational Mapping (1:1, 1:N, M:N, relationship attributes, junction tables)
- Normalization (1NF, 2NF, 3NF, BCNF — full definitions + worked examples)
- Relational Algebra (σ, π, ∪, ∩, −, ×, ⋈, ρ — procedural vs declarative)
- Relational Algebra query trees (leaf tables at the bottom, operators applied bottom-up, result at the root)
- Union Compatibility (∪, ∩, − require the same number of attributes with matching domains, in the same order)
- SQL (DDL vs DML, CRUD, index tradeoffs)
- Database Index internals (an index avoids a full table scan: read a small sorted structure then jump straight to the row; faster reads ↔ extra storage + slightly slower writes)
- Full worked Normalization midterm (decomposing an unnormalized table with partial & transitive dependencies down to 3NF, listing every final table)
- SQL Query Life Cycle (Parser → Analyzer → Optimizer → Execution Engine)
- Join Algorithms (NLJ, Index NLJ, Merge Join, Hash Join — how each works + when to use)
- Aggregation (sort-based vs hash-based, COUNT/SUM/AVG/MIN/MAX)

RULES:
1. If the student writes in Arabic, respond ONLY in Arabic
2. If the student writes in English, respond ONLY in English
3. Be concise, clear, use examples and bullet points
4. Always be encouraging and friendly
5. Highlight exam tips when relevant`

// ═══════════════════════════════════════════════════════════
// LECTURES METADATA (9 lectures across 2 groups)
// ═══════════════════════════════════════════════════════════
export const CSE221_LECTURES: Lecture[] = [
  {
    id: 'CSE221-L1', courseSlug: 'CSE221', number: 1,
    title: 'Intro to DBs',
    description: 'Database concepts, DBMS benefits, redundancy vs inconsistency, why we split data',
    concepts: [],
  },
  {
    id: 'CSE221-L2', courseSlug: 'CSE221', number: 2,
    title: 'ER Diagrams',
    description: 'Chen notation shapes, cardinality ratios, participation, Crow\'s Foot notation',
    concepts: [],
  },
  {
    id: 'CSE221-L3', courseSlug: 'CSE221', number: 3,
    title: 'Keys',
    description: 'Superkey → Candidate key → Primary key hierarchy, foreign keys, surrogate keys',
    concepts: [],
  },
  {
    id: 'CSE221-L4', courseSlug: 'CSE221', number: 4,
    title: 'ER-to-Relational Mapping',
    description: 'Converting ER diagrams to relational schemas for 1:1, 1:N, and M:N relationships',
    concepts: [],
  },
  {
    id: 'CSE221-L5', courseSlug: 'CSE221', number: 5,
    title: 'Normalization',
    description: '1NF, 2NF, 3NF, BCNF — functional dependencies and decomposition',
    concepts: [],
  },
  {
    id: 'CSE221-L6', courseSlug: 'CSE221', number: 6,
    title: 'Relational Algebra',
    description: 'σ (select), π (project), ∪, ∩, −, × (Cartesian), ⋈ (join), ρ (rename)',
    concepts: [],
  },
  {
    id: 'CSE221-L7', courseSlug: 'CSE221', number: 7,
    title: 'Indexes & SQL',
    description: 'DDL vs DML, CRUD operations, index types, query life cycle',
    concepts: [],
  },
  {
    id: 'CSE221-L8', courseSlug: 'CSE221', number: 8,
    title: 'Join Algorithms',
    description: 'Nested Loop Join, Index NLJ, Merge Join, Hash Join — when and how',
    concepts: [],
  },
  {
    id: 'CSE221-L9', courseSlug: 'CSE221', number: 9,
    title: 'Aggregation',
    description: 'Sort-based vs hash-based aggregation, COUNT/SUM/AVG/MIN/MAX, GROUP BY',
    concepts: [],
  },
]

// ═══════════════════════════════════════════════════════════
// EXAM QUESTIONS — 60 Questions (MCQ + T/F)
// Source: CSE221-Premium_ULTRA html file
// ═══════════════════════════════════════════════════════════
export const CSE221_QUESTIONS: Question[] = [
  {n:1, q:"What are the two main benefits of using a database?", t:'mcq',
   opts:["Graphical interface and internet connectivity","Efficient storage of large amounts of data and fast retrieval/updating","Free hosting and automatic backups","Programming language support and virus protection"],
   c:'b', f:"The two core benefits: efficient storage of large amounts of data AND fast retrieval/updating.", tag:"Lec 1"},
  {n:2, q:'True or False: "Redundancy is the existence of two or more conflicting values for the same data item."', t:'tf',
   c:false, f:"False. That describes INCONSISTENCY. Redundancy = storing the same data more than once.", tag:"Lec 1"},
  {n:3, q:"Which of the following best describes a DBMS?", t:'mcq',
   opts:["A hardware device for storing data","Software that manages and controls database access","A type of programming language","A network protocol for data transfer"],
   c:'b', f:"A DBMS (Database Management System) is software that manages databases — handles storage, retrieval, security, and concurrent access.", tag:"Lec 1"},
  {n:4, q:'True or False: "Redundancy always causes inconsistency."', t:'tf',
   c:false, f:"False. Redundancy can exist without inconsistency (e.g., two identical copies). But redundancy makes inconsistency easy to occur and hard to detect.", tag:"Lec 1"},
  {n:5, q:"In Chen notation, what shape represents an Entity?", t:'mcq',
   opts:["Ellipse","Diamond","Rectangle","Double ellipse"],
   c:'c', f:"Rectangle = Entity (e.g. Student, Course). Ellipse = Attribute. Diamond = Relationship.", tag:"Lec 2"},
  {n:6, q:"What does a Double Ellipse represent in an ER diagram?", t:'mcq',
   opts:["A primary key","A derived attribute","A multi-valued attribute","A weak entity"],
   c:'c', f:"Double Ellipse = Multi-valued attribute (e.g. phone numbers — a person can have multiple).", tag:"Lec 2"},
  {n:7, q:"In a 1:N relationship, one entity on the '1' side can be associated with how many entities on the 'N' side?", t:'mcq',
   opts:["Exactly one","Zero or one","Many","None"],
   c:'c', f:"1:N means one entity on the '1' side can relate to many entities on the 'N' side. Example: One Department has many Employees.", tag:"Lec 2"},
  {n:8, q:'True or False: "Total participation means every instance of an entity must participate in the relationship."', t:'tf',
   c:true, f:"True. Total participation (double line in Chen notation) means every instance MUST be involved in the relationship — it is mandatory.", tag:"Lec 2"},
  {n:9, q:"What is a Candidate Key?", t:'mcq',
   opts:["Any attribute that uniquely identifies rows","A minimal superkey — no attribute can be removed without losing uniqueness","The primary key of a related table","A key with NULL values allowed"],
   c:'b', f:"Candidate Key = minimal superkey. It must uniquely identify every row AND be minimal (no subset of it is also a superkey).", tag:"Lec 3"},
  {n:10, q:'True or False: "Every primary key is a candidate key."', t:'tf',
   c:true, f:"True. The primary key is chosen FROM the set of candidate keys. So every PK is a CK, but not every CK becomes the PK.", tag:"Lec 3"},
  {n:11, q:"What is a Superkey?", t:'mcq',
   opts:["Only the primary key","Any set of attributes that can uniquely identify a row — may have redundant attributes","A key with no NULL values","A foreign key referencing itself"],
   c:'b', f:"Superkey = any combination of attributes that guarantees uniqueness. {StudentID, Name} is a superkey even if StudentID alone would suffice.", tag:"Lec 3"},
  {n:12, q:"An Alternate Key is:", t:'mcq',
   opts:["A key with duplicate values","A candidate key that was NOT chosen as the primary key","A foreign key in another table","A composite key"],
   c:'b', f:"Alternate Key = any candidate key that was not selected as the primary key. It still uniquely identifies rows.", tag:"Lec 3"},
  {n:13, q:"In ER-to-Relational mapping for a 1:N relationship, the foreign key is placed in:", t:'mcq',
   opts:["The '1' side table","The 'N' side table","A new junction table","Both tables"],
   c:'b', f:"For 1:N: FK goes in the 'N' side (the 'many' side) referencing the PK of the '1' side. Example: Employee table has DeptID (FK to Department).", tag:"Lec 4"},
  {n:14, q:"An M:N relationship in ER-to-Relational mapping creates:", t:'mcq',
   opts:["No new tables","One extra column in each table","A new junction/bridge table with FKs to both sides","A composite key in one table"],
   c:'c', f:"M:N always creates a new junction table containing the PKs of both entities as foreign keys (and optionally relationship attributes).", tag:"Lec 4"},
  {n:15, q:'True or False: "In a 1:1 relationship mapping, the FK can go in either table."', t:'tf',
   c:true, f:"True. For 1:1 you can place the FK in either table — typically choose the table with total participation to avoid NULLs.", tag:"Lec 4"},
  {n:16, q:"First Normal Form (1NF) requires:", t:'mcq',
   opts:["No transitive dependencies","No partial dependencies","All attributes are atomic (no repeating groups or multi-valued attributes)","All attributes depend on the whole primary key"],
   c:'c', f:"1NF: every cell must hold one atomic value. No arrays, no comma-separated lists, no repeating column groups.", tag:"Lec 5"},
  {n:17, q:"A table is in 2NF if it is in 1NF AND:", t:'mcq',
   opts:["Has no transitive dependencies","Every non-key attribute is fully functionally dependent on the entire primary key (no partial dependencies)","Has a single-column primary key","Has no NULL values"],
   c:'b', f:"2NF eliminates PARTIAL dependencies — where a non-key attribute depends only on PART of a composite PK, not all of it.", tag:"Lec 5"},
  {n:18, q:"3NF eliminates which type of dependency?", t:'mcq',
   opts:["Partial dependency","Multi-valued dependency","Transitive dependency (non-key attribute depending on another non-key attribute)","Join dependency"],
   c:'c', f:"3NF: no transitive dependencies. A → B → C is transitive; B and C should be in a separate table.", tag:"Lec 5"},
  {n:19, q:'True or False: "Every BCNF table is also in 3NF."', t:'tf',
   c:true, f:"True. BCNF is stricter than 3NF. BCNF ⊂ 3NF: if a table satisfies BCNF it automatically satisfies 3NF.", tag:"Lec 5"},
  {n:20, q:"In Relational Algebra, the σ (sigma) operator performs:", t:'mcq',
   opts:["Projection (selecting columns)","Selection (filtering rows by a condition)","Natural join","Set union"],
   c:'b', f:"σ (Selection) filters ROWS. π (Projection) filters COLUMNS. Remember: σ = SQL WHERE clause equivalent.", tag:"Lec 6"},
  {n:21, q:"The π (pi) operator in Relational Algebra:", t:'mcq',
   opts:["Filters rows based on a condition","Projects (selects) specific columns and removes duplicates","Performs a Cartesian product","Renames a relation"],
   c:'b', f:"π (Projection) selects which COLUMNS to keep and removes duplicate rows from the result.", tag:"Lec 6"},
  {n:22, q:'True or False: "The Cartesian product (×) of two relations R(3 rows) and S(4 rows) produces 7 rows."', t:'tf',
   c:false, f:"False. Cartesian product multiplies: 3 × 4 = 12 rows. Every row from R is paired with every row from S.", tag:"Lec 6"},
  {n:23, q:"What does the ρ (rho) operator do in Relational Algebra?", t:'mcq',
   opts:["Removes duplicate tuples","Renames a relation or its attributes","Computes the intersection of two relations","Performs a theta join"],
   c:'b', f:"ρ (Rename) operator renames a relation and/or its attributes. Useful when doing self-joins or disambiguating attribute names.", tag:"Lec 6"},
  {n:24, q:"DDL in SQL stands for:", t:'mcq',
   opts:["Data Display Language","Data Definition Language","Dynamic Data Logic","Database Deployment Language"],
   c:'b', f:"DDL = Data Definition Language — CREATE, ALTER, DROP. These commands define the structure/schema. DML = Data Manipulation Language — SELECT, INSERT, UPDATE, DELETE.", tag:"Lec 7"},
  {n:25, q:"What is the correct order of the SQL Query Life Cycle?", t:'mcq',
   opts:["Optimizer → Parser → Analyzer → Execution Engine","Parser → Optimizer → Analyzer → Execution Engine","Parser → Analyzer → Optimizer → Execution Engine","Analyzer → Parser → Execution Engine → Optimizer"],
   c:'c', f:"SQL Life Cycle: Parser (syntax check) → Analyzer (semantic check, validate tables/columns exist) → Optimizer (choose best execution plan) → Execution Engine (run it).", tag:"Lec 7"},
  {n:26, q:'True or False: "An index always speeds up both read and write operations."', t:'tf',
   c:false, f:"False. Indexes speed up READ operations (SELECT) but SLOW DOWN writes (INSERT/UPDATE/DELETE) because the index must also be updated. It is a deliberate tradeoff.", tag:"Lec 7"},
  {n:27, q:"Which Join Algorithm is most efficient when both tables have an index on the join attribute?", t:'mcq',
   opts:["Nested Loop Join (NLJ)","Index Nested Loop Join","Sort-Merge Join","Hash Join"],
   c:'b', f:"Index NLJ uses the index on the inner table to avoid full scans — O(n log n) instead of O(n²). Best when one table is small and the other has an index.", tag:"Lec 8"},
  {n:28, q:"Hash Join works best when:", t:'mcq',
   opts:["Both tables are pre-sorted","There is an index on the join column","Both tables fit in memory and there is no useful index","Tables are very large and disk-based"],
   c:'c', f:"Hash Join builds a hash table from the smaller relation, then probes it with the larger. Best for large unsorted tables with no index, and when memory is sufficient.", tag:"Lec 8"},
  {n:29, q:"Sort-Merge Join requires:", t:'mcq',
   opts:["An index on both join columns","Both relations to be sorted on the join attribute","A hash table built from the smaller relation","Nested iteration through all rows"],
   c:'b', f:"Sort-Merge Join: sort both relations on the join attribute first, then merge them. Efficient if data is already sorted or sort is cheap.", tag:"Lec 8"},
  {n:30, q:'True or False: "Hash-based aggregation is more efficient than sort-based aggregation when the data is already sorted."', t:'tf',
   c:false, f:"False. If data is already sorted on the grouping attribute, sort-based aggregation is more efficient — no extra work needed. Hash-based shines on unsorted data.", tag:"Lec 9"},
  {n:31, q:"Which aggregation method maintains a running count per group as it scans sorted data?", t:'mcq',
   opts:["Hash-based aggregation","Sort-based aggregation","Index-based aggregation","Nested Loop aggregation"],
   c:'b', f:"Sort-based aggregation: data is sorted on group-by attribute, so matching rows are adjacent — maintain running aggregates and emit when group changes.", tag:"Lec 9"},
  {n:32, q:"In SQL, AVG(salary) ignores:", t:'mcq',
   opts:["Zero values","Negative values","NULL values","Duplicate values"],
   c:'c', f:"All aggregate functions (AVG, SUM, COUNT(*) excluded) ignore NULL values. COUNT(*) counts all rows; COUNT(col) ignores NULLs in that column.", tag:"Lec 9"},
  {n:33, q:"A Weak Entity in an ER diagram:", t:'mcq',
   opts:["Has no attributes","Cannot exist without its owner/parent entity","Has a composite primary key","Can only participate in 1:1 relationships"],
   c:'b', f:"Weak Entity: has no PK of its own — it depends on a parent (owner) entity for identification. Represented by a double rectangle.", tag:"Lec 2"},
  {n:34, q:"A Derived Attribute in an ER diagram is represented by:", t:'mcq',
   opts:["Double ellipse","Dashed ellipse","Double rectangle","Underlined attribute"],
   c:'b', f:"Dashed Ellipse = Derived Attribute (calculated from other data, e.g. Age derived from DOB). Double Ellipse = Multi-valued.", tag:"Lec 2"},
  {n:35, q:'True or False: "A natural key is a surrogate key created by the database system."', t:'tf',
   c:false, f:"False. Natural key = real-world meaningful attribute used as PK (e.g. StudentID, ISBN). Surrogate key = system-generated artificial key (e.g. auto-increment ID).", tag:"Lec 3"},
  {n:36, q:"BCNF is violated when:", t:'mcq',
   opts:["There is a partial dependency","A non-key attribute determines part of the PK","A determinant (left side of FD) is NOT a superkey","There are multi-valued dependencies"],
   c:'c', f:"BCNF: for every non-trivial FD X → Y, X must be a superkey. If any determinant is not a superkey, BCNF is violated.", tag:"Lec 5"},
  {n:37, q:"The difference between 3NF and BCNF is:", t:'mcq',
   opts:["3NF allows partial dependencies","BCNF allows transitive dependencies","3NF allows some FDs where the determinant is not a superkey (if the dependent is a prime attribute); BCNF does not","There is no difference"],
   c:'c', f:"3NF exception: allows A → B if B is a prime attribute (part of some candidate key). BCNF is stricter — no exceptions, every determinant must be a superkey.", tag:"Lec 5"},
  {n:38, q:"In Relational Algebra, the Natural Join (⋈) differs from Cartesian Product (×) because:", t:'mcq',
   opts:["Natural Join only works on sorted relations","Natural Join automatically joins on common attribute names and removes duplicate columns","Natural Join requires explicit join conditions","Natural Join produces more rows than Cartesian Product"],
   c:'b', f:"Natural Join = Cartesian product + filter on matching values of common-named attributes + remove one duplicate column. Much more useful than raw ×.", tag:"Lec 6"},
  {n:39, q:"Which SQL command is used to add new rows to a table?", t:'mcq',
   opts:["UPDATE","CREATE","INSERT","ADD"],
   c:'c', f:"INSERT INTO table_name VALUES (...) or INSERT INTO table_name (col1, col2) VALUES (val1, val2). INSERT is DML.", tag:"Lec 7"},
  {n:40, q:'True or False: "The SQL Optimizer always chooses the plan with the fewest operations."', t:'tf',
   c:false, f:"False. The Optimizer chooses the CHEAPEST plan based on cost estimation (I/O, CPU, memory) — not necessarily the fewest operations. Fewer operations can sometimes be more expensive.", tag:"Lec 7"},
  {n:41, q:"Nested Loop Join (NLJ) has a time complexity of approximately:", t:'mcq',
   opts:["O(n + m)","O(n log n)","O(n × m)","O(n²/m)"],
   c:'c', f:"Basic NLJ: for every row in outer table, scan entire inner table → O(n × m). Very expensive for large tables, hence Index NLJ, Merge Join, and Hash Join exist.", tag:"Lec 8"},
  {n:42, q:"Which aggregate function returns the number of NON-NULL values in a column?", t:'mcq',
   opts:["COUNT(*)","COUNT(column_name)","SUM(column_name)","TOTAL(column_name)"],
   c:'b', f:"COUNT(column) counts NON-NULL values. COUNT(*) counts all rows including NULLs. There is no TOTAL() in standard SQL.", tag:"Lec 9"},
  {n:43, q:"A Foreign Key enforces:", t:'mcq',
   opts:["Entity integrity","Referential integrity","Domain integrity","User-defined integrity"],
   c:'b', f:"FK enforces Referential Integrity — every value in the FK column must either be NULL or match an existing PK value in the referenced table.", tag:"Lec 3"},
  {n:44, q:'True or False: "In ER-to-Relational mapping, relationship attributes of an M:N relationship go into the junction table."', t:'tf',
   c:true, f:"True. Relationship attributes (e.g. Grade on Student-enrolls-Course) are placed in the junction/bridge table since they describe the relationship, not either entity alone.", tag:"Lec 4"},
  {n:45, q:"Entity Integrity rule states that:", t:'mcq',
   opts:["Every table must have a FK","No primary key attribute can be NULL","All attributes must be atomic","FKs must always reference existing rows"],
   c:'b', f:"Entity Integrity: PK values must be unique AND NOT NULL. A NULL PK would mean we cannot uniquely identify that row.", tag:"Lec 3"},
  {n:46, q:"In the context of functional dependencies, A → B means:", t:'mcq',
   opts:["A is determined by B","For each value of A, there is exactly one value of B","A and B always have the same value","B can have multiple values for one A"],
   c:'b', f:"A → B (A functionally determines B): knowing A's value tells you exactly one B value. Example: StudentID → StudentName.", tag:"Lec 5"},
  {n:47, q:"Which normal form specifically deals with multi-valued dependencies?", t:'mcq',
   opts:["1NF","3NF","BCNF","4NF"],
   c:'d', f:"4NF deals with multi-valued dependencies (MVDs). Beyond the scope of most intro courses but: A ↠ B means for each A, there's a set of B values independent of other attributes.", tag:"Lec 5"},
  {n:48, q:'True or False: "The σ (selection) operator in Relational Algebra can reduce the number of columns in a result."', t:'tf',
   c:false, f:"False. σ (Selection) only filters ROWS. It never changes the number of columns. Use π (Projection) to reduce columns.", tag:"Lec 6"},
  {n:49, q:"What is the result of R ∩ S in Relational Algebra?", t:'mcq',
   opts:["All tuples in R plus all tuples in S","Only tuples that appear in both R and S","All tuples in R that don't appear in S","A Cartesian product of R and S"],
   c:'b', f:"∩ (Intersection): tuples that are in BOTH R and S. Like SQL INTERSECT. Requires R and S to be union-compatible (same schema).", tag:"Lec 6"},
  {n:50, q:"Hash-based aggregation is preferred when:", t:'mcq',
   opts:["Data is already sorted on the GROUP BY attribute","Memory is very limited","Data is large, unsorted, and there is enough memory for a hash table","The number of groups is exactly 1"],
   c:'c', f:"Hash-based aggregation: build a hash table keyed on GROUP BY attributes, accumulate aggregates per bucket. Best for large unsorted data with adequate memory.", tag:"Lec 9"},
  {n:51, q:"The degree of a relationship in ER diagrams refers to:", t:'mcq',
   opts:["The number of instances participating","The number of entity types involved in the relationship","The cardinality ratio (1:1, 1:N, M:N)","The number of attributes on the relationship"],
   c:'b', f:"Degree = number of entity types involved. Unary (1) = recursive. Binary (2) = most common. Ternary (3) = three entity types.", tag:"Lec 2"},
  {n:52, q:'True or False: "A table with a single-column primary key is automatically in 2NF."', t:'tf',
   c:true, f:"True. Partial dependency only makes sense with a COMPOSITE PK (multiple columns). A single-column PK means all non-key attributes trivially depend on the whole key.", tag:"Lec 5"},
  {n:53, q:"In SQL, the ALTER TABLE command belongs to:", t:'mcq',
   opts:["DML (Data Manipulation Language)","DCL (Data Control Language)","DDL (Data Definition Language)","TCL (Transaction Control Language)"],
   c:'c', f:"ALTER TABLE is DDL — it modifies the structure/schema (add/drop/modify columns, add constraints). DDL also includes CREATE and DROP.", tag:"Lec 7"},
  {n:54, q:"What is the main advantage of Index Nested Loop Join over basic NLJ?", t:'mcq',
   opts:["It uses less memory","It avoids full scans of the inner table by using an index lookup","It works without any indexes","It produces sorted output"],
   c:'b', f:"Index NLJ: instead of scanning the entire inner table for each outer row, it uses an index to jump directly to matching rows — reducing cost from O(n×m) to O(n log m).", tag:"Lec 8"},
  {n:55, q:"Which of the following is true about the SQL Parser stage?", t:'mcq',
   opts:["It checks if referenced tables and columns exist","It chooses the optimal execution plan","It checks the query for syntax errors and tokenizes it","It executes the query and returns results"],
   c:'c', f:"Parser: tokenizes the SQL string and checks syntax (grammar). It does NOT check if tables/columns exist — that's the Analyzer's job.", tag:"Lec 7"},
  {n:56, q:'True or False: "In Relational Algebra, Set Difference R − S returns tuples in R that are not in S."', t:'tf',
   c:true, f:"True. R − S = rows in R that do NOT appear in S. Requires union compatibility. Equivalent to SQL's EXCEPT.", tag:"Lec 6"},
  {n:57, q:"A composite key is:", t:'mcq',
   opts:["A key made of two or more attributes that together uniquely identify a row","A key that references another table","A key generated by the database system","A key that allows NULL values"],
   c:'a', f:"Composite Key = PK made of 2+ attributes. Neither attribute alone is unique enough; combined they guarantee uniqueness. Common in junction tables.", tag:"Lec 3"},
  {n:58, q:"Which join type in SQL returns all rows from the left table and matching rows from the right (NULLs for no match)?", t:'mcq',
   opts:["INNER JOIN","RIGHT OUTER JOIN","LEFT OUTER JOIN","CROSS JOIN"],
   c:'c', f:"LEFT OUTER JOIN: all rows from LEFT table, matching rows from RIGHT. If no match, RIGHT side columns are NULL.", tag:"Lec 8"},
  {n:59, q:'True or False: "COUNT(*) and COUNT(column) always return the same value."', t:'tf',
   c:false, f:"False. COUNT(*) counts ALL rows (including NULLs). COUNT(column) counts only NON-NULL values in that column. If the column has NULLs, the counts differ.", tag:"Lec 9"},
  {n:60, q:"What problem does normalization primarily solve?", t:'mcq',
   opts:["Slow query execution","Update anomalies, insert anomalies, and delete anomalies caused by redundancy","Lack of indexes","Missing foreign key constraints"],
   c:'b', f:"Normalization eliminates data redundancy and the anomalies it causes: UPDATE anomaly (must change many rows), INSERT anomaly (can't insert without unrelated data), DELETE anomaly (deleting loses unrelated data).", tag:"Lec 5"},
]

// ═══════════════════════════════════════════════════════════
// QUICK CHIPS (AI starter questions)
// ═══════════════════════════════════════════════════════════
export const CSE221_QUICK_CHIPS = [
  'فرق Redundancy وInconsistency؟',
  'Explain BCNF with example',
  'متى نستخدم Hash Join؟',
  'Steps for ER-to-Relational mapping?',
  'فرق 2NF و 3NF؟',
  'What are the SQL aggregate functions?',
]
