<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Controller\Module\Management;

use Neos\Flow\Mvc\View\ViewInterface;
use Neos\Flow\Tests\UnitTestCase;
use Neos\FluidAdaptor\View\StandaloneView;
use Neos\FluidAdaptor\View\TemplatePaths;
use Neos\FluidAdaptor\View\TemplateView;
use NEOSidekick\WorkspaceReview\Controller\Module\Management\WorkspacesController;

class WorkspacesControllerTest extends UnitTestCase
{
    /**
     * The bug this guards against: another package's view configuration won and
     * declared no layout root, so Fluid derived the module layout from this
     * package - which ships none - and the module failed to render.
     *
     * @test
     */
    public function initializeViewGivesTheViewEveryRootPathItNeedsToRender(): void
    {
        $templatePaths = $this->createTemplatePaths(
            ['resource://Flownative.WorkspacePreview/Private/Templates'],
            [],
            []
        );

        $this->createController()->initializeViewForTest($this->createViewWithPaths($templatePaths));

        self::assertContains('resource://Neos.Neos/Private/Layouts', $templatePaths->getLayoutRootPaths());
        self::assertContains('resource://Neos.Neos/Private/Partials', $templatePaths->getPartialRootPaths());
        self::assertContains('resource://Neos.Neos/Private/Templates', $templatePaths->getTemplateRootPaths());
        // The template of the package that won the configuration stays reachable.
        self::assertContains('resource://Flownative.WorkspacePreview/Private/Templates', $templatePaths->getTemplateRootPaths());
    }

    /**
     * @test
     */
    public function initializeViewLetsThisPackageResolveItsOwnTemplatesFirst(): void
    {
        $templatePaths = $this->createTemplatePaths(
            ['resource://Neos.Neos/Private/Templates'],
            ['resource://Neos.Neos/Private/Partials'],
            ['resource://Neos.Neos/Private/Layouts']
        );

        $this->createController()->initializeViewForTest($this->createViewWithPaths($templatePaths));

        // Fluid takes the first match, so this package has to come first.
        self::assertSame('resource://NEOSidekick.WorkspaceReview/Private/Templates', $templatePaths->getTemplateRootPaths()[0]);
        self::assertSame('resource://NEOSidekick.WorkspaceReview/Private/Partials', $templatePaths->getPartialRootPaths()[0]);
    }

    /**
     * A view configuration may name any view class. StandaloneView does not
     * extend TemplateView but carries the same template paths, including the
     * package-derived layout path that fails.
     *
     * @test
     */
    public function initializeViewAlsoCorrectsAViewThatIsNotTheDefaultTemplateView(): void
    {
        $templatePaths = $this->createTemplatePaths([], [], []);
        $view = $this->getMockBuilder(StandaloneView::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getTemplatePaths', 'assign'])
            ->getMock();
        $view->method('getTemplatePaths')->willReturn($templatePaths);

        $this->createController()->initializeViewForTest($view);

        self::assertContains('resource://Neos.Neos/Private/Layouts', $templatePaths->getLayoutRootPaths());
    }

    /**
     * A view that is not template based has no root paths to correct.
     *
     * @test
     */
    public function initializeViewLeavesAViewWithoutTemplatePathsAlone(): void
    {
        $view = $this->createMock(ViewInterface::class);
        $view->expects(self::once())->method('assign')->with('moduleConfiguration');

        $this->createController()->initializeViewForTest($view);
    }

    /**
     * @test
     */
    public function completeRootPathsGuaranteesTheNeosLayoutPathWhenNoneWasConfigured(): void
    {
        // The failing case: another package's view configuration won and
        // carries no layout root, so Fluid would look for the module layout
        // inside this package, which ships none.
        self::assertSame(
            ['resource://Neos.Neos/Private/Layouts'],
            $this->createController()->completeRootPathsForTest([], 'Layouts', false)
        );
    }

    /**
     * @test
     */
    public function completeRootPathsKeepsPathsContributedByOtherPackages(): void
    {
        // A package overriding an action this package does not touch must keep
        // its template; this one only claims precedence for its own files.
        self::assertSame(
            [
                'resource://NEOSidekick.WorkspaceReview/Private/Templates',
                'resource://Flownative.WorkspacePreview/Private/Templates',
                'resource://Neos.Neos/Private/Templates',
            ],
            $this->createController()->completeRootPathsForTest(
                [
                    'resource://Flownative.WorkspacePreview/Private/Templates',
                    'resource://Neos.Neos/Private/Templates',
                ],
                'Templates'
            )
        );
    }

    /**
     * @test
     */
    public function completeRootPathsDoesNotRepeatAPathThatIsAlreadyConfigured(): void
    {
        self::assertSame(
            [
                'resource://NEOSidekick.WorkspaceReview/Private/Partials',
                'resource://Neos.Neos/Private/Partials',
            ],
            $this->createController()->completeRootPathsForTest(
                ['resource://NEOSidekick.WorkspaceReview/Private/Partials'],
                'Partials'
            )
        );
    }

    /**
     * Records what the controller sets without touching the filesystem: the
     * real TemplatePaths validates each path through the resource:// stream
     * wrapper, which is not registered in a unit test.
     */
    private function createTemplatePaths(array $templates, array $partials, array $layouts): TemplatePaths
    {
        return new class ($templates, $partials, $layouts) extends TemplatePaths {
            private array $templates;
            private array $partials;
            private array $layouts;

            public function __construct(array $templates, array $partials, array $layouts)
            {
                $this->templates = $templates;
                $this->partials = $partials;
                $this->layouts = $layouts;
            }

            public function getTemplateRootPaths()
            {
                return $this->templates;
            }

            public function setTemplateRootPaths(array $templateRootPaths)
            {
                $this->templates = $templateRootPaths;
            }

            public function getPartialRootPaths()
            {
                return $this->partials;
            }

            public function setPartialRootPaths(array $partialRootPaths)
            {
                $this->partials = $partialRootPaths;
            }

            public function getLayoutRootPaths()
            {
                return $this->layouts;
            }

            public function setLayoutRootPaths(array $layoutRootPaths)
            {
                $this->layouts = $layoutRootPaths;
            }
        };
    }

    private function createViewWithPaths(TemplatePaths $templatePaths): TemplateView
    {
        $view = $this->getMockBuilder(TemplateView::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getTemplatePaths', 'assign'])
            ->getMock();
        $view->method('getTemplatePaths')->willReturn($templatePaths);

        return $view;
    }

    /**
     * The controller is exercised through an anonymous subclass, because a
     * unit test has neither Flow's dependency injection nor a request.
     */
    private function createController(): WorkspacesController
    {
        return new class extends WorkspacesController {
            public function __construct()
            {
            }

            public function completeRootPathsForTest(array $configuredPaths, string $type, bool $includeOwnPath = true): array
            {
                return $this->completeRootPaths($configuredPaths, $type, $includeOwnPath);
            }

            public function initializeViewForTest(ViewInterface $view): void
            {
                $this->initializeView($view);
            }
        };
    }
}
