# README showcase

The previews were captured on 17 September 2026 from the running package at
`https://neospackagedevelopment.ddev.site/`, using the English Neos backend,
workspace `user-admin`, and base workspace `live`. The demo copy and editor labels
are in English. The fixture remains in its existing `language=de` content dimension,
whose English display label is **German**; this label describes the dimension,
not the backend interface language.

The showcase has 11 unpublished changes on four pages. The autumn-program page
contains eight of them. Only the local development database, media store, user
language preference and development configuration were changed. The published
baseline and draft copy were translated together to preserve meaningful diffs;
the original fixture properties and ordering were backed up locally first.

The README plates use AI-assisted annotation and composition based on these captures.
The original browser screenshots below are the reference for exact UI text and
appearance. Mint callouts and English headlines are documentation annotations,
not controls in the package.

## Preview highlights

1. **Understand exactly what will change.** Configurations, word-by-word comparison,
   links and formatting, explicit statuses, and readable sibling positions. The
   position card is a separately labelled screenshot excerpt.
2. **See changes in page previews.** One full backend screenshot, with the iframe
   scrolled to show created content, text editing and a deleted image together.
3. **Review media. Choose what to publish.** Red/green before-and-after image
   borders, gallery changes, and selection across pages. There is no native-actions
   feature callout in this plate.
4. **Stay in control of your review.** English action-scope and keyboard help.

## Original captures

| Capture | Demonstrates |
| --- | --- |
| [Change list](Screenshots/01-change-list.jpg) | Created badge, readable configuration, external link target, bold formatting and condensed word diff |
| [Lifecycle cards](Screenshots/02-statuses.jpg) | Deleted image, readable sibling position, unchanged-wording explanation and hidden badge |
| [Full visual comparison](Screenshots/03-visual-text.jpg) | Created content, inline word diffs and a deleted image restored with a red overlay, in one full backend view |
| [Rendered replacement image](Screenshots/05-visual-media.jpg) | A changed page in the website's own layout |
| [Media and batch selection](Screenshots/06-media-selection.jpg) | Red/green image borders, gallery removal, boolean labels, selection across two pages and an explicit selection count |
| [Action scope help](Screenshots/07-action-scope.jpg) | The info icon explains the native Neos content cascade and publishing dependencies |
| [Keyboard help](Screenshots/08-keyboard.jpg) | Page navigation, change navigation, view switching and shortcut overview |
| [Internal links and window behavior](Screenshots/09-links.jpg) | Internal targets resolved to page labels and same-tab to new-tab changes |

## Demo content

| Local page | Draft examples |
| --- | --- |
| Site | “Directions and contact” points from Text Hero to Image Hero; “download the PDF” changes from the same tab to a new tab |
| Autumn Program 2026 | Spacing changes from Large to Small; the program link changes from HTTP to HTTPS; “6 pm” becomes bold; the ticket paragraph changes September 15 → 1, €12 → €14, and €8 → €9; the contents list becomes visible; an image is deleted; Concerts moves from third to first; Readings keeps an unchanged-wording explanation; Workshops is hidden; a new foyer announcement is added |
| Image Hero | The abstract `hero-image.jpg` is replaced by [herbstprogramm-buehne.png](Fixtures/herbstprogramm-buehne.png) |
| Text Hero | The gallery changes from three copies of `hero-image.jpg` to two, and its lightbox is disabled |

The created announcement appears before the other autumn-program content so creation,
text editing and image deletion can be reviewed together in the visual comparison.
The replacement stage photograph is AI-generated fictional demo artwork. It contains
no real event or venue claim. The fixture file is included to recreate the media example.

## Recreate the views

1. Start the local NeosPackageDevelopment project with this package linked and its
   frontend assets built. Visual comparison must be enabled on this Fusion-rendered
   website.
2. Set **User Settings → Interface Language → English** and save the user.
3. The CodeQ.Site demo has some hard-coded German NodeType labels. For this local
   fixture only, copy [NodeTypes.WorkspaceReviewDemo.yaml](Fixtures/NodeTypes.WorkspaceReviewDemo.yaml)
   and [Settings.WorkspaceReviewDemo.yaml](Fixtures/Settings.WorkspaceReviewDemo.yaml)
   to the project's `Configuration/Development/` directory, then run
   `ddev exec ./flow flow:cache:flush`. These are demo overrides, not package defaults.
   Do not overwrite existing files with unrelated settings.
4. Prepare the published baseline before making the draft edits in the table above.
   Use English copy in both versions. Preserve the existing local drafts when using
   the current database; publishing or discarding them removes the comparison.
5. Open **Management → Workspaces → your workspace**. The full workspace should
   contain four changed pages and eleven elements. Select Autumn Program 2026 in
   the sidebar. Capture its first three cards, then scroll to the moved Concerts
   card for the position excerpt.
6. Switch to visual comparison with **D**. Focus Autumn Program 2026 in the sidebar
   and press **]** to reach the new announcement. Scroll inside the iframe until
   the green announcement, orange text changes and red deleted image are visible
   together. Keep the page header, sidebar and footer in the full screenshot.
7. Return to the change list, select the Image Hero change and the Text Hero gallery
   change, and collapse the autumn-program section. The footer should say two changes
   are selected. The old image has a red border; its replacement has a green border.
8. Capture the info dialog and **?** keyboard help in English. Clear the selection
   when finished, leaving the drafts available for interactive review.

Use normal viewport screenshots; the original captures here are 1280 × 720 JPEGs.
Avoid full-page stitching of nested preview frames. The README's annotated plates
are 1672 × 941 PNGs. Verify rendered text, statuses, selection counts and dialog copy
against the original captures when refreshing the annotations.

The demo shows one content dimension. It does not claim multilingual coverage or
Next.js visual-comparison support.
