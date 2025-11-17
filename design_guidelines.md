# Design Guidelines: 務メ討魔録 (Tsutome Touma-roku)

## Design Approach
**Reference-Based**: Drawing inspiration from successful Japanese mobile RPGs (Monster Strike, Pokémon GO, Fate/Grand Order) combined with modern productivity apps (Habitica, Todoist). This hybrid approach balances engaging game aesthetics with functional task management.

**Core Principle**: Traditional Japanese yokai aesthetic meets modern mobile gaming UI, optimized for one-handed smartphone use.

## Typography System

**Font Families**:
- Primary: "Noto Sans JP" (600, 700) - for UI elements, stats, buttons
- Accent: "Zen Antique" (400) - for titles, story text, traditional elements
- Monospace: "Roboto Mono" (500) - for numbers, stats, timers

**Hierarchy**:
- Hero/Title: 2.5rem (40px), Zen Antique, bold
- Section Headers: 1.5rem (24px), Noto Sans JP, 700
- Card Titles: 1.125rem (18px), Noto Sans JP, 600
- Body Text: 1rem (16px), Noto Sans JP, 600
- Small Stats/Labels: 0.875rem (14px), Noto Sans JP, 600
- Micro Text: 0.75rem (12px), Noto Sans JP, 600

## Layout System

**Spacing Scale**: Use Tailwind units of 2, 3, 4, 6, 8, 12, 16 (e.g., p-4, gap-6, mb-8)

**Screen Structure**:
- Fixed bottom navigation: h-16 with 4-5 icon buttons
- Scrollable content area: Full height minus bottom nav
- No top app bar (maximize content space)
- Horizontal padding: px-4 consistently
- Card spacing: gap-4 between cards, gap-6 between sections

**Grid Patterns**:
- Single column for task cards (full width)
- 2-column grid for stats display (grid-cols-2)
- 3-column for item/equipment icons (grid-cols-3)
- 4-column for material icons (grid-cols-4)

## Component Library

### Navigation
**Bottom Tab Bar**: Fixed navigation with 5 tabs - Home (務メ), Training (修練), Boss (大敵), Shop (商店), Profile (記録). Each tab has icon + label below. Active state with underline accent.

**Hamburger Menu**: Top-right corner for Settings, Calendar, Archive, Emergency Stop. Slide-in from right.

### Task Cards
**務メ Card** (Monster Task):
- Rounded corners (rounded-xl)
- Monster illustration thumbnail (square, 80x80px, left-aligned)
- Task title (truncate after 2 lines)
- Deadline badge with countdown
- Difficulty indicator (1-5 stars)
- Linked 修練/師範 mini badges
- Swipe right to complete, left to view details

**修練 Card** (Habit/Training):
- Horizontal card with training illustration (60x60px circle)
- Streak counter prominently displayed
- Last completed date
- Linked 務メ count indicator
- Progress ring around illustration

**師範 Card** (Master/Long-term Goal):
- Portrait-style illustration (100x100px, top center)
- Master name in traditional typography
- Linked 務メ progress bar
- Achievement date
- Reward preview icons

**刺客 Card** (Urgent Task):
- Compact horizontal card
- Red accent border (border-l-4)
- Countdown timer (hours:minutes)
- Quick complete button

### Boss Battle Display
Full-screen portrait layout:
- Boss illustration (full width, 300-400px height)
- Boss name overlay with traditional text treatment
- HP bar with current/max values
- Player stats summary (compact, 2x2 grid)
- Daily damage preview
- Counter-attack challenge card (if available)
- Estimated days to defeat

### Stats Display
**Player Status Panel**:
- Character level in large typography (Zen Antique, 3rem)
- XP progress bar beneath
- HP bar (red gradient)
- 5 stats in vertical list with icon + value + bar visualization
- Current equipment slots preview (4 slots, icon-only)

### Forms
**Task Input** (optimized for mobile keyboard):
- Full-screen modal overlay
- Large touch targets (min 44x44px)
- Bottom sheet style form
- Auto-focus on title input
- Difficulty slider (1-5)
- Genre selection (horizontal scroll chips)
- Date picker (native mobile)
- Quick templates for common tasks

### Shop & Forge
**Item Grid**:
- 3-column layout for items (grid-cols-3)
- Square item cards with illustration
- Price badge overlay (bottom-right)
- Tap to view details modal
- Filter chips (horizontal scroll, top)

**Forge Interface**:
- Selected item preview (large, top)
- Required materials grid (4 columns)
- Owned quantity indicators
- Craft button (full width, sticky bottom)

### Calendar
**Month View**:
- Traditional Japanese calendar aesthetics
- Date cells with task count indicators
- Color-coded dots for task types
- Tap date for daily detail sheet

### Story/Archive
**Story Viewer**:
- Vertical scroll paper-like background
- Full-width illustrations
- Text boxes with semi-transparent background
- Swipe up to continue narrative
- Archive list with thumbnail previews

## Interaction Patterns

**Primary Actions**:
- Large, full-width buttons (h-12)
- Secondary actions as outline buttons
- Icon buttons for tertiary actions (h-10 w-10)

**Gestures**:
- Swipe right on task cards: Complete
- Swipe left on task cards: Details
- Pull down: Refresh
- Long press: Quick actions menu

**Feedback**:
- Task completion: Brief success animation (scale pulse + confetti)
- Level up: Full-screen celebration modal
- Damage received: Screen shake + HP bar animation
- Item obtained: Slide-in notification banner

**Loading States**:
- Skeleton screens for AI-generated content
- Shimmer effect for image loading
- Inline spinners for actions

## Visual Elements

**Borders & Shadows**:
- Cards: shadow-md, rounded-xl
- Panels: border with accent color, no shadow
- Buttons: shadow-sm on primary, no shadow on secondary
- Modals: shadow-2xl

**Iconography**:
- Use Heroicons for UI elements
- Custom yokai/fantasy icons for game elements (via AI generation)
- Consistent 24x24px size for navigation
- 20x20px for inline icons

**Illustrations**:
All illustrations AI-generated via OpenAI integration, optimized for mobile vertical format (portrait orientation, 3:4 or 1:1 aspect ratios).

## Images

**Monster Illustrations**: Square format (1:1, 512x512px), Japanese yokai style art, varied creatures based on task attributes. Placed in task cards, detail views, and archive.

**Training Scene Illustrations**: Circular thumbnails (1:1, 256x256px), depicting traditional Japanese training activities, meditation, or skill practice.

**Master Character Portraits**: Vertical portraits (3:4, 384x512px), wise mentor characters in traditional Japanese clothing, used in goal cards and story scenes.

**Boss Character Art**: Large vertical illustrations (3:4 or 4:5, 768x1024px), dramatic yokai boss designs for battle screen. Each boss unique to user's progress.

**Story Scenes**: Full-width vertical illustrations (9:16, optimized for mobile screens), narrative scenes in traditional Japanese art style for story progression.

**Items & Equipment**: Small square icons (128x128px), weapons, armor, materials in stylized Japanese aesthetic.

**No large hero image** - This app prioritizes immediate task visibility over marketing-style heroes.

## Accessibility

- Minimum touch target: 44x44px
- Text contrast ratio: 4.5:1 minimum
- Form labels always visible
- Error states with icon + text
- Success feedback with visual + haptic
- Screen reader labels on all interactive elements

## Mobile Optimization

- Viewport: 360px-430px width
- Single-column layouts
- Bottom navigation for thumb reach
- No horizontal scrolling (except intentional carousels)
- Optimized image sizes for mobile bandwidth
- Lazy loading for images and AI content
- Local storage for offline task viewing