// src/lib/z.ts — unified z-index scale (single source of truth for layering).
// Higher = closer to the viewer. Modal is always above the mobile Drawer.
export const Z = {
  base: 1,
  sidebar: 200,        // persistent app sidebar
  topnav: 300,         // fixed top nav / app header
  drawerOverlay: 800,  // dim behind the mobile drawer
  drawer: 810,         // mobile slide-in drawer panel
  dropdown: 850,       // menus / popovers
  modal: 1000,         // dialogs — must sit above the drawer
  toast: 1100,
} as const
