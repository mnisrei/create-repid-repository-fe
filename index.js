#!/usr/bin/env node

import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import events from 'events';
import simpleGit from 'simple-git';
import spawn from 'cross-spawn';

// Suppress MaxListenersExceededWarning
events.EventEmitter.defaultMaxListeners = 20;

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const git = simpleGit();

const designSystems = [
    { name: 'material-ui', folder: 'components-materialUi' },
    { name: 'antd', folder: 'components-antd' },
    { name: 'tailwind', folder: 'components-tailwind' }
];

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
            choices: designSystems.map(ds => ds.name),
        },
    ]);

    const { projectName, designSystem } = answers;
    const destDir = path.resolve(process.cwd(), projectName);

    const selectedDesignSystem = designSystems.find(ds => ds.name === designSystem);

    try {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir);
            console.log('Directory created successfully.');

            // Clone the template repository
            const templateRepo = 'https://github.com/mnisrei/test.git';
            await git.clone(templateRepo, destDir, ['--depth', '1']);
            console.log('Template repository cloned successfully.');

            // Remove the .git directory from the cloned template
            fs.removeSync(path.join(destDir, '.git'));

            // Define design system specific directories
            const srcDesignSystemDir = path.join(destDir, 'src', selectedDesignSystem.folder);
            const commonHooksDir = path.join(destDir, 'src', 'hooks');
            const componentsDir = path.join(destDir, 'src', 'components');
            const utilsDir = path.join(destDir, 'src', 'utils');

            // Remove non-selected design system folders
            for (const ds of designSystems) {
                if (ds.name !== designSystem) {
                    const nonSelectedDesignSystemDir = path.join(destDir, 'src', ds.folder);
                    if (fs.existsSync(nonSelectedDesignSystemDir)) {
                        fs.removeSync(nonSelectedDesignSystemDir);
                        console.log(`Removed non-selected design system folder: ${nonSelectedDesignSystemDir}`);
                    }
                }
            }

            // Create necessary directories if they don't exist
            if (!fs.existsSync(commonHooksDir)) {
                fs.mkdirSync(commonHooksDir);
            }
            if (!fs.existsSync(componentsDir)) {
                fs.mkdirSync(componentsDir);
            }
            if (!fs.existsSync(utilsDir)) {
                fs.mkdirSync(utilsDir);
            }

            // Copy hooks folder from the selected design system to src/hooks
            if (fs.existsSync(path.join(srcDesignSystemDir, 'hook'))) {
                await fs.copy(path.join(srcDesignSystemDir, 'hook'), commonHooksDir);
                console.log('Copied hooks folder.');
            }

            // Copy components, pages, and shared-components folders to src/components
            const foldersToCopy = ['components', 'pages', 'shared-components'];
            for (const folder of foldersToCopy) {
                const srcFolder = path.join(srcDesignSystemDir, folder);
                if (fs.existsSync(srcFolder)) {
                    await fs.copy(srcFolder, path.join(componentsDir, folder));
                    console.log(`Copied ${folder} folder.`);
                }
            }

            // Copy Themes folder to src/utils
            const themesDir = path.join(srcDesignSystemDir, 'Themes');
            if (fs.existsSync(themesDir)) {
                await fs.copy(themesDir, path.join(utilsDir, 'Themes'));
                console.log('Copied Themes folder.');
            }

            // Copy App.tsx to src
            const appFile = path.join(srcDesignSystemDir, 'App.tsx');
            if (fs.existsSync(appFile)) {
                await fs.copy(appFile, path.join(destDir, 'src', 'App.tsx'));
                console.log('Copied App.tsx file.');
            }

            // Copy package.json from design system directory to project root
            const packageJsonFile = path.join(srcDesignSystemDir, 'package.json');
            console.log(`Looking for package.json at ${packageJsonFile}`);
            if (fs.existsSync(packageJsonFile)) {
                await fs.copy(packageJsonFile, path.join(destDir, 'package.json'));
                console.log('Copied package.json file from design system directory.');
            } else {
                console.error(`package.json file does not exist in the design system directory: ${packageJsonFile}`);
            }

            // Remove the selected design system folder at the end
            if (fs.existsSync(srcDesignSystemDir)) {
                fs.removeSync(srcDesignSystemDir);
                console.log(`Removed selected design system folder: ${srcDesignSystemDir}`);
            }

            // Remove unwanted files from the root of the destination folder
            const filesToRemove = ['index.js'];
            for (const file of filesToRemove) {
                const filePath = path.join(destDir, file);
                if (fs.existsSync(filePath)) {
                    fs.removeSync(filePath);
                    console.log(`Removed file: ${filePath}`);
                }
            }

            // Change directory to the destination folder
            process.chdir(destDir);

            // Run pnpm install
            const install = spawn.sync('pnpm', ['install'], { stdio: 'inherit' });

            if (install.error) {
                console.error(`Error running pnpm install: ${install.error}`);
                process.exit(1);
            }

            console.log('pnpm install completed successfully.');
        } else {
            console.log(`This folder *${destDir}* already exists`);
            initialInquire();
        }
    } catch (err) {
        console.error(err);
    }
};

initialInquire();
