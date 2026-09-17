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
use Neos\Neos\Domain\Service\ContentContextFactory;
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
            // Every node is known to live, so nothing is new or moved.
            static fn($identifier): ?NodeInterface => null
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

        $service = $this->createService([$collection], [$page], static fn($identifier): ?NodeInterface => null);

        self::assertSame([], $service->computeSiteChanges($this->createMock(Workspace::class)));
    }

    /**
     * "isNew" and "isMoved" follow the core's live lookup: a document the live
     * workspace does not know is new, one sitting elsewhere in live is moved.
     *
     * @test
     */
    public function computeSiteChangesFlagsDocumentsAgainstTheLiveWorkspace(): void
    {
        $page = $this->createNode('/sites/example/herbst', ['language' => ['de']]);
        $page->method('getIdentifier')->willReturn('page');
        $liveNode = $this->createNode('/sites/example/sommer', ['language' => ['de']]);

        $service = $this->createService(
            [$page],
            [$page],
            static fn($identifier): ?NodeInterface => $liveNode
        );

        $siteChanges = $service->computeSiteChanges($this->createMock(Workspace::class));
        $dimensionHash = array_key_first($siteChanges['example']['documents']);
        $document = $siteChanges['example']['documents'][$dimensionHash]['herbst'];

        self::assertFalse($document['isNew']);
        self::assertTrue($document['isMoved']);
    }

    /**
     * @param NodeInterface[] $unpublishedNodes
     * @param NodeInterface[] $documents the closest document per unpublished node, in the same order
     * @param callable $liveLookup answers the live workspace lookup by node identifier
     */
    private function createService(array $unpublishedNodes, array $documents, callable $liveLookup): ReviewService
    {
        $publishingService = $this->createMock(PublishingServiceInterface::class);
        $publishingService->method('getUnpublishedNodes')->willReturn($unpublishedNodes);

        $liveContext = $this->createMock(ContentContext::class);
        $liveContext->method('getNodeByIdentifier')->willReturnCallback($liveLookup);
        $contextFactory = $this->createMock(ContentContextFactory::class);
        $contextFactory->method('create')->willReturn($liveContext);

        $siteRepository = $this->createMock(SiteRepository::class);
        $siteRepository->method('findOneByNodeName')->willReturn(null);

        $documentsByNode = new \SplObjectStorage();
        foreach ($unpublishedNodes as $index => $node) {
            $documentsByNode[$node] = $documents[$index] ?? null;
        }

        return new class ($publishingService, $contextFactory, $siteRepository, $documentsByNode) extends ReviewService {
            private \SplObjectStorage $documentsByNode;

            public function __construct(
                PublishingServiceInterface $publishingService,
                ContentContextFactory $contextFactory,
                SiteRepository $siteRepository,
                \SplObjectStorage $documentsByNode
            ) {
                $this->publishingService = $publishingService;
                $this->contextFactory = $contextFactory;
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
