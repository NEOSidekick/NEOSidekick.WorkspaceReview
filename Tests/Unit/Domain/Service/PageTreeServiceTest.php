<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Domain\Service;

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\Domain\Service\PageTreeService;

class PageTreeServiceTest extends UnitTestCase
{
    /**
     * Changes are listed as their elements follow on the page: by sorting
     * index below the document, a container ahead of the elements inside it,
     * regardless of the order the repository returned them in.
     *
     * @test
     */
    public function sortChangesInPageOrderFollowsTheSortingIndicesBelowTheDocument(): void
    {
        $document = $this->createPositionedNode('/sites/site/page', 0, null);
        $main = $this->createPositionedNode('/sites/site/page/main', 100, $document);
        $first = $this->createPositionedNode('/sites/site/page/main/first', 100, $main);
        $container = $this->createPositionedNode('/sites/site/page/main/container', 200, $main);
        $inner = $this->createPositionedNode(
            '/sites/site/page/main/container/items/inner',
            100,
            $this->createPositionedNode('/sites/site/page/main/container/items', 100, $container)
        );
        $last = $this->createPositionedNode('/sites/site/page/main/last', 300, $main);
        $changes = [
            'main/last' => ['node' => $last],
            'main/container/items/inner' => ['node' => $inner],
            'main/first' => ['node' => $first],
            'main/container' => ['node' => $container],
        ];

        $sorted = (new PageTreeService())->sortChangesInPageOrder($changes, $document);

        self::assertSame(['main/first', 'main/container', 'main/container/items/inner', 'main/last'], array_keys($sorted));
    }

    /**
     * The sidebar shows the changed pages as a tree: the unchanged "blog" page
     * between the site and its changed post is listed as an ancestor, and a
     * post follows its parent even when a sibling like "blog-archive" sorts
     * between the two as plain strings.
     *
     * @test
     */
    public function computePageTreeListsUnchangedAncestorsAndKeepsChildrenBelowTheirParent(): void
    {
        $site = $this->createMock(NodeInterface::class);
        $blog = $this->createMock(NodeInterface::class);
        $blog->method('getParent')->willReturn($site);
        $post = $this->createMock(NodeInterface::class);
        $post->method('getParent')->willReturn($blog);
        $archive = $this->createMock(NodeInterface::class);
        $archive->method('getParent')->willReturn($site);
        $documents = [
            '' => ['documentNode' => $site],
            'blog-archive' => ['documentNode' => $archive],
            'blog/post' => ['documentNode' => $post],
        ];

        $pages = (new PageTreeService())->computePageTree($documents);

        self::assertSame(
            [[$site, 0, true, true], [$blog, 1, false, true], [$post, 2, true, false], [$archive, 1, true, false]],
            array_map(static function (array $entry): array {
                return [$entry['node'], $entry['depth'], $entry['document'] !== null, $entry['hasChildren']];
            }, $pages)
        );
        self::assertSame($documents['blog/post'], $pages[2]['document']);
    }

    private function createPositionedNode(string $path, int $index, ?NodeInterface $parent): NodeInterface
    {
        $node = $this->createMock(NodeInterface::class);
        $node->method('getPath')->willReturn($path);
        $node->method('getIndex')->willReturn($index);
        $node->method('getParent')->willReturn($parent);
        return $node;
    }
}
