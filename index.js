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
            choices: ['material-ui', 'antd'],
        },
    ]);

    const { projectName, designSystem } = answers;
    const destDir = path.resolve(process.cwd(), projectName);

    try {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir);
            console.log('Directory created successfully.');

            // Clone the template repository
            const templateRepo = 'https://github.com/mnisrei/test.git';
            await git.clone(templateRepo, destDir, ['--depth', '1']);
            console.log('Template repository cloned successfully.');

            // Define design system specific directories
            const srcDesignSystemDir = path.join(destDir, 'src', `components-${designSystem}`);
            const commonHooksDir = path.join(destDir, 'src', 'hooks');

            // Create src/hooks directory if it doesn't exist
            if (!fs.existsSync(commonHooksDir)) {
                fs.mkdirSync(commonHooksDir);
            }

            // Copy hooks folder from the selected design system to src/hooks
            await fs.copy(path.join(srcDesignSystemDir, 'hooks'), commonHooksDir);

            // Remove unnecessary design system folders
            const otherDesignSystem = designSystem === 'material-ui' ? 'antd' : 'material-ui';
            fs.removeSync(path.join(destDir, 'src', `components-${otherDesignSystem}`));

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
