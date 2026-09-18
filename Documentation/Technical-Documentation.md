# Technical Documentation

## What reviewers see

Every changed node becomes one card with one entry for each effect publishing would have. Cards are grouped beneath their page header. When no renderable property changed, the card explains why instead of staying empty.

| Entry        | Appears when                                                                 | Reads like                                                          |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Text         | the wording changed                                                          | `… startet am ~~15.~~ 1. September, Karten kosten ~~12~~ 14 Euro …` |
| Link         | a link points elsewhere, opens differently, or words were linked or unlinked | `Link "Anfahrt und Kontakt" · Text Hero → Image Hero`               |
| Formatting   | the same words carry different formatting                                    | `"18 Uhr," · no formatting → bold`                                  |
| Value        | a property changed, shown with its editor labels                             | `Abstand unten · Groß → Klein`                                      |
| Position     | a node was reordered among its siblings                                      | `Position · 3 of 3 → 1 of 3`                                        |
| Image, Asset | media was replaced                                                           | the published and the new file side by side, framed red and green                         |
| Visibility   | a node was hidden or made visible                                            | `Visible → Hidden`                                                  |
| Note         | nothing renderable changed                                                   | an explanation of the remaining difference                          |

The card header names the element type next to the node label, because the label is usually the element's own text ("Minimalismus" alone does not say that a headline was hidden), and shows whether the node was created, deleted, moved or hidden. A deleted element shows its values struck through only, without an arrow to an empty new value.

### Detailed behavior

- **Text changes** are compared word by word. An unchanged run longer than two dozen words collapses to the words surrounding the edit plus an ellipsis. Deleted words are struck through in addition to their colouring, and each edited run starts with a visually hidden "deleted:" or "added:" label, because `<del>` and `<ins>` alone are not reliably announced by screen readers. HTML entities are decoded before comparison, so titles show `&` instead of `&amp;`.
- **Configuration values** use translated `editorOptions.values` labels, such as "Kein Abstand" instead of `none`. Booleans render as Yes or No, references as node labels. A property changed back to its NodeType default is still reported.
- **Gallery and asset lists** compare persisted asset identities in order. Replacements, additions, removals and reordering show asset titles or filenames; equally named lists include identifiers to distinguish them.
- **Links and formatting** are compared a second time on the markup level, conservatively: a link pointing elsewhere (internal `node://` and `asset://` targets resolved to page and asset names), a changed window behavior, links added or removed even alongside rewritten or newly created text, and bold, italic, underline, strikethrough, subscript, superscript, code, highlight and heading-level changes per passage. Two targets that resolve to the same label keep their raw URIs, so the result never claims `X → X`.
- **Position and status**: a moved node shows its place among siblings, such as `3 of 3 → 1 of 3`. An index changed only by sibling renumbering is identified as internal re-sorting.
- **Changes without a visible diff** use three distinct notes: "Changed – the wording is unchanged, please check details in the preview.", "Edited, but matching the published version again – no content differences found." and "No visible changes (internal update)."

### Visual compare

Visual comparison currently supports Fusion-rendered websites. Next.js/Zebra frontends need a dedicated preview adapter: the current endpoint can render their structured Neos editing view instead of the public layout, and deleted elements may be missing. WorkspaceReview automatically disables visual comparison when Flow reports the Zebra integration package `Networkteam.Neos.Next` as available. The change list remains usable. Detection applies to the whole installation; mixed Fusion/Zebra installations can override it explicitly.

The switch above the review stream, or **D**, toggles between the change list and the visual compare, which renders the reviewed workspace in the site's own layout and adds status labels and outlines to changed elements: green for created, orange for changed, blue for moved, hatched grey for hidden and a red overlay for a deleted element restored from the published rendering. Text edits appear in place when the new wording can be matched to a text element on the page. Changes with no visible matching element are listed below the frame with links to their cards.

### Keyboard review

| Keys | Action |
| --- | --- |
| **↓ / J**, **↑ / K** | next / previous page |
| **Home / End** | first / last page |
| **Enter** | focus the page in the review stream (from the sidebar) |
| **]** / **[** | next / previous change on the page |
| **D** | switch between change list and visual compare |
| **Esc** | one step back, or close the overlay |

Shortcuts stay off inside form controls, and modifier combinations are left to the browser.

### Review a single page

The review accepts an optional `document` module argument with the context path of a document node. Another package, a bookmark or a message to a reviewer can link straight to the changes of one page:

```
/neos/management/workspaces/show?moduleArguments[workspace][__identity]=user-admin&moduleArguments[document]=/sites/site/blog/post@user-admin%3Blanguage=de
```

What the argument changes:

- **The review lists only that page.** The heading reads "Review changes on *Page title*", the subtitle counts its changed elements, and the page tree shows the page with the ancestors that lead to it.
- **The batch buttons act on that page only.** "Publish all" and "Discard all" post everything shown through the batch form instead of calling the core actions for the whole workspace. Selecting single changes and the buttons of a single element work as in the full review.
- **Other changes stay reachable.** If other pages have changes too, the footer says "There are more changes on other pages, show all" and links to the review without the argument.
- **A page without changes says so.** Instead of an empty list, a notice states that the page has no unpublished changes and links to the whole workspace.
- **New pages are published with what they need.** A new page is published together with the new or moved pages it lives in, as in the full review, even though the filter hides them.
- **Discard stays within the shown page.** Hidden ancestors needed for publishing are excluded from both "Discard all" and "Discard selected". The discard count reflects that narrower scope.

The value of the argument:

| Value | Matches |
| --- | --- |
| `/sites/site/blog/post@user-admin%3Blanguage=de` | that page in that dimension combination |
| `/sites/site/blog/post` | every dimension variant of the page |

The `;` of a context path has to be URL-encoded as `%3B`, because a query string ends an argument at a plain `;`. A context path cut off there arrives without its dimension part and is treated like the plain node path. The workspace part of the value is ignored; the review is about the workspace it was opened for.

After publishing or discarding, the inherited core action returns to the review of the whole workspace.

## Configuration

```yaml
Neos:
  Neos:
    Ui:
      frontendConfiguration:
        'NEOSidekick.WorkspaceReview':
          visualCompare: null   # automatic detection (default)
```

With `null` (or no value), visual comparison is enabled unless `Networkteam.Neos.Next` is available. Set `false` to disable it on any installation, or `true` to enable it explicitly, for example after installing a compatible preview adapter. Enabling it alone does not add Zebra rendering support. Use YAML booleans, not quoted strings.

When disabled, the review stays in the change-list view, even if visual comparison was previously selected. The view switch and visual-comparison keyboard shortcut are hidden/disabled.

`showAction` resolves detection, reads that namespace and renders it into the `data-features` attribute of the application root, which is how a Neos UI setting reaches a backend module.

Word-diff thresholds (24 context words, 50 edited words) are constants in `Domain\Diff\WordDiffer`: they shape server-rendered HTML and therefore cannot be client-side flags.

After installing the package into a running website, sign out of Neos and sign back in so the session picks up the new backend request patterns.

The info icon beside publishing and discarding actions explains Neos’s recursive behavior: pages and containers include their nested content, even when those child changes are not selected. Child pages are excluded from that content cascade. The native publishing and discarding behavior is unchanged.

## GraphQL API

The review data is served read-only by this package’s `GraphQLController` at `neos/graphql/workspace-review`, described by `Resources/Private/GraphQL/schema.root.graphql`. It uses `webonyx/graphql-php` directly and supports both the 0.13 library used by older Media UI installations and version 15 used by newer installations. It does not change other packages’ GraphQL endpoints or field resolvers. One query answers the whole review:

```graphql
query { workspace(name: "user-admin") { name canPublishToBase sites { name dimensions { hash label pages { depth hasChildren page { id changes { label properties { kind label diffHtml } } } } } } } }
```

There are no mutations: publishing and discarding stay the core module controller's actions, reached through Flow forms with their CSRF token. The endpoint is bound to the `Neos.Neos:Backend` authentication provider, and `QueryResolver` refuses any workspace the current user may not read; such a denial is a client-safe GraphQL error that writes no exception log.

## Development

The client lives in `Resources/Private/JavaScript` as Yarn workspaces and is built with esbuild into the committed bundles `Resources/Public/Assets/main.bundle.js|css`:

```bash
yarn install
yarn build     # or: yarn watch
```

`ddev` serves the built files directly, so there is no dev server.

## Technical implementation

- `Configuration/Settings.yaml` replaces the controller of `management/workspaces` with `NEOSidekick\WorkspaceReview\Controller\Module\Management\WorkspacesController`, which extends the Neos core controller and overrides only `showAction`.
- `Configuration/Policy.yaml` grants the inherited core controller actions, the resolver and the preview to `Neos.Neos:AbstractEditor`. Without the first grant, the module's method-based privilege matching would return 403 after the controller replacement.
- `Domain\Service\ReviewService` carries a ported copy of the core's `computeSiteChanges()` grouping loop, because that method is protected and the GraphQL query is a separate request without a module controller instance.
- `Domain\Service\NodeChangeService` is the type-aware replacement for the core's `renderContentChanges()`, `Domain\Diff\WordDiffer` the word-level diff and `Domain\Diff\RichTextDiffer` the markup-level comparison, which has no injected dependencies and no content repository knowledge.
- `Controller/PreviewController.php` renders pages through `neos/workspace-review/preview` with the Fusion content cache disabled and `Cache-Control: no-store`.
- `Resources/Private/Fusion/Root.fusion` adds node identifiers to `Neos.Neos:ContentComponent` and `Neos.Neos:Content` in that preview and suppresses the Neos.Ui editing scripts there. Public page rendering is unaffected.
- The controller points the view at this package's templates and at the Neos layouts in `initializeView()`, because Flow applies only the single heaviest-matching `Views.yaml` entry rather than merging them.

## Tests

```bash
ddev exec bin/phpunit --configuration Build/BuildEssentials/PhpUnit/UnitTests.xml \
  DistributionPackages/NEOSidekick.WorkspaceReview/Tests/Unit
```

GitHub Actions runs the same suite plus `phpcs` and `phpstan` on PHP 8.2 × Neos 8.3 and PHP 8.4 × Neos 8.4.
