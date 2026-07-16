// src/lib/data/mat312.ts
// Complete Differential Equations content — from MAT312-Premium

import type { Lecture, Question, FlashCard } from '@/types'

// ═══════════════════════════════════════════════════════════
// LECTURES — 9 Sheets
// ═══════════════════════════════════════════════════════════
export const MAT312_LECTURES: Lecture[] = [
  { id:'MAT312-S1', courseSlug:'MAT312', number:1, title:'Separable Equations',
    description:'Order, degree, linearity; separating variables; IVPs', concepts:[] },
  { id:'MAT312-S2', courseSlug:'MAT312', number:2, title:'Linear 1st-Order & Bernoulli',
    description:'Integrating factor method; Bernoulli substitution z=y^(1-n)', concepts:[] },
  { id:'MAT312-S3', courseSlug:'MAT312', number:3, title:'Exact Equations',
    description:'∂M/∂y = ∂N/∂x test; finding potential function F(x,y)', concepts:[] },
  { id:'MAT312-S4', courseSlug:'MAT312', number:4, title:'Homogeneous DEs & Substitutions',
    description:'v=y/x substitution; reduction to separable form', concepts:[] },
  { id:'MAT312-S5', courseSlug:'MAT312', number:5, title:'2nd-Order Const. Coefficients',
    description:'Characteristic equation; real/complex/repeated roots; variation of parameters', concepts:[] },
  { id:'MAT312-S6', courseSlug:'MAT312', number:6, title:'Cauchy-Euler & Reduction of Order',
    description:'ax²y\'\' + bxy\' + cy = 0; y=x^m substitution; reduction of order method', concepts:[] },
  { id:'MAT312-S7', courseSlug:'MAT312', number:7, title:'Laplace Transforms',
    description:'Definition, linearity, transforms of common functions, s-shifting', concepts:[] },
  { id:'MAT312-S8', courseSlug:'MAT312', number:8, title:'Inverse Laplace & Fourier Series',
    description:'Partial fractions, convolution theorem, Fourier series for periodic functions', concepts:[] },
  { id:'MAT312-S9', courseSlug:'MAT312', number:9, title:'Power Series & Special Topics',
    description:'Ordinary/singular points, radius of convergence, Frobenius method', concepts:[] },
]

// ═══════════════════════════════════════════════════════════
// FLASHCARDS — 43 cards
// ═══════════════════════════════════════════════════════════
export const MAT312_FLASHCARDS: FlashCard[] = [
  { t:"1st-Order Separable", i:[
    {k:"Method", v:" Separate dy/g(y)=f(x)dx, then integrate"},
    {k:"GS", v:" ∫dy/g(y) = ∫f(x)dx + C"},
    {k:"Singular", v:" Check g(y₀)=0 separately"},
  ]},
  { t:"Linear 1st-Order", i:[
    {k:"Form", v:" y' + P(x)y = Q(x)"},
    {k:"IF", v:" μ = e^(∫P dx)"},
    {k:"Solution", v:" y = (1/μ)(∫μQ dx + C)"},
  ]},
  { t:"Bernoulli Equation", i:[
    {k:"Form", v:" y' + Py = Qyⁿ"},
    {k:"Substitution", v:" z = y^(1-n)"},
    {k:"New DE", v:" z' + (1-n)Pz = (1-n)Q"},
  ]},
  { t:"Exact Equations", i:[
    {k:"Test", v:" ∂M/∂y = ∂N/∂x"},
    {k:"F from M", v:" F = ∫M dx + g(y)"},
    {k:"Find g(y)", v:" ∂F/∂y = N → solve for g'(y)"},
  ]},
  { t:"Homogeneous DE", i:[
    {k:"Test", v:" f(tx,ty) = f(x,y)"},
    {k:"Sub", v:" v = y/x → y = vx, y' = v + xv'"},
    {k:"Result", v:" Separable DE in v and x"},
  ]},
  { t:"2nd-Order Const. Coefficients", i:[
    {k:"Eq", v:" ay'' + by' + cy = 0"},
    {k:"Char. Eq.", v:" ar² + br + c = 0"},
    {k:"Roots", v:" r₁, r₂"},
  ]},
  { t:"Real Distinct Roots", i:[
    {k:"Condition", v:" b²-4ac > 0"},
    {k:"GS", v:" y = C₁e^(r₁x) + C₂e^(r₂x)"},
  ]},
  { t:"Repeated Root", i:[
    {k:"Condition", v:" b²-4ac = 0"},
    {k:"Root", v:" r = -b/(2a)"},
    {k:"GS", v:" y = (C₁ + C₂x)e^(rx)"},
  ]},
  { t:"Complex Roots", i:[
    {k:"Condition", v:" b²-4ac < 0"},
    {k:"Roots", v:" r = α ± βi"},
    {k:"GS", v:" y = e^(αx)(C₁cos βx + C₂sin βx)"},
  ]},
  { t:"Variation of Parameters", i:[
    {k:"Use when", v:" RHS is not in undetermined coefficients list"},
    {k:"Wronskian", v:" W = y₁y₂' - y₂y₁'"},
    {k:"yₚ", v:" -y₁∫(y₂g/W)dx + y₂∫(y₁g/W)dx"},
  ]},
  { t:"Cauchy-Euler", i:[
    {k:"Form", v:" ax²y'' + bxy' + cy = 0"},
    {k:"Sub", v:" y = x^m"},
    {k:"Char. Eq.", v:" am(m-1) + bm + c = 0"},
  ]},
  { t:"Laplace Transform Def.", i:[
    {k:"Def", v:" L{f(t)} = ∫₀^∞ e^(-st)f(t)dt"},
    {k:"L{1}", v:" 1/s"},
    {k:"L{eᵃᵗ}", v:" 1/(s-a)"},
    {k:"L{tⁿ}", v:" n!/s^(n+1)"},
  ]},
  { t:"Laplace — Trig", i:[
    {k:"L{sin at}", v:" a/(s²+a²)"},
    {k:"L{cos at}", v:" s/(s²+a²)"},
    {k:"L{sinh at}", v:" a/(s²-a²)"},
    {k:"L{cosh at}", v:" s/(s²-a²)"},
  ]},
  { t:"s-Shifting Theorem", i:[
    {k:"Rule", v:" L{eᵃᵗf(t)} = F(s-a)"},
    {k:"Use", v:" Shift s by a in F(s)"},
  ]},
  { t:"Laplace Derivatives", i:[
    {k:"L{f'}", v:" sF(s) - f(0)"},
    {k:"L{f''}", v:" s²F(s) - sf(0) - f'(0)"},
    {k:"L{f^(n)}", v:" sⁿF(s) - sⁿ⁻¹f(0) - ... - f^(n-1)(0)"},
  ]},
  { t:"Fourier Series", i:[
    {k:"Form", v:" f(x) = a₀/2 + Σ(aₙcos(nπx/L) + bₙsin(nπx/L))"},
    {k:"a₀", v:" (1/L)∫₋ₗᴸ f(x)dx"},
    {k:"aₙ", v:" (1/L)∫₋ₗᴸ f(x)cos(nπx/L)dx"},
    {k:"bₙ", v:" (1/L)∫₋ₗᴸ f(x)sin(nπx/L)dx"},
  ]},
  { t:"Even / Odd Functions", i:[
    {k:"Even", v:" f(-x) = f(x) → only cosine terms (bₙ=0)"},
    {k:"Odd", v:" f(-x) = -f(x) → only sine terms (aₙ=0)"},
  ]},
  { t:"Power Series Solution", i:[
    {k:"Assume", v:" y = Σ aₙxⁿ"},
    {k:"Ordinary pt", v:" Series converges; use power series directly"},
    {k:"Regular sing.", v:" Use Frobenius: y = xʳΣaₙxⁿ"},
  ]},
  { t:"Ordinary vs Singular Point", i:[
    {k:"Ordinary", v:" P(x)≠0 at x₀; series solution always works"},
    {k:"Regular Singular", v:" (x-x₀)P, (x-x₀)²Q analytic at x₀"},
    {k:"Irregular Singular", v:" Does not satisfy regular singular conditions"},
  ]},
  { t:"Reduction of Order", i:[
    {k:"Use when", v:" One solution y₁ is known"},
    {k:"Sub", v:" y₂ = v(x)·y₁"},
    {k:"Reduces to", v:" 1st-order DE in v'"},
  ]},
]

// ═══════════════════════════════════════════════════════════
// EXAM QUESTIONS — 40 Questions (sample — expand with full set)
// ═══════════════════════════════════════════════════════════
export const MAT312_QUESTIONS: Question[] = [
  {n:1, q:"A differential equation dy/dx = f(x)/g(y) is called:", t:'mcq',
   opts:["Linear","Exact","Separable","Homogeneous"],
   c:'c', f:"Separable DEs can be written as dy/g(y) = f(x)dx — variables on separate sides to integrate.", tag:"Sheet 1"},
  {n:2, q:'True or False: "A 2nd-order DE has exactly 2 arbitrary constants in its general solution."', t:'tf',
   c:true, f:"True. An nth-order DE has n arbitrary constants in its general solution — reflecting n integrations.", tag:"Sheet 1"},
  {n:3, q:"The integrating factor for y' + P(x)y = Q(x) is:", t:'mcq',
   opts:["e^(∫Q dx)","e^(∫P dx)","P(x)","1/P(x)"],
   c:'b', f:"Integrating factor μ = e^(∫P(x)dx). Multiplying both sides by μ makes the left side d/dx[μy].", tag:"Sheet 2"},
  {n:4, q:"For a Bernoulli equation y' + Py = Qy^n, the substitution used is:", t:'mcq',
   opts:["z = y^n","z = y^(1-n)","z = 1/y","z = ln y"],
   c:'b', f:"Substitution z = y^(1-n) transforms the Bernoulli equation into a linear 1st-order DE in z.", tag:"Sheet 2"},
  {n:5, q:"An equation M dx + N dy = 0 is exact if:", t:'mcq',
   opts:["∂M/∂x = ∂N/∂y","∂M/∂y = ∂N/∂x","M = N","∂²M/∂x² = ∂²N/∂y²"],
   c:'b', f:"Exactness test: ∂M/∂y = ∂N/∂x. If true, there exists F(x,y) where ∂F/∂x = M and ∂F/∂y = N.", tag:"Sheet 3"},
  {n:6, q:'True or False: "For a homogeneous DE, the substitution v = y/x transforms it into a separable equation."', t:'tf',
   c:true, f:"True. With y = vx and y' = v + xv', the homogeneous DE becomes separable in v and x.", tag:"Sheet 4"},
  {n:7, q:"The characteristic equation for ay'' + by' + cy = 0 is:", t:'mcq',
   opts:["ap² + bp + c = 0 where p = dy/dx","ar² + br + c = 0","a/r² + b/r + c = 0","ar + b = 0"],
   c:'b', f:"Substituting y = e^(rx) into the DE gives the characteristic (auxiliary) equation ar² + br + c = 0.", tag:"Sheet 5"},
  {n:8, q:"If the characteristic equation has roots r = 2 ± 3i, the general solution is:", t:'mcq',
   opts:["y = C₁e^(2x) + C₂e^(3x)","y = e^(2x)(C₁cos 3x + C₂sin 3x)","y = (C₁+C₂x)e^(2x)","y = C₁cos 2x + C₂sin 3x"],
   c:'b', f:"Complex roots α ± βi → y = e^(αx)(C₁cos βx + C₂sin βx). Here α=2, β=3.", tag:"Sheet 5"},
  {n:9, q:"For a repeated root r in the characteristic equation, the general solution is:", t:'mcq',
   opts:["y = C₁e^(rx)","y = (C₁ + C₂x)e^(rx)","y = e^(rx)(C₁cos x + C₂sin x)","y = C₁e^(rx) + C₂e^(-rx)"],
   c:'b', f:"Repeated root r → GS = (C₁ + C₂x)e^(rx). The extra factor x prevents linear dependence.", tag:"Sheet 5"},
  {n:10, q:"The Cauchy-Euler equation has the form:", t:'mcq',
   opts:["y'' + P(x)y' + Q(x)y = 0","ax²y'' + bxy' + cy = 0","y'' + ay' + by = 0","y' = P(x)y + Q(x)"],
   c:'b', f:"Cauchy-Euler: ax²y'' + bxy' + cy = 0. The substitution y = x^m leads to the characteristic equation.", tag:"Sheet 6"},
  {n:11, q:"The Laplace transform of f(t) = 1 is:", t:'mcq',
   opts:["s","1","1/s","1/s²"],
   c:'c', f:"L{1} = ∫₀^∞ e^(-st)·1 dt = 1/s for s > 0.", tag:"Sheet 7"},
  {n:12, q:"The Laplace transform of e^(at) is:", t:'mcq',
   opts:["1/s","1/(s+a)","1/(s-a)","a/(s²-a²)"],
   c:'c', f:"L{e^(at)} = 1/(s-a) for s > a. This is the s-shift of L{1}=1/s.", tag:"Sheet 7"},
  {n:13, q:'True or False: "The Laplace transform is a linear operator."', t:'tf',
   c:true, f:"True. L{af(t)+bg(t)} = aF(s)+bG(s). Linearity makes Laplace very powerful for solving DEs.", tag:"Sheet 7"},
  {n:14, q:"L{f'(t)} equals:", t:'mcq',
   opts:["F'(s)","sF(s) - f(0)","sF(s) + f(0)","F(s)/s"],
   c:'b', f:"L{f'(t)} = sF(s) - f(0). Each derivative in t multiplies by s and subtracts an initial condition.", tag:"Sheet 7"},
  {n:15, q:"The s-shifting theorem states that L{e^(at)f(t)} equals:", t:'mcq',
   opts:["F(s+a)","F(s-a)","e^(as)F(s)","F(s)/a"],
   c:'b', f:"s-Shifting: L{e^(at)f(t)} = F(s-a). Shift s to (s-a) in the original transform F(s).", tag:"Sheet 7"},
  {n:16, q:"L{sin(at)} equals:", t:'mcq',
   opts:["s/(s²+a²)","a/(s²+a²)","s/(s²-a²)","a/(s²-a²)"],
   c:'b', f:"L{sin at} = a/(s²+a²). Compare with L{cos at} = s/(s²+a²) — note the numerator difference.", tag:"Sheet 7"},
  {n:17, q:"For Fourier series on [-L, L], the coefficient b_n is calculated using:", t:'mcq',
   opts:["(1/L)∫cos(nπx/L)dx","(1/L)∫f(x)sin(nπx/L)dx","(1/L)∫f(x)dx","(2/L)∫f(x)cos(nπx/L)dx"],
   c:'b', f:"bₙ = (1/L)∫₋ₗᴸ f(x)sin(nπx/L)dx. The sine coefficient uses sin in the integral.", tag:"Sheet 8"},
  {n:18, q:'True or False: "An even function has only sine terms in its Fourier series."', t:'tf',
   c:false, f:"False. Even functions have only COSINE terms (and a₀). Odd functions have only SINE terms. Remember: even→cos, odd→sin.", tag:"Sheet 8"},
  {n:19, q:"The Fourier series of an odd function f(x) contains:", t:'mcq',
   opts:["Only cosine terms","Only sine terms","Both sine and cosine terms","Only constant terms"],
   c:'b', f:"Odd function: f(-x) = -f(x) → all aₙ = 0 (including a₀). Only bₙ sine terms remain.", tag:"Sheet 8"},
  {n:20, q:"A point x₀ is an Ordinary Point of y'' + P(x)y' + Q(x)y = 0 if:", t:'mcq',
   opts:["P(x₀) = 0","P(x₀) ≠ 0 and Q(x₀) ≠ 0; both P and Q are analytic at x₀","P(x₀) is undefined","The equation has no solution at x₀"],
   c:'b', f:"Ordinary point: P(x) and Q(x) are analytic (have convergent power series) at x₀. Solution guaranteed as power series y = Σaₙ(x-x₀)ⁿ.", tag:"Sheet 9"},
  {n:21, q:"The Frobenius method is used at:", t:'mcq',
   opts:["Ordinary points","Regular singular points","Irregular singular points","Points where P(x)=0"],
   c:'b', f:"Frobenius method applies at REGULAR SINGULAR points. Assumes y = (x-x₀)^r · Σaₙ(x-x₀)ⁿ with indicial equation for r.", tag:"Sheet 9"},
  {n:22, q:'True or False: "The Wronskian of two linearly independent solutions is always zero."', t:'tf',
   c:false, f:"False. For linearly independent solutions, W ≠ 0. W = 0 means linearly DEPENDENT (one solution is a multiple of the other).", tag:"Sheet 5"},
  {n:23, q:"Variation of Parameters requires knowledge of:", t:'mcq',
   opts:["Only one solution of the homogeneous equation","The complementary (homogeneous) solution y_c","Only the particular solution","The Laplace transform of the forcing function"],
   c:'b', f:"Variation of Parameters needs the full complementary solution (two independent solutions y₁, y₂) to compute the Wronskian and then find yₚ.", tag:"Sheet 5"},
  {n:24, q:"The convolution theorem states: L{f * g} equals:", t:'mcq',
   opts:["F(s) + G(s)","F(s) - G(s)","F(s)·G(s)","F(s)/G(s)"],
   c:'c', f:"Convolution Theorem: L{(f*g)(t)} = F(s)·G(s). Very useful for inverse Laplace when the transform is a product.", tag:"Sheet 8"},
  {n:25, q:"For the DE y'' - 5y' + 6y = 0, the characteristic roots are:", t:'mcq',
   opts:["r = 2, 3","r = -2, -3","r = 1 ± i√5","r = 5/2 (repeated)"],
   c:'a', f:"r² - 5r + 6 = 0 → (r-2)(r-3) = 0 → r = 2, 3. Both real and distinct.", tag:"Sheet 5"},
  {n:26, q:"L{t^n} equals:", t:'mcq',
   opts:["n/s^n","n!/s^(n+1)","1/s^n","(n-1)!/s^n"],
   c:'b', f:"L{t^n} = n!/s^(n+1). Special case: L{t} = 1/s², L{t²} = 2/s³, L{t³} = 6/s⁴.", tag:"Sheet 7"},
  {n:27, q:'True or False: "A first-order DE always has exactly one solution given an initial condition."', t:'tf',
   c:false, f:"False. Existence and uniqueness depend on Lipschitz conditions. Some DEs (like y' = y^(2/3)) can have non-unique solutions or no solution.", tag:"Sheet 1"},
  {n:28, q:"The general solution of a 2nd-order non-homogeneous DE is:", t:'mcq',
   opts:["y = y_p only","y = y_c only","y = y_c + y_p","y = y_c · y_p"],
   c:'c', f:"GS = y_c + y_p (complementary + particular). y_c handles the homogeneous part, y_p handles the forcing function.", tag:"Sheet 5"},
  {n:29, q:"For the Cauchy-Euler equation with complex roots m = α ± βi, the solution is:", t:'mcq',
   opts:["y = x^α(C₁cos(βx) + C₂sin(βx))","y = x^α(C₁cos(β ln x) + C₂sin(β ln x))","y = (C₁+C₂x)x^α","y = C₁x^(α+β) + C₂x^(α-β)"],
   c:'b', f:"Cauchy-Euler with complex roots α±βi: y = x^α[C₁cos(β ln x) + C₂sin(β ln x)]. Note ln x, not x.", tag:"Sheet 6"},
  {n:30, q:'True or False: "L{cos(at)} = a/(s²+a²)."', t:'tf',
   c:false, f:"False. L{cos at} = s/(s²+a²) (s in numerator). L{sin at} = a/(s²+a²) (a in numerator). Remember: cos→s, sin→a.", tag:"Sheet 7"},
  {n:31, q:"The order of a differential equation is determined by:", t:'mcq',
   opts:["The highest power of y","The highest power of x","The order of the highest derivative","The number of terms"],
   c:'c', f:"Order = highest derivative present. y'' + 3y' + 2y = 0 is 2nd order because of y''.", tag:"Sheet 1"},
  {n:32, q:"If f(t) is a periodic function with period 2L, the period of sin(nπt/L) in the Fourier series is:", t:'mcq',
   opts:["2L/n","2L","nL","L/n"],
   c:'a', f:"sin(nπt/L) has period 2L/n. For n=1, period = 2L; for n=2, period = L; etc.", tag:"Sheet 8"},
  {n:33, q:"To solve y'' = f using reduction of order when one solution y₁ is known, we set:", t:'mcq',
   opts:["y₂ = cy₁","y₂ = v(x)","y₂ = v(x)y₁","y₂ = y₁ + C"],
   c:'c', f:"Reduction of order: y₂ = v(x)·y₁. Substituting gives a 1st-order DE in v' (let w = v').", tag:"Sheet 6"},
  {n:34, q:'True or False: "For an exact equation M dx + N dy = 0, we find F by integrating M with respect to x and N with respect to y separately."', t:'tf',
   c:false, f:"False. We integrate M w.r.t. x to get F(x,y), then differentiate w.r.t. y and compare with N to find the unknown function g(y).", tag:"Sheet 3"},
  {n:35, q:"The radius of convergence of a power series solution about an ordinary point x₀ is at least:", t:'mcq',
   opts:["Zero","The distance to the nearest singular point","Infinity","1"],
   c:'b', f:"The radius of convergence is at least the distance from x₀ to the nearest singular point in the complex plane.", tag:"Sheet 9"},
  {n:36, q:"Which method finds a particular solution of ay''+by'+cy = g(x) by treating C₁ and C₂ as functions of x?", t:'mcq',
   opts:["Undetermined Coefficients","Reduction of Order","Variation of Parameters","Frobenius Method"],
   c:'c', f:"Variation of Parameters: treat y_p = u₁y₁ + u₂y₂ where u₁, u₂ are functions (not constants). Works for any g(x).", tag:"Sheet 5"},
  {n:37, q:'True or False: "L{f\'\'(t)} = s²F(s) - f(0) - f\'(0)."', t:'tf',
   c:false, f:"False. L{f''(t)} = s²F(s) - sf(0) - f'(0). The first initial condition is multiplied by s.", tag:"Sheet 7"},
  {n:38, q:"What is the Wronskian W(y₁, y₂) = ?", t:'mcq',
   opts:["y₁y₂","y₁'y₂'","y₁y₂' - y₂y₁'","y₁' + y₂'"],
   c:'c', f:"W(y₁,y₂) = y₁y₂' - y₂y₁' = det|y₁ y₂; y₁' y₂'|. Non-zero W ↔ linearly independent solutions.", tag:"Sheet 5"},
  {n:39, q:"The Laplace transform is useful for solving DEs because it:", t:'mcq',
   opts:["Eliminates all constants","Converts the DE into an algebraic equation in s","Only works for 1st-order DEs","Removes the need for initial conditions"],
   c:'b', f:"Laplace transforms differentiation into multiplication by s, converting the DE into an algebraic equation in the s-domain. Solve algebraically, then invert.", tag:"Sheet 7"},
  {n:40, q:'True or False: "Fourier series can represent any periodic function exactly at every point."', t:'tf',
   c:false, f:"False. At jump discontinuities, the Fourier series converges to the average of the left and right limits (Dirichlet conditions). Gibbs phenomenon occurs near jumps.", tag:"Sheet 8"},
]

// ═══════════════════════════════════════════════════════════
// FORMULA SHEET TOPICS
// ═══════════════════════════════════════════════════════════
export const MAT312_FORMULA_TOPICS = [
  { id:'sep', title:'Separable & 1st-Order', badge:'S1-S2' },
  { id:'exact', title:'Exact & Homogeneous', badge:'S3-S4' },
  { id:'2nd', title:'2nd-Order & Cauchy-Euler', badge:'S5-S6' },
  { id:'laplace', title:'Laplace Transforms', badge:'S7-S8' },
  { id:'fourier', title:'Fourier Series', badge:'S8' },
  { id:'power', title:'Power Series', badge:'S9' },
]

// ═══════════════════════════════════════════════════════════
// AI TUTOR — knowledge base + starter chips (bilingual)
// ═══════════════════════════════════════════════════════════
export const MAT312_AI_PROMPT = `You are a helpful AI assistant specialized in MAT312 Differential Equations at Alamein International University.

You help students master these 9 topics (with full step-by-step methods and worked examples):
1. Separable Equations — order, degree, linearity; separate variables then integrate ∫dy/g(y)=∫f(x)dx+C; initial-value problems; watch for singular solutions g(y)=0.
2. Linear 1st-Order & Bernoulli — standard form y'+P(x)y=Q(x); integrating factor μ=e^(∫P dx); solution (μy)'=μQ. Bernoulli y'+P y=Q yⁿ → substitute z=y^(1-n) to linearize.
3. Exact Equations — M dx+N dy=0 is exact iff ∂M/∂y=∂N/∂x; find potential F with ∂F/∂x=M, ∂F/∂y=N; solution F(x,y)=C. Integrating factors when not exact.
4. Homogeneous DEs & Substitutions — degree-0 homogeneous f(tx,ty)=f(x,y); substitute v=y/x (y=vx, y'=v+xv') to get a separable DE in v and x.
5. 2nd-Order Constant Coefficients — ay''+by'+cy=0 → auxiliary (characteristic) equation ar²+br+c=0; three cases: real distinct r₁,r₂ → C₁e^(r₁x)+C₂e^(r₂x); repeated r → (C₁+C₂x)e^(rx); complex α±βi → e^(αx)(C₁cos βx+C₂sin βx). Non-homogeneous: undetermined coefficients (multiply trial by x if it collides with the homogeneous solution) and variation of parameters (Wronskian W=y₁y₂'−y₂y₁').
6. Cauchy-Euler & Reduction of Order — ax²y''+bxy'+cy=0, substitute y=x^m → am(m−1)+bm+c=0. Reduction of order: given y₁, find y₂=y₁∫[e^(−∫P dx)/y₁²]dx.
7. Laplace Transforms — L{1}=1/s, L{tⁿ}=n!/s^(n+1), L{e^(at)}=1/(s−a), L{sin at}=a/(s²+a²), L{cos at}=s/(s²+a²); linearity; L{y'}=sY−y(0), L{y''}=s²Y−sy(0)−y'(0); solve IVPs algebraically in the s-domain.
8. Inverse Laplace & Fourier Series — inverse Laplace via partial fractions (numerator degree < denominator degree; complete the square for quadratics). Fourier series on [−L,L]: f(x)=a₀/2+Σ[aₙcos(nπx/L)+bₙsin(nπx/L)]; even functions → cosine only (bₙ=0), odd functions → sine only (aₙ=0).
9. Power Series & Special Topics — power series solutions y=Σ aₙxⁿ about ordinary points; recurrence relations; the Airy equation y''−xy=0 near x=0.

RULES:
1. If the student writes in Arabic, respond ONLY in Arabic.
2. If the student writes in English, respond ONLY in English.
3. Show clean step-by-step solutions with the actual formulas; be concise and use bullet points.
4. Always be encouraging and friendly.
5. Highlight exam tips when relevant (e.g. "separate COMPLETELY before integrating", "check exactness first", "for repeated roots multiply by x").`

export const MAT312_QUICK_CHIPS = [
  'اشرح طريقة integrating factor بمثال',
  "Solve y'' + 3y' + 2y = 0 step by step",
  'فرق بين exact و separable إزاي أعرف؟',
  "Laplace transform of y'' with initial conditions?",
]
