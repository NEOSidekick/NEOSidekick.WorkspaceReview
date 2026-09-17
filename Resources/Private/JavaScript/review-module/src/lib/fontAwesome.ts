import { library } from '@fortawesome/fontawesome-svg-core';
import {
    faCaretDown,
    faCheck,
    faCheckDouble,
    faChevronDown,
    faChevronRight,
    faChevronUp,
    faClock,
    faExternalLinkAlt,
    faEye,
    faEyeSlash,
    faListUl,
    faLongArrowAltRight,
    faPencilAlt,
    faQuestionCircle,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

/**
 * The component library's Icon resolves names through the FontAwesome library,
 * so every icon the module's own interface names has to be registered. Node
 * type icons are not among them: they come from the NodeTypes configuration in
 * class notation and are rendered with the icon font of the backend page, which
 * keeps the three icon packs out of the bundle.
 */
export function loadIconLibrary(): void {
    library.add(
        faCaretDown,
        faCheck,
        faCheckDouble,
        faChevronDown,
        faChevronRight,
        faChevronUp,
        faClock,
        faExternalLinkAlt,
        faEye,
        faEyeSlash,
        faListUl,
        faLongArrowAltRight,
        faPencilAlt,
        faQuestionCircle,
        faTrashAlt
    );
}
