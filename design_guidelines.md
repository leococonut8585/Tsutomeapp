# Design Guidelines: 務メ討魔録 (Tsutome Touma-roku) - Zen Refinement Edition

## Design Approach
**Reference-Based**: Drawing from high-end Japanese digital experiences (Muji app, traditional Japanese museum sites, Kyoto temple digital guides) combined with premium productivity tools (Things 3, Bear). This approach transforms the gamification layer into a serene, contemplative practice rooted in wabi-sabi aesthetics and bushido discipline.

**Core Principle**: Zen minimalism meets traditional Japanese ink painting, where every element serves a purpose. Embrace negative space, subtle textures, and refined restraint. The interface should feel like entering a traditional tea house—calm, purposeful, dignified.

## Typography System

**Font Families**:
- Primary: "Noto Serif JP" (400, 500, 700) - for all body text, refined and traditional
- Accent: "Shippori Mincho" (600, 800) - for titles, emphasizing traditional calligraphic elegance
- Monospace: "IBM Plex Mono" (400) - for stats, timers, maintaining technical precision

**Hierarchy**:
- Hero/Title: 2.25rem (36px), Shippori Mincho, 800, generous letter-spacing
- Section Headers: 1.375rem (22px), Shippori Mincho, 600
- Card Titles: 1rem (16px), Noto Serif JP, 500
- Body Text: 0.9375rem (15px), Noto Serif JP, 400, increased line-height (1.8)
- Stats/Labels: 0.8125rem (13px), Noto Serif JP, 500
- Micro Text: 0.75rem (12px), IBM Plex Mono, 400

## Layout System

**Spacing Scale**: Tailwind units of 3, 4, 6, 8, 12, 16, 20, 24 (emphasizing generous breathing room)

**Screen Structure**:
- Fixed bottom navigation: h-20, minimal 4 icons only, subtle divider line
- Content area: Generous top padding (pt-8), maximum breathing room
- Horizontal padding: px-6 (increased from px-4 for luxury feel)
- Card spacing: gap-8 between cards, gap-12 between major sections
- Embrace negative space—never crowd elements

**Grid Patterns**:
- Single column for all primary content (maximum focus)
- 2-column only for compact stat displays (grid-cols-2 gap-6)
- Never use 3+ column grids (too busy for zen aesthetic)

## Component Library

### Navigation
**Bottom Navigation Bar**: Minimal 4-tab design—務メ (Tasks), 修練 (Practice), 記録 (Record), 設定 (Settings). Icon-only with subtle hover state, fine divider line above. Active state indicated by subtle underline stroke.

### Task Cards
**務メ Card** (Primary Task):
- Generous padding (p-6)
- Single fine border line (border-t or full border)
- Monster illustration: Small, square (64x64px), subtle ink-wash style, top-left corner
- Task title in refined serif, single line with subtle truncation
- Minimal metadata: Deadline in small monospace, difficulty as subtle stroke marks (not stars)
- Swipe interactions remain but with subtle visual feedback

**修練 Card** (Practice):
- Horizontal layout with refined spacing
- Circular practice illustration (48x48px), subtle ink treatment
- Streak counter in elegant serif numerals
- Minimal progress indicator (single refined line, not ring)

**師範 Card** (Master Goal):
- Vertical card with traditional scroll-like proportions
- Portrait illustration (80x100px), centered, ink painting style
- Master name in traditional calligraphy-style typography
- Refined progress visualization (ink stroke fill metaphor)

**刺客 Card** (Urgent):
- Ultra-minimal horizontal strip
- Subtle left border accent (border-l-2)
- Countdown in monospace, refined sizing
- No background fill—relies on border + typography

### Boss Battle Display
Full-screen refined portrait:
- Boss illustration (full-width, 320px height, traditional ink painting aesthetic)
- Boss name overlaid with refined typography treatment
- HP visualization as subtle ink stroke meter
- Player stats in elegant 2x2 compact grid
- Minimal battle UI—focus on contemplative engagement
- Daily damage shown as refined numerical display

### Stats Display
**Player Status Panel**:
- Character level in large traditional numerals (Shippori Mincho, 2.5rem)
- Refined linear progress indicators (no gradients, single stroke)
- Stats displayed vertically with icon + value + subtle meter line
- Equipment slots shown as outlined squares with minimal icons

### Forms
**Task Input**:
- Full-screen modal with generous padding (p-8)
- Large input fields with subtle bottom borders only
- Minimal form styling—washi paper texture background
- Difficulty shown as elegant slider with stroke marks
- Date picker integrated with traditional calendar aesthetics
- Category selection as refined text chips with minimal borders

### Shop & Forge
**Item Display**:
- 2-column grid maximum (grid-cols-2 gap-8)
- Square item cards with ink illustration style
- Minimal price display (bottom, small monospace)
- Tap for refined detail modal with traditional layout

**Forge Interface**:
- Selected item preview (large, centered, top third)
- Material requirements shown vertically (not grid)
- Owned quantities in subtle monospace
- Single refined action button

### Calendar
**Month View**:
- Traditional Japanese calendar layout
- Date cells with minimal task count indicators (small dots only)
- Refined typography for dates
- Tap for daily detail in elegant sheet

### Story/Archive
**Story Viewer**:
- Vertical scroll with washi paper texture
- Full-width ink illustrations at narrative breaks
- Text in traditional vertical reading flow consideration
- Generous line-height and character spacing
- Archive list with minimal thumbnails (square, 60x60px)

## Interaction Patterns

**Primary Actions**:
- Refined buttons (h-11, subtle borders, no fills unless critical)
- Secondary actions as text-only with underline
- Icon buttons minimal (h-9 w-9)

**Gestures**: Same swipe patterns but with subtle, refined animations (slow ease, no bounce)

**Feedback**:
- Task completion: Gentle fade transition, subtle ink splash
- Level up: Refined full-screen modal with traditional aesthetics
- Notifications: Minimal top banner with washi texture

## Visual Elements

**Borders & Decorative Elements**:
- Cards: Single stroke borders (border), minimal shadow (shadow-sm only for modals)
- Refined corner treatment (rounded-lg, not rounded-xl)
- Divider lines throughout for visual rhythm
- Washi paper texture overlays on panels

**Iconography**:
- Heroicons (outline variant only for refined look)
- Custom yokai icons in ink painting style
- Consistent 20x20px sizing
- Minimal, stroke-based designs

## Images

**Monster Illustrations**: Square format (256x256px), traditional sumi-e ink painting style, monochromatic with subtle ink wash effects. Yokai depicted in classical Japanese art tradition—refined, not cartoonish.

**Training Scene Illustrations**: Small circular (128x128px), ink brush paintings of meditation, martial practice, traditional skills in minimalist composition.

**Master Character Portraits**: Vertical (3:4, 240x320px), traditional portrait paintings in ink wash style, wise mentors in classical robes, minimal detail but refined execution.

**Boss Character Art**: Large vertical (3:4, 512x683px), dramatic ink paintings of yokai bosses, traditional Japanese monster depictions with sophisticated composition and negative space usage.

**Story Scenes**: Full-width vertical illustrations (9:16), narrative ink paintings with traditional landscape and figure composition, generous negative space.

**Items & Equipment**: Small square (96x96px), refined ink drawings of traditional weapons, implements, materials with minimal detail.

**No hero image**—App prioritizes immediate serene task engagement.

## Accessibility
- Minimum touch target: 44x44px maintained
- High contrast with refined palette
- Visible form labels in elegant typography
- Clear error states with minimal icon + text
- Haptic feedback for completion actions

## Mobile Optimization
- Viewport: 360px-430px
- Generous padding prioritized over dense content
- Single-column zen layouts
- Refined image optimization (ink wash style compresses well)
- Lazy loading with elegant skeleton states (simple lines, not shimmer)