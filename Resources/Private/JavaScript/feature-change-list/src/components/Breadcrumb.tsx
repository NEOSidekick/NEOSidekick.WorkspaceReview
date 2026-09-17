import * as React from 'react';
import { Icon } from '@neos-project/react-ui-components';
import type { NodeRef } from '@neosidekick/workspace-review-core';

import styles from './PageSection.module.css';

/** The path of a page as node labels with their node type icons. */
export function Breadcrumb({ nodes }: { nodes: NodeRef[] }) {
    if (!nodes.length) return null;
    return (
        <span>
            {nodes.map((node, index) => (
                <span className={styles.crumb} key={`${node.identifier}-${index}`}>
                    {index > 0 && (
                        <span className={styles.separator}>
                            <Icon icon="chevron-right" />
                        </span>
                    )}
                    <Icon icon={node.icon || 'fas fa-file'} />
                    {node.label}
                </span>
            ))}
        </span>
    );
}
