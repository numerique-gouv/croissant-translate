import { useEffect, useState } from 'react';
import './App.css';
import {
	ChatCompletionMessageParam,
	CreateWebWorkerEngine,
	EngineInterface,
	InitProgressReport,
} from '@mlc-ai/web-llm';
import { appConfig } from './app-config';
import Progress from './components/Progress';
import { Button, Textarea } from '@mantine/core';

appConfig.useIndexedDBCache = true;

if (appConfig.useIndexedDBCache) {
	console.log('Using IndexedDB Cache');
} else {
	console.log('Using Cache API');
}

function App() {
	const selectedModel = 'CroissantLLMChat-v0.1-q0f16';
	const [engine, setEngine] = useState<EngineInterface | null>(null);
	const [progress, setProgress] = useState('Not loaded');
	const [progressPercentage, setProgressPercentage] = useState(0);
	const [isFecthing, setIsFetching] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [runtimeStats, setRuntimeStats] = useState('');
	const [input, setInput] = useState<string>('');
	const [output, setOutput] = useState<string>('');

	useEffect(() => {
		if (!engine) {
			loadEngine();
		}
	}, []);

	const initProgressCallback = (report: InitProgressReport) => {
		//console.log(report);
		if (report.text.startsWith('Loading model from cache')) {
			setOutput('Loading from cache...');
		} else {
			setOutput(
				'Téléchargement des points du modèle dans la cache de votre navigateur, cela peut prendre quelques minutes.'
			);
		}

		if (report.progress !== 0) {
			setProgressPercentage(report.progress);
		}
		if (report.progress === 1) {
			setProgressPercentage(0);
			setOutput('');
		}
		setProgress(report.text);
	};

	const loadEngine = async () => {
		console.log('Loading engine...');
		setIsFetching(true);
		setOutput('Loading model... (this might take a bit)');

		const engine: EngineInterface = await CreateWebWorkerEngine(
			new Worker(new URL('./worker.ts', import.meta.url), {
				type: 'module',
			}),
			selectedModel,
			{ initProgressCallback: initProgressCallback, appConfig: appConfig }
		);
		setIsFetching(false);
		setEngine(engine);
		return engine;
	};

	const onSend = async () => {
		if (input === '') {
			return;
		}
		setIsGenerating(true);

		let loadedEngine = engine;

		const userMessage: ChatCompletionMessageParam = {
			role: 'user',
			content: 'Tu peux me traduire ce texte en anglais :' + input,
		};

		if (!loadedEngine) {
			console.log('Engine not loaded');

			try {
				loadedEngine = await loadEngine();
			} catch (error) {
				setIsGenerating(false);
				console.log(error);
				setOutput('Could not load the model because ' + error);
				return;
			}
		}

		try {
			await loadedEngine.resetChat();
			const completion = await loadedEngine.chat.completions.create({
				stream: true,
				messages: [userMessage],
			});

			let assistantMessage = '';
			for await (const chunk of completion) {
				const curDelta = chunk.choices[0].delta.content;
				if (curDelta) {
					assistantMessage += curDelta;
				}
				setOutput(assistantMessage);
			}
			setIsGenerating(false);

			setRuntimeStats(await loadedEngine.runtimeStatsText());
			console.log(await loadedEngine.runtimeStatsText());
		} catch (error) {
			setIsGenerating(false);
			console.log('EXECPTION');
			console.log(error);
			setOutput('Error. Please try again.');
			return;
		}
	};

	const reset = async () => {
		if (!engine) {
			console.log('Engine not loaded');
			return;
		}
		await engine.resetChat();
		setInput('');
		setOutput('');
	};

	const onStop = () => {
		if (!engine) {
			console.log('Engine not loaded');
			return;
		}

		setIsGenerating(false);
		engine.interruptGenerate();
	};

	return (
		<>
			<h1>🥐 CroissantLLM</h1>
			<h2>A Truly Bilingual French-English Language Model</h2>

			{/* <Button variant='light' color='gray' onClick={loadEngine}>
				Load
			</Button> */}

			<div className='textbox-container'>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.currentTarget.value)}
					autosize
					minRows={15}
					maxRows={15}
					disabled={isFecthing}
					variant='filled'
					size='lg'
					label='Français'
					placeholder='Écrivez ou collez votre texte ici.'
					className='textarea'
				/>
				<Textarea
					value={output}
					autosize
					minRows={15}
					maxRows={15}
					disabled={isFecthing}
					variant='filled'
					size='lg'
					label='Anglais'
					className='textarea'
				/>
				{/* <textarea
					value={input}
					placeholder='Ecrivez ou collez votre texte ici.'
					rows={25}
					onChange={(e) => setInput(e.target.value)}
				></textarea>
				<textarea value={output} rows={25} readOnly></textarea> */}
			</div>

			<div className='button-container'>
				<Button
					variant='light'
					color='gray'
					onClick={reset}
					disabled={isGenerating || isFecthing}
					loading={isFecthing}
				>
					Effacer
				</Button>

				<Button
					variant='light'
					color='gray'
					onClick={onSend}
					disabled={isGenerating || isFecthing}
					loading={isGenerating || isFecthing}
				>
					Traduire
				</Button>

				<Button
					variant='light'
					onClick={onStop}
					color='gray'
					disabled={!isGenerating}
					loading={isFecthing}
				>
					Stop
				</Button>
			</div>

			{progressPercentage !== 0 && (
				<div className='progress-bars-containerOld'>
					<Progress percentage={progressPercentage} />
				</div>
			)}

			<div>{progress}</div>
			{runtimeStats && <p>Performances : {runtimeStats}</p>}
		</>
	);
}

export default App;
