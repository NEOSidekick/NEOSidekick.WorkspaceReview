const { sep } = require('path');
const esbuild = require('esbuild');
const { cssModules } = require('./cssModules');

const isWatch = process.argv.includes('--watch');
const isAnalyze = process.argv.includes('--analyze');

/**
 * Every stylesheet is processed as a CSS module, because components import their
 * styles that way. Two groups are excluded:
 *  - core/src/diff.css holds the two global class names the PHP side writes into
 *    diffHtml, which must not be hashed (see the architecture §4.3);
 *  - the pre-built stylesheets of @neos-project/react-ui-components, whose class
 *    names its dist already hashed and mapped in JavaScript.
 */
const excludeFilter = new RegExp(
    [
        `core\\${sep}src\\${sep}diff\\.css$`,
        `react-ui-components\\${sep}dist\\${sep}_css\\${sep}`,
    ].join('|')
);

/** @type {import("esbuild").BuildOptions} */
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
    metafile: isAnalyze,
    mainFields: ['browser', 'module', 'main'],
    loader: {
        '.svg': 'dataurl',
        '.woff': 'file',
        '.woff2': 'file',
    },
    plugins: [
        cssModules({
            includeFilter: /\.css$/,
            excludeFilter,
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
    esbuild.build(options).then((result) => {
        if (isAnalyze) {
            require('fs').writeFileSync('meta.json', JSON.stringify(result.metafile));
            console.log("\nUpload './meta.json' to https://esbuild.github.io/analyze/ to analyze the bundle.");
        }
    });
}
