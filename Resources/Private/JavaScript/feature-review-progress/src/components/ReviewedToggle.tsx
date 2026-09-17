import * as React from 'react';
import classnames from 'classnames';
import { Button, Icon } from '@neos-project/react-ui-components';
import { isReviewed, useIntl, useReviewActions, useReviewState } from '@neosidekick/workspace-review-core';
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
    const reviewed = isReviewed(useReviewState().marks, page.id);

    return (
        <Button
            className={classnames(styles.toggle, reviewed && styles.pressed)}
            style={reviewed ? 'success' : 'lighter'}
            hoverStyle={reviewed ? 'success' : 'brand'}
            aria-pressed={reviewed}
            title={translate('review.markReviewed', 'Mark page as reviewed and collapse it')}
            onClick={() => actions.setReviewed(pageIndex, !reviewed)}
        >
            <Icon icon="check" />
            {translate('review.reviewed', 'Reviewed')}
        </Button>
    );
}
