<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\I18n\EelHelper\TranslationHelper;
use Neos\Flow\I18n\Locale;
use Neos\Flow\I18n\Translator;
use Neos\Neos\Service\UserService as BackendUserService;

/**
 * Turns stored property values into the words an editor sees in the
 * inspector: select and toggle options resolve to their configured labels,
 * booleans and references read as text, and every label is translated into
 * the backend user's interface language right away, because the GraphQL
 * response carries finished strings rather than translation ids.
 *
 * It is also the package's translation entry point, so the differ and the
 * other services do not each need their own translator wiring.
 *
 * @Flow\Scope("singleton")
 */
class PropertyLabelService
{
    /**
     * @Flow\Inject
     * @var Translator
     */
    protected $translator;

    /**
     * @Flow\Inject
     * @var BackendUserService
     */
    protected $backendUserService;

    /**
     * Translates a label from this package's Main.xlf.
     */
    public function translate(string $id, array $arguments = [], ?int $quantity = null): string
    {
        try {
            return (string)$this->translator->translateById(
                $id,
                $arguments,
                $quantity,
                $this->getInterfaceLocale(),
                'Main',
                'NEOSidekick.WorkspaceReview'
            );
        } catch (\Exception $exception) {
            return $id;
        }
    }

    /**
     * Translates a "Package:Source:id" shorthand label; plain strings are
     * returned unchanged.
     */
    public function translateShorthand(string $label): string
    {
        if (preg_match(TranslationHelper::I18N_LABEL_ID_PATTERN, $label) !== 1) {
            return $label;
        }
        [$package, $source, $id] = explode(':', $label, 3);
        try {
            return (string)$this->translator->translateById(
                $id,
                [],
                null,
                $this->getInterfaceLocale(),
                str_replace('.', '/', $source),
                $package
            );
        } catch (\Exception $exception) {
            return $label;
        }
    }

    /**
     * Strips markup and decodes entities so node labels and raw values read
     * naturally ("&" instead of "&amp;").
     */
    public function cleanLabel(string $label): string
    {
        $label = strip_tags($label);
        $label = html_entity_decode($label, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim((string)preg_replace('/[\x{00A0}\s]+/u', ' ', $label));
    }

    /**
     * Names the field a change belongs to, translated and readable. A node
     * type without a "ui.label" leaves only the property name, which is
     * humanized ("subtitleColor" -> "Subtitle color") instead of shown raw.
     */
    public function getPropertyLabel(string $propertyName, NodeInterface $changedNode): string
    {
        $properties = $changedNode->getNodeType()->getProperties();
        $configuredLabel = $properties[$propertyName]['ui']['label'] ?? $propertyName;
        $label = $this->translateShorthand((string)$configuredLabel);
        if ($label === $propertyName) {
            $label = ucfirst(strtolower((string)preg_replace('/(?<!^)[A-Z]/', ' $0', $propertyName)));
        }
        return $label;
    }

    /**
     * Returns the configured value-label map of a select box or toggle editor,
     * or null if the property has no such static options.
     */
    public function getEditorValues(string $propertyName, NodeInterface $node): ?array
    {
        $properties = $node->getNodeType()->getProperties();
        $values = $properties[$propertyName]['ui']['inspector']['editorOptions']['values'] ?? null;
        return is_array($values) && $values !== [] ? $values : null;
    }

    /**
     * Renders any property value as a short human-readable label, resolving
     * select/toggle editor options to their translated labels.
     *
     * @param mixed $value
     */
    public function renderValueLabel($value, string $propertyName, NodeInterface $node): string
    {
        if ($value === null || $value === '' || $value === []) {
            return $this->translate('value.empty');
        }
        if (is_bool($value)) {
            return $this->translate($value ? 'value.yes' : 'value.no');
        }
        if ($value instanceof NodeInterface) {
            return $this->cleanLabel($value->getLabel());
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('d.m.Y H:i');
        }
        if (is_array($value)) {
            $labels = array_map(fn($entry) => $this->renderValueLabel($entry, $propertyName, $node), $value);
            return implode(', ', $labels);
        }
        if (is_scalar($value)) {
            $editorValues = $this->getEditorValues($propertyName, $node);
            // Toggle editors may define only a description (plus an icon)
            // instead of a label, so fall back to the description.
            $valueLabel = $editorValues[(string)$value]['label'] ?? $editorValues[(string)$value]['description'] ?? null;
            if ($valueLabel !== null) {
                return $this->translateShorthand((string)$valueLabel);
            }
            return $this->cleanLabel((string)$value);
        }
        if (is_object($value) && method_exists($value, '__toString')) {
            return $this->cleanLabel((string)$value);
        }
        // Last resort for unknown objects: name their type instead of hiding the change.
        return get_class($value);
    }

    protected function getInterfaceLocale(): ?Locale
    {
        try {
            return new Locale($this->backendUserService->getInterfaceLanguage());
        } catch (\Exception $exception) {
            return null;
        }
    }
}
