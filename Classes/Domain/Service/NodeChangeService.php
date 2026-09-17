<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Doctrine\ORM\EntityNotFoundException;
use Doctrine\Persistence\Proxy as DoctrineProxy;
use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\NodeType;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\ResourceManagement\ResourceManager;
use Neos\Media\Domain\Model\AssetInterface;
use Neos\Media\Domain\Model\ImageInterface;
use Neos\Media\Domain\Model\ThumbnailConfiguration;
use Neos\Media\Domain\Repository\AssetRepository;
use Neos\Media\Domain\Service\AssetService;
use Neos\Neos\Domain\Service\ContentContextFactory;
use NEOSidekick\WorkspaceReview\Domain\Diff\RichTextDiffer;
use NEOSidekick\WorkspaceReview\Domain\Diff\WordDiffer;

/**
 * Turns one changed node into the review card the client renders: the node's
 * own status plus one entry per effect publishing it would have.
 *
 * This is the type-aware replacement for the core controller's
 * renderContentChanges(), together with the protected helpers it calls
 * (getOriginalNode, loadAsset, getPropertyLabel). Entries are produced in the
 * shape of the GraphQL SDL, so no mapping layer sits between this service and
 * the API.
 *
 * @Flow\Scope("singleton")
 */
class NodeChangeService
{
    /**
     * Editorially relevant Neos system fields which are stored outside the
     * regular property collection and therefore need explicit comparison.
     */
    protected const SYSTEM_FIELD_DEFINITIONS = [
        '_hiddenBeforeDateTime' => ['getter' => 'getHiddenBeforeDateTime', 'label' => 'system.hiddenBefore'],
        '_hiddenAfterDateTime' => ['getter' => 'getHiddenAfterDateTime', 'label' => 'system.hiddenAfter'],
        '_hiddenInIndex' => ['getter' => 'isHiddenInIndex', 'label' => 'system.hiddenInIndex'],
        '_accessRoles' => ['getter' => 'getAccessRoles', 'label' => 'system.accessRoles'],
        '_nodeType' => ['getter' => 'getNodeType', 'label' => 'system.nodeType'],
        '_path' => ['getter' => 'getPath', 'label' => 'system.path'],
        '_index' => ['getter' => 'getIndex', 'label' => 'system.position'],
    ];

    /**
     * The card's media previews are shown side by side, so a bounding box is
     * enough; the full asset stays one click away behind "uri".
     */
    protected const THUMBNAIL_BOX = 400;

    /**
     * @Flow\Inject
     * @var PropertyLabelService
     */
    protected $propertyLabelService;

    /**
     * @Flow\Inject
     * @var PositionService
     */
    protected $positionService;

    /**
     * @Flow\Inject
     * @var WordDiffer
     */
    protected $wordDiffer;

    /**
     * @Flow\Inject
     * @var RichTextDiffer
     */
    protected $richTextDiffer;

    /**
     * Resolves the "asset://<uuid>" targets of rich-text links to asset names.
     *
     * @Flow\Inject
     * @var AssetRepository
     */
    protected $assetRepository;

    /**
     * @Flow\Inject
     * @var AssetService
     */
    protected $assetService;

    /**
     * @Flow\Inject
     * @var ResourceManager
     */
    protected $resourceManager;

    /**
     * @Flow\Inject
     * @var ContentContextFactory
     */
    protected $contextFactory;

    /**
     * Builds the whole change entry of one node.
     *
     * @param bool $publishable false inside a new page, where the core cannot publish a single node
     * @return array<string, mixed> a NodeChange as the SDL describes it
     */
    public function buildChange(NodeInterface $node, string $dimensionHash, bool $isNew, bool $isMoved, bool $publishable): array
    {
        return [
            'id' => $node->getIdentifier() . '-' . $dimensionHash,
            'identifier' => $node->getIdentifier(),
            'contextPath' => $node->getContextPath(),
            'nodePath' => $node->getPath(),
            'label' => $this->propertyLabelService->cleanLabel((string)$node->getLabel()),
            'typeLabel' => $this->renderNodeTypeLabel($node->getNodeType()),
            'isNew' => $isNew,
            'isMoved' => $isMoved,
            'isHidden' => $node->isHidden(),
            'isRemoved' => $node->isRemoved(),
            'lastModified' => $this->readLastModified($node),
            'publishable' => $publishable,
            'properties' => array_values($this->renderContentChanges($node)),
        ];
    }

    /**
     * The legacy NodeInterface has no accessor for the modification time, so
     * it is read from the node data the review's change signature depends on.
     */
    protected function readLastModified(NodeInterface $node): int
    {
        $lastModified = $node->getNodeData()->getLastModificationDateTime();
        return $lastModified === null ? 0 : $lastModified->getTimestamp();
    }

    protected function renderNodeTypeLabel(NodeType $nodeType): string
    {
        $label = (string)$nodeType->getLabel();
        return $label === '' ? $nodeType->getName() : $this->propertyLabelService->translateShorthand($label);
    }

    /**
     * Type-aware replacement for the core property diff rendering. Keys name
     * the property an entry belongs to and are only used to keep the entries
     * of one property together and in order.
     *
     * @return array<string, array<string, mixed>>
     */
    public function renderContentChanges(NodeInterface $changedNode): array
    {
        $contentChanges = [];
        $originalNode = $this->getOriginalNode($changedNode);
        $changeNodePropertiesDefaults = $changedNode->getNodeType()->getDefaultValuesForProperties();
        $hasScalarDifference = false;

        foreach ($changedNode->getProperties() as $propertyName => $changedPropertyValue) {
            $isDefaultValue = isset($changeNodePropertiesDefaults[$propertyName])
                && $changedPropertyValue === $changeNodePropertiesDefaults[$propertyName];
            if ($originalNode === null && (empty($changedPropertyValue) || $isDefaultValue)) {
                // A new node carries no review information in properties that
                // are empty or still hold their NodeType default.
                continue;
            }
            if ($changedNode->isRemoved() && $isDefaultValue) {
                // A deleted node is compared against nothing, so listing every
                // untouched default would bury what was actually deleted.
                continue;
            }
            $originalPropertyValue = ($originalNode === null ? null : $originalNode->getProperty($propertyName));
            if ($changedPropertyValue === $originalPropertyValue && !$changedNode->isRemoved()) {
                // On an existing node a property that still holds its default
                // may well be a real change back from a non-default value, so
                // equality with the published value is the only valid skip.
                continue;
            }
            if (!$this->valueCarriesObjectIdentity($originalPropertyValue) && !$this->valueCarriesObjectIdentity($changedPropertyValue)) {
                // Only a difference between values that compare by value proves
                // the stored content really changed.
                $hasScalarDifference = true;
            }
            foreach ($this->renderPropertyChange((string)$propertyName, $originalPropertyValue, $changedPropertyValue, $changedNode) as $index => $entry) {
                // One property can yield several entries (a text diff plus the
                // rich-text findings), so each of them needs its own key.
                $suffix = $entry['kind'] === 'NOTE' ? '#note' : ($index === 0 ? '' : '#rt' . $index);
                if ($index > 0) {
                    // All entries describe the same field; repeating its name
                    // would read as several changed fields instead of one.
                    $entry['label'] = '';
                }
                $contentChanges[$propertyName . $suffix] = $entry;
            }
        }

        if ($originalNode !== null && $originalNode->isHidden() !== $changedNode->isHidden()) {
            $contentChanges['_hidden'] = $this->entry('VISIBILITY', '_hidden', $this->translate('visibility.label'), [
                'hidden' => $changedNode->isHidden(),
                'message' => $this->translate($changedNode->isHidden() ? 'visibility.hidden' : 'visibility.shown'),
            ]);
        }

        if ($originalNode !== null) {
            $contentChanges += $this->renderSystemFieldChanges($originalNode, $changedNode);
        }

        // Guarantee an explanation: a node that is neither removed, new nor
        // moved but has no renderable property change would otherwise appear
        // in the list without any stated reason. Without a scalar difference
        // the node was edited and reverted, which is worth saying out loud.
        $isNew = $originalNode === null;
        $isMoved = $originalNode !== null && $originalNode->getPath() !== $changedNode->getPath();
        if ($contentChanges === [] && !$changedNode->isRemoved() && !$isNew && !$isMoved) {
            $contentChanges['_note'] = $this->entry('NOTE', '_note', '', [
                'message' => $this->translate($hasScalarDifference ? 'change.noVisibleChanges' : 'change.identicalToOriginal'),
            ]);
        }

        return $contentChanges;
    }

    /**
     * Retrieves the given node's corresponding node in the base workspace,
     * that is the one that would be overwritten by publishing.
     */
    public function getOriginalNode(NodeInterface $modifiedNode): ?NodeInterface
    {
        // The reviewed workspace is the one of the context. The node's own
        // workspace differs for a node the reviewed workspace has not changed,
        // such as the unchanged page of a changed element: its data still
        // belongs to a base workspace, whose base would be the wrong reference.
        $baseWorkspace = $modifiedNode->getContext()->getWorkspace()->getBaseWorkspace();
        if ($baseWorkspace === null) {
            return null;
        }
        $contextProperties = $modifiedNode->getContext()->getProperties();
        $contextProperties['workspaceName'] = $baseWorkspace->getName();
        $contentContext = $this->contextFactory->create($contextProperties);

        return $contentContext->getNodeByIdentifier($modifiedNode->getIdentifier());
    }

    /**
     * Every entry carries the full field set of the SDL type, because the
     * GraphQL default field resolver reads array keys and a missing key on a
     * non-null field would fail the whole query.
     *
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    protected function entry(string $kind, string $property, string $label, array $values = []): array
    {
        return array_merge([
            'kind' => $kind,
            'property' => $property,
            'label' => $label,
            'detail' => null,
            'diffHtml' => null,
            'diffHtmlFull' => null,
            'changedText' => null,
            'original' => null,
            'changed' => null,
            'originalMedia' => null,
            'changedMedia' => null,
            'hidden' => null,
            'message' => null,
            'help' => null,
        ], $values);
    }

    /**
     * Tells whether a value compares by identity rather than by content.
     * Objects are re-instantiated per request and therefore differ even when
     * they mean the same; reference properties hand out arrays of such objects,
     * so an array counts as soon as it holds one.
     *
     * @param mixed $value
     */
    protected function valueCarriesObjectIdentity($value): bool
    {
        if (is_object($value)) {
            return true;
        }
        if (!is_array($value)) {
            return false;
        }
        foreach ($value as $entry) {
            if (is_object($entry)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Compares Neos system fields, which NodeInterface::getProperties() does
     * not expose, and renders every actual change as a regular review entry.
     *
     * @return array<string, array<string, mixed>>
     */
    protected function renderSystemFieldChanges(NodeInterface $originalNode, NodeInterface $changedNode): array
    {
        $changes = [];
        foreach (self::SYSTEM_FIELD_DEFINITIONS as $propertyName => $definition) {
            $getter = $definition['getter'];
            $originalValue = $originalNode->{$getter}();
            $changedValue = $changedNode->{$getter}();
            if ($this->systemFieldValuesAreEqual($originalValue, $changedValue)) {
                continue;
            }

            if ($propertyName === '_index') {
                $positionChange = $this->positionService->renderPositionChange($originalNode, $changedNode);
                if ($positionChange !== null) {
                    // The service answers in SDL vocabulary; only the defaults
                    // of an entry are filled in here.
                    $changes['_index'] = $this->entry($positionChange['kind'], '_index', $positionChange['label'], $positionChange);
                }
                continue;
            }

            if ($originalValue instanceof \DateTimeInterface || $changedValue instanceof \DateTimeInterface) {
                $changes[$propertyName] = $this->entry('DATETIME', $propertyName, $this->translate($definition['label']), [
                    'original' => $this->renderDateTime($originalValue),
                    'changed' => $this->renderDateTime($changedValue),
                ]);
                continue;
            }

            $changes[$propertyName] = $this->entry('VALUE', $propertyName, $this->translate($definition['label']), [
                'original' => $this->renderSystemFieldValue($originalValue),
                'changed' => $this->renderSystemFieldValue($changedValue),
            ]);
        }
        return $changes;
    }

    /**
     * @param mixed $originalValue
     * @param mixed $changedValue
     */
    protected function systemFieldValuesAreEqual($originalValue, $changedValue): bool
    {
        if ($originalValue instanceof \DateTimeInterface && $changedValue instanceof \DateTimeInterface) {
            return $originalValue->getTimestamp() === $changedValue->getTimestamp();
        }
        if ($originalValue instanceof NodeType && $changedValue instanceof NodeType) {
            return $originalValue->getName() === $changedValue->getName();
        }
        return $originalValue === $changedValue;
    }

    /**
     * @param mixed $value
     */
    protected function renderSystemFieldValue($value): string
    {
        if ($value instanceof NodeType) {
            return $this->renderNodeTypeLabel($value);
        }
        if ($value === null || $value === '' || $value === []) {
            return $this->translate('value.empty');
        }
        if (is_bool($value)) {
            return $this->translate($value ? 'value.yes' : 'value.no');
        }
        if (is_array($value)) {
            return implode(', ', array_map([$this, 'renderSystemFieldValue'], $value));
        }
        return $this->propertyLabelService->cleanLabel((string)$value);
    }

    /**
     * @param mixed $value
     */
    protected function renderDateTime($value): ?string
    {
        return $value instanceof \DateTimeInterface ? $value->format(\DateTimeInterface::ATOM) : null;
    }

    /**
     * Classifies a single property change and renders it human-readable.
     *
     * Returns a list of change entries, because one rich-text property can
     * carry several independent stories (a text edit plus a changed link).
     * An empty list means the difference is not a real editorial change.
     *
     * @param mixed $originalValue
     * @param mixed $changedValue
     * @return array<int, array<string, mixed>>
     */
    protected function renderPropertyChange(string $propertyName, $originalValue, $changedValue, NodeInterface $changedNode): array
    {
        $propertyLabel = $this->propertyLabelService->getPropertyLabel($propertyName, $changedNode);
        $isRemoved = $changedNode->isRemoved();

        if (
            ($originalValue instanceof ImageInterface || $originalValue === null)
            && ($changedValue instanceof ImageInterface || $changedValue === null)
            && ($originalValue !== null || $changedValue !== null)
        ) {
            return [$this->entry('IMAGE', $propertyName, $propertyLabel, [
                'originalMedia' => $this->renderMedia($this->loadAsset($originalValue)),
                'changedMedia' => $isRemoved ? null : $this->renderMedia($this->loadAsset($changedValue)),
            ])];
        }

        if ($originalValue instanceof AssetInterface || $changedValue instanceof AssetInterface) {
            return [$this->entry('ASSET', $propertyName, $propertyLabel, [
                'originalMedia' => $this->renderMedia($this->loadAsset($originalValue)),
                'changedMedia' => $isRemoved ? null : $this->renderMedia($this->loadAsset($changedValue)),
            ])];
        }

        if ($originalValue instanceof \DateTimeInterface || $changedValue instanceof \DateTimeInterface) {
            $bothDates = $originalValue instanceof \DateTimeInterface && $changedValue instanceof \DateTimeInterface;
            if ($bothDates && $originalValue->getTimestamp() === $changedValue->getTimestamp() && !$isRemoved) {
                // Two instances of the same moment: the stored value is
                // unchanged, only the object identity differs.
                return [];
            }
            return [$this->entry('DATETIME', $propertyName, $propertyLabel, [
                'original' => $this->renderDateTime($originalValue),
                'changed' => $isRemoved ? null : $this->renderDateTime($changedValue),
            ])];
        }

        // Values with a select/toggle editor, booleans, arrays (references,
        // multi-selects) and remaining objects render as before/after labels.
        $editorValues = $this->propertyLabelService->getEditorValues($propertyName, $changedNode);
        $isTextual = (is_string($originalValue) || $originalValue === null) && (is_string($changedValue) || $changedValue === null);
        if ($editorValues !== null || !$isTextual) {
            $originalLabel = $this->propertyLabelService->renderValueLabel($originalValue, $propertyName, $changedNode);
            $changedLabel = $isRemoved
                ? $this->translate('value.empty')
                : $this->propertyLabelService->renderValueLabel($changedValue, $propertyName, $changedNode);
            if ($originalLabel === $changedLabel) {
                if ((is_scalar($originalValue) || $originalValue === null) && (is_scalar($changedValue) || $changedValue === null)) {
                    // Scalars compare by value, so equal labels over different
                    // values mean a real but invisible change.
                    return $this->renderTechnicalOnlyNote($propertyName, $propertyLabel, $originalValue, $changedValue, $isRemoved);
                }
                // Objects and arrays are rebuilt per request and differ by
                // identity, so an entry here would be a false positive.
                return [];
            }
            return [$this->entry('VALUE', $propertyName, $propertyLabel, [
                'original' => $originalLabel,
                'changed' => $changedLabel,
            ])];
        }

        $entries = [];
        $originalText = (string)($originalValue ?? '');
        $changedText = $isRemoved ? '' : (string)($changedValue ?? '');
        $diffHtml = $this->wordDiffer->renderDiff($originalText, $changedText);
        if ($diffHtml !== null) {
            $entries[] = $this->entry('TEXT', $propertyName, $propertyLabel, [
                'diffHtml' => $diffHtml,
                // The visual compare shows the diff in place of the text on
                // the rendered page, where nothing may be left out, and finds
                // that place by the plain wording of the new text.
                'diffHtmlFull' => $this->wordDiffer->renderDiff($originalText, $changedText, false),
                'changedText' => implode(' ', $this->wordDiffer->tokenize($changedText)),
            ]);
        }
        if (is_string($originalValue) && is_string($changedValue) && !$isRemoved) {
            // The text diff strips all tags, so link and formatting edits are
            // invisible to it and are compared on the markup level instead.
            foreach ($this->richTextDiffer->compare($originalValue, $changedValue) as $finding) {
                $entries[] = $this->renderRichTextFinding($finding, $propertyName, $propertyLabel, $changedNode);
            }
        }
        if ($entries === []) {
            return $this->renderTechnicalOnlyNote($propertyName, $propertyLabel, $originalValue, $changedValue, $isRemoved);
        }
        return $entries;
    }

    /**
     * Names the field of a change that is real on the stored value but has no
     * visible effect, instead of dropping it and leaving the reviewer with an
     * unexplained card.
     *
     * The note claims that a published version exists and reads differently, so
     * it stays silent without a published counterpart - a removed node is
     * compared against nothing, a new node has nothing to be compared to - and
     * whenever both sides read the same once null and "" are treated as the
     * same emptiness.
     *
     * @param mixed $originalValue
     * @param mixed $changedValue
     * @return array<int, array<string, mixed>>
     */
    protected function renderTechnicalOnlyNote(string $propertyName, string $propertyLabel, $originalValue, $changedValue, bool $isRemoved): array
    {
        if ($isRemoved || $originalValue === null) {
            return [];
        }
        if ((string)$originalValue === (string)($changedValue ?? '')) {
            return [];
        }
        return [$this->entry('NOTE', $propertyName, $propertyLabel, [
            'message' => $this->translate('change.technicalOnly'),
            'help' => $this->translate('change.technicalOnlyHelp'),
        ])];
    }

    /**
     * Turns one finding of the rich-text comparison into a review entry, where
     * the detail line names the affected link or passage and the before/after
     * values name what changed about it.
     *
     * @param array<string, mixed> $finding
     * @return array<string, mixed>
     */
    protected function renderRichTextFinding(array $finding, string $propertyName, string $propertyLabel, NodeInterface $changedNode): array
    {
        return match ($finding['kind']) {
            'linkTarget' => $this->renderLinkTargetChange($finding, $propertyName, $propertyLabel, $changedNode),
            'linkAttribute' => $this->entry('LINK', $propertyName, $propertyLabel, [
                'detail' => $this->translate('link.detailAttribute', [
                    $finding['linkText'],
                    $this->translate('link.attribute.' . $finding['attribute']),
                ]),
                'original' => $this->renderLinkAttributeValue($finding['attribute'], $finding['original']),
                'changed' => $this->renderLinkAttributeValue($finding['attribute'], $finding['changed']),
            ]),
            'linkAdded' => $this->entry('LINK', $propertyName, $propertyLabel, [
                'detail' => $this->translate('link.detail', [$finding['linkText']]),
                'original' => $this->translate('link.none'),
                'changed' => $this->renderLinkTargetLabel($finding['href'], $changedNode),
            ]),
            'linkRemoved' => $this->entry('LINK', $propertyName, $propertyLabel, [
                'detail' => $this->translate('link.detail', [$finding['linkText']]),
                'original' => $this->renderLinkTargetLabel($finding['href'], $changedNode),
                'changed' => $this->translate('link.none'),
            ]),
            'formatting' => $this->entry('FORMATTING', $propertyName, $propertyLabel, [
                'detail' => $this->translate('formatting.detail', [$finding['text']]),
                'original' => $this->renderMarkList($finding['originalMarks']),
                'changed' => $this->renderMarkList($finding['changedMarks']),
            ]),
        };
    }

    /**
     * Shows both targets of a re-pointed link by name. Two different targets
     * that happen to carry the same title would read as "X → X", so such a pair
     * falls back to the raw hrefs, which do differ.
     *
     * @param array<string, mixed> $finding
     * @return array<string, mixed>
     */
    protected function renderLinkTargetChange(array $finding, string $propertyName, string $propertyLabel, NodeInterface $changedNode): array
    {
        $original = $this->renderLinkTargetLabel($finding['original'], $changedNode);
        $changed = $this->renderLinkTargetLabel($finding['changed'], $changedNode);
        if ($original === $changed) {
            $original = $finding['original'];
            $changed = $finding['changed'];
        }
        return $this->entry('LINK', $propertyName, $propertyLabel, [
            'detail' => $this->translate('link.detail', [$finding['linkText']]),
            'original' => $original,
            'changed' => $changed,
        ]);
    }

    /**
     * Neos stores internal links as "node://<uuid>" and "asset://<uuid>", which
     * tells a reviewer nothing, so both are resolved to the title of what they
     * point at. Anything that cannot be resolved keeps its raw href: an opaque
     * target still beats a name we do not have.
     */
    protected function renderLinkTargetLabel(string $href, NodeInterface $changedNode): string
    {
        try {
            if (preg_match('#^node://([^/?\#]+)#', $href, $matches) === 1) {
                $context = $changedNode->getContext();
                $node = $context === null ? null : $context->getNodeByIdentifier($matches[1]);
                return $node === null ? $href : $this->orRawHref($this->propertyLabelService->cleanLabel($node->getLabel()), $href);
            }
            if (preg_match('#^asset://([^/?\#]+)#', $href, $matches) === 1) {
                return $this->renderAssetTargetLabel($matches[1], $href);
            }
        } catch (\Throwable $exception) {
            // Resolving reads from the content repository and the asset
            // storage; a review must render even when they cannot answer.
            return $href;
        }
        return $href;
    }

    protected function renderAssetTargetLabel(string $identifier, string $href): string
    {
        $asset = $this->assetRepository->findByIdentifier($identifier);
        if (!$asset instanceof AssetInterface) {
            return $href;
        }
        $title = $this->propertyLabelService->cleanLabel((string)$asset->getTitle());
        if ($title !== '') {
            return $title;
        }
        // Assets uploaded without a title are known to editors by their file name.
        $resource = $asset->getResource();
        return $resource === null ? $href : $this->orRawHref($this->propertyLabelService->cleanLabel($resource->getFilename()), $href);
    }

    protected function orRawHref(string $label, string $href): string
    {
        return $label === '' ? $href : $label;
    }

    /**
     * Names what a link attribute value means to a reader: the target keyword
     * describes where the link opens, every other attribute shows as stored.
     */
    protected function renderLinkAttributeValue(string $attribute, ?string $value): string
    {
        if ($attribute === 'target') {
            if ($value === null || $value === '') {
                return $this->translate('link.target.sameTab');
            }
            return strtolower($value) === '_blank' ? $this->translate('link.target.newTab') : $value;
        }
        return $value === null || $value === '' ? $this->translate('value.empty') : $value;
    }

    /**
     * Names a set of formatting marks in the reviewer's language.
     *
     * @param string[] $marks
     */
    protected function renderMarkList(array $marks): string
    {
        if ($marks === []) {
            return $this->translate('value.formatNone');
        }
        $labels = array_map(function (string $mark): string {
            // Heading levels share one label with the level as an argument.
            if (preg_match('/^heading(\d)$/', $mark, $matches) === 1) {
                return $this->translate('format.heading', [$matches[1]]);
            }
            return $this->translate('format.' . $mark);
        }, $marks);
        return implode(', ', $labels);
    }

    /**
     * A Doctrine proxy of an asset that no longer exists throws on access, so
     * it is loaded here and its error message travels on as the media label.
     *
     * @return AssetInterface|string|null
     */
    protected function loadAsset(?AssetInterface $assetOrNull)
    {
        if ($assetOrNull instanceof DoctrineProxy) {
            try {
                $assetOrNull->__load();
            } catch (EntityNotFoundException $exception) {
                return $exception->getMessage();
            }
        }
        return $assetOrNull;
    }

    /**
     * @param AssetInterface|string|null $asset
     * @return array<string, mixed>|null a MediaRef as the SDL describes it
     */
    protected function renderMedia($asset): ?array
    {
        if ($asset === null) {
            return null;
        }
        if (is_string($asset)) {
            // The asset is gone; its absence is what the reviewer has to see.
            return ['label' => $asset, 'thumbnailUri' => null, 'uri' => null, 'filename' => null];
        }

        $resource = $asset->getResource();
        $filename = $resource === null ? null : $resource->getFilename();
        $title = $this->propertyLabelService->cleanLabel((string)$asset->getTitle());

        return [
            'label' => $title !== '' ? $title : (string)$filename,
            'thumbnailUri' => $this->renderThumbnailUri($asset),
            'uri' => $this->renderResourceUri($asset),
            'filename' => $filename,
        ];
    }

    protected function renderThumbnailUri(AssetInterface $asset): ?string
    {
        try {
            $configuration = new ThumbnailConfiguration(null, self::THUMBNAIL_BOX, null, self::THUMBNAIL_BOX);
            $thumbnail = $this->assetService->getThumbnailUriAndSizeForAsset($asset, $configuration);
        } catch (\Throwable $exception) {
            // Thumbnail generation touches the image driver and the filesystem;
            // a missing preview must not fail the whole review query.
            return null;
        }
        return $thumbnail['src'] ?? null;
    }

    protected function renderResourceUri(AssetInterface $asset): ?string
    {
        $resource = $asset->getResource();
        if ($resource === null) {
            return null;
        }
        try {
            $uri = $this->resourceManager->getPublicPersistentResourceUri($resource);
        } catch (\Throwable $exception) {
            return null;
        }
        return is_string($uri) ? $uri : null;
    }

    /**
     * @param array<int, string|int> $arguments
     */
    protected function translate(string $id, array $arguments = []): string
    {
        return $this->propertyLabelService->translate($id, $arguments);
    }
}
