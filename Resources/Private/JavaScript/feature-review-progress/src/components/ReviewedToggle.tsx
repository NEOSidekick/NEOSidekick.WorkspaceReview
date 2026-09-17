import * as React from 'react';
import classnames from 'classnames';
import { Button, Icon } from '@neos-project/react-ui-components';
import { useIntl, useReviewActions, useReviewState } from '@neosidekick/workspace-review-core';
import type { ChangedPage } from '@neosidekick/workspace-review-core';

import styles from './ReviewedToggle.module.css';

interface ReviewedToggleProps {
    page: ChangedPage;
    pageIndex: number;
}

/** Marks a page as reviewed, which collapses it and advances the progress bar. */
export function ReviewedToggle({ page, pageIndex }: ReviewedToggleProps) {
    const translate = useIntl();
    const actions = useReviewActions();
    const isReviewed = useReviewState().reviewed[page.id] === true;

    return (
        <Button
            className={classnames(styles.toggle, isReviewed && styles.pressed)}
            style={isReviewed ? 'success' : 'lighter'}
            hoverStyle={isReviewed ? 'success' : 'brand'}
            aria-pressed={isReviewed}
            title={translate('review.markReviewed', 'Mark page as reviewed and collapse it')}
            onClick={() => actions.setReviewed(pageIndex, !isReviewed)}
        >
            <Icon icon="check" padded="right" />
            {translate('review.reviewed', 'Reviewed')}
        </Button>
    );
}
