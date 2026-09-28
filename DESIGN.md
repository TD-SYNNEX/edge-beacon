# AI Atlas design foundation

The supplied [TD SYNNEX Design System](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/) is the visual authority for this revision. Its pilot 0.1.0 pages and stylesheet were inspected on September 15, 2026, along with desktop screenshots. These decisions supersede the previous public-homepage styling. The reference documents proposed digital extensions; adopting it does not imply corporate brand approval.

## Verified tokens and assets

| Element          | Value                        | Source                                                 |
| ---------------- | ---------------------------- | ------------------------------------------------------ |
| Deep teal        | `#003031`                    | Color foundation; primary text and dark surfaces       |
| Teal             | `#005758`                    | Primary actions and links                              |
| Green            | `#2D9F88`                    | Supporting brand color                                 |
| Aqua             | `#08BED5`                    | Small accents and focus on dark surfaces               |
| Chartreuse       | `#CCD814`                    | Small display-type accent on deep teal                 |
| White            | `#FFFFFF`                    | Main reading surfaces                                  |
| Light grey       | `#F0F0F0`                    | Recessed panels and icon housings                      |
| Cool grey        | `#D9D8D7`                    | Subtle dividers                                        |
| Secondary text   | `#466263`                    | Reference semantic UI token                            |
| Control boundary | `#698687`                    | Reference strong-border UI token                       |
| Typography       | Arial, Helvetica, sans-serif | Reference's approved fallback implementation           |
| Corners          | 2px                          | Reference component token                              |
| Motion           | 120ms / 200ms                | Reference duration tokens; disabled for reduced motion |
| Icons            | Lucide line icons            | Reference's proposed digital icon set                  |

Sources:

- [Color](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/foundations/color)
- [Typography](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/foundations/typography)
- [Icons and imagery](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/foundations/icons)
- [Design tokens](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/tokens)
- [Partner portal example](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/templates/portal)
- [Header logo asset](https://tdsnx-design-system-tanishq-thakkars-projects.vercel.app/brand/td-synnex-logo.png)

`src/styles/tokens.css` holds the shared values. The header uses the source logo unchanged, preserving its proportions and clear space. The reference uses Arial because licensed Everett files were not included in that system. AI Atlas follows that choice for consistency; the previously supplied Everett files are retained as legacy assets but are not used by the interface.

## Application of the system

- A deep-teal brand header, white navigation rail, and subtle active-navigation background mirror the reference's application shell.
- A compact discovery hero establishes hierarchy with a chartreuse heading accent and actual catalog counts. No invented customer results or performance metrics are shown.
- Forms, cards, filters, and comparison tables use rectangular geometry, strong control boundaries, and readable spacing.
- Lucide icons are 18–20px in controls and 24px in 48px circular housings. Decorative icons are hidden from assistive technology.
- Body text defaults to 16px, control labels to 14px, and secondary metadata to 12px. Content uses sentence case and left alignment.
- The catalog renders 12 use cases at a time with previous/next controls. Search and filter changes return to the first page.
- Mobile layouts stack fields and cards; tablets use two-column cards. Comparison tables scroll independently instead of expanding the page.

## Interaction and accessibility

- Semantic links, buttons, visible form labels, native dialogs, Escape handling, focus restoration, and a skip link remain available.
- Hidden mobile navigation is inert; an open mobile menu makes the underlying workspace inert. Breakpoint changes restore desktop access.
- Keyboard focus has an explicit visible treatment, including aqua outlines on the dark header.
- Matching results use a live region and busy state. New input aborts pending requests and invalidates stale results.
- Status text distinguishes guided catalog matching from AI-assisted discovery. AI failures provide an explicit guided fallback.
- Brief content remains editable before copy or download. Shortlists and draft context persist only in the browser.

## Content and server behavior

The migration preserves the original catalog and planning content: 12 capabilities and 375 use cases spanning 14 product lines and 15 verticals. Dates, costs, learning access, and engagement formats remain planning material requiring confirmation.

TypeScript contracts cover the frontend, catalog, matcher, API, build scripts, and tests. API request and provider-response boundaries also perform runtime validation. Credentials remain server-only; account aliases are excluded from provider requests; generated text is escaped before rendering.

Perspective controls do not grant account permissions. A downloaded brief does not submit a request, send communications, update a CRM, book an event, or deploy an implementation.
