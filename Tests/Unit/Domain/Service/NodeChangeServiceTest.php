<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Domain\Service;

use Neos\ContentRepository\Domain\Model\ArrayPropertyCollection;
use Neos\ContentRepository\Domain\Model\NodeData;
use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\NodeType;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Domain\Service\Context;
use Neos\ContentRepository\Domain\Service\ContextFactoryInterface;
use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\Domain\Diff\RichTextDiffer;
use NEOSidekick\WorkspaceReview\Domain\Diff\WordDiffer;
use NEOSidekick\WorkspaceReview\Domain\Service\NodeChangeService;
use NEOSidekick\WorkspaceReview\Domain\Service\PositionService;
use NEOSidekick\WorkspaceReview\Domain\Service\PropertyLabelService;

class NodeChangeServiceTest extends UnitTestCase
{
    /** @test */
    public function renderContentChangesIncludesAllChangedNeosSystemFields(): void
    {
        $originalNodeType = $this->createMock(NodeType::class);
        $originalNodeType->method('getName')->willReturn('Vendor.Site:Original');

        $changedNodeType = $this->createMock(NodeType::class);
        $changedNodeType->method('getName')->willReturn('Vendor.Site:Changed');
        $changedNodeType->method('getDefaultValuesForProperties')->willReturn([]);

        $originalNode = $this->createMock(NodeInterface::class);
        $originalNode->method('getNodeType')->willReturn($originalNodeType);
        $originalNode->method('isHidden')->willReturn(false);
        $originalNode->method('getHiddenBeforeDateTime')->willReturn(null);
        $originalNode->method('getHiddenAfterDateTime')->willReturn(new \DateTimeImmutable('2026-09-10 08:00:00'));
        $originalNode->method('isHiddenInIndex')->willReturn(false);
        $originalNode->method('getAccessRoles')->willReturn([]);
        $originalNode->method('getPath')->willReturn('/sites/example/original');
        $originalNode->method('getIndex')->willReturn(100);

        $changedNode = $this->createMock(NodeInterface::class);
        $changedNode->method('getProperties')->willReturn(new ArrayPropertyCollection([]));
        $changedNode->method('getNodeType')->willReturn($changedNodeType);
        $changedNode->method('isHidden')->willReturn(true);
        $changedNode->method('getHiddenBeforeDateTime')->willReturn(new \DateTimeImmutable('2026-09-01 08:00:00'));
        $changedNode->method('getHiddenAfterDateTime')->willReturn(new \DateTimeImmutable('2026-09-20 08:00:00'));
        $changedNode->method('isHiddenInIndex')->willReturn(true);
        $changedNode->method('getAccessRoles')->willReturn(['Vendor.Site:Members']);
        $changedNode->method('getPath')->willReturn('/sites/example/changed');
        $changedNode->method('getIndex')->willReturn(200);
        $changedNode->method('isRemoved')->willReturn(false);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            [
                '_hidden',
                '_hiddenBeforeDateTime',
                '_hiddenAfterDateTime',
                '_hiddenInIndex',
                '_accessRoles',
                '_nodeType',
                '_path',
                '_index',
            ],
            array_keys($changes)
        );
        self::assertSame('VISIBILITY', $changes['_hidden']['kind']);
        self::assertSame('DATETIME', $changes['_hiddenBeforeDateTime']['kind']);
        self::assertSame(
            (new \DateTimeImmutable('2026-09-20 08:00:00'))->format(\DateTimeInterface::ATOM),
            $changes['_hiddenAfterDateTime']['changed']
        );
        self::assertSame('VALUE', $changes['_hiddenInIndex']['kind']);
        self::assertSame('VALUE', $changes['_accessRoles']['kind']);
        self::assertSame('VALUE', $changes['_nodeType']['kind']);
        self::assertSame('VALUE', $changes['_path']['kind']);
        // Without a reachable parent the position falls back to the raw index.
        self::assertSame(
            ['VALUE', '_index', 'system.position', '100', '200'],
            $this->summarize($changes['_index'])
        );
    }

    /** @test */
    public function renderContentChangesReportsAPropertyChangedBackToItsNodeTypeDefault(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Element', [
            'spaceBelow' => [
                'ui' => [
                    'label' => 'Space below',
                    'inspector' => [
                        'editorOptions' => [
                            'values' => [
                                'normal' => ['label' => 'Normal'],
                                'big' => ['label' => 'Big'],
                            ],
                        ],
                    ],
                ],
            ],
        ], ['spaceBelow' => 'normal']);

        $originalNode = $this->createNode($nodeType, ['spaceBelow' => 'big']);
        $changedNode = $this->createNode($nodeType, ['spaceBelow' => 'normal']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            ['VALUE', 'spaceBelow', 'Space below', 'Big', 'Normal'],
            $this->summarize($changes['spaceBelow'] ?? [])
        );
    }

    /** @test */
    public function renderContentChangesSkipsDefaultAndEmptyPropertiesOfANewNode(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Element', [], ['spaceBelow' => 'normal']);
        $changedNode = $this->createNode($nodeType, ['spaceBelow' => 'normal', 'title' => '']);

        self::assertSame([], $this->createService(null)->renderContentChanges($changedNode));
    }

    /**
     * The visual compare puts the diff in place of the text on the rendered
     * page, so it gets the complete wording while the card stays collapsed.
     *
     * @test
     */
    public function renderContentChangesKeepsAnUncollapsedDiffForTheVisualCompare(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $words = implode(' ', array_map(static fn(int $i): string => 'Wort' . $i, range(1, 40)));
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Alt ' . $words . '</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Neu ' . $words . '</p>']);

        $change = $this->createService($originalNode)->renderContentChanges($changedNode)['text'];

        self::assertSame('TEXT', $change['kind']);
        self::assertStringContainsString(WordDiffer::ELLIPSIS_CLASS, $change['diffHtml']);
        self::assertStringNotContainsString(WordDiffer::ELLIPSIS_CLASS, $change['diffHtmlFull']);
        self::assertStringContainsString('Wort40', $change['diffHtmlFull']);
        self::assertSame('Neu ' . $words, $change['changedText']);
    }

    /** @test */
    public function renderContentChangesReportsALinkTargetTheTextDiffCannotSee(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="http://neos.eu">neos.eu</a></p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="https://neos.eu">neos.eu</a></p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            ['LINK', 'text', 'Text', 'http://neos.eu', 'https://neos.eu'],
            $this->summarize($changes['text'] ?? [])
        );
        self::assertSame('link.detail(neos.eu)', $changes['text']['detail']);
    }

    /** @test */
    public function renderContentChangesKeepsTheTextDiffNextToItsRichTextFindings(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="http://neos.eu">neos.eu</a> lesen</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="https://neos.eu">neos.eu</a> nachlesen</p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(['text', 'text#rt1'], array_keys($changes));
        self::assertSame('TEXT', $changes['text']['kind']);
        self::assertSame('LINK', $changes['text#rt1']['kind']);
        // Both entries describe the same field, so its name is stated once,
        // while the property they belong to stays on each of them.
        self::assertSame('Text', $changes['text']['label']);
        self::assertSame('', $changes['text#rt1']['label']);
        self::assertSame('text', $changes['text#rt1']['property']);
    }

    /** @test */
    public function renderContentChangesNamesWhereALinkOpensInsteadOfTheRawKeyword(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="https://neos.eu">neos.eu</a></p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Mehr auf <a href="https://neos.eu" target="_blank">neos.eu</a></p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            ['LINK', 'text', 'Text', 'link.target.sameTab', 'link.target.newTab'],
            $this->summarize($changes['text'] ?? [])
        );
        self::assertSame('link.detailAttribute(neos.eu, link.attribute.target)', $changes['text']['detail']);
    }

    /** @test */
    public function renderContentChangesResolvesAnInternalLinkTargetToThePageTitle(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $context = $this->createMock(Context::class);
        $context->method('getNodeByIdentifier')->willReturnCallback(
            fn($identifier) => $identifier === 'c0ffee' ? $this->createLabelledNode('Kontakt &amp; Anfahrt') : null
        );
        $originalNode = $this->createNode($nodeType, ['text' => '<p><a href="node://deadbeef">Mehr</a></p>']);
        $changedNode = $this->createNode(
            $nodeType,
            ['text' => '<p><a href="node://c0ffee">Mehr</a></p>'],
            context: $context
        );

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // A target the context cannot resolve keeps its raw href.
        self::assertSame('node://deadbeef', $changes['text']['original'] ?? null);
        self::assertSame('Kontakt & Anfahrt', $changes['text']['changed'] ?? null);
    }

    /** @test */
    public function renderContentChangesShowsTheRawTargetsOfTwoPagesWithTheSameTitle(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $context = $this->createMock(Context::class);
        $context->method('getNodeByIdentifier')->willReturnCallback(
            fn($identifier) => $this->createLabelledNode('Kontakt')
        );
        $originalNode = $this->createNode($nodeType, ['text' => '<p><a href="node://deadbeef">Mehr</a></p>']);
        $changedNode = $this->createNode(
            $nodeType,
            ['text' => '<p><a href="node://c0ffee">Mehr</a></p>'],
            context: $context
        );

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // Two equal labels would read as "Kontakt → Kontakt" and hide that the
        // link points at a different page now.
        self::assertSame('node://deadbeef', $changes['text']['original'] ?? null);
        self::assertSame('node://c0ffee', $changes['text']['changed'] ?? null);
    }

    /** @test */
    public function renderContentChangesKeepsALinkTargetItCannotResolve(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p><a href="asset://deadbeef">Prospekt</a></p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p><a href="asset://c0ffee">Prospekt</a></p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // Without an asset repository the lookup fails; the review must still
        // answer, showing the raw targets.
        self::assertSame('asset://deadbeef', $changes['text']['original'] ?? null);
        self::assertSame('asset://c0ffee', $changes['text']['changed'] ?? null);
    }

    /** @test */
    public function renderContentChangesNamesTheFieldOfAnInvisibleTextChange(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Hallo</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p >Hallo</p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame('NOTE', $changes['text#note']['kind'] ?? null);
        self::assertSame('Text', $changes['text#note']['label'] ?? null);
        self::assertSame('change.technicalOnly', $changes['text#note']['message'] ?? null);
    }

    /** @test */
    public function renderContentChangesStatesThatAnEditedNodeMatchesTheOriginalAgain(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $properties = ['text' => '<p>Hallo Welt</p>'];
        $originalNode = $this->createNode($nodeType, $properties);
        $changedNode = $this->createNode($nodeType, $properties);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(['_note'], array_keys($changes));
        self::assertSame('change.identicalToOriginal', $changes['_note']['message']);
        self::assertSame('', $changes['_note']['label']);
    }

    /** @test */
    public function renderContentChangesTreatsARebuiltDateTimeAsNoChangeAtAll(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['publishDate' => new \DateTimeImmutable('2026-09-01 08:00:00')]);
        $changedNode = $this->createNode($nodeType, ['publishDate' => new \DateTimeImmutable('2026-09-01 08:00:00')]);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // The two instances differ by identity only, which is no reason to
        // claim the node was changed and reverted.
        self::assertSame(['_note'], array_keys($changes));
        self::assertSame('change.identicalToOriginal', $changes['_note']['message']);
    }

    /** @test */
    public function renderContentChangesShowsAMovedNodeAsAPositionAmongItsSiblings(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [], 100, $this->createParent('/sites/example', ['first', 'moved', 'third']));
        $changedNode = $this->createNode($nodeType, [], 250, $this->createParent('/sites/example', ['moved', 'first', 'third']));

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            ['VALUE', '_index', 'system.position', 'position.ordinalOfTotal(2, 3)', 'position.ordinalOfTotal(1, 3)'],
            $this->summarize($changes['_index'] ?? [])
        );
    }

    /** @test */
    public function renderContentChangesCallsARenumberedSortingIndexAnInternalChange(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [], 100, $this->createParent('/sites/example', ['first', 'moved', 'third']));
        $changedNode = $this->createNode($nodeType, [], 150, $this->createParent('/sites/example', ['first', 'moved', 'third']));

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame('NOTE', $changes['_index']['kind'] ?? null);
        self::assertSame('system.position', $changes['_index']['label'] ?? null);
        self::assertSame('position.internalOnly', $changes['_index']['message'] ?? null);
    }

    /** @test */
    public function renderContentChangesLeavesThePositionOutWhenTheNodeChangedItsParent(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [], 100, $this->createParent('/sites/example', ['first', 'moved']), '/sites/example/moved');
        $changedNode = $this->createNode($nodeType, [], 250, $this->createParent('/sites/other', ['moved']), '/sites/other/moved');

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // An ordinal within another list would suggest a reordering that never
        // happened; the changed path already states the move.
        self::assertSame(['_path'], array_keys($changes));
    }

    /** @test */
    public function renderContentChangesNamesTheFormattingOfAReformattedPassage(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [
            'text' => '<p>Hallo schöne Welt</p>',
            'heading' => '<p>Titel</p>',
        ]);
        $changedNode = $this->createNode($nodeType, [
            'text' => '<p>Hallo <strong>schöne</strong> Welt</p>',
            'heading' => '<h2>Titel</h2>',
        ]);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(
            ['FORMATTING', 'text', 'Text', 'value.formatNone', 'format.bold'],
            $this->summarize($changes['text'] ?? [])
        );
        self::assertSame('formatting.detail(schöne)', $changes['text']['detail']);
        self::assertSame(
            ['FORMATTING', 'heading', 'Heading', 'value.formatNone', 'format.heading(2)'],
            $this->summarize($changes['heading'] ?? [])
        );
    }

    /** @test */
    public function renderContentChangesReportsOnlyTheFormattingWhenAWordBeforeACommaBecameBold(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [
            'text' => '<p>Der Einlass beginnt jeweils um 18 Uhr, der Eintritt ist frei.</p>',
        ]);
        $changedNode = $this->createNode($nodeType, [
            'text' => '<p>Der Einlass beginnt jeweils um <strong>18 Uhr</strong>, der Eintritt ist frei.</p>',
        ]);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // Removing the inline tag must not leave a space behind, which would
        // let the word diff claim "Uhr," was rewritten as "Uhr ,".
        self::assertSame(['text'], array_keys($changes));
        self::assertSame('formatting.detail(18 Uhr,)', $changes['text']['detail']);
    }

    /** @test */
    public function renderContentChangesShowsTheTextOfARemovedNodeAsDeleted(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Wird gelöscht</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Wird gelöscht</p>'], isRemoved: true);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        self::assertSame(['text'], array_keys($changes));
        self::assertSame('TEXT', $changes['text']['kind']);
        self::assertStringContainsString(
            '<del><span class="' . WordDiffer::SCREEN_READER_CLASS . '">diff.deleted </span>Wird gelöscht</del>',
            $changes['text']['diffHtml']
        );
    }

    /** @test */
    public function renderContentChangesLabelsEveryEditedRunForScreenReaders(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Der Vorverkauf startet am 15. September.</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Der Vorverkauf startet am 1. September.</p>']);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // The markers carry no visible text of their own: the hidden label is
        // what tells a screen reader user which run was removed and which one
        // was added.
        self::assertSame(
            'Der Vorverkauf startet am'
            . ' <del><span class="' . WordDiffer::SCREEN_READER_CLASS . '">diff.deleted </span>15.</del>'
            . ' <ins><span class="' . WordDiffer::SCREEN_READER_CLASS . '">diff.added </span>1.</ins>'
            . ' September.',
            $changes['text']['diffHtml']
        );
    }

    /** @test */
    public function renderContentChangesSaysNothingTechnicalAboutANodeCreatedAndDeletedAtOnce(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Wird gelöscht</p>'], isRemoved: true);

        // There is no published version this content could differ from; the
        // "deleted" badge is the whole story.
        self::assertSame([], $this->createService(null)->renderContentChanges($changedNode));
    }

    /** @test */
    public function renderContentChangesSkipsUntouchedDefaultsOfARemovedNode(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Element', [], ['spaceBelow' => 'normal']);
        $originalNode = $this->createNode($nodeType, ['spaceBelow' => 'normal']);
        $changedNode = $this->createNode($nodeType, ['spaceBelow' => 'normal'], isRemoved: true);

        self::assertSame([], $this->createService($originalNode)->renderContentChanges($changedNode));
    }

    /** @test */
    public function renderContentChangesSaysNothingAboutAValueThatWasNeverSet(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['title' => null, 'text' => '<p>Hallo</p>']);
        $changedNode = $this->createNode($nodeType, ['title' => '', 'text' => '<p>Hallo Welt</p>']);

        // "not set" and "empty" describe the same state, so the empty title is
        // no change a reviewer needs to read about.
        self::assertSame(['text'], array_keys($this->createService($originalNode)->renderContentChanges($changedNode)));
    }

    /** @test */
    public function renderContentChangesSaysNothingTechnicalAboutAnEmptyParagraphOfANewNode(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $changedNode = $this->createNode($nodeType, ['text' => '<p>&nbsp;</p>']);

        self::assertSame([], $this->createService(null)->renderContentChanges($changedNode));
    }

    /** @test */
    public function renderContentChangesCallsARevertedReferenceListIdenticalToTheOriginal(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Element');
        $originalNode = $this->createNode($nodeType, ['related' => [$this->createLabelledNode('Kontakt')]]);
        $changedNode = $this->createNode($nodeType, ['related' => [$this->createLabelledNode('Kontakt')]]);

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // The two arrays hold different instances of the same reference, which
        // is object identity, not a stored difference.
        self::assertSame(['_note'], array_keys($changes));
        self::assertSame('change.identicalToOriginal', $changes['_note']['message']);
    }

    /** @test */
    public function renderContentChangesCallsAnElementInsertedAboveAnInternalChange(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, [], 100, $this->createParent('/sites/example', ['first', 'moved']));
        $changedNode = $this->createNode($nodeType, [], 200, $this->createParent('/sites/example', ['first', 'neu', 'moved']));

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // The element still follows "first"; only the new sibling in between
        // renumbered the indices.
        self::assertSame(['_index'], array_keys($changes));
        self::assertSame('position.internalOnly', $changes['_index']['message']);
    }

    /** @test */
    public function renderContentChangesCountsOnlyPagesWhenRankingAPage(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Page', isDocument: true);
        $originalNode = $this->createNode($nodeType, [], 100, $this->createParent('/sites/example', ['main'], ['first', 'moved', 'third']));
        $changedNode = $this->createNode($nodeType, [], 50, $this->createParent('/sites/example', ['main'], ['moved', 'first', 'third']));

        $changes = $this->createService($originalNode)->renderContentChanges($changedNode);

        // The page's own content collection is no sibling in the page order.
        self::assertSame(
            ['VALUE', '_index', 'system.position', 'position.ordinalOfTotal(2, 3)', 'position.ordinalOfTotal(1, 3)'],
            $this->summarize($changes['_index'] ?? [])
        );
    }

    /**
     * Every entry carries the full field set of the SDL type, so a missing key
     * cannot fail the query on a non-null field.
     *
     * @test
     */
    public function everyPropertyChangeCarriesEveryFieldOfTheSchema(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $originalNode = $this->createNode($nodeType, ['text' => '<p>Alt</p>']);
        $changedNode = $this->createNode($nodeType, ['text' => '<p>Neu</p>']);

        $change = $this->createService($originalNode)->renderContentChanges($changedNode)['text'];

        self::assertSame(
            [
                'kind', 'property', 'label', 'detail', 'diffHtml', 'diffHtmlFull', 'changedText',
                'original', 'changed', 'originalMedia', 'changedMedia', 'hidden', 'message',
            ],
            array_keys($change)
        );
    }

    /**
     * The same for the change itself. `identifier` is its own field because the
     * visual compare matches it against the marker attribute, and a Neos node
     * identifier is not necessarily a UUID that could be read back out of `id`.
     *
     * @test
     */
    public function everyChangeCarriesEveryFieldOfTheSchema(): void
    {
        $nodeType = $this->createNodeType('Vendor.Site:Text');
        $nodeType->method('getLabel')->willReturn('Text');
        $node = $this->createNode($nodeType, []);
        $node->method('getContextPath')->willReturn('/sites/example/moved@user-admin;language=de');
        $node->method('getLabel')->willReturn('Text element');
        $node->method('getNodeData')->willReturn($this->createMock(NodeData::class));

        $change = $this->createService(null)->buildChange($node, 'a1b2c3', false, true, true);

        self::assertSame(
            [
                'id', 'identifier', 'contextPath', 'nodePath', 'label', 'typeLabel',
                'isNew', 'isMoved', 'isHidden', 'isRemoved', 'lastModified', 'publishable', 'properties',
            ],
            array_keys($change)
        );
        self::assertSame('moved', $change['identifier']);
        self::assertSame('moved-a1b2c3', $change['id']);
    }

    /**
     * The five fields every assertion here is about, in one line.
     *
     * @param array<string, mixed> $entry
     * @return array<int, mixed>
     */
    private function summarize(array $entry): array
    {
        return [
            $entry['kind'] ?? null,
            $entry['property'] ?? null,
            $entry['label'] ?? null,
            $entry['original'] ?? null,
            $entry['changed'] ?? null,
        ];
    }

    /**
     * The service is exercised through an anonymous subclass, because a unit
     * test has neither Flow's dependency injection nor a base workspace to
     * read the original node from. The translator stand-in answers with the
     * label id, so assertions can name the label they expect.
     */
    /**
     * The reference of a review is the base of the REVIEWED workspace. A page
     * the reviewed workspace has not changed still carries the workspace of
     * its data ("live"), whose base would be none at all - it must not count
     * as new because of that.
     *
     * @test
     */
    public function getOriginalNodeLooksIntoTheBaseOfTheContextWorkspaceNotOfTheNodeData(): void
    {
        $liveWorkspace = $this->createMock(Workspace::class);
        $liveWorkspace->method('getName')->willReturn('live');
        $liveWorkspace->method('getBaseWorkspace')->willReturn(null);
        $reviewedWorkspace = $this->createMock(Workspace::class);
        $reviewedWorkspace->method('getBaseWorkspace')->willReturn($liveWorkspace);

        $context = $this->createMock(Context::class);
        $context->method('getWorkspace')->willReturn($reviewedWorkspace);
        $context->method('getProperties')->willReturn(['workspaceName' => 'user-admin', 'dimensions' => ['language' => ['de']]]);

        $unchangedPage = $this->createMock(NodeInterface::class);
        $unchangedPage->method('getContext')->willReturn($context);
        $unchangedPage->method('getWorkspace')->willReturn($liveWorkspace);
        $unchangedPage->method('getIdentifier')->willReturn('page');

        $publishedPage = $this->createMock(NodeInterface::class);
        $baseContext = $this->createMock(Context::class);
        $baseContext->method('getNodeByIdentifier')->with('page')->willReturn($publishedPage);
        $contextFactory = $this->createMock(ContextFactoryInterface::class);
        $contextFactory->expects(self::once())->method('create')
            ->with(['workspaceName' => 'live', 'dimensions' => ['language' => ['de']]])
            ->willReturn($baseContext);

        $service = new NodeChangeService();
        $this->inject($service, 'contextFactory', $contextFactory);

        self::assertSame($publishedPage, $service->getOriginalNode($unchangedPage));
    }

    private function createService(?NodeInterface $originalNode): NodeChangeService
    {
        $propertyLabelService = new class extends PropertyLabelService {
            public function translate(string $id, array $arguments = [], ?int $quantity = null): string
            {
                return $arguments === [] ? $id : $id . '(' . implode(', ', $arguments) . ')';
            }
        };
        $wordDiffer = new class ($propertyLabelService) extends WordDiffer {
            public function __construct(PropertyLabelService $propertyLabelService)
            {
                $this->propertyLabelService = $propertyLabelService;
            }
        };
        $positionService = new class ($propertyLabelService) extends PositionService {
            public function __construct(PropertyLabelService $propertyLabelService)
            {
                $this->propertyLabelService = $propertyLabelService;
            }
        };

        return new class ($originalNode, $propertyLabelService, $wordDiffer, $positionService) extends NodeChangeService {
            private ?NodeInterface $original;

            public function __construct(
                ?NodeInterface $original,
                PropertyLabelService $propertyLabelService,
                WordDiffer $wordDiffer,
                PositionService $positionService
            ) {
                $this->original = $original;
                $this->propertyLabelService = $propertyLabelService;
                $this->wordDiffer = $wordDiffer;
                $this->positionService = $positionService;
                $this->richTextDiffer = new RichTextDiffer();
            }

            public function getOriginalNode(NodeInterface $modifiedNode): ?NodeInterface
            {
                return $this->original;
            }
        };
    }

    private function createNodeType(
        string $name,
        array $properties = [],
        array $defaultValues = [],
        bool $isDocument = false
    ): NodeType {
        $nodeType = $this->createMock(NodeType::class);
        $nodeType->method('getName')->willReturn($name);
        $nodeType->method('getProperties')->willReturn($properties);
        $nodeType->method('getDefaultValuesForProperties')->willReturn($defaultValues);
        $nodeType->method('isOfType')->willReturnCallback(
            static fn($superType): bool => $isDocument && $superType === 'Neos.Neos:Document'
        );
        return $nodeType;
    }

    /**
     * A node whose system fields all hold the same values, so only the given
     * properties, index and parent can produce change entries.
     */
    private function createNode(
        NodeType $nodeType,
        array $properties,
        int $index = 1,
        ?NodeInterface $parent = null,
        string $path = '/sites/example/moved',
        bool $isRemoved = false,
        ?Context $context = null
    ): NodeInterface {
        $node = $this->createMock(NodeInterface::class);
        $node->method('getNodeType')->willReturn($nodeType);
        $node->method('getProperties')->willReturn(new ArrayPropertyCollection($properties));
        $node->method('getProperty')->willReturnCallback(
            static fn($propertyName) => $properties[$propertyName] ?? null
        );
        $node->method('getIdentifier')->willReturn('moved');
        $node->method('isHidden')->willReturn(false);
        $node->method('isRemoved')->willReturn($isRemoved);
        $node->method('getHiddenBeforeDateTime')->willReturn(null);
        $node->method('getHiddenAfterDateTime')->willReturn(null);
        $node->method('isHiddenInIndex')->willReturn(false);
        $node->method('getAccessRoles')->willReturn([]);
        $node->method('getPath')->willReturn($path);
        $node->method('getIndex')->willReturn($index);
        $node->method('getParent')->willReturn($parent);
        $node->method('getContext')->willReturn($context);
        return $node;
    }

    /**
     * A node that only has to answer with a label, as a link target or as the
     * value of a reference property.
     */
    private function createLabelledNode(string $label): NodeInterface
    {
        $node = $this->createMock(NodeInterface::class);
        $node->method('getLabel')->willReturn($label);
        return $node;
    }

    /**
     * The children are answered per node type filter, mirroring the content
     * repository: a page lists its sub pages, a collection its elements.
     *
     * @param string[] $contentChildIdentifiers children of "!Neos.Neos:Document"
     * @param string[] $documentChildIdentifiers children of "Neos.Neos:Document"
     */
    private function createParent(
        string $path,
        array $contentChildIdentifiers,
        array $documentChildIdentifiers = []
    ): NodeInterface {
        $contentChildren = $this->createChildNodes($contentChildIdentifiers);
        $documentChildren = $this->createChildNodes($documentChildIdentifiers);

        $parent = $this->createMock(NodeInterface::class);
        $parent->method('getPath')->willReturn($path);
        $parent->method('getChildNodes')->willReturnCallback(
            static fn($nodeTypeFilter = null): array => $nodeTypeFilter === 'Neos.Neos:Document'
                ? $documentChildren
                : $contentChildren
        );
        return $parent;
    }

    /**
     * @param string[] $identifiers
     * @return NodeInterface[]
     */
    private function createChildNodes(array $identifiers): array
    {
        return array_map(function (string $identifier): NodeInterface {
            $child = $this->createMock(NodeInterface::class);
            $child->method('getIdentifier')->willReturn($identifier);
            return $child;
        }, $identifiers);
    }
}
