<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Controller\Module\Management;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\TypeConverter\NodeConverter;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Mvc\Routing\UriBuilder;
use Neos\Flow\Mvc\View\ViewInterface;
use Neos\FluidAdaptor\View\AbstractTemplateView;
use Neos\Neos\Controller\Module\Management\WorkspacesController as NeosWorkspacesController;
use NEOSidekick\WorkspaceReview\Domain\Service\PopupResultStore;

/**
 * The review view of the Management > Workspaces module.
 *
 * Everything the core controller does keeps working: the workspace list,
 * creating, editing and deleting workspaces, rebasing into the editor and all
 * publishing and discarding actions are inherited unchanged, together with
 * their templates, their property-mapping configuration and their redirects.
 *
 * Only showAction is replaced. It computes nothing about the changes - that
 * is the job of the read-only GraphQL API - and hands the React application
 * the workspace name, its endpoint and the module URIs of the actions the
 * review's buttons post to.
 *
 * @Flow\Scope("singleton")
 */
class WorkspacesController extends NeosWorkspacesController
{
    /**
     * The value of the "presentation" argument that shows the review as a
     * popup: without the backend chrome, with a close button instead of the
     * back link, and reporting what was published or discarded to the window
     * that opened it.
     */
    public const PRESENTATION_POPUP = 'popup';

    /**
     * @Flow\Inject
     * @var PopupResultStore
     */
    protected $popupResultStore;

    /**
     * Set by the publishing actions: the review their redirect returns to.
     *
     * @var array{workspace: Workspace, documents: string[], popup: bool}|null
     */
    protected $reviewRedirect = null;

    /**
     * Set by the publishing actions in popup mode: what they are about to do,
     * stored for the next page view once the action succeeded.
     *
     * @var array<string, mixed>|null
     */
    protected $pendingPopupResult = null;

    /**
     * The Neos UI serialises this configuration only into the editor host,
     * never into a backend module, and Flow's InjectConfiguration cannot
     * address the dotted package key inside it - so the whole map is injected
     * and indexed by hand.
     *
     * @Flow\InjectConfiguration(package="Neos.Neos.Ui", path="frontendConfiguration")
     * @var array
     */
    protected $frontendConfiguration;

    /**
     * Points the view at this package's templates and at the Neos layouts.
     *
     * Which Views.yaml entry applies is decided by Flow's request filter
     * weights, and only the single heaviest match is used - its options are
     * not merged with the others. Another package overriding the same module
     * (Flownative.WorkspacePreview does so for the index action) can therefore
     * replace the paths configured here. Its configuration carries no layout
     * root, which is harmless while Neos.Neos owns the controller but not once
     * this package does: Fluid then derives the layout path from this package
     * and fails, because it ships no layouts of its own.
     *
     * Setting the paths on the view sidesteps that contest. They are added to
     * whatever the winning configuration provided rather than replacing it, so
     * a template another package contributes for an action this package does
     * not override stays reachable. This package's own templates do take
     * precedence on every action, which no view configuration can undo.
     *
     * The guard ends where root paths do: a configuration that replaces
     * "templatePathAndFilenamePattern" or "layoutPathAndFilenamePattern" with a
     * pattern carrying no root placeholder bypasses these lists entirely.
     *
     * @param ViewInterface $view
     * @return void
     */
    protected function initializeView(ViewInterface $view)
    {
        parent::initializeView($view);

        if (!$view instanceof AbstractTemplateView) {
            return;
        }

        $templatePaths = $view->getTemplatePaths();
        $templatePaths->setTemplateRootPaths(
            $this->completeRootPaths($templatePaths->getTemplateRootPaths(), 'Templates')
        );
        $templatePaths->setPartialRootPaths(
            $this->completeRootPaths($templatePaths->getPartialRootPaths(), 'Partials')
        );
        // No own path for layouts: this package ships none, and Fluid already
        // derives one from it - that derived path is exactly what fails, so
        // only the Neos fallback behind it is worth adding.
        $templatePaths->setLayoutRootPaths(
            $this->completeRootPaths($templatePaths->getLayoutRootPaths(), 'Layouts', false)
        );
    }

    /**
     * Puts this package's resource path first, so its own templates win, and
     * appends the Neos path unless it is configured already. Configured paths
     * keep their order, including a Neos path that some configuration
     * deliberately placed ahead of another package's.
     *
     * @param string[] $configuredPaths
     * @return string[]
     */
    protected function completeRootPaths(array $configuredPaths, string $type, bool $includeOwnPath = true): array
    {
        $paths = array_values($configuredPaths);
        if ($includeOwnPath) {
            array_unshift($paths, 'resource://NEOSidekick.WorkspaceReview/Private/' . $type);
        }
        $paths[] = 'resource://Neos.Neos/Private/' . $type;

        return array_values(array_unique($paths));
    }

    /**
     * Renders the review application shell. The change data is fetched by the
     * client from the GraphQL endpoint; everything assigned here is what the
     * server alone can know: the endpoint, the feature flags and the module
     * URIs that carry the module argument namespace.
     *
     * With documents the review is narrowed to those pages: only their changes
     * are listed, and the batch actions publish or discard only them. Each
     * value is the context path of a document node, or its node path to cover
     * every dimension variant. "document" takes one page, "documents" a list
     * of them; both can be combined. The client applies them, because it needs
     * the whole review anyway to tell whether other pages have changes too.
     *
     * With the presentation "popup" the review is shown in a popup window, see
     * PRESENTATION_POPUP. The results of the publishing actions that redirected
     * here are handed to the page once.
     *
     * @param Workspace $workspace
     * @param string|null $document
     * @param array $documents
     * @param string|null $presentation
     * @return void
     */
    public function showAction(Workspace $workspace, ?string $document = null, array $documents = [], ?string $presentation = null)
    {
        $isPopup = $presentation === self::PRESENTATION_POPUP;
        $documentList = $this->collectDocuments($document, $documents);
        $reviewArguments = $this->reviewArguments($documentList, $isPopup);
        $this->view->assignMultiple([
            'selectedWorkspace' => $workspace,
            'selectedWorkspaceLabel' => $workspace->getTitle() ?: $workspace->getName(),
            // Only whether there is anything to review; what changed is
            // answered by the GraphQL query, not by this request.
            'hasChanges' => $this->publishingService->getUnpublishedNodesCount($workspace) > 0,
            'graphQlUri' => $this->buildGraphQlUri(),
            'features' => json_encode($this->getFrontendConfiguration(), JSON_THROW_ON_ERROR),
            'rebaseUri' => $this->buildModuleUri('rebaseAndRedirect', ['targetWorkspace' => $workspace]),
            'publishWorkspaceUri' => $this->buildModuleUri('publishWorkspace', ['workspace' => $workspace] + $reviewArguments),
            'discardWorkspaceUri' => $this->buildModuleUri('discardWorkspace', ['workspace' => $workspace] + $reviewArguments),
            'documents' => json_encode($documentList, JSON_THROW_ON_ERROR),
            // "Show all" leaves the document filter, but not the popup.
            'showUri' => $this->buildModuleUri('show', ['workspace' => $workspace] + $this->reviewArguments([], $isPopup)),
            // Where the close button of a popup goes when the window cannot
            // close itself: the same review, shown as a module page.
            'exitUri' => $this->buildModuleUri('show', ['workspace' => $workspace] + $this->reviewArguments($documentList, false)),
            // Carried by the forms, so the publishing actions can return to
            // this review rather than to the whole workspace.
            'reviewArguments' => $reviewArguments,
            'presentation' => $isPopup ? self::PRESENTATION_POPUP : '',
            'popupResults' => json_encode($isPopup ? $this->popupResultStore->takeAll() : [], JSON_THROW_ON_ERROR),
        ]);
    }

    /**
     * Publishes or discards the given nodes, as the core action does, and
     * returns to the review they were selected in: its document filter and its
     * presentation are kept. In popup mode it also records what was done.
     *
     * @param array $nodes <\Neos\ContentRepository\Domain\Model\NodeInterface> $nodes
     * @param string $action
     * @param Workspace $selectedWorkspace
     * @throws \Exception
     * @throws \Neos\Flow\Property\Exception
     * @throws \Neos\Flow\Security\Exception
     */
    public function publishOrDiscardNodesAction(array $nodes, $action, ?Workspace $selectedWorkspace = null)
    {
        if ($selectedWorkspace !== null) {
            $this->prepareReviewRedirect($selectedWorkspace);
            if ($this->reviewRedirect['popup'] && in_array($action, ['publish', 'discard'], true)) {
                $this->pendingPopupResult = $this->describePopupResult(
                    $action,
                    $selectedWorkspace,
                    $this->convertNodes($nodes)
                );
            }
        }
        parent::publishOrDiscardNodesAction($nodes, $action, $selectedWorkspace);
    }

    /**
     * Publishes the whole workspace. In popup mode it returns to the review
     * instead of the workspace list and records what was published.
     *
     * @param Workspace $workspace
     * @return void
     */
    public function publishWorkspaceAction(Workspace $workspace)
    {
        $this->prepareReviewRedirect($workspace);
        if ($this->reviewRedirect['popup']) {
            $this->pendingPopupResult = $this->describePopupResult(
                'publish',
                $workspace,
                $this->publishingService->getUnpublishedNodes($workspace)
            );
        }
        parent::publishWorkspaceAction($workspace);
    }

    /**
     * Discards the whole workspace. In popup mode it returns to the review
     * instead of the workspace list and records what was discarded.
     *
     * @param Workspace $workspace
     * @return void
     */
    public function discardWorkspaceAction(Workspace $workspace)
    {
        $this->prepareReviewRedirect($workspace);
        if ($this->reviewRedirect['popup']) {
            $this->pendingPopupResult = $this->describePopupResult(
                'discard',
                $workspace,
                $this->publishingService->getUnpublishedNodes($workspace)
            );
        }
        parent::discardWorkspaceAction($workspace);
    }

    /**
     * The inherited publishing actions end with a redirect to the review of
     * the whole workspace or to the workspace list. Once prepareReviewRedirect
     * ran, a redirect to the review keeps its document filter and presentation;
     * in popup mode the one to the list returns to the review as well, because
     * the popup has no use for the list.
     *
     * The result is stored only here: an action that fails throws before it
     * redirects, and leaves nothing to report.
     *
     * {@inheritdoc}
     */
    protected function redirect($actionName, $controllerName = null, $packageKey = null, array $arguments = [], $delay = 0, $statusCode = 303, $format = null)
    {
        [$actionName, $arguments] = $this->redirectToReview($actionName, $controllerName, $arguments);
        parent::redirect($actionName, $controllerName, $packageKey, $arguments, $delay, $statusCode, $format);
    }

    /**
     * The target of a redirect of this controller, see redirect(), and the
     * moment the pending popup result is stored.
     *
     * @param array<string, mixed> $arguments
     * @return array{0: string, 1: array<string, mixed>}
     */
    protected function redirectToReview(string $actionName, ?string $controllerName, array $arguments): array
    {
        $review = $this->reviewRedirect;
        if ($review === null || $controllerName !== null || !($actionName === 'show' || ($actionName === 'index' && $review['popup']))) {
            return [$actionName, $arguments];
        }
        if ($this->pendingPopupResult !== null) {
            $this->popupResultStore->add($this->pendingPopupResult);
            $this->pendingPopupResult = null;
        }
        return ['show', ['workspace' => $review['workspace']] + $this->reviewArguments($review['documents'], $review['popup'])];
    }

    /**
     * Reads the review arguments the forms and URIs of the review carry along
     * with every publishing request.
     */
    protected function prepareReviewRedirect(Workspace $workspace): void
    {
        $document = $this->request->hasArgument('document') ? $this->request->getArgument('document') : null;
        $documents = $this->request->hasArgument('documents') ? $this->request->getArgument('documents') : [];
        $presentation = $this->request->hasArgument('presentation') ? $this->request->getArgument('presentation') : null;
        $this->reviewRedirect = [
            'workspace' => $workspace,
            'documents' => $this->collectDocuments(
                is_string($document) ? $document : null,
                is_array($documents) ? $documents : []
            ),
            'popup' => $presentation === self::PRESENTATION_POPUP,
        ];
    }

    /**
     * The module arguments that address a review besides its workspace.
     *
     * @param string[] $documents
     * @return array<string, mixed>
     */
    protected function reviewArguments(array $documents, bool $isPopup): array
    {
        $arguments = [];
        if ($documents !== []) {
            $arguments['documents'] = $documents;
        }
        if ($isPopup) {
            $arguments['presentation'] = self::PRESENTATION_POPUP;
        }
        return $arguments;
    }

    /**
     * Converts the posted context paths as the core action does, before it
     * runs: once discarded, a node can no longer be described.
     *
     * @param array<mixed> $nodes
     * @return NodeInterface[]
     */
    protected function convertNodes(array $nodes): array
    {
        $configuration = $this->propertyMapper->buildPropertyMappingConfiguration();
        $configuration->setTypeConverterOption(NodeConverter::class, NodeConverter::REMOVED_CONTENT_SHOWN, true);
        $converted = [];
        foreach ($nodes as $node) {
            $node = $node instanceof NodeInterface
                ? $node
                : $this->propertyMapper->convert($node, NodeInterface::class, $configuration);
            if ($node instanceof NodeInterface) {
                $converted[] = $node;
            }
        }
        return $converted;
    }

    /**
     * What a publishing action did, as the popup reports it: every change with
     * the page it belongs to, so the receiver needs no further lookup.
     *
     * @param NodeInterface[] $nodes
     * @return array<string, mixed>
     */
    protected function describePopupResult(string $action, Workspace $workspace, array $nodes): array
    {
        $targetWorkspace = null;
        if ($action === 'publish') {
            $targetWorkspace = $workspace->getBaseWorkspace() ?? $this->workspaceRepository->findOneByName('live');
        }

        return [
            'resultId' => bin2hex(random_bytes(16)),
            'action' => $action === 'publish' ? 'published' : 'discarded',
            'workspace' => $workspace->getName(),
            'targetWorkspace' => $targetWorkspace instanceof Workspace ? $targetWorkspace->getName() : null,
            'changes' => array_values(array_map(fn (NodeInterface $node): array => $this->describeNode($node), $nodes)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function describeNode(NodeInterface $node): array
    {
        $document = $node;
        while ($document !== null && !$document->getNodeType()->isOfType('Neos.Neos:Document')) {
            $document = $document->getParent();
        }

        return [
            'nodeIdentifier' => $node->getIdentifier(),
            'contextPath' => $node->getContextPath(),
            'nodePath' => $node->getPath(),
            'nodeType' => $node->getNodeType()->getName(),
            'label' => $node->getLabel(),
            'removed' => $node->isRemoved(),
            'dimensions' => $node->getDimensions(),
            'documentIdentifier' => $document?->getIdentifier(),
            'documentPath' => $document?->getPath(),
            'documentLabel' => $document?->getLabel(),
        ];
    }

    /**
     * The values of both document arguments in the order given, without blanks
     * and repetitions. The list comes from the query string as it is, so an
     * entry that is not a string - a nested array - is dropped.
     *
     * @param array<mixed> $documents
     * @return string[]
     */
    protected function collectDocuments(?string $document, array $documents): array
    {
        $values = array_filter(
            array_merge([$document], $documents),
            static fn ($value): bool => is_string($value) && trim($value) !== ''
        );

        return array_values(array_unique(array_map('trim', $values)));
    }

    /**
     * @return array<string, mixed>
     */
    protected function getFrontendConfiguration(): array
    {
        $configuration = $this->frontendConfiguration['NEOSidekick.WorkspaceReview'] ?? [];
        $configuration = is_array($configuration) ? $configuration : [];
        // Only explicit booleans override automatic detection. The Fusion
        // preview endpoint cannot render a Zebra frontend faithfully.
        if (!is_bool($configuration['visualCompare'] ?? null)) {
            $configuration['visualCompare'] = !$this->packageManager->isPackageAvailable('Networkteam.Neos.Next');
        }
        return $configuration;
    }

    /**
     * The endpoint lives outside the module, so its URI is built on the main
     * request. The API route only matches the format "json", which the main
     * request does not carry, hence the explicit setFormat().
     */
    protected function buildGraphQlUri(): string
    {
        $uriBuilder = new UriBuilder();
        $uriBuilder->setRequest($this->request->getMainRequest());
        return $uriBuilder->reset()
            ->setCreateAbsoluteUri(false)
            ->setFormat('json')
            ->uriFor('query', [], 'GraphQL', 'NEOSidekick.WorkspaceReview');
    }

    /**
     * An action of this module, addressed through the module's own URI
     * builder so the arguments land in the "moduleArguments" namespace the
     * inherited actions read them from.
     *
     * @param array<string, mixed> $arguments
     */
    protected function buildModuleUri(string $actionName, array $arguments): string
    {
        return $this->uriBuilder->reset()->uriFor($actionName, $arguments);
    }
}
