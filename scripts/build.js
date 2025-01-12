const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Configure marked for security
marked.setOptions({
    headerIds: false,
    mangle: false
});

async function readTemplate() {
    const template = await fs.readFile(path.join(__dirname, '../src/templates/base.html'), 'utf-8');
    return template;
}

async function processMarkdown(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { attributes, body } = frontMatter(content);
    const html = marked.parse(body);
    return { attributes, html };
}

async function buildPage(template, markdownPath, outputPath) {
    const { attributes, html } = await processMarkdown(markdownPath);
    let page = template.replace('{{title}}', attributes.title || 'Untitled');
    page = page.replace('{{content}}', html);
    
    // Create a directory for each page (except index/home)
    const filename = path.basename(outputPath, '.html');
    const outputDir = filename === 'index' 
        ? path.dirname(outputPath)
        : path.join(path.dirname(outputPath), filename);
    
    // Create the directory and write index.html inside it
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'index.html'), page);
}

async function copyStaticAssets() {
    // Copy CSS
    await fs.mkdir(path.join(__dirname, '../public/css'), { recursive: true });
    await fs.copyFile(
        path.join(__dirname, '../src/css/style.css'),
        path.join(__dirname, '../public/css/style.css')
    );

    // Copy JS
    await fs.mkdir(path.join(__dirname, '../public/js'), { recursive: true });
    try {
        await fs.copyFile(
            path.join(__dirname, '../src/js/main.js'),
            path.join(__dirname, '../public/js/main.js')
        );
    } catch (error) {
        console.log('No main.js found, skipping...');
    }
}

async function buildSite() {
    try {
        const template = await readTemplate();

        // Build pages
        const pagesDir = path.join(__dirname, '../src/pages');
        const pages = await fs.readdir(pagesDir);
        for (const page of pages) {
            if (page.endsWith('.md')) {
                const markdownPath = path.join(pagesDir, page);
                const outputPath = path.join(
                    __dirname,
                    '../public',
                    page.replace('.md', '.html')
                );
                await buildPage(template, markdownPath, outputPath);
            }
        }

        // Build blog posts
        const blogDir = path.join(__dirname, '../src/blog');
        try {
            const posts = await fs.readdir(blogDir);
            for (const post of posts) {
                if (post.endsWith('.md')) {
                    const markdownPath = path.join(blogDir, post);
                    const outputPath = path.join(
                        __dirname,
                        '../public/blog',
                        post.replace('.md', '.html')
                    );
                    await buildPage(template, markdownPath, outputPath);
                }
            }
        } catch (error) {
            console.log('No blog posts found, skipping...');
        }

        // Copy static assets
        await copyStaticAssets();

        console.log('Site built successfully!');
    } catch (error) {
        console.error('Error building site:', error);
        process.exit(1);
    }
}

buildSite(); 