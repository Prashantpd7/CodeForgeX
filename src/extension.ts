import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
	path: path.resolve(__dirname, '../.env')
});

import { generatePracticeQuestion } from './services/aiService';
// In-memory storage for hint & solution
let storedHint: string | null = null;
let storedSolution: string | null = null;


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

		// Prevent duplicate question
		if (fileContent.includes('Question (')) {
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

		// Difficulty
		const difficulty = await vscode.window.showQuickPick(
			['Easy', 'Medium', 'Hard'],
			{ placeHolder: 'Select difficulty level' }
		);

		if (!difficulty) return;

		// Mode
		const mode = await vscode.window.showQuickPick(
			[
				'Question Only',
				'Question + Hint',
				'Full Solution',
				'Multiple Approaches'
			],
			{ placeHolder: 'Select practice mode' }
		);

		if (!mode) return;

		vscode.window.showInformationMessage('Generating practice content...');

		let aiContent: string;

		try {
			aiContent = await generatePracticeQuestion(
				detectedTopic,
				languageId,
				difficulty,
				mode
			);
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage('AI generation failed.');
			return;
		}

		const commentPrefix = languageId === 'python' ? '# ' : '// ';

		const headerLine =
			`${commentPrefix}Question (${difficulty} | ${mode})\n\n`;

		// 🔥 Structured Parsing - ONLY extract, DO NOT insert hint/solution
		const questionMatch = aiContent.match(/\[QUESTION\]([\s\S]*?)(?=\[HINT\]|\[SOLUTION\]|$)/);
		const hintMatch = aiContent.match(/\[HINT\]([\s\S]*?)(?=\[SOLUTION\]|$)/);
		const solutionMatch = aiContent.match(/\[SOLUTION\]([\s\S]*)/);

		// STORE hint and solution for later commands ONLY
		storedHint = hintMatch ? hintMatch[1].trim() : null;
		storedSolution = solutionMatch ? solutionMatch[1].trim() : null;

		// Build content with ONLY the question
		let finalContent = headerLine;
		if (questionMatch) {
			const questionText = questionMatch[1].trim();
			finalContent += questionText
				.split('\n')
				.map(line => commentPrefix + line)
				.join('\n') + '\n\n';
		}

		// Insert ONLY the question into the editor
		await editor.edit(editBuilder => {
			editBuilder.insert(
				new vscode.Position(0, 0),
				finalContent
			);
		});

		// Enable word wrap
		await vscode.workspace.getConfiguration('editor').update(
			'wordWrap',
			'on',
			vscode.ConfigurationTarget.Workspace
		);

	});
	const hintCommand = vscode.commands.registerCommand('codeforgex.showHint', async () => {

	const editor = vscode.window.activeTextEditor;
	if (!editor || !storedHint) {
		vscode.window.showInformationMessage('No hint available.');
		return;
	}

	const commentPrefix = editor.document.languageId === 'python' ? '# ' : '// ';

	const hintContent =
		`\n${commentPrefix}Hint:\n` +
		storedHint
			.split('\n')
			.map(line => commentPrefix + line)
			.join('\n') +
		'\n\n';

	await editor.edit(editBuilder => {
		editBuilder.insert(
			new vscode.Position(editor.document.lineCount, 0),
			hintContent
		);
	});
});
const solutionCommand = vscode.commands.registerCommand('codeforgex.showSolution', async () => {

	const editor = vscode.window.activeTextEditor;
	if (!editor || !storedSolution) {
		vscode.window.showInformationMessage('No solution available.');
		return;
	}

	const solutionContent = `\n${storedSolution}\n\n`;

	await editor.edit(editBuilder => {
		editBuilder.insert(
			new vscode.Position(editor.document.lineCount, 0),
			solutionContent
		);
	});
});
	context.subscriptions.push(disposable, hintCommand, solutionCommand);
}

export function deactivate() {}
