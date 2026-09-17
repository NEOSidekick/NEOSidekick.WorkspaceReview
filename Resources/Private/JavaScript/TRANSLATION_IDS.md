# Translation ids used by the React module

Every label of `Resources/Private/JavaScript` goes through
`window.NeosCMS.I18n.translate(id, fallback, 'NEOSidekick.WorkspaceReview', 'Main')`
(see `core/src/intl.tsx`). The table lists every id the client asks for together
with the English fallback that is compiled into the bundle, so the XLIFF
catalogue can be checked against it.

| id | English fallback | in en/Main.xlf |
| --- | --- | --- |
| `actions.back` | Back | yes |
| `actions.cancel` | Cancel | yes |
| `actions.cantPublishInNewPage` | A single element of a new page cannot be published on its own. | yes |
| `actions.confirmDiscardAll` | Really discard every change in this workspace? | **missing** |
| `actions.confirmDiscardSelected` | Really discard the selected changes? | yes |
| `actions.discardAll` | Discard all changes | yes |
| `actions.discardChange` | Discard this change | yes |
| `actions.discardSelected` | Discard selected changes | yes |
| `actions.editPage` | Edit the page | yes |
| `actions.openPage` | Open the page in this workspace | yes |
| `actions.publishAll` | Publish all changes to “{0}” | yes |
| `actions.publishChange` | Publish this change | yes |
| `actions.publishSelected` | Publish selected changes to “{0}” | yes |
| `change.lastModified` | Last change | yes |
| `mode.label` | View | yes |
| `mode.unified` | Change list | yes |
| `mode.unifiedHelp` | Every change as a card with the changed words | yes |
| `mode.visual` | Visual compare | yes |
| `mode.visualHelp` | The page as it will look, with the changes marked in place | yes |
| `navigation.currentPage` | Current page | yes |
| `navigation.help.back` | back to the list | yes |
| `navigation.help.review` | review page | yes |
| `navigation.pages` | Changed pages | yes |
| `navigation.unchangedPage` | Unchanged page with changed subpages | yes |
| `review.changedSinceReview` | Changed since your review | yes |
| `review.changedSinceReviewHelp` | This page was edited again after you marked it as reviewed. The reviewed mark was therefore removed, so please look through its changes once more. | yes |
| `review.collapse` | Hide the changes of this page | yes |
| `review.expand` | Show the changes of this page | yes |
| `review.loading` | Loading the changes… | yes |
| `review.loadingFailed` | The changes of this workspace could not be loaded. | yes |
| `review.markReviewed` | Mark page as reviewed and collapse it | yes |
| `review.noChanges` | This workspace has no unpublished changes. | yes |
| `review.progress` | {0}/{1} reviewed | yes |
| `review.retry` | Try again | yes |
| `review.reviewed` | Reviewed | yes |
| `selection.all` | Select all changes | yes |
| `selection.change` | Select this change | yes |
| `selection.count` | {0} selected | yes |
| `selection.page` | Select all changes of this page | yes |
| `shortcuts.backToPage` | back to the page heading | yes |
| `shortcuts.close` | Close | yes |
| `shortcuts.firstLastPage` | first / last page | yes |
| `shortcuts.groupChanges` | Changes | yes |
| `shortcuts.groupPages` | Pages | yes |
| `shortcuts.groupReview` | Review | yes |
| `shortcuts.help` | show this overview | yes |
| `shortcuts.nextChange` | next change on the page | yes |
| `shortcuts.nextPage` | next page | yes |
| `shortcuts.open` | Show the keyboard shortcuts | yes |
| `shortcuts.previousChange` | previous change on the page | yes |
| `shortcuts.previousPage` | previous page | yes |
| `shortcuts.title` | Keyboard shortcuts | yes |
| `shortcuts.toggleMode` | switch between change list and visual compare | yes |
| `shortcuts.toggleReviewed` | mark the page as reviewed / not reviewed | yes |
| `status.created` | created | yes |
| `status.deleted` | deleted | yes |
| `status.edited` | changed | yes |
| `status.hidden` | hidden | yes |
| `status.moved` | moved | yes |
| `visibility.hidden` | Element was hidden | yes |
| `visibility.shown` | Element was made visible | yes |
| `visual.legend` | Marker colours | yes |
| `visual.newPage` | New page: everything on it is published for the first time. | yes |
| `visual.removedPage` | Deleted page: shown as currently published, all of it is removed. | yes |
| `visual.showInList` | Show this change in the change list | yes |
| `visual.unavailable` | The page could not be rendered for the visual compare. | yes |
| `visual.unlocated` | Not visible on the rendered page | yes |
| `visual.unplaced` | Deleted elements whose former place could not be determined | yes |

## Ids the catalogue is still missing

- `actions.confirmDiscardAll` – "Really discard every change in this workspace?"

`actions.cancel` labels the cancel button of both confirmation dialogs,
`actions.confirmDiscardAll` the question of the "discard all changes" dialog.

## Notes

- Ids the client never asks for are server-side labels (`link.*`, `format.*`,
  `value.*`, `position.*`, `system.*`, the `change.*` messages, `diff.*`), which
  the PHP side renders into `PropertyChange.label`, `.detail` and `.message`.
- `visual.loading` and `visual.disabled` are unused so far: a frame shows a
  status line only after a failed load (`visual.unavailable`), and a switched-off
  visual compare hides the view switch instead of explaining it.
