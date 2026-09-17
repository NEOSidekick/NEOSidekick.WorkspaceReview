# README showcase

The previews were captured on 17 September 2026 from the running package at
`https://neospackagedevelopment.ddev.site/`, using the German Neos backend,
workspace `user-admin`, base workspace `live`, and content dimension `language=de`.
All content changes are local drafts. The showcase has 11 changed elements on four pages;
the focused autumn-program review contains eight of them.

The README plates use AI-assisted annotation and composition based on these captures.
The original, unannotated browser screenshots below are the reference for exact UI
text and appearance. Numbered mint callouts and English headlines are documentation
annotations, not controls in the package.

## Original captures

| Capture | Demonstrates |
| --- | --- |
| [Single-page change list](Screenshots/01-change-list.jpg) | Page filter, ancestor tree, dimension label, translated settings, external link target, bold formatting, condensed word diff, page-scoped actions and access to other changes |
| [Lifecycle cards](Screenshots/02-statuses.jpg) | Readable sibling position, unchanged-wording explanation, hidden and created badges |
| [Visual text comparison](Screenshots/03-visual-text.jpg) | Inline word diffs, orange change outlines and a deleted image restored with a red overlay |
| [Visual lifecycle markers](Screenshots/04-visual-statuses.jpg) | Moved, changed, hidden and created elements in the rendered layout |
| [Rendered replacement image](Screenshots/05-visual-media.jpg) | A changed page in the website's own layout |
| [Media and batch selection](Screenshots/06-media-selection.jpg) | Before/after image thumbnails, gallery removal, boolean labels, selection across two pages and an explicit selection count |
| [Action scope help](Screenshots/07-action-scope.jpg) | The info icon explains the native Neos content cascade and publishing dependencies |
| [Keyboard help](Screenshots/08-keyboard.jpg) | Page navigation, change navigation, view switching and shortcut overview |
| [Internal links and window behavior](Screenshots/09-links.jpg) | Internal targets resolved to page labels and same-tab to new-tab changes |

## Demo content

The existing autumn-program fixtures were retained. Media examples were added through
the Neos backend. Only the local development database and its media store were changed;
no production content or shared demo credentials are included in this package.

| Local page | Draft examples |
| --- | --- |
| Site | “Anfahrt und Kontakt” points from Text Hero to Image Hero; “PDF herunterladen” changes from the same tab to a new tab |
| Herbstprogramm 2026 | Spacing changes from Groß to Klein; the program link changes from HTTP to HTTPS; “18 Uhr,” becomes bold; the ticket paragraph changes 15. → 1. September, 12 → 14 Euro, and 8 → 9 Euro; the contents list becomes visible; an image is deleted; Konzerte moves from third to first; Lesungen keeps an unchanged-wording explanation; Workshops is hidden; a new foyer announcement is added |
| Image Hero | The abstract `hero-image.jpg` is replaced by [herbstprogramm-buehne.png](Fixtures/herbstprogramm-buehne.png) |
| Text Hero | The gallery changes from three copies of `hero-image.jpg` to two, and its lightbox is disabled |

The replacement stage photograph is AI-generated fictional demo artwork. It contains
no real event or venue claim. The fixture file is included to recreate the media example.

## Recreate the views

1. Start the local NeosPackageDevelopment project with the package linked and its
   committed frontend assets built. Visual comparison must be enabled on this
   Fusion-rendered website.
2. In the Neos backend, prepare the published baseline before making the draft
   edits in the table above. Preserve these existing drafts when using the current
   development database; publishing or discarding them removes the comparison.
3. Open **Management → Workspaces → your workspace**. The whole-workspace view
   should show four changed pages and eleven elements for this fixture.
4. Open the focused autumn-program review with these module arguments, URL-encoded:

   ```text
   moduleArguments[workspace][__identity]=user-admin
   moduleArguments[document]=/sites/site/node-3ckjjeh74a9nh/node-cfp9hn0bx51vr@user-admin;language=de
   ```

   The heading names Herbstprogramm 2026; the footer offers all eight shown changes
   and a link to the other pages. This context path belongs to the current local
   fixture, so use the page's own context path in another database.
5. Capture the first two cards in the change list, then scroll down for the
   position, explanation, visibility and creation examples.
6. Switch to visual comparison with **D**. Focus the page in the sidebar, then use
   **]** to navigate its changes. Capture the text/deleted-image area and the
   Konzerte/Lesungen/Workshops/new-announcement area separately.
7. Return to the whole workspace, select the Image Hero change and the Text Hero
   gallery change, and collapse the autumn-program section. The footer should say
   two changes are selected. Open its info icon to show the scope explanation.
8. Open **?** for keyboard help. Clear the selection when finished, leaving the
   drafts available for interactive review.

Use normal viewport screenshots; the captures here are 1280 × 720. Avoid full-page
stitching of nested preview frames. The README's annotated plates are 1672 × 941.
Verify rendered text, statuses, selection counts and dialog copy against the raw
captures when refreshing the annotations.

The demo shows one language dimension with its actual label. It does not claim
multilingual coverage or Next.js visual-comparison support.
