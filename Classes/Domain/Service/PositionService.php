<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\Flow\Annotations as Flow;

/**
 * States where a node sits among its siblings ("2 of 5"), because the raw
 * sorting index is a sparse internal number ("100 → 150") that tells a
 * reviewer nothing about what moved.
 *
 * @Flow\Scope("singleton")
 */
class PositionService
{
    /**
     * @Flow\Inject
     * @var PropertyLabelService
     */
    protected $propertyLabelService;

    /**
     * Describes a changed sorting index as the node's position among its
     * siblings. The answer is already a PropertyChange of the SDL, so no
     * mapping sits between this service and the API. Returns null when no
     * position can be stated honestly.
     *
     * @return array<string, mixed>|null
     */
    public function renderPositionChange(NodeInterface $originalNode, NodeInterface $changedNode): ?array
    {
        $originalParent = $originalNode->getParent();
        $changedParent = $changedNode->getParent();
        if ($originalParent === null || $changedParent === null) {
            return $this->renderRawPositionChange($originalNode, $changedNode);
        }
        if ($originalParent->getPath() !== $changedParent->getPath()) {
            // Ordinals of two different sibling lists are not comparable; the
            // path entry and the "moved" badge already tell that story.
            return null;
        }

        $nodeTypeFilter = $changedNode->getNodeType()->isOfType('Neos.Neos:Document')
            ? 'Neos.Neos:Document'
            : '!Neos.Neos:Document';
        $originalSiblings = $this->collectSiblingIdentifiers($originalParent, $nodeTypeFilter);
        $changedSiblings = $this->collectSiblingIdentifiers($changedParent, $nodeTypeFilter);
        // Siblings that exist on one side only - created or deleted in this
        // workspace - would shift the ordinal without anything having moved, so
        // both sides are ranked among the siblings they share.
        $sharedSiblings = array_intersect($originalSiblings, $changedSiblings);

        $originalPosition = $this->findSiblingPosition($originalSiblings, $sharedSiblings, $originalNode->getIdentifier());
        $changedPosition = $this->findSiblingPosition($changedSiblings, $sharedSiblings, $changedNode->getIdentifier());
        if ($originalPosition === null || $changedPosition === null) {
            return $this->renderRawPositionChange($originalNode, $changedNode);
        }

        $propertyLabel = $this->propertyLabelService->translate('system.position');
        if ($originalPosition['ordinal'] === $changedPosition['ordinal']) {
            // Re-sorting the siblings or inserting one above renumbers indices,
            // so a node can get a new index while keeping the place the reader
            // sees it in relative to the elements that already existed.
            return [
                'kind' => 'NOTE',
                'label' => $propertyLabel,
                'message' => $this->propertyLabelService->translate('position.internalOnly'),
            ];
        }
        return [
            'kind' => 'VALUE',
            'label' => $propertyLabel,
            'original' => $this->propertyLabelService->translate('position.ordinalOfTotal', [$originalPosition['ordinal'], $originalPosition['total']]),
            'changed' => $this->propertyLabelService->translate('position.ordinalOfTotal', [$changedPosition['ordinal'], $changedPosition['total']]),
        ];
    }

    /**
     * Falls back to the raw sorting index when the node's surroundings are
     * unavailable: an unexplained number still beats hiding the change.
     *
     * @return array<string, mixed>
     */
    protected function renderRawPositionChange(NodeInterface $originalNode, NodeInterface $changedNode): array
    {
        return [
            'kind' => 'VALUE',
            'label' => $this->propertyLabelService->translate('system.position'),
            'original' => (string)$originalNode->getIndex(),
            'changed' => (string)$changedNode->getIndex(),
        ];
    }

    /**
     * Reads the identifiers of the parent's children in document order, limited
     * to the node's own kind: a page is ordered among pages, a content element
     * among the elements of its collection. The list is read in the node's own
     * context, which shows hidden and removed nodes alike, so the ordinals of
     * the base and the user workspace stay comparable.
     *
     * @return string[]
     */
    protected function collectSiblingIdentifiers(NodeInterface $parent, string $nodeTypeFilter): array
    {
        $identifiers = [];
        foreach ($parent->getChildNodes($nodeTypeFilter) as $sibling) {
            $identifiers[] = $sibling->getIdentifier();
        }
        return $identifiers;
    }

    /**
     * Ranks a node among the siblings both workspaces know about.
     *
     * @param string[] $identifiers sibling identifiers in document order
     * @param string[] $sharedIdentifiers identifiers present on both sides
     * @return array{ordinal: int, total: int}|null null if the node is not among the shared siblings
     */
    protected function findSiblingPosition(array $identifiers, array $sharedIdentifiers, string $identifier): ?array
    {
        $ordinal = null;
        $total = 0;
        foreach ($identifiers as $siblingIdentifier) {
            if (!in_array($siblingIdentifier, $sharedIdentifiers, true)) {
                continue;
            }
            $total++;
            if ($siblingIdentifier === $identifier) {
                $ordinal = $total;
            }
        }
        return $ordinal === null ? null : ['ordinal' => $ordinal, 'total' => $total];
    }
}
