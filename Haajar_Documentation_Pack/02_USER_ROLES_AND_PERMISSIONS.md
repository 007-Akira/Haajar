# User Roles and Permissions

## Roles

- Member
- Co-organiser
- Organiser
- Super organiser

## Permission matrix

| Capability | Member | Co-organiser | Organiser | Super organiser |
|---|---:|---:|---:|---:|
| View assigned groups | Yes | Yes | Yes | Yes |
| View all event groups | No | No | Managed groups only | Yes |
| View group members | Yes | Yes | Yes | Yes |
| View group phone numbers | Yes | Yes | Yes | Yes |
| Display personal group QR | Yes | Yes | Yes | Yes |
| Scan attendance QR | No | Yes | Yes | Yes |
| Mark attendance manually | No | No | Yes | Yes |
| Start group roll call | No | No | Yes | Yes |
| Start central roll call | No | No | No | Yes |
| Approve join requests | No | No | Yes | Yes |
| Reject join requests | No | No | Yes | Yes |
| Promote/demote members | No | No | Yes | Yes |
| Assign organisers | No | No | No | Yes |
| Edit registration answers | No | No | Yes | Yes |
| Edit locked questions | No | No | No | No |
| Export group attendance | No | No | Yes | Yes |
| Export full event attendance | No | No | No | Yes |
| Archive group | No | No | Yes | Yes |
| View audit logs | No | No | Limited | Yes |

## Permission enforcement

Permissions must be enforced in three layers:

1. UI visibility
2. Application service checks
3. Supabase Row Level Security and database functions

Hiding a button is not security. Every protected mutation must be validated server-side.
