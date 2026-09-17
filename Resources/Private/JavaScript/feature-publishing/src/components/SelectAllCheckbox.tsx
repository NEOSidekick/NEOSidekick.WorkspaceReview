import * as React from 'react';
import { useIntl } from '@neosidekick/workspace-review-core';

import { Checkbox } from './Checkbox';
import { useSelection, useWholeSelectionState } from '../useSelection';

/** The toolbar checkbox above the review stream, with its own visible label. */
export function SelectAllCheckbox() {
    const translate = useIntl();
    const { disabled, toggleAll } = useSelection();
    const state = useWholeSelectionState();
    return (
        <Checkbox
            checked={state === 'all'}
            indeterminate={state === 'some'}
            disabled={disabled}
            label={translate('selection.all', 'Select all changes')}
            onChange={toggleAll}
            visibleLabel
        />
    );
}
