import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcDir = path.join(rootDir, 'src');

const build = async () => {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(srcDir, 'js', 'index.js')],
    outfile: path.join(distDir, 'script.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    sourcemap: true
  });

  const css = await readFile(path.join(srcDir, 'css', 'index.css'), 'utf8');
  await writeFile(path.join(distDir, 'style.css'), css, 'utf8');
  await cp(path.join(srcDir, 'images'), path.join(distDir, 'images'), {
    recursive: true,
    force: true
  });

  const indexTemplate = await readFile(path.join(srcDir, 'templates', 'index.hbs'), 'utf8');
  const panelTemplate = await readFile(path.join(srcDir, 'templates', 'panel.hbs'), 'utf8');
  Handlebars.registerPartial('panel', panelTemplate);

  const compile = Handlebars.compile(indexTemplate);
  const context = {
    htmlWebpackPlugin: { options: { options: {} } },
  };
  let html = compile(context);
  await writeFile(path.join(distDir, 'index.html'), html, 'utf8');
};

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
