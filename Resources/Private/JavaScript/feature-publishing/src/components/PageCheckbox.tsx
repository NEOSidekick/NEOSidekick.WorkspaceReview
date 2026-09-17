import * as React from 'react';
import { useIntl } from '@neosidekick/workspace-review-core';
import type { ChangedPage } from '@neosidekick/workspace-review-core';

import { Checkbox } from './Checkbox';
import { pageSelectionState } from '../selection';
import { useSelection } from '../useSelection';

/** Selects every change of a page; it is not a form field of its own. */
export function PageCheckbox({ page }: { page: ChangedPage }) {
    const translate = useIntl();
    const { selection, disabled, toggleOnePage } = useSelection();
    const state = pageSelectionState(page, selection);
    return (
        <Checkbox
            checked={state === 'all'}
            indeterminate={state === 'some'}
            disabled={disabled}
            label={translate('selection.page', 'Select all changes of this page')}
            onChange={(checked) => toggleOnePage(page, checked)}
        />
    );
}
