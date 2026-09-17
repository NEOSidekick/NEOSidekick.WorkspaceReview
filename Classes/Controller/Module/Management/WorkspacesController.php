<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Controller\Module\Management;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Mvc\Routing\UriBuilder;
use Neos\Flow\Mvc\View\ViewInterface;
use Neos\FluidAdaptor\View\AbstractTemplateView;
use Neos\Neos\Controller\Module\Management\WorkspacesController as NeosWorkspacesController;

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
     * @param Workspace $workspace
     * @return void
     */
    public function showAction(Workspace $workspace)
    {
        $this->view->assignMultiple([
            'selectedWorkspace' => $workspace,
            'selectedWorkspaceLabel' => $workspace->getTitle() ?: $workspace->getName(),
            // Only whether there is anything to review; what changed is
            // answered by the GraphQL query, not by this request.
            'hasChanges' => $this->publishingService->getUnpublishedNodesCount($workspace) > 0,
            'graphQlUri' => $this->buildGraphQlUri(),
            'features' => json_encode($this->getFrontendConfiguration(), JSON_THROW_ON_ERROR),
            'rebaseUri' => $this->buildModuleUri('rebaseAndRedirect', ['targetWorkspace' => $workspace]),
            'publishWorkspaceUri' => $this->buildModuleUri('publishWorkspace', ['workspace' => $workspace]),
            'discardWorkspaceUri' => $this->buildModuleUri('discardWorkspace', ['workspace' => $workspace]),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function getFrontendConfiguration(): array
    {
        $configuration = $this->frontendConfiguration['NEOSidekick.WorkspaceReview'] ?? [];
        return is_array($configuration) ? $configuration : [];
    }

    /**
     * The endpoint lives outside the module, so its URI is built on the main
     * request. The t3n route only matches the format "json", which the main
     * request does not carry, hence the explicit setFormat().
     */
    protected function buildGraphQlUri(): string
    {
        $uriBuilder = new UriBuilder();
        $uriBuilder->setRequest($this->request->getMainRequest());
        return $uriBuilder->reset()
            ->setCreateAbsoluteUri(false)
            ->setFormat('json')
            ->uriFor('query', ['endpoint' => 'workspace-review'], 'GraphQL', 't3n.GraphQL');
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
