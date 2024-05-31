#!/usr/bin/env node

import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import events from 'events';
import simpleGit from 'simple-git';
import spawn from 'cross-spawn';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Suppress MaxListenersExceededWarning
events.EventEmitter.defaultMaxListeners = 20;

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const git = simpleGit();

const initialInquire = async () => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project folder?',
            default: 'rapid-framework-fe',
        },
        {
            type: 'list',
            name: 'designSystem',
            message: 'Which design system would you like to use?',
            choices: ['material-ui', 'antd', 'tailwind'],
        },
    ]);

    const { projectName, designSystem } = answers;
    const destDir = path.resolve(process.cwd(), projectName);

    try {
        if (fs.existsSync(destDir)) {
            fs.readdirSync(destDir).forEach((file) => {
                if (file !== 'node_modules') {
                    fs.removeSync(path.join(destDir, file));
                }
            });
        } else {
            fs.mkdirSync(destDir);
            console.log('Directory created successfully.');
        }

        // Clone the template repository
        const templateRepo = 'https://github.com/mnisrei/test.git';
        await git.clone(templateRepo, destDir, ['--depth', '1']);
        console.log('Template repository cloned successfully.');

        // Remove the .git directory from the cloned template
        fs.removeSync(path.join(destDir, '.git'));

        // Define design system specific directories
        const srcDesignSystemDir = path.join(destDir, 'src', `components-${designSystem === 'antd' ? 'antd' : designSystem === 'tailwind' ? 'tailwind' : 'materialUi'}`);
        const commonHooksDir = path.join(destDir, 'src', 'hooks');
        const componentsDir = path.join(destDir, 'src', 'components');
        const appFileSrc = path.join(srcDesignSystemDir, 'App.tsx');
        const appFileDest = path.join(destDir, 'src', 'App.tsx');
        const designSystemPackageJson = path.join(srcDesignSystemDir, 'package.json');
        const destPackageJson = path.join(destDir, 'package.json');
        const srcThemeDir = path.join(srcDesignSystemDir, 'Theme');
        const destThemeDir = path.join(destDir, 'src', 'utils', 'Theme');

        // Create necessary directories in the destination
        const necessaryDirs = [
            path.join(destDir, 'public'),
            path.join(destDir, 'src'),
            commonHooksDir,
            componentsDir,
            path.join(destDir, 'src', 'utils')
        ];

        necessaryDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        const copyItems = ['public', 'src'];
        for (const item of copyItems) {
            fs.copySync(path.join(__dirname, item), path.join(destDir, item), {
                filter: (src) => {
                    return !src.includes('node_modules')
                        && !src.includes('components-materialUi')
                        && !src.includes('components-antd')
                        && !src.includes('components-tailwind')
                        && !src.endsWith('package.json')
                        && !src.endsWith('index.js');
                }
            });
        }

        await fs.copy(path.join(srcDesignSystemDir, 'hook'), commonHooksDir);
        await fs.copy(path.join(srcDesignSystemDir, 'pages'), path.join(componentsDir, 'pages'));
        await fs.copy(path.join(srcDesignSystemDir, 'shared-components'), path.join(componentsDir, 'shared-components'));
        await fs.copy(appFileSrc, appFileDest);
        await fs.copy(designSystemPackageJson, destPackageJson);

        fs.mkdirSync(destThemeDir, { recursive: true });

        if (fs.existsSync(srcThemeDir)) {
            await fs.copy(srcThemeDir, destThemeDir, { overwrite: true });
        } else {
            console.warn(`Warning: ${srcThemeDir} does not exist.`);
        }

        const dependencyFiles = [
            'index.html',
            'LICENSE',
            'README.md',
            'tsconfig.json',
            'tsconfig.node.json',
            'vercel.json',
            'vite.config.ts'
        ];

        for (const file of dependencyFiles) {
            const srcPath = path.join(__dirname, file);
            const destPath = path.join(destDir, file);
            if (fs.existsSync(srcPath)) {
                await fs.copy(srcPath, destPath, { overwrite: true });
            }
        }

        process.chdir(destDir);
        const install = spawn.sync('pnpm', ['install'], { stdio: 'inherit' });
        if (install.error) {
            console.error(`Error running pnpm install: ${install.error}`);
            process.exit(1);
        }
        console.log('pnpm install completed successfully.');

        // Run pnpm dev
        const dev = spawn.sync('pnpm', ['run', 'dev'], { stdio: 'inherit' });
        if (dev.error) {
            console.error(`Error running pnpm dev: ${dev.error}`);
            process.exit(1);
        }
        console.log('pnpm dev started successfully.');
    } catch (err) {
        console.error(err);
    }
};

initialInquire();
