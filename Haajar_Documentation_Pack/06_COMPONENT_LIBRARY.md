# Component Library

## Base UI strategy

- HeroUI Native: base components
- Stitch: visual composition and prototypes
- Dribbble and similar sites: inspiration only
- Custom components: attendance, scanner, QR, offline sync

Avoid combining multiple full UI frameworks.

## Layout components

- `ScreenContainer`
- `SafeAreaPage`
- `PageHeader`
- `SectionHeader`
- `BottomTabBar`
- `KeyboardAwareForm`

## Cards

- `EventCard`
- `GroupCard`
- `RollCallCard`
- `MemberCard`
- `JoinRequestCard`
- `AttendanceSummaryCard`
- `SyncStatusCard`
- `NotificationCard`

## Status components

- `RoleBadge`
- `AttendanceBadge`
- `SyncBadge`
- `ConnectionBadge`
- `PendingCountBadge`

## Buttons

- `PrimaryButton`
- `SecondaryButton`
- `DestructiveButton`
- `IconButton`
- `CallButton`
- `ScanButton`
- `FloatingScanButton`

## Form components

- `TextField`
- `PhoneField`
- `SelectField`
- `MultiSelectField`
- `ChoiceGroup`
- `YesNoField`
- `DynamicQuestionRenderer`
- `SearchField`

## Attendance components

- `QRScannerOverlay`
- `MemberVerificationSheet`
- `AttendanceProgress`
- `AttendanceMemberRow`
- `ScanSuccessOverlay`
- `OfflineBanner`
- `PendingSyncPanel`
- `AbsenteeRow`

## Feedback components

- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`
- `ConfirmationDialog`
- `Toast`
- `PermissionPrompt`
- `RetryPanel`

## Component requirements

Every shared component must support:

- Accessibility label
- Disabled state
- Loading state where relevant
- Error state where relevant
- Dark/light theme readiness
- Test identifier
