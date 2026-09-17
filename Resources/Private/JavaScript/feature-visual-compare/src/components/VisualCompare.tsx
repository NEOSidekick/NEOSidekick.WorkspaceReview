import * as React from 'react';
import { useEffect, useRef } from 'react';
import classnames from 'classnames';
import {
    STATUS_LABELS,
    changeStatusOf,
    registerVisualFrame,
    useIntl,
    useReviewActions,
} from '@neosidekick/workspace-review-core';
import type { ChangeStatus, ChangedPage } from '@neosidekick/workspace-review-core';

import styles from './VisualCompare.module.css';
import { createVisualFrame } from '../frameDecorator';
import type { FrameChange, VisualFrame } from '../frameDecorator';

interface VisualCompareProps {
    page: ChangedPage;
    /** Kept mounted while the change list is shown, so the frame is loaded once. */
    hidden: boolean;
}

/** What the change cards of a page know about each changed element. */
function collectFrameChanges(page: ChangedPage): FrameChange[] {
    return page.changes.map((change) => ({
        identifier: change.identifier,
        changeId: change.id,
        status: changeStatusOf(change),
        label: change.label,
        type: change.typeLabel,
        textDiffs: change.properties
            .filter((property) => property.kind === 'TEXT' && property.changedText && property.diffHtmlFull)
            .map((property) => ({ text: property.changedText as string, html: property.diffHtmlFull as string })),
    }));
}

/**
 * The rendered page of one document with its changes marked in place. The frame
 * loads only once it is about to scroll into view.
 */
export function VisualCompare({ page, hidden }: VisualCompareProps) {
    const translate = useIntl();
    const actions = useReviewActions();
    const hostRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<VisualFrame | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const statuses = STATUS_LABELS.reduce(
            (labels, item) => ({ ...labels, [item.status]: translate(item.id, item.fallback) }),
            {} as Record<ChangeStatus, string>
        );

        const mount = () => {
            if (frameRef.current) return;
            const frame = createVisualFrame({
                host,
                title: page.node.label,
                previewUri: page.previewUri,
                basePreviewUri: page.basePreviewUri,
                isNew: page.isNew,
                isRemoved: page.isRemoved,
                changes: collectFrameChanges(page),
                labels: {
                    loading: translate('visual.loading', 'Loading the page…'),
                    unavailable: translate(
                        'visual.unavailable',
                        'The page could not be rendered for the visual compare.'
                    ),
                    newPage: translate('visual.newPage', 'New page: everything on it is published for the first time.'),
                    removedPage: translate(
                        'visual.removedPage',
                        'Deleted page: shown as currently published, all of it is removed.'
                    ),
                    unplaced: translate(
                        'visual.unplaced',
                        'Deleted elements whose former place could not be determined'
                    ),
                    unlocated: translate('visual.unlocated', 'Not visible on the rendered page'),
                    showInList: translate('visual.showInList', 'Show this change in the change list'),
                    statuses,
                },
                classNames: {
                    iframe: styles.iframe,
                    status: styles.status,
                    banner: styles.banner,
                    bannerNew: styles.bannerNew,
                    bannerRemoved: styles.bannerRemoved,
                    notes: styles.notes,
                },
                onShowInList: (changeId) => actions.showChangeInList(changeId),
            });
            frameRef.current = frame;
            unregister = registerVisualFrame(page.id, frame);
        };

        let unregister: () => void = () => undefined;
        let observer: IntersectionObserver | null = null;
        if (typeof IntersectionObserver === 'undefined') {
            mount();
        } else {
            observer = new IntersectionObserver(
                (entries) => {
                    if (!entries.some((entry) => entry.isIntersecting)) return;
                    observer?.disconnect();
                    mount();
                },
                { rootMargin: '800px 0px' }
            );
            observer.observe(host);
        }

        return () => {
            observer?.disconnect();
            unregister();
            frameRef.current?.destroy();
            frameRef.current = null;
        };
    }, [actions, page, translate]);

    return (
        <div
            ref={hostRef}
            hidden={hidden}
            className={classnames(styles.frame, page.isNew && styles.new, page.isRemoved && styles.removed)}
        />
    );
}
