<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Utility;
use Neos\Eel\FlowQuery\FlowQuery;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Mvc\Controller\ControllerContext;
use Neos\Flow\Mvc\Routing\UriBuilder;
use Neos\Neos\Domain\Repository\SiteRepository;
use Neos\Neos\Domain\Service\ContentContextFactory;
use Neos\Neos\Domain\Service\ContentDimensionPresetSourceInterface;
use Neos\Neos\Domain\Service\SiteService;
use Neos\Neos\Domain\Service\UserService;
use Neos\Neos\Service\LinkingService;
use Neos\Neos\Service\PublishingService;
use NEOSidekick\WorkspaceReview\GraphQL\Context\ReviewContext;

/**
 * Builds the whole review of one workspace as a nested array shaped exactly
 * like the GraphQL schema: sites, content dimensions, the page tree of the
 * changed documents and, per document, its changes in page order.
 *
 * The grouping loop is a port of the core module controller's
 * computeSiteChanges(): that method is protected and calls further protected
 * methods of the controller, and the GraphQL query is a separate request with
 * no module controller instance to call them on.
 *
 * @Flow\Scope("singleton")
 */
class ReviewService
{
    /**
     * @Flow\Inject
     * @var PublishingService
     */
    protected $publishingService;

    /**
     * @Flow\Inject
     * @var SiteRepository
     */
    protected $siteRepository;

    /**
     * @Flow\Inject
     * @var ContentContextFactory
     */
    protected $contextFactory;

    /**
     * @Flow\Inject
     * @var ContentDimensionPresetSourceInterface
     */
    protected $contentDimensionPresetSource;

    /**
     * @Flow\Inject
     * @var UserService
     */
    protected $userService;

    /**
     * @Flow\Inject
     * @var LinkingService
     */
    protected $linkingService;

    /**
     * @Flow\Inject
     * @var NodeChangeService
     */
    protected $nodeChangeService;

    /**
     * @Flow\Inject
     * @var PageTreeService
     */
    protected $pageTreeService;

    /**
     * @Flow\Inject
     * @var NodeTypeIconService
     */
    protected $nodeTypeIconService;

    /**
     * @Flow\Inject
     * @var PropertyLabelService
     */
    protected $propertyLabelService;

    /**
     * @return array<string, mixed> a Workspace as the SDL describes it
     */
    public function build(Workspace $workspace, ReviewContext $context): array
    {
        $baseWorkspace = $workspace->getBaseWorkspace();

        return [
            'name' => $workspace->getName(),
            'title' => $workspace->getTitle() ?: $workspace->getName(),
            'baseWorkspaceTitle' => $baseWorkspace === null
                ? ''
                : ($baseWorkspace->getTitle() ?: $baseWorkspace->getName()),
            'canPublishToBase' => $baseWorkspace !== null
                && $this->userService->currentUserCanPublishToWorkspace($baseWorkspace),
            'sites' => $this->buildSites($workspace, $context),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildSites(Workspace $workspace, ReviewContext $context): array
    {
        $baseWorkspaceName = $workspace->getBaseWorkspace() === null
            ? 'live'
            : $workspace->getBaseWorkspace()->getName();
        $controllerContext = $context->getControllerContext();

        $sites = [];
        foreach ($this->computeSiteChanges($workspace) as $siteNodeName => $site) {
            $dimensions = [];
            foreach ($site['documents'] as $dimensionHash => $documents) {
                foreach ($documents as $documentPath => $document) {
                    $documents[$documentPath]['changes'] = $this->pageTreeService->sortChangesInPageOrder(
                        $document['changes'] ?? [],
                        $document['documentNode']
                    );
                }
                $firstDocument = reset($documents);
                $dimensions[] = [
                    'hash' => (string)$dimensionHash,
                    // Every document of this group lives in the same dimension
                    // variant, so the first one names the whole group.
                    'label' => $firstDocument === false
                        ? ''
                        : ($this->renderDimensionLabel($firstDocument['documentNode']) ?? ''),
                    'pages' => $this->buildPages(
                        $this->pageTreeService->computePageTree($documents),
                        (string)$dimensionHash,
                        $baseWorkspaceName,
                        $controllerContext
                    ),
                ];
            }
            $sites[] = [
                'name' => $this->renderSiteName((string)$siteNodeName, $site['siteNode'] ?? null),
                'dimensions' => $dimensions,
            ];
        }
        return $sites;
    }

    /**
     * @param object|null $site a Neos site, absent when the node name matches no site
     */
    protected function renderSiteName(string $siteNodeName, $site): string
    {
        if ($site !== null && method_exists($site, 'getName')) {
            $name = (string)$site->getName();
            if ($name !== '') {
                return $name;
            }
        }
        return $siteNodeName;
    }

    /**
     * @param array<int, array<string, mixed>> $entries page tree entries
     * @return array<int, array<string, mixed>>
     */
    protected function buildPages(array $entries, string $dimensionHash, string $baseWorkspaceName, ControllerContext $controllerContext): array
    {
        $pages = [];
        foreach ($entries as $entry) {
            $pages[] = [
                'node' => $this->buildNodeRef($entry['node']),
                'depth' => $entry['depth'],
                'hasChildren' => $entry['hasChildren'],
                'page' => $entry['document'] === null
                    ? null
                    : $this->buildChangedPage($entry['document'], $dimensionHash, $baseWorkspaceName, $controllerContext),
            ];
        }
        return $pages;
    }

    /**
     * @param array<string, mixed> $document
     * @return array<string, mixed> a ChangedPage as the SDL describes it
     */
    protected function buildChangedPage(array $document, string $dimensionHash, string $baseWorkspaceName, ControllerContext $controllerContext): array
    {
        /** @var NodeInterface $documentNode */
        $documentNode = $document['documentNode'];
        $isNew = (bool)($document['isNew'] ?? false);
        $contextPath = $documentNode->getContextPath();

        $changes = [];
        foreach ($document['changes'] ?? [] as $change) {
            $changes[] = $this->nodeChangeService->buildChange(
                $change['node'],
                $dimensionHash,
                (bool)($change['isNew'] ?? false),
                (bool)($change['isMoved'] ?? false),
                // The core disables the single-node publish button inside a new
                // page, because publishing the element alone would orphan it.
                !$isNew
            );
        }

        return [
            'id' => $documentNode->getIdentifier() . '-' . $dimensionHash,
            'node' => $this->buildNodeRef($documentNode),
            'nodePath' => $documentNode->getPath(),
            'breadcrumb' => array_map([$this, 'buildNodeRef'], $this->collectBreadcrumb($documentNode)),
            'isNew' => $isNew,
            'isMoved' => (bool)($document['isMoved'] ?? false),
            'isRemoved' => $documentNode->isRemoved(),
            'previewUri' => $documentNode->isRemoved() ? null : $this->buildPreviewUri($contextPath, $controllerContext),
            'basePreviewUri' => $this->buildBasePreviewUri($documentNode, $baseWorkspaceName, $controllerContext),
            'openUri' => $this->buildOpenUri($documentNode, $controllerContext),
            'changes' => $changes,
        ];
    }

    /**
     * @return array<string, mixed> a NodeRef as the SDL describes it
     */
    protected function buildNodeRef(NodeInterface $node): array
    {
        return [
            'identifier' => $node->getIdentifier(),
            'label' => $this->propertyLabelService->cleanLabel((string)$node->getLabel()),
            'icon' => $this->nodeTypeIconService->forNode($node),
            'dimensionLabel' => $this->renderDimensionLabel($node),
            'isHidden' => $node->isHidden(),
        ];
    }

    /**
     * The documents from the site down to the given page, the page included.
     *
     * @return NodeInterface[]
     */
    protected function collectBreadcrumb(NodeInterface $node): array
    {
        $documents = [];
        for ($current = $node; $current !== null; $current = $current->getParent()) {
            if (!$current->getNodeType()->isOfType('Neos.Neos:Document')) {
                break;
            }
            $documents[] = $current;
        }
        return array_reverse($documents);
    }

    /**
     * Names the content dimension variant a node lives in, the way the core
     * partial NodeContentDimensionsInformation does: the preset label of every
     * dimension value, translated. Null without configured dimensions.
     */
    protected function renderDimensionLabel(NodeInterface $node): ?string
    {
        $presets = $this->contentDimensionPresetSource->getAllPresets();
        if ($presets === []) {
            return null;
        }

        $labels = [];
        foreach ($node->getDimensions() as $dimensionName => $dimensionValues) {
            $preset = $this->contentDimensionPresetSource->findPresetByDimensionValues($dimensionName, $dimensionValues);
            if ($preset === null) {
                continue;
            }
            $labels[] = $this->propertyLabelService->translateShorthand((string)($preset['label'] ?? ''));
        }
        $label = implode(', ', array_filter($labels, static fn(string $entry): bool => $entry !== ''));
        return $label === '' ? null : $label;
    }

    /**
     * The visual compare renders a page through this package's preview route.
     * A fresh UriBuilder on the main request is needed because the GraphQL
     * request has its own format ("json"), for which no frontend route exists;
     * setRequest() resets the format, so the route default "html" applies.
     */
    protected function buildPreviewUri(string $contextPath, ControllerContext $controllerContext): string
    {
        $uriBuilder = new UriBuilder();
        $uriBuilder->setRequest($controllerContext->getRequest()->getMainRequest());
        return $uriBuilder->reset()
            ->setCreateAbsoluteUri(false)
            ->uriFor('show', ['node' => $contextPath], 'Preview', 'NEOSidekick.WorkspaceReview');
    }

    /**
     * The "before" rendering of a page is its state in the base workspace of
     * the reviewed one, read in the page's own dimensions. Whether that node
     * exists is checked directly in that context.
     */
    protected function buildBasePreviewUri(NodeInterface $documentNode, string $baseWorkspaceName, ControllerContext $controllerContext): ?string
    {
        $contextProperties = $documentNode->getContext()->getProperties();
        $contextProperties['workspaceName'] = $baseWorkspaceName;
        $baseContext = $this->contextFactory->create($contextProperties);
        $baseNode = $baseContext->getNodeByIdentifier($documentNode->getIdentifier());
        if ($baseNode === null) {
            return null;
        }
        return $this->buildPreviewUri($baseNode->getContextPath(), $controllerContext);
    }

    /**
     * The frontend URI of the page in the reviewed workspace. The format has
     * to be stated: the GraphQL request is a JSON one, and createNodeUri would
     * otherwise inherit that format, for which no frontend route resolves.
     */
    protected function buildOpenUri(NodeInterface $documentNode, ControllerContext $controllerContext): ?string
    {
        try {
            return $this->linkingService->createNodeUri($controllerContext, $documentNode, null, 'html', true);
        } catch (\Throwable $exception) {
            // A removed page or one outside a site has no frontend URI; the
            // review still lists its changes.
            return null;
        }
    }

    /**
     * The document a node belongs to, the node itself when it is one.
     */
    protected function findClosestDocument(NodeInterface $node): ?NodeInterface
    {
        $flowQuery = new FlowQuery([$node]);
        return $flowQuery->closest('[instanceof Neos.Neos:Document]')->get(0);
    }

    /**
     * A review answers what publishing changes, and publishing goes to the
     * base workspace. So a node is new when the base workspace does not know
     * it in the node's own dimensions, and moved when it sits elsewhere there.
     * The core looks both up in "live" without dimension values: in a chained
     * workspace it calls a page new that the target already has, and it
     * misses a new translation whose other-language variant is published.
     *
     * @return array{isNew: bool, isMoved: bool}
     */
    protected function flagsAgainstBaseWorkspace(NodeInterface $node): array
    {
        $originalNode = $this->nodeChangeService->getOriginalNode($node);
        return [
            'isNew' => $originalNode === null,
            'isMoved' => $originalNode !== null && $originalNode->getPath() !== $node->getPath(),
        ];
    }

    /**
     * Builds an array of changes for the sites in the given workspace - a port
     * of the core module controller's computeSiteChanges(). Unlike the core,
     * "isNew" and "isMoved" refer to the base workspace, see
     * flagsAgainstBaseWorkspace().
     *
     * @return array<string, array<string, mixed>>
     */
    public function computeSiteChanges(Workspace $selectedWorkspace): array
    {
        $siteChanges = [];
        foreach ($this->publishingService->getUnpublishedNodes($selectedWorkspace) as $node) {
            /** @var NodeInterface $node */
            $skipCollectionChanges = $node->getNodeType()->isOfType('Neos.Neos:ContentCollection')
                && !$node->getNodeType()->isOfType('Neos.Neos:Content');
            if ($skipCollectionChanges) {
                continue;
            }
            $pathParts = explode('/', $node->getPath());
            if (count($pathParts) <= 2) {
                continue;
            }
            $siteNodeName = $pathParts[2];
            $document = $this->findClosestDocument($node);
            // $document is null for a broken root line, which should not happen
            // but currently can in some scenarios.
            if ($document === null) {
                continue;
            }

            $documentPath = implode('/', array_slice(explode('/', $document->getPath()), 3));
            // The hash is computed from a sorted copy, which the utility takes
            // by reference, so the values need a variable of their own.
            $dimensionValues = $document->getDimensions();
            $documentDimension = Utility::sortDimensionValueArrayAndReturnDimensionsHash($dimensionValues);
            $relativePath = str_replace(
                sprintf(SiteService::SITES_ROOT_PATH . '/%s/%s', $siteNodeName, $documentPath),
                '',
                $node->getPath()
            );
            if (!isset($siteChanges[$siteNodeName]['siteNode'])) {
                $siteChanges[$siteNodeName]['siteNode'] = $this->siteRepository->findOneByNodeName($siteNodeName);
            }
            $siteChanges[$siteNodeName]['documents'][$documentDimension][$documentPath]['documentNode'] = $document;
            $siteChanges[$siteNodeName]['documents'][$documentDimension][$documentPath]['changes'][$relativePath] = ['node' => $node];
        }

        ksort($siteChanges);
        foreach ($siteChanges as $siteKey => $site) {
            foreach ($site['documents'] as $documentDimension => $documentsPerDimension) {
                foreach ($documentsPerDimension as $documentKey => $document) {
                    $flags = $this->flagsAgainstBaseWorkspace($document['documentNode']);
                    $siteChanges[$siteKey]['documents'][$documentDimension][$documentKey]['isNew'] = $flags['isNew'];
                    $siteChanges[$siteKey]['documents'][$documentDimension][$documentKey]['isMoved'] = $flags['isMoved'];
                    foreach ($document['changes'] as $changeKey => $change) {
                        $flags = $this->flagsAgainstBaseWorkspace($change['node']);
                        $siteChanges[$siteKey]['documents'][$documentDimension][$documentKey]['changes'][$changeKey]['isNew'] = $flags['isNew'];
                        $siteChanges[$siteKey]['documents'][$documentDimension][$documentKey]['changes'][$changeKey]['isMoved'] = $flags['isMoved'];
                    }
                }
            }
            foreach ($siteChanges[$siteKey]['documents'] as $key => $document) {
                ksort($siteChanges[$siteKey]['documents'][$key]);
            }
        }
        return $siteChanges;
    }
}
