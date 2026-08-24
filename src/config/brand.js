/**
 * ---------------------------------------------------------------------------
 *  COLOR METAL SRL - CENTRAL BRAND CONFIGURATION
 * ---------------------------------------------------------------------------
 *  This is THE ONLY file you need to touch to re-skin the whole application.
 *  Every colour, font, logo and spacing value used by the UI is derived from
 *  the values below. Change a value here -> the whole app changes.
 *
 *  All values come from the official "Color Metal - Brand Manual" (2020).
 *
 *      Primary   Gold          #C0A062     RGB 192/160/98
 *                Faded Gold    #E1D1B4     RGB 225/209/180
 *                Silver        #939598     RGB 147/149/152
 *                Faded Silver  #D1CECD     RGB 209/206/205
 *      Accent    Orange        #F4B422     RGB 244/180/34
 *                Faded Orange  #FCE1B0     RGB 252/225/176
 *      Neutral   "Black"       #323232     RGB 50/50/50
 *                White         #FFFFFF
 *      Secondary Dark Bronze   #620C01
 *                Bronze        #9E2A03
 *                Green         #41896D
 *                Dark Green    #464D45
 *                Grey          #57525F
 *
 *      Typeface  Montserrat (Light / Regular / Bold)
 *
 *  NOTE: values stored in the database (Admin -> Settings) override the
 *  company name / logo / colours below at runtime. This file is the fallback
 *  and the single source of truth for a fresh installation.
 * ---------------------------------------------------------------------------
 */

// The Vite base path (needed so the logo also loads from a GitHub Pages subfolder)
const BASE = import.meta.env.BASE_URL || '/'

export const brand = {
  // ---------------------------------------------------------------- identity
  companyName: 'Color Metal',
  companyLegalName: 'Color Metal SRL',
  slogan: 'Partner in Engineering',
  appName: 'CM Event Leads',
  website: 'www.color-metal.ro',
  contactEmail: 'direct@color-metal.ro',
  contactPhone: '+40 266 206 050',
  contactAddress: '535600 Odorheiu Secuiesc, Str. Nicolae Bălcescu, nr. 69B/5',

  // ------------------------------------------------------------------ assets
  // Colour logo, used on white / light backgrounds.
  logo: `${BASE}cm-logo.png`,
  // White logo, used on the dark graphite header / dark backgrounds.
  logoLight: `${BASE}cm-logo-white.png`,
  favicon: `${BASE}favicon.svg`,
  // Rendered logo height in px (kiosk / admin). Tweak freely.
  logoHeight: 46,
  logoHeightKiosk: 64,

  // ------------------------------------------------------------- brand colors
  // Main brand colour - used for primary actions, active states, focus rings.
  primaryColor: '#C0A062', // Gold
  primaryColorDark: '#A6884C', // Gold, darkened for hover states
  primaryColorSoft: '#E1D1B4', // Faded Gold
  primaryColorTint: '#F6F0E5', // Very light gold wash (backgrounds)

  // Secondary brand colour - technical / neutral metal tone.
  secondaryColor: '#939598', // Silver
  secondaryColorSoft: '#D1CECD', // Faded Silver

  // Accent colour - highlights, badges, warnings, "pending sync" states.
  accentColor: '#F4B422', // Orange
  accentColorSoft: '#FCE1B0', // Faded Orange

  // ---------------------------------------------------------------- surfaces
  backgroundColor: '#FFFFFF', // page background (kiosk)
  backgroundAlt: '#F4F4F5', // light grey app background (admin)
  surfaceColor: '#FFFFFF', // cards, panels
  surfaceMuted: '#FAFAFA', // subtle inner panels
  darkColor: '#323232', // "Black" - headers, dark bars
  darkColorDeep: '#1E1E1E', // deeper graphite for the admin sidebar

  // -------------------------------------------------------------------- text
  textColor: '#323232',
  textMuted: '#6E6E73',
  textFaint: '#93959A',
  textOnDark: '#FFFFFF',
  textOnPrimary: '#1E1E1E', // gold is light -> use dark text on it

  // ------------------------------------------------------------------ lines
  borderColor: '#E3E3E5',
  borderColorStrong: '#C9C9CD',

  // ------------------------------------------------------------- status hues
  // Derived from the secondary palette of the brand manual where possible.
  successColor: '#41896D', // Brand Green
  successSoft: '#E4F0EB',
  warningColor: '#F4B422', // Brand Orange
  warningSoft: '#FCE1B0',
  dangerColor: '#9E2A03', // Brand Bronze
  dangerSoft: '#F6E3DC',
  infoColor: '#57525F', // Brand Grey
  infoSoft: '#ECEBEE',

  // -------------------------------------------------------------- typography
  font: {
    // Montserrat is the principal typeface of the brand manual.
    family:
      "'Montserrat', 'Segoe UI', 'Helvetica Neue', Arial, system-ui, sans-serif",
    familyMono: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace",
    // Google Fonts URL. Set to null to disable the network request entirely
    // (the app then falls back to the system sans-serif stack).
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
    weightLight: 300,
    weightRegular: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
    // Base sizes (px). Kiosk sizes are deliberately larger for tablets.
    baseSize: 15,
    baseSizeKiosk: 19,
    lineHeight: 1.55,
    // Wide letter-spacing on headings matches the brand manual's look.
    headingLetterSpacing: '0.06em',
    labelLetterSpacing: '0.08em',
    headingTransform: 'uppercase'
  },

  // ------------------------------------------------------------------ shape
  radius: {
    sm: '2px',
    md: '3px',
    lg: '4px',
    // The brand language is architectural / technical -> almost square corners.
    pill: '999px'
  },
  shadow: {
    sm: '0 1px 2px rgba(50,50,50,0.06)',
    md: '0 2px 10px rgba(50,50,50,0.08)',
    lg: '0 8px 30px rgba(50,50,50,0.12)'
  },
  // 8px based spacing scale
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
    xxl: '64px'
  },

  // ------------------------------------------------------------------ kiosk
  kiosk: {
    // Minimum touch target height on the tablet, in px.
    controlHeight: 64,
    buttonHeight: 72,
    maxContentWidth: 860,
    // Seconds the "Thank you" screen stays visible before the form resets.
    autoResetSeconds: 5
  },

  // --------------------------------------------------------------- defaults
  defaults: {
    country: 'România',
    language: 'ro',
    leadPrefix: 'CM',
    gdprText:
      'Prin completarea acestui formular sunt de acord ca Color Metal SRL să prelucreze datele furnizate în scopul comunicării comerciale și profesionale. Datele nu vor fi transmise către terți fără acordul meu. Îmi pot retrage consimțământul oricând scriind la direct@color-metal.ro.',
    gdprVersion: '2026-01',
    // Link to the full company GDPR policy, shown as small print under the
    // consent checkbox on the registration form. Set to null to hide.
    gdprPolicyUrl:
      'https://www.color-metal.ro/sites/default/files/2025-03/GDPR%20COLOR%20METAL%202025.pdf',
    successTitle: 'Mulțumim!',
    successMessage: 'Înregistrarea a fost salvată cu succes.',
    successSubMessage:
      'Un reprezentant Color Metal vă poate contacta ulterior.'
  }
}

/**
 * Converts the brand object into CSS custom properties and injects them on
 * :root. Called once at application start (see src/main.jsx) and again every
 * time the admin changes the Settings, so the whole UI restyles instantly.
 */
export function applyBrand(overrides = {}) {
  const b = { ...brand, ...overrides }
  const font = { ...brand.font, ...(overrides.font || {}) }
  const radius = { ...brand.radius, ...(overrides.radius || {}) }
  const shadow = { ...brand.shadow, ...(overrides.shadow || {}) }
  const space = { ...brand.space, ...(overrides.space || {}) }
  const kiosk = { ...brand.kiosk, ...(overrides.kiosk || {}) }

  const vars = {
    '--cm-primary': b.primaryColor,
    '--cm-primary-dark': b.primaryColorDark,
    '--cm-primary-soft': b.primaryColorSoft,
    '--cm-primary-tint': b.primaryColorTint,
    '--cm-secondary': b.secondaryColor,
    '--cm-secondary-soft': b.secondaryColorSoft,
    '--cm-accent': b.accentColor,
    '--cm-accent-soft': b.accentColorSoft,

    '--cm-bg': b.backgroundColor,
    '--cm-bg-alt': b.backgroundAlt,
    '--cm-surface': b.surfaceColor,
    '--cm-surface-muted': b.surfaceMuted,
    '--cm-dark': b.darkColor,
    '--cm-dark-deep': b.darkColorDeep,

    '--cm-text': b.textColor,
    '--cm-text-muted': b.textMuted,
    '--cm-text-faint': b.textFaint,
    '--cm-text-on-dark': b.textOnDark,
    '--cm-text-on-primary': b.textOnPrimary,

    '--cm-border': b.borderColor,
    '--cm-border-strong': b.borderColorStrong,

    '--cm-success': b.successColor,
    '--cm-success-soft': b.successSoft,
    '--cm-warning': b.warningColor,
    '--cm-warning-soft': b.warningSoft,
    '--cm-danger': b.dangerColor,
    '--cm-danger-soft': b.dangerSoft,
    '--cm-info': b.infoColor,
    '--cm-info-soft': b.infoSoft,

    '--cm-font': font.family,
    '--cm-font-mono': font.familyMono,
    '--cm-fw-light': String(font.weightLight),
    '--cm-fw-regular': String(font.weightRegular),
    '--cm-fw-medium': String(font.weightMedium),
    '--cm-fw-semibold': String(font.weightSemibold),
    '--cm-fw-bold': String(font.weightBold),
    '--cm-font-size': `${font.baseSize}px`,
    '--cm-font-size-kiosk': `${font.baseSizeKiosk}px`,
    '--cm-line-height': String(font.lineHeight),
    '--cm-heading-ls': font.headingLetterSpacing,
    '--cm-label-ls': font.labelLetterSpacing,
    '--cm-heading-transform': font.headingTransform,

    '--cm-radius-sm': radius.sm,
    '--cm-radius-md': radius.md,
    '--cm-radius-lg': radius.lg,
    '--cm-radius-pill': radius.pill,

    '--cm-shadow-sm': shadow.sm,
    '--cm-shadow-md': shadow.md,
    '--cm-shadow-lg': shadow.lg,

    '--cm-space-xs': space.xs,
    '--cm-space-sm': space.sm,
    '--cm-space-md': space.md,
    '--cm-space-lg': space.lg,
    '--cm-space-xl': space.xl,
    '--cm-space-xxl': space.xxl,

    '--cm-kiosk-control-h': `${kiosk.controlHeight}px`,
    '--cm-kiosk-button-h': `${kiosk.buttonHeight}px`,
    '--cm-kiosk-max-w': `${kiosk.maxContentWidth}px`
  }

  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))

  // Favicon + document title
  if (b.favicon) {
    let link = document.querySelector("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = b.favicon
    link.type = b.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  }

  // Google Fonts (skip if disabled in config)
  if (font.googleFontsUrl && !document.getElementById('cm-google-fonts')) {
    const pre1 = document.createElement('link')
    pre1.rel = 'preconnect'
    pre1.href = 'https://fonts.googleapis.com'
    const pre2 = document.createElement('link')
    pre2.rel = 'preconnect'
    pre2.href = 'https://fonts.gstatic.com'
    pre2.crossOrigin = 'anonymous'
    const l = document.createElement('link')
    l.id = 'cm-google-fonts'
    l.rel = 'stylesheet'
    l.href = font.googleFontsUrl
    document.head.append(pre1, pre2, l)
  }

  return b
}

export default brand
