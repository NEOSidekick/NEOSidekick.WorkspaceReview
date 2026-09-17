const esbuild = require('esbuild');
const { cssModules } = require('./cssModules');

const isWatch = process.argv.includes('--watch');

/**
 * Only the components' own `*.module.css` files are CSS modules, which is the
 * plugin's default: `core/src/diff.css` holds the global class names the PHP
 * side writes into diffHtml, and the stylesheets of
 * `@neos-project/react-ui-components` arrive from its dist with their class
 * names already hashed and mapped in JavaScript. Both are plain stylesheets.
 *
 * @type {import("esbuild").BuildOptions}
 */
const options = {
    entryPoints: {
        'main.bundle': './src/index.tsx',
    },
    outdir: '../../../Public/Assets',
    bundle: true,
    minify: !isWatch,
    sourcemap: 'linked',
    legalComments: 'linked',
    target: 'es2020',
    logLevel: 'info',
    color: true,
    mainFields: ['browser', 'module', 'main'],
    plugins: [
        cssModules({
            targets: {
                chrome: 80 << 16,
                safari: (13 << 16) | (1 << 8),
                firefox: 72 << 16,
                edge: 80 << 16,
            },
            drafts: {
                nesting: true,
            },
        }),
    ],
};

if (isWatch) {
    esbuild.context(options).then((context) => context.watch());
} else {
    esbuild.build(options);
}
