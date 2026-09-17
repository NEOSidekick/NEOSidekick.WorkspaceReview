import * as React from 'react';
import { countChangedNodes, useIntl, useReviewData } from '@neosidekick/workspace-review-core';

import { Checkbox } from './Checkbox';
import { useSelection, useWholeSelectionState } from '../useSelection';

/** The toolbar checkbox above the review stream, with its own visible label. */
export function SelectAllCheckbox() {
    const translate = useIntl();
    const { disabled, toggleAll } = useSelection();
    const state = useWholeSelectionState();
    const { pages } = useReviewData();
    return (
        <Checkbox
            checked={state === 'all'}
            indeterminate={state === 'some'}
            disabled={disabled}
            label={
                countChangedNodes(pages) === 1
                    ? translate('selection.one', 'Select the change')
                    : translate('selection.all', 'Select all {0} changes', [countChangedNodes(pages)])
            }
            onChange={toggleAll}
            visibleLabel
        />
    );
}
