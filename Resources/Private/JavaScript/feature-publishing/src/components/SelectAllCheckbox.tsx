import * as React from 'react';
import { useIntl } from '@neosidekick/workspace-review-core';

import { Checkbox } from './Checkbox';
import { useSelection } from '../useSelection';

/** The toolbar checkbox above the review stream, with its own visible label. */
export function SelectAllCheckbox() {
    const translate = useIntl();
    const { state, disabled, toggleAll } = useSelection();
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
