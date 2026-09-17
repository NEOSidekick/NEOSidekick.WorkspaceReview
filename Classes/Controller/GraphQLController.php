<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Controller;

use GraphQL\Executor\Executor;
use GraphQL\GraphQL;
use GraphQL\Utils\BuildSchema;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Mvc\Controller\ActionController;
use NEOSidekick\WorkspaceReview\GraphQL\Context\ReviewContext;
use NEOSidekick\WorkspaceReview\GraphQL\Resolver\Type\QueryResolver;
use NEOSidekick\WorkspaceReview\GraphQL\Transform\ErrorTransform;

/** A read-only endpoint independent of other packages' GraphQL controllers. */
class GraphQLController extends ActionController
{
    protected $supportedMediaTypes = ['application/json'];

    protected string $schemaSource = 'resource://NEOSidekick.WorkspaceReview/Private/GraphQL/schema.root.graphql';

    /**
     * @Flow\Inject
     * @var QueryResolver
     */
    protected $queryResolver;

    /**
     * @Flow\Inject
     * @var ErrorTransform
     */
    protected $errorTransform;

    /**
     * The schema contains queries only; authorization is checked by the resolver.
     *
     * @Flow\SkipCsrfProtection
     * @param array<string, mixed>|null $variables
     */
    public function queryAction(string $query, ?array $variables = null, ?string $operationName = null): string
    {
        $schema = BuildSchema::build(file_get_contents($this->schemaSource));
        $context = new ReviewContext($this->controllerContext);
        $root = ['workspace' => function ($source, array $arguments, ReviewContext $context): array {
            return $this->queryResolver->workspace(null, $arguments, $context);
        }];
        $result = GraphQL::executeQuery(
            $schema,
            $query,
            $root,
            $context,
            $variables,
            $operationName,
            // Do not inherit a package-global resolver installed by t3n or Media UI.
            [Executor::class, 'defaultFieldResolver']
        );

        $this->response->setContentType('application/json');
        $this->response->setHttpHeader('Cache-Control', 'no-store');
        return json_encode($this->errorTransform->transformResult($result)->toArray(), JSON_THROW_ON_ERROR);
    }
}
