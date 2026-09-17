/** One query for the whole review; it selects every field of schema.root.graphql. */
export const WORKSPACE_QUERY = `
    query Workspace($name: String!) {
        workspace(name: $name) {
            name
            title
            baseWorkspaceTitle
            canPublishToBase
            sites {
                name
                dimensions {
                    hash
                    label
                    pages {
                        depth
                        hasChildren
                        node {
                            ...NodeRefFields
                        }
                        page {
                            id
                            nodePath
                            isNew
                            isMoved
                            isRemoved
                            previewUri
                            basePreviewUri
                            openUri
                            node {
                                ...NodeRefFields
                            }
                            breadcrumb {
                                ...NodeRefFields
                            }
                            changes {
                                id
                                identifier
                                contextPath
                                nodePath
                                label
                                typeLabel
                                isNew
                                isMoved
                                isHidden
                                isRemoved
                                lastModified
                                publishable
                                properties {
                                    kind
                                    property
                                    label
                                    detail
                                    diffHtml
                                    diffHtmlFull
                                    changedText
                                    original
                                    changed
                                    hidden
                                    message
                                    help
                                    originalMedia {
                                        ...MediaRefFields
                                    }
                                    changedMedia {
                                        ...MediaRefFields
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    fragment NodeRefFields on NodeRef {
        identifier
        label
        icon
        dimensionLabel
    }

    fragment MediaRefFields on MediaRef {
        label
        thumbnailUri
        uri
        filename
    }
`;
