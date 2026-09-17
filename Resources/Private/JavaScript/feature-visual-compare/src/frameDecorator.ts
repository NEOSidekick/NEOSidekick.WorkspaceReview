import { NODE_ATTRIBUTE } from '@neosidekick/workspace-review-core';
import type { ChangeStatus, VisualFrameHandle } from '@neosidekick/workspace-review-core';

import { FRAME_STYLES } from './frameStyles';

/** Block elements a text diff must not flatten into a single line. */
const BLOCK_SELECTOR =
    'p, div, section, article, aside, ul, ol, li, table, blockquote, h1, h2, h3, h4, h5, h6, figure, header, footer, nav';

export interface FrameTextDiff {
    text: string;
    html: string;
}

export interface FrameChange {
    /** Node identifier, matching the Fusion marker attribute. */
    identifier: string;
    /** Id of the change card this marker links back to. */
    changeId: string;
    status: ChangeStatus;
    label: string;
    type: string;
    textDiffs: FrameTextDiff[];
}

export interface FrameLabels {
    loading: string;
    unavailable: string;
    newPage: string;
    removedPage: string;
    unplaced: string;
    unlocated: string;
    showInList: string;
    statuses: Record<ChangeStatus, string>;
}

export interface FrameClassNames {
    iframe: string;
    status: string;
    statusLoading: string;
    banner: string;
    bannerNew: string;
    bannerRemoved: string;
    notes: string;
}

export interface FrameOptions {
    /** The element the iframe, banner and notes are rendered into. */
    host: HTMLElement;
    title: string;
    previewUri: string | null;
    basePreviewUri: string | null;
    isNew: boolean;
    isRemoved: boolean;
    changes: FrameChange[];
    labels: FrameLabels;
    classNames: FrameClassNames;
    onShowInList(changeId: string): void;
}

interface Mark {
    element: Element;
    change: FrameChange;
    halo: HTMLElement;
}

export interface VisualFrame extends VisualFrameHandle {
    destroy(): void;
}

function frameDocument(iframe: HTMLIFrameElement): Document | null {
    try {
        const doc = iframe.contentDocument;
        return doc && doc.body ? doc : null;
    } catch (error) {
        // A frame from another origin cannot be decorated.
        return null;
    }
}

function findNode(doc: Document, identifier: string): Element | null {
    return doc.querySelector(`[${NODE_ATTRIBUTE}="${identifier.replace(/["\\]/g, '\\$&')}"]`);
}

function normalizeText(text: string | null): string {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Renders one page for the visual compare and marks its changes in place. The
 * iframe document is manipulated imperatively: it belongs to the site, so React
 * never owns it.
 */
export function createVisualFrame(options: FrameOptions): VisualFrame {
    const { host, labels, classNames } = options;
    const marks: Mark[] = [];
    /** Changes with no element of their own; they can never become visible. */
    const missing: FrameChange[] = [];
    let notes: HTMLElement | null = null;
    /** The changes the notes currently list, to keep an untouched list alive. */
    let notesKey = '';
    let doc: Document | null = null;
    let overlay: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // While the page loads the status carries a spinner; a failure drops it.
    const status = host.ownerDocument.createElement('p');
    status.className = `${classNames.status} ${classNames.statusLoading}`;
    status.textContent = labels.loading;
    host.appendChild(status);
    const showUnavailable = () => {
        status.className = classNames.status;
        status.textContent = labels.unavailable;
    };

    // A deleted page only exists in the base workspace and is shown as published.
    const mainUri = options.isRemoved ? options.basePreviewUri : options.previewUri;
    const transplantUri = options.isRemoved ? null : options.basePreviewUri;

    if (!mainUri) {
        showUnavailable();
        return { step: () => undefined, clearCursor: () => undefined, destroy: () => undefined };
    }

    if (options.isRemoved || options.isNew) {
        const banner = host.ownerDocument.createElement('p');
        banner.className = `${classNames.banner} ${options.isRemoved ? classNames.bannerRemoved : classNames.bannerNew}`;
        banner.textContent = options.isRemoved ? labels.removedPage : labels.newPage;
        host.insertBefore(banner, status);
    }

    const iframe = host.ownerDocument.createElement('iframe');
    iframe.className = classNames.iframe;
    iframe.setAttribute('title', options.title);
    iframe.hidden = true;

    function prepareDocument(target: Document): HTMLElement {
        const style = target.createElement('style');
        style.textContent = FRAME_STYLES;
        target.head.appendChild(style);
        // The frame is for looking, not for browsing: links and forms stay put.
        target.addEventListener(
            'click',
            (event) => {
                const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
                if (anchor) event.preventDefault();
            },
            true
        );
        target.addEventListener('submit', (event) => event.preventDefault(), true);
        const element = target.createElement('div');
        element.className = 'neosidekick-review-overlay';
        target.documentElement.appendChild(element);
        return element;
    }

    /**
     * Changes with no visible place on the rendered page are listed below the
     * frame, each opening its card in the change list. The list is rebuilt from
     * the current layout: an element measured while the frame was still hidden
     * would otherwise stay listed as invisible for good.
     */
    function renderNotes(unlocated: FrameChange[]) {
        // Every layout would otherwise rebuild the list and take the focus off a
        // note button the reviewer is about to press.
        const key = unlocated.map((change) => change.changeId).join('|');
        if (key === notesKey) return;
        notesKey = key;
        if (!unlocated.length) {
            notes?.remove();
            notes = null;
            return;
        }
        if (!notes) {
            notes = host.ownerDocument.createElement('div');
            notes.className = classNames.notes;
            host.appendChild(notes);
        }
        notes.textContent = `${labels.unlocated}:`;
        const list = host.ownerDocument.createElement('ul');
        unlocated.forEach((change) => {
            const item = host.ownerDocument.createElement('li');
            const button = host.ownerDocument.createElement('button');
            button.type = 'button';
            button.textContent = [labels.statuses[change.status] || change.status, change.type, change.label]
                .filter(Boolean)
                .join(' · ');
            button.title = labels.showInList;
            button.addEventListener('click', () => options.onShowInList(change.changeId));
            item.appendChild(button);
            list.appendChild(item);
        });
        notes.appendChild(list);
    }

    function createHalo(target: Document, into: HTMLElement, change: FrameChange): HTMLElement {
        const halo = target.createElement('div');
        halo.className = `neosidekick-review-halo neosidekick-review-halo--${change.status}`;
        const chip = target.createElement('button');
        chip.type = 'button';
        chip.className = 'neosidekick-review-halo__label';
        chip.textContent = (labels.statuses[change.status] || change.status) + (change.type ? ` · ${change.type}` : '');
        chip.title = (change.label ? `${change.label} – ` : '') + labels.showInList;
        chip.addEventListener('click', (event) => {
            event.preventDefault();
            options.onShowInList(change.changeId);
        });
        halo.appendChild(chip);
        into.appendChild(halo);
        return halo;
    }

    function addMark(element: Element, change: FrameChange) {
        if (!doc || !overlay) return;
        marks.push({ element, change, halo: createHalo(doc, overlay, change) });
        marks.sort((a, b) =>
            a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );
    }

    // Halos are absolutely positioned in the page document, so they follow its
    // own scrolling; only size changes need a new layout.
    function layoutMarks() {
        // A frame laid out while it is hidden measures everything as zero-sized;
        // the ResizeObserver lays the marks out once it is shown.
        if (!doc || iframe.clientWidth === 0) return;
        const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop || 0;
        const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft || 0;
        const unlocated = [...missing];
        marks.forEach((mark) => {
            const rect = mark.element.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0;
            mark.halo.style.display = visible ? '' : 'none';
            if (!visible) {
                unlocated.push(mark.change);
                return;
            }
            mark.halo.style.top = `${rect.top + scrollTop - 4}px`;
            mark.halo.style.left = `${rect.left + scrollLeft - 4}px`;
            mark.halo.style.width = `${rect.width + 8}px`;
            mark.halo.style.height = `${rect.height + 8}px`;
        });
        renderNotes(unlocated);
    }

    /**
     * The card's word diff replaces the new wording where it appears on the page:
     * the innermost element with exactly that text and no block structure of its
     * own, so paragraphs are not flattened into one.
     */
    function applyTextDiffs(element: Element, textDiffs: FrameTextDiff[]) {
        textDiffs.forEach((diff) => {
            const wanted = normalizeText(diff.text);
            if (!wanted || !diff.html) return;
            const candidates = [element, ...Array.from(element.querySelectorAll('*'))].filter(
                (candidate) => normalizeText(candidate.textContent) === wanted
            );
            const target = candidates
                .reverse()
                .find((candidate) => !candidates.some((other) => other !== candidate && candidate.contains(other)));
            if (!target || target.querySelector(BLOCK_SELECTOR) || target.querySelector(`[${NODE_ATTRIBUTE}]`)) return;
            target.innerHTML = diff.html;
            target.classList.add('neosidekick-review-diff');
        });
    }

    /**
     * Moves the base-workspace rendering of a deleted element to where it stood,
     * next to a neighbour that still exists. Without such a neighbour it is
     * listed at the end of the page.
     */
    function transplantDeleted(target: Document, baseDoc: Document, identifier: string): Element | null {
        const baseElement = findNode(baseDoc, identifier);
        if (!baseElement) return null;
        const clone = target.importNode(baseElement, true) as Element;
        clone.classList.add('neosidekick-review-deleted-clone');
        for (let sibling = baseElement.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            const neighbour = sibling.hasAttribute(NODE_ATTRIBUTE)
                ? findNode(target, sibling.getAttribute(NODE_ATTRIBUTE) as string)
                : null;
            if (neighbour) {
                neighbour.insertAdjacentElement('afterend', clone);
                return clone;
            }
        }
        for (let sibling = baseElement.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            const neighbour = sibling.hasAttribute(NODE_ATTRIBUTE)
                ? findNode(target, sibling.getAttribute(NODE_ATTRIBUTE) as string)
                : null;
            if (neighbour) {
                neighbour.insertAdjacentElement('beforebegin', clone);
                return clone;
            }
        }
        let unplaced = target.querySelector('.neosidekick-review-unplaced');
        if (!unplaced) {
            unplaced = target.createElement('section');
            unplaced.className = 'neosidekick-review-unplaced';
            const heading = target.createElement('p');
            heading.className = 'neosidekick-review-unplaced__title';
            heading.textContent = labels.unplaced;
            unplaced.appendChild(heading);
            target.body.appendChild(unplaced);
        }
        unplaced.appendChild(clone);
        return clone;
    }

    // Deleted elements no longer exist in the workspace rendering; the base
    // rendering is loaded out of sight to take them from.
    function loadBaseRendering(uri: string, done: (baseDoc: Document | null) => void) {
        const hiddenFrame = host.ownerDocument.createElement('iframe');
        hiddenFrame.className = classNames.iframe;
        hiddenFrame.setAttribute('aria-hidden', 'true');
        hiddenFrame.tabIndex = -1;
        hiddenFrame.style.cssText =
            'position:absolute;top:0;left:0;height:0;min-height:0;visibility:hidden;pointer-events:none';
        hiddenFrame.addEventListener('load', () => {
            done(frameDocument(hiddenFrame));
            hiddenFrame.remove();
        });
        hiddenFrame.src = uri;
        host.appendChild(hiddenFrame);
    }

    function decorate() {
        if (!doc) return;
        const deleted: FrameChange[] = [];
        const located: Array<{ element: Element; change: FrameChange }> = [];
        // Every node is looked up first: a text diff replaces the markup of its
        // target, which would destroy a marked element nested inside it.
        options.changes.forEach((change) => {
            const element = findNode(doc as Document, change.identifier);
            if (!element) {
                if (change.status === 'deleted' && transplantUri) deleted.push(change);
                else missing.push(change);
                return;
            }
            located.push({ element, change });
        });
        located.forEach(({ element, change }) => {
            if (change.status !== 'deleted') applyTextDiffs(element, change.textDiffs);
            addMark(element, change);
        });
        layoutMarks();
        const view = doc.defaultView;
        if (view && typeof view.ResizeObserver !== 'undefined') {
            resizeObserver = new view.ResizeObserver(() => layoutMarks());
            resizeObserver.observe(doc.documentElement);
        }
        // Deleted elements arrive with the base rendering; the page is usable in
        // the meantime.
        if (!deleted.length || !transplantUri) return;
        loadBaseRendering(transplantUri, (baseDoc) => {
            deleted.forEach((change) => {
                const element = baseDoc && doc ? transplantDeleted(doc, baseDoc, change.identifier) : null;
                if (element) addMark(element, change);
                else missing.push(change);
            });
            layoutMarks();
        });
    }

    iframe.addEventListener('load', () => {
        // A navigation inside the frame replaces the document, so everything
        // collected for the previous one is dropped first.
        resizeObserver?.disconnect();
        resizeObserver = null;
        marks.length = 0;
        missing.length = 0;
        renderNotes([]);
        doc = frameDocument(iframe);
        if (!doc) {
            showUnavailable();
            if (!status.isConnected) host.insertBefore(status, iframe);
            iframe.hidden = true;
            return;
        }
        overlay = prepareDocument(doc);
        status.remove();
        iframe.hidden = false;
        decorate();
    });
    iframe.src = mainUri;
    host.appendChild(iframe);

    return {
        // ] and [ walk the marked elements of the page in the visual compare.
        step(direction) {
            const visibleMarks = marks.filter((mark) => mark.halo.style.display !== 'none');
            if (!visibleMarks.length) return;
            const current = visibleMarks.findIndex((mark) =>
                mark.halo.classList.contains('neosidekick-review-halo--active')
            );
            const next = Math.max(0, Math.min(current + direction, visibleMarks.length - 1));
            if (next === current) return;
            visibleMarks.forEach((mark, markIndex) =>
                mark.halo.classList.toggle('neosidekick-review-halo--active', markIndex === next)
            );
            visibleMarks[next].element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        },
        clearCursor() {
            marks.forEach((mark) => mark.halo.classList.remove('neosidekick-review-halo--active'));
        },
        destroy() {
            resizeObserver?.disconnect();
            // Status, banner and any hidden base frame are children of the host
            // as well, and a re-run of the effect would duplicate them.
            while (host.firstChild) host.removeChild(host.firstChild);
            notes = null;
            notesKey = '';
        },
    };
}
