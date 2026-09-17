import * as React from 'react';
import classnames from 'classnames';
import { Icon } from '@neos-project/react-ui-components';
import { Pill, useIntl } from '@neosidekick/workspace-review-core';
import type { MediaRef, NodeChange, PropertyChange } from '@neosidekick/workspace-review-core';

import styles from './ChangeCard.module.css';
import { TextDiff } from './TextDiff';
import { absoluteDate, backendLocale } from '../relativeDate';

interface PropertyChangeViewProps {
    property: PropertyChange;
    /** A deleted element has no "after": no arrow and no new value. */
    isRemoved: boolean;
    change: NodeChange;
}

function Media({ media, variant }: { media: MediaRef; variant: 'old' | 'new' }) {
    if (media.thumbnailUri) {
        return (
            <div className={classnames(styles.mediaItem, variant === 'old' && styles.mediaOld)}>
                <img src={media.thumbnailUri} alt={media.label} />
            </div>
        );
    }
    return (
        <div className={classnames(styles.mediaItem, variant === 'old' && styles.mediaOld)}>
            {media.uri ? (
                <a href={media.uri} target="_blank" rel="noreferrer">
                    {media.filename || media.label}
                </a>
            ) : (
                media.filename || media.label
            )}
        </div>
    );
}

function Arrow() {
    return <Icon className={styles.arrow} icon="long-arrow-alt-right" />;
}

/** One statement about what publishing this element would change. */
export function PropertyChangeView({ property, isRemoved, change }: PropertyChangeViewProps) {
    const translate = useIntl();
    const locale = backendLocale();

    const value = (() => {
        switch (property.kind) {
            case 'TEXT':
                return property.diffHtml ? <TextDiff html={property.diffHtml} /> : null;
            case 'VALUE':
            case 'LINK':
            case 'FORMATTING':
                return (
                    <>
                        <Pill variant="old" wrapping={property.kind === 'LINK'}>
                            {property.original}
                        </Pill>
                        {!isRemoved && (
                            <>
                                <Arrow />
                                <Pill variant="new" wrapping={property.kind === 'LINK'}>
                                    {property.changed}
                                </Pill>
                            </>
                        )}
                    </>
                );
            case 'DATETIME':
                return (
                    <>
                        <Pill variant="old">
                            {property.original ? absoluteDate(Date.parse(property.original) / 1000, locale) : ''}
                        </Pill>
                        {!isRemoved && (
                            <>
                                <Arrow />
                                <Pill variant="new">
                                    {property.changed ? absoluteDate(Date.parse(property.changed) / 1000, locale) : ''}
                                </Pill>
                            </>
                        )}
                    </>
                );
            case 'IMAGE':
            case 'ASSET':
                return (
                    <div className={styles.media}>
                        {property.originalMedia && <Media media={property.originalMedia} variant="old" />}
                        {!isRemoved && (
                            <>
                                {property.originalMedia && <Arrow />}
                                {property.changedMedia ? (
                                    <Media media={property.changedMedia} variant="new" />
                                ) : (
                                    <span className={styles.note}>–</span>
                                )}
                            </>
                        )}
                    </div>
                );
            case 'VISIBILITY':
                return (
                    <span className={styles.visibility}>
                        <Icon icon={property.hidden ? 'eye-slash' : 'eye'} padded="right" />
                        {property.message ||
                            (property.hidden
                                ? translate('visibility.hidden', 'Element was hidden')
                                : translate('visibility.shown', 'Element was made visible'))}
                    </span>
                );
            case 'NOTE':
                return <span className={styles.note}>{property.message}</span>;
            default:
                return null;
        }
    })();

    const isMedia = property.kind === 'IMAGE' || property.kind === 'ASSET';

    return (
        <div
            className={classnames(
                styles.property,
                isMedia && styles.propertyMedia,
                property.kind === 'NOTE' && !property.label && styles.propertyNote
            )}
            data-review-property={property.property}
            data-review-change-id={change.id}
        >
            {property.label && <div className={styles.propertyLabel}>{property.label}</div>}
            <div className={styles.propertyValue}>
                {property.detail && <div className={styles.detail}>{property.detail}</div>}
                {value}
            </div>
        </div>
    );
}
