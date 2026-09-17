<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Domain\Service;

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\NodeType;
use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\Domain\Service\NodeTypeIconService;

class NodeTypeIconServiceTest extends UnitTestCase
{
    /**
     * @test
     * @dataProvider icons
     */
    public function normalizeMapsEveryIconNotationToFontAwesomeClasses(?string $icon, string $expected): void
    {
        self::assertSame($expected, (new NodeTypeIconService())->normalize($icon));
    }

    public function icons(): array
    {
        return [
            'plain name' => ['globe', 'fas fa-globe'],
            'legacy prefix' => ['icon-tags', 'fas fa-tags'],
            'font awesome name' => ['fa-newspaper', 'fas fa-newspaper'],
            'complete classes' => ['far fa-file-alt', 'far fa-file-alt'],
            'missing' => [null, 'fas fa-file'],
            'empty' => ['', 'fas fa-file'],
        ];
    }

    /**
     * NodeType has no "ui" accessor, so an implementation reading
     * "nodeType.ui.icon" would always find nothing.
     *
     * @test
     */
    public function forNodeReadsTheIconFromTheFullNodeTypeConfiguration(): void
    {
        $nodeType = $this->createMock(NodeType::class);
        $nodeType->method('getFullConfiguration')->willReturn(['ui' => ['icon' => 'icon-globe']]);
        $node = $this->createMock(NodeInterface::class);
        $node->method('getNodeType')->willReturn($nodeType);

        self::assertSame('fas fa-globe', (new NodeTypeIconService())->forNode($node));
    }

    /** @test */
    public function forNodeFallsBackWhenTheNodeTypeConfiguresNoIcon(): void
    {
        $nodeType = $this->createMock(NodeType::class);
        $nodeType->method('getFullConfiguration')->willReturn([]);
        $node = $this->createMock(NodeInterface::class);
        $node->method('getNodeType')->willReturn($nodeType);

        self::assertSame('fas fa-file', (new NodeTypeIconService())->forNode($node));
    }
}
