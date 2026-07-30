# Design System

## Design principles

- Fast to understand
- Usable outdoors
- Large touch targets
- High contrast
- Minimal decorative complexity
- Clear attendance and sync states
- Consistent role indicators
- Malayalam identity without visual clichés

## Brand direction

Product name: **Haajar**

Suggested supporting Malayalam line:

```text
ഹാജർ — എല്ലാവരും ഉണ്ടെന്ന് ഉറപ്പാക്കാം
```

## Design tokens

### Spacing

Use a 4-point scale:

```text
4, 8, 12, 16, 20, 24, 32, 40
```

### Radius

```text
Small: 8
Medium: 12
Large: 16
Pill: 999
```

### Touch targets

- Minimum height: 44 dp
- Primary actions: 48–56 dp
- Scanner confirmation: at least 56 dp

### Typography

Suggested hierarchy:

- Display: app and event titles
- Heading 1: screen title
- Heading 2: section title
- Body: normal content
- Label: inputs and statuses
- Caption: timestamps and metadata

Use one primary font family with reliable Malayalam support.

## Semantic colours

Define tokens, not hard-coded component colours:

- `background`
- `surface`
- `surfaceElevated`
- `textPrimary`
- `textSecondary`
- `border`
- `brand`
- `success`
- `warning`
- `danger`
- `info`
- `offline`
- `pending`

## Status design

### Attendance

- Present
- Absent
- Unmarked

Never rely only on colour. Always include text or an icon.

### Synchronisation

- Synced
- Syncing
- Pending sync
- Sync failed
- Conflict resolved

### Roles

- Member
- Co-organiser
- Organiser
- Super organiser

Role badges must remain readable but visually secondary to attendance status.

## Motion

Use short functional motion:

- Scan success: checkmark and light haptic
- Bottom sheet: fast slide
- Realtime count update: subtle number transition
- Avoid long page animations during attendance
