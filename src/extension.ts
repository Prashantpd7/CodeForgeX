import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
	path: path.resolve(__dirname, '../.env')
});

import { generatePracticeQuestion } from './services/aiService';

export function activate(context: vscode.ExtensionContext) {

	console.log('CodeForgeX is now active!');

	const disposable = vscode.commands.registerCommand('codeforgex.startPractice', async () => {

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active file detected.');
			return;
		}

		const languageId = editor.document.languageId;
		const fileContent = editor.document.getText();

		// 🚫 Prevent multiple question generation
		if (fileContent.includes('// Question:')) {
			vscode.window.showInformationMessage('A practice question is already generated in this file.');
			return;
		}

		const fileName = editor.document.fileName;
		const baseName = fileName.split('/').pop()?.toLowerCase() || '';

		let detectedTopic = 'General Programming';

		if (baseName.includes('binary') || baseName.includes('search')) {
			detectedTopic = 'Searching';
		} else if (baseName.includes('sort')) {
			detectedTopic = 'Sorting';
		} else if (baseName.includes('linked') || baseName.includes('list')) {
			detectedTopic = 'Linked List';
		}

		const decision = await vscode.window.showInformationMessage(
			`Detected Topic: ${detectedTopic}`,
			{ modal: true },
			'Continue',
			'Change Topic'
		);

		if (!decision) return;

		if (decision === 'Change Topic') {
			const manualTopic = await vscode.window.showInputBox({
				prompt: 'Enter topic name manually'
			});

			if (manualTopic && manualTopic.trim() !== '') {
				detectedTopic = manualTopic.trim();
			}
		}

		vscode.window.showInformationMessage('Generating practice question...');

		let question: string;

		try {
			question = await generatePracticeQuestion(detectedTopic, languageId);
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage('AI generation failed.');
			return;
		}

		// Determine correct comment prefix
		const commentPrefix = languageId === 'python' ? '# ' : '// ';

		// Clean simple formatting
		const formattedQuestion =
			`${commentPrefix}Question:\n` +
			question
				.split('\n')
				.map(line => commentPrefix + line)
				.join('\n') +
			'\n\n';

		await editor.edit(editBuilder => {
			editBuilder.insert(
				new vscode.Position(0, 0),
				formattedQuestion
			);
		});

		// Enable word wrap for better readability
		await vscode.commands.executeCommand('editor.action.toggleWordWrap');

	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
