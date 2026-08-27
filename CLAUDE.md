# Gymerr - Claude Code Guidelines

## Design System

This app follows a **dark, minimal design** aesthetic. All UI components must adhere to this style guide.

### Color Palette

```
Background:
- Primary bg:     #0a0a0a (near black)
- Secondary bg:   #1a1a1a (dark gray)
- Elevated bg:    rgba(255, 255, 255, 0.05) - subtle lift
- Interactive bg: rgba(255, 255, 255, 0.08) - buttons, inputs
- Hover bg:       rgba(255, 255, 255, 0.12)
- Active bg:      rgba(255, 255, 255, 0.15)

Text:
- Primary:        #fff
- Secondary:      rgba(255, 255, 255, 0.6)
- Muted:          rgba(255, 255, 255, 0.4)
- Disabled:       rgba(255, 255, 255, 0.25)

Borders:
- Default:        rgba(255, 255, 255, 0.08)
- Subtle:         rgba(255, 255, 255, 0.1)
- Emphasis:       rgba(255, 255, 255, 0.2)

Accents (use sparingly):
- Primary action: #fff (white buttons for main CTAs)
- Rest timer:     #f97316 (orange)
- Success:        #22c55e (green - only for checkmarks/icons, NOT backgrounds)
- Danger:         #f87171 (red - text only)

Backdrop:
- Modal overlay:  rgba(0, 0, 0, 0.7)
```

### Design Principles

1. **No colored backgrounds** - Never use green/red/blue backgrounds for states. Use subtle white alpha overlays instead.
2. **Minimal color** - The UI is mostly grayscale. Color is reserved for specific semantic meaning.
3. **White for primary actions** - Main CTA buttons use white bg with dark text.
4. **Subtle states** - Hover/active/completed states use subtle white alpha changes, not color changes.
5. **Clean typography** - Use system fonts, tabular-nums for numbers, clear hierarchy.

### Component Patterns

**Buttons:**
```css
/* Primary CTA */
background: #fff;
color: #0a0a0a;
border-radius: 12px;

/* Secondary */
background: rgba(255, 255, 255, 0.1);
color: #fff;

/* Danger (text only) */
background: transparent;
color: #f87171;
```

**Cards/Containers:**
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
```

**Inputs:**
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #fff;
```

**Completed/Done states:**
```css
/* DO NOT use green backgrounds */
/* Instead, use subtle visual cues: */
color: rgba(255, 255, 255, 0.5);  /* muted text */
background: rgba(255, 255, 255, 0.05);  /* subtle bg */
```

### Border Radius Scale
- Small: 6px (chips, tags)
- Medium: 10px (cards, inputs)
- Large: 12px (buttons, modals)
- XL: 20px (drawers, sheets)

### Spacing
Use 4px base unit: 4, 8, 12, 16, 20, 24, 32, 48

### Shadows
Minimal shadows. Use elevation through background alpha changes instead.
```css
/* Only for floating elements like drawers */
box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.5);
```

## Code Style

- Use CSS Modules (`.module.css`)
- Use CSS variables from `src/styles/variables.css` when available
- Mobile-first responsive design
- Support iOS safe areas with `env(safe-area-inset-*)`

## File Structure

- Components: `src/components/ComponentName/`
- Pages: `src/pages/PageName/`
- Each component has its own `.tsx` and `.module.css`
