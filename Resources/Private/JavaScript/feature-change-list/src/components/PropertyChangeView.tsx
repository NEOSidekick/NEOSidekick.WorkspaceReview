import * as React from 'react';
import classnames from 'classnames';
import { Icon } from '@neos-project/react-ui-components';
import { HelpTip, Pill, useIntl } from '@neosidekick/workspace-review-core';
import type { MediaRef, NodeChange, PropertyChange } from '@neosidekick/workspace-review-core';

import styles from './ChangeCard.module.css';
import { TextDiff } from './TextDiff';
import { absoluteDate, backendLocale } from '../relativeDate';

interface PropertyChangeViewProps {
    property: PropertyChange;
    change: NodeChange;
}

/**
 * One asset of a media change. The name of the replaced or deleted file is
 * struck through, so a list of file names still reads as before and after.
 */
function Media({ media, variant }: { media: MediaRef; variant: 'old' | 'new' }) {
    const name = media.filename || media.label;
    return (
        <div
            className={classnames(
                styles.mediaItem,
                variant === 'old' && styles.mediaOld,
                media.thumbnailUri && styles.mediaThumbnail
            )}
        >
            {media.thumbnailUri ? (
                <img src={media.thumbnailUri} alt={media.label} />
            ) : media.uri ? (
                <a href={media.uri} target="_blank" rel="noreferrer">
                    {name}
                </a>
            ) : (
                name
            )}
        </div>
    );
}

function Arrow() {
    return <Icon className={styles.arrow} icon="long-arrow-alt-right" />;
}

/** One statement about what publishing this element would change. */
export function PropertyChangeView({ property, change }: PropertyChangeViewProps) {
    const translate = useIntl();
    const locale = backendLocale();
    // A deleted element has no "after": no arrow and no new value.
    const isRemoved = change.isRemoved;

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
                // A before and after like every other value, but without red and
                // green: hiding an element is neither a loss nor an addition.
                return (
                    <>
                        <Pill variant="neutralOld">
                            {property.hidden
                                ? translate('visibility.stateVisible', 'Visible')
                                : translate('visibility.stateHidden', 'Hidden')}
                        </Pill>
                        <Arrow />
                        <Pill variant="neutral">
                            {property.hidden
                                ? translate('visibility.stateHidden', 'Hidden')
                                : translate('visibility.stateVisible', 'Visible')}
                        </Pill>
                    </>
                );
            case 'NOTE':
                return property.help ? (
                    <HelpTip help={property.help} className={styles.note}>
                        {property.message}
                        <Icon icon="info-circle" padded="left" />
                    </HelpTip>
                ) : (
                    <span className={styles.note}>{property.message}</span>
                );
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
                property.kind === 'NOTE' && !property.label && styles.propertyNote,
                property.kind !== 'NOTE' && !property.label && styles.propertyContinuation
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
