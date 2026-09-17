import * as React from 'react';
import classnames from 'classnames';
import { Icon } from '@neos-project/react-ui-components';
import {
    LINK_ATTRIBUTE,
    NodeTypeIcon,
    SrOnly,
    useIntl,
    useJumpToPage,
    useReviewState,
} from '@neosidekick/workspace-review-core';
import type { TreeRow } from '@neosidekick/workspace-review-core';

import styles from './PageTreeRow.module.css';

/** The chevron, node type icon and label shared by both row kinds. */
function RowContent({ row }: { row: TreeRow }) {
    const translate = useIntl();
    return (
        <>
            <span className={styles.chevron}>{row.hasChildren && <Icon icon="caret-down" />}</span>
            <span className={styles.icon}>
                <NodeTypeIcon icon={row.node.icon} />
            </span>
            <span className={classnames(styles.label, row.node.isHidden && styles.hiddenPage)}>{row.node.label}</span>
            {row.node.isHidden && (
                <span className={styles.hiddenMark} title={translate('status.hidden', 'hidden')}>
                    <Icon icon="eye-slash" />
                    <SrOnly>{translate('status.hidden', 'hidden')}</SrOnly>
                </span>
            )}
        </>
    );
}

export function PageTreeRow({ row }: { row: TreeRow }) {
    const translate = useIntl();
    const jumpTo = useJumpToPage();
    const { activePageIndex } = useReviewState();
    const style = { '--review-depth': row.depth } as React.CSSProperties;

    if (!row.page) {
        return (
            <li className={styles.item} style={style}>
                <span
                    className={classnames(styles.row, styles.ancestor)}
                    title={translate('navigation.unchangedPage', 'Unchanged page with changed subpages')}
                >
                    <RowContent row={row} />
                </span>
            </li>
        );
    }

    const linkAttributes = { [LINK_ATTRIBUTE]: row.pageIndex };

    return (
        <li className={styles.item} style={style}>
            <a
                {...linkAttributes}
                className={classnames(styles.row, styles.link)}
                href={`#page-${row.page.id}`}
                aria-current={activePageIndex === row.pageIndex ? 'location' : undefined}
                title={activePageIndex === row.pageIndex ? translate('navigation.currentPage', 'Current page') : undefined}
                onClick={(event) => {
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
                    event.preventDefault();
                    // A keyboard activation (detail 0) moves on to the page itself.
                    jumpTo(row.pageIndex, event.detail === 0);
                }}
            >
                <RowContent row={row} />
                {row.node.dimensionLabel && (
                    <span className={styles.dimensions}>
                        <span className={styles.dimensionLabel}>{row.node.dimensionLabel}</span>
                    </span>
                )}
            </a>
        </li>
    );
}
