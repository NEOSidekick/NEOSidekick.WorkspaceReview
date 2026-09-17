/**
 * Hand-written client contract for Resources/Private/GraphQL/schema.root.graphql.
 * Every nullable SDL field is typed as `| null`, because the server sends null
 * rather than omitting the key.
 */

export type PropertyChangeKind =
    | 'TEXT'
    | 'VALUE'
    | 'LINK'
    | 'FORMATTING'
    | 'DATETIME'
    | 'IMAGE'
    | 'ASSET'
    | 'VISIBILITY'
    | 'NOTE';

export interface MediaRef {
    label: string;
    thumbnailUri: string | null;
    uri: string | null;
    filename: string | null;
}

export interface NodeRef {
    identifier: string;
    label: string;
    icon: string;
    dimensionLabel: string | null;
}

export interface PropertyChange {
    kind: PropertyChangeKind;
    property: string;
    label: string;
    detail: string | null;
    diffHtml: string | null;
    diffHtmlFull: string | null;
    changedText: string | null;
    original: string | null;
    changed: string | null;
    originalMedia: MediaRef | null;
    changedMedia: MediaRef | null;
    hidden: boolean | null;
    message: string | null;
    help: string | null;
}

export interface NodeChange {
    id: string;
    identifier: string;
    contextPath: string;
    nodePath: string;
    label: string;
    typeLabel: string;
    isNew: boolean;
    isMoved: boolean;
    isHidden: boolean;
    isRemoved: boolean;
    lastModified: number;
    publishable: boolean;
    properties: PropertyChange[];
}

export interface ChangedPage {
    id: string;
    node: NodeRef;
    nodePath: string;
    breadcrumb: NodeRef[];
    isNew: boolean;
    isMoved: boolean;
    isRemoved: boolean;
    previewUri: string | null;
    basePreviewUri: string | null;
    openUri: string | null;
    changes: NodeChange[];
}

export interface PageTreeEntry {
    node: NodeRef;
    depth: number;
    hasChildren: boolean;
    page: ChangedPage | null;
}

export interface Dimension {
    hash: string;
    label: string;
    pages: PageTreeEntry[];
}

export interface Site {
    name: string;
    dimensions: Dimension[];
}

export interface Workspace {
    name: string;
    title: string;
    baseWorkspaceTitle: string;
    canPublishToBase: boolean;
    sites: Site[];
}

export interface WorkspaceQueryResult {
    workspace: Workspace;
}

/** Feature flags from Neos.Neos.Ui.frontendConfiguration, see the architecture §5. */
export interface FeatureFlags {
    visualCompare: boolean;
}

/** Server-built URIs handed to the client through data attributes. */
export interface ModuleUris {
    rebase: string;
    publishWorkspace: string;
    discardWorkspace: string;
    index: string;
}

export type ViewMode = 'list' | 'visual';

export type PublishingAction = 'publish' | 'discard';
