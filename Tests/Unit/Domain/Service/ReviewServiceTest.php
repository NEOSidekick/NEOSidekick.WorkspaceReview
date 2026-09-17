<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Domain\Service;

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\NodeType;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Domain\Service\PublishingServiceInterface;
use Neos\Flow\Tests\UnitTestCase;
use Neos\Neos\Domain\Repository\SiteRepository;
use Neos\Neos\Domain\Service\ContentContext;
use NEOSidekick\WorkspaceReview\Domain\Service\NodeChangeService;
use NEOSidekick\WorkspaceReview\Domain\Service\ReviewService;

class ReviewServiceTest extends UnitTestCase
{
    /**
     * The grouping the whole review rests on: every unpublished node is filed
     * under its site, the dimension hash of its document and that document's
     * path below the site, with its path relative to the document as the key.
     *
     * @test
     */
    public function computeSiteChangesGroupsEveryNodeUnderItsSiteDimensionAndDocument(): void
    {
        $page = $this->createNode('/sites/example/herbst', ['language' => ['de']]);
        $headline = $this->createNode('/sites/example/herbst/main/headline', ['language' => ['de']]);
        $home = $this->createNode('/sites/example', ['language' => ['de']]);

        $service = $this->createService(
            [$headline, $page, $home],
            [$page, $page, $home],
            static fn(NodeInterface $node): ?NodeInterface => null
        );

        $siteChanges = $service->computeSiteChanges($this->createMock(Workspace::class));

        self::assertSame(['example'], array_keys($siteChanges));
        $dimensionHash = array_key_first($siteChanges['example']['documents']);
        self::assertSame(
            ['', 'herbst'],
            array_keys($siteChanges['example']['documents'][$dimensionHash])
        );
        self::assertSame(
            ['/main/headline', ''],
            array_keys($siteChanges['example']['documents'][$dimensionHash]['herbst']['changes'])
        );
    }

    /**
     * A node a content collection only carries is no editorial change; the
     * core skips it and so does the port.
     *
     * @test
     */
    public function computeSiteChangesSkipsPlainContentCollections(): void
    {
        $collection = $this->createNode('/sites/example/herbst/main', ['language' => ['de']], true);
        $page = $this->createNode('/sites/example/herbst', ['language' => ['de']]);

        $service = $this->createService([$collection], [$page], static fn(NodeInterface $node): ?NodeInterface => null);

        self::assertSame([], $service->computeSiteChanges($this->createMock(Workspace::class)));
    }

    /**
     * "isNew" and "isMoved" refer to the base workspace, where publishing goes:
     * a document the base workspace knows under another path is moved, not new.
     *
     * @test
     */
    public function computeSiteChangesFlagsDocumentsAgainstTheBaseWorkspace(): void
    {
        $page = $this->createNode('/sites/example/herbst', ['language' => ['de']]);
        $baseNode = $this->createNode('/sites/example/sommer', ['language' => ['de']]);

        $service = $this->createService([$page], [$page], static fn(NodeInterface $node): ?NodeInterface => $baseNode);

        $siteChanges = $service->computeSiteChanges($this->createMock(Workspace::class));
        $dimensionHash = array_key_first($siteChanges['example']['documents']);
        $document = $siteChanges['example']['documents'][$dimensionHash]['herbst'];

        self::assertFalse($document['isNew']);
        self::assertTrue($document['isMoved']);
    }

    /**
     * Chained workspaces: a page created in the base workspace is not live
     * yet, but publishing an edit of it adds no page - only the element the
     * base workspace does not know is new.
     *
     * @test
     */
    public function computeSiteChangesDoesNotCallAPageNewThatTheBaseWorkspaceAlreadyHas(): void
    {
        $page = $this->createNode('/sites/example/herbst', ['language' => ['de']]);
        $edited = $this->createNode('/sites/example/herbst/main/text', ['language' => ['de']]);
        $added = $this->createNode('/sites/example/herbst/main/teaser', ['language' => ['de']]);

        $service = $this->createService(
            [$page, $edited, $added],
            [$page, $page, $page],
            static fn(NodeInterface $node): ?NodeInterface => $node === $added ? null : $node
        );

        $siteChanges = $service->computeSiteChanges($this->createMock(Workspace::class));
        $dimensionHash = array_key_first($siteChanges['example']['documents']);
        $document = $siteChanges['example']['documents'][$dimensionHash]['herbst'];

        self::assertFalse($document['isNew']);
        self::assertFalse($document['changes']['/main/text']['isNew']);
        self::assertTrue($document['changes']['/main/teaser']['isNew']);
        self::assertFalse($document['changes']['/main/teaser']['isMoved']);
    }

    /**
     * The lookup is made per node, so it carries the node's dimensions: a new
     * translation is new although its other-language variant exists.
     *
     * @test
     */
    public function computeSiteChangesFlagsANewTranslationVariantAsNew(): void
    {
        $german = $this->createNode('/sites/example/herbst', ['language' => ['de']]);
        $english = $this->createNode('/sites/example/herbst', ['language' => ['en']]);

        $service = $this->createService(
            [$german, $english],
            [$german, $english],
            static fn(NodeInterface $node): ?NodeInterface => $node === $german ? $german : null
        );

        $flags = [];
        foreach ($service->computeSiteChanges($this->createMock(Workspace::class))['example']['documents'] as $documents) {
            $flags[] = $documents['herbst']['isNew'];
        }

        self::assertSame([false, true], $flags);
    }

    /**
     * @param NodeInterface[] $unpublishedNodes
     * @param NodeInterface[] $documents the closest document per unpublished node, in the same order
     * @param callable $baseLookup answers the base workspace lookup for a node, as NodeChangeService::getOriginalNode() does
     */
    private function createService(array $unpublishedNodes, array $documents, callable $baseLookup): ReviewService
    {
        $publishingService = $this->createMock(PublishingServiceInterface::class);
        $publishingService->method('getUnpublishedNodes')->willReturn($unpublishedNodes);

        $nodeChangeService = $this->createMock(NodeChangeService::class);
        $nodeChangeService->method('getOriginalNode')->willReturnCallback($baseLookup);

        $siteRepository = $this->createMock(SiteRepository::class);
        $siteRepository->method('findOneByNodeName')->willReturn(null);

        $documentsByNode = new \SplObjectStorage();
        foreach ($unpublishedNodes as $index => $node) {
            $documentsByNode[$node] = $documents[$index] ?? null;
        }

        return new class ($publishingService, $nodeChangeService, $siteRepository, $documentsByNode) extends ReviewService {
            private \SplObjectStorage $documentsByNode;

            public function __construct(
                PublishingServiceInterface $publishingService,
                NodeChangeService $nodeChangeService,
                SiteRepository $siteRepository,
                \SplObjectStorage $documentsByNode
            ) {
                $this->publishingService = $publishingService;
                $this->nodeChangeService = $nodeChangeService;
                $this->siteRepository = $siteRepository;
                $this->documentsByNode = $documentsByNode;
            }

            protected function findClosestDocument(NodeInterface $node): ?NodeInterface
            {
                return $this->documentsByNode[$node] ?? null;
            }
        };
    }

    /**
     * @param array<string, array<int, string>> $dimensions
     */
    private function createNode(string $path, array $dimensions, bool $isPlainCollection = false): NodeInterface
    {
        $nodeType = $this->createMock(NodeType::class);
        $nodeType->method('isOfType')->willReturnCallback(
            static fn(string $superType): bool => $isPlainCollection && $superType === 'Neos.Neos:ContentCollection'
        );

        $node = $this->createMock(NodeInterface::class);
        $node->method('getNodeType')->willReturn($nodeType);
        $node->method('getPath')->willReturn($path);
        $node->method('getDimensions')->willReturn($dimensions);
        return $node;
    }
}
