import * as React from 'react';
import { useEffect, useRef } from 'react';
import classnames from 'classnames';
import { Icon } from '@neos-project/react-ui-components';
import {
    CHANGE_ATTRIBUTE,
    CHANGE_PAGE_ATTRIBUTE,
    useIntl,
    useReviewActions,
    useReviewState,
} from '@neosidekick/workspace-review-core';
import type { NodeChange } from '@neosidekick/workspace-review-core';
import { CardActions, NodeCheckbox } from '@neosidekick/workspace-review-publishing';

import styles from './ChangeCard.module.css';
import { PropertyChangeView } from './PropertyChangeView';
import { StatusBadges } from './StatusBadges';
import { absoluteDate, backendLocale, relativeDate } from '../relativeDate';

interface ChangeCardProps {
    change: NodeChange;
    changeIndex: number;
    pageIndex: number;
}

/** One changed element with one entry per effect publishing would have. */
export function ChangeCard({ change, changeIndex, pageIndex }: ChangeCardProps) {
    const translate = useIntl();
    const actions = useReviewActions();
    const { highlightedChangeId } = useReviewState();
    const cardRef = useRef<HTMLDivElement>(null);
    const isHighlighted = highlightedChangeId === change.id;
    const locale = backendLocale();

    // Opened from the visual compare: the card takes focus and flashes once.
    useEffect(() => {
        if (!isHighlighted) return;
        const element = cardRef.current;
        element?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        element?.focus({ preventScroll: true });
        const timer = window.setTimeout(() => actions.clearHighlight(), 1600);
        return () => window.clearTimeout(timer);
    }, [actions, isHighlighted]);

    const markers = { [CHANGE_ATTRIBUTE]: changeIndex, [CHANGE_PAGE_ATTRIBUTE]: pageIndex };

    return (
        <div
            {...markers}
            ref={cardRef}
            id={`change-${change.id}`}
            tabIndex={-1}
            className={classnames(styles.card, isHighlighted && styles.highlight)}
        >
            <NodeCheckbox change={change} />
            <div className={styles.body}>
                <div className={styles.header}>
                    <span className={styles.label}>{change.label}</span>
                    <span className={styles.type}>{change.typeLabel}</span>
                    <StatusBadges change={change} />
                    <span
                        className={styles.meta}
                        title={`${translate('change.lastModified', 'Last change')}: ${absoluteDate(
                            change.lastModified,
                            locale
                        )}`}
                    >
                        <Icon icon="clock" padded="right" />
                        {relativeDate(change.lastModified, locale)}
                    </span>
                </div>
                {change.properties.map((property, index) => (
                    <PropertyChangeView
                        key={`${property.property}-${property.kind}-${index}`}
                        property={property}
                        change={change}
                        isRemoved={change.isRemoved}
                    />
                ))}
            </div>
            <CardActions change={change} />
        </div>
    );
}
