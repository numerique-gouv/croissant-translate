import { useEffect, useState } from 'react';
import './App.css';
import {
	ChatCompletionMessageParam,
	CreateWebWorkerEngine,
	EngineInterface,
	InitProgressReport,
	hasModelInCache,
} from '@mlc-ai/web-llm';
import { appConfig } from './app-config';
import Progress from './components/Progress';
import { ActionIcon, Button, Textarea, Tooltip } from '@mantine/core';
import { IconSwitchHorizontal, IconSwitchVertical } from '@tabler/icons-react';

appConfig.useIndexedDBCache = true;

if (appConfig.useIndexedDBCache) {
	console.log('Using IndexedDB Cache');
} else {
	console.log('Using Cache API');
}

function App() {
	const selectedModel = 'CroissantLLMChat-v0.1-q0f16';
	const promptEnglishToFrench =
		"Pouvez-vous traduire ce texte en francais sans ajouter d'informations ?";
	const promptFrenchToEnglish =
		'Can you translate this text in english for me without adding informations';
	const [engine, setEngine] = useState<EngineInterface | null>(null);
	const [progress, setProgress] = useState('Not loaded');
	const [progressPercentage, setProgressPercentage] = useState(0);
	const [isFecthing, setIsFetching] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [runtimeStats, setRuntimeStats] = useState('');
	const [input, setInput] = useState<string>('');
	const [output, setOutput] = useState<string>('');
	const [modelInCache, setModelInCache] = useState<boolean | null>(null);
	const [switched, setSwitched] = useState<boolean>(false);
	//const [showModal, setShowModal] = useState<boolean>(false);

	useEffect(() => {
		checkModelInCache();
		if (!engine) {
			loadEngine();
		}
	}, []);

	const initProgressCallback = (report: InitProgressReport) => {
		//console.log(report);
		if (
			modelInCache === true ||
			report.text.startsWith('Loading model from cache')
		) {
			setOutput('Chargement du modèle dans la RAM...');
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
		setOutput('Chargement du modèle...');

		const engine: EngineInterface = await CreateWebWorkerEngine(
			new Worker(new URL('./worker.ts', import.meta.url), {
				type: 'module',
			}),
			selectedModel,
			{ initProgressCallback: initProgressCallback, appConfig: appConfig }
		);
		setIsFetching(false);
		setEngine(engine);
		const isInChache = await hasModelInCache(selectedModel, appConfig);
		setModelInCache(isInChache);
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
			content:
				(switched ? promptEnglishToFrench : promptFrenchToEnglish) + input,
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
			console.log(userMessage);
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

	const checkModelInCache = async () => {
		const isInChache = await hasModelInCache(selectedModel, appConfig);
		setModelInCache(isInChache);
		console.log(`${selectedModel} in cache : ${isInChache}`);
	};

	return (
		<>
			{/* <Modal
				opened={showModal}
				onClose={() => setShowModal(false)}
				withCloseButton={false}
				centered
				size='xl'
			>
				<p className=''>
					Ce site est un outil de traduction 100% souverain et confidentiel.
					Contrairement à d'autres outils de traduction comme ChatGPT, le modèle
					utilisé fonctionnent entièrement dans votre navigateur, ce qui
					signifie que :
				</p>
				<ul>
					<li>Vos données ne quittent jamais votre ordinateur.</li>
					<li>
						Après le téléchargement initial du modèle, vous pouvez déconnecter
						votre WiFi, et la traduction fonctionnera toujours hors ligne.
					</li>
				</ul>
				<p>
					Note : le premier message peut prendre un certain temps à traiter car
					le modèle doit être entièrement téléchargé sur votre ordinateur. Mais
					lors de vos prochaines visites sur ce site, le modèle se chargera
					rapidement à partir du stockage local de votre ordinateur.
				</p>
				<p>Navigateurs supportés : Chrome, Edge (WebGPU requis)</p>
				<p>
					Ce projet est open source. Consultez la page Github pour plus de
					détails et pour soumettre des bugs et des demandes de fonctionnalités.
				</p>
			</Modal> */}
			<h1>Traduction Anglais/Français</h1>
			<h2>Un service 100% souverain et confidentiel</h2>
			<p>
				Cette traduction est le résultat d'un traitement local dans votre
				navigateur. Vos données ne quittent pas votre ordinateur et ne
				transitent par aucun serveur.
			</p>

			{/* <Button variant='light' color='gray' onClick={loadEngine}>
				Load
			</Button>

			<Button variant='light' color='gray' onClick={() => setShowModal(true)}>
				Modal
			</Button> */}

			{/* <Button variant='light' color='gray' onClick={checkModelInCache}>
				Check Cache
			</Button>

			<Button variant='light' color='gray' onClick={() => engine?.unload()}>
				Unload
			</Button>  */}

			{modelInCache !== null && (
				<p>Modèle téléchargé : {modelInCache === true ? '✅' : '❌'}</p>
			)}

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
					label={switched ? 'Anglais' : 'Français'}
					placeholder='Écrivez ou collez votre texte ici.'
					className='textarea'
				/>

				<div>
					<div className='horizontal-switch-button'>
						<Tooltip label='Intervertir les langues source et cible'>
							<ActionIcon
								variant='transparent'
								color='black'
								size='xl'
								data-disabled={isFecthing || isGenerating}
								onClick={() => setSwitched((prevState) => !prevState)}
								className='switch-button'
							>
								<IconSwitchHorizontal style={{ width: '90%', height: '90%' }} />
							</ActionIcon>
						</Tooltip>
					</div>
					<div className='vertical-switch-button'>
						<Tooltip label='Intervertir les langues source et cible'>
							<ActionIcon
								variant='transparent'
								color='black'
								size='xl'
								disabled={isFecthing || isGenerating}
								onClick={() => setSwitched((prevState) => !prevState)}
								className='switch-button'
							>
								<IconSwitchVertical style={{ width: '90%', height: '90%' }} />
							</ActionIcon>
						</Tooltip>
					</div>
				</div>

				<Textarea
					value={output}
					autosize
					minRows={15}
					maxRows={15}
					disabled={isFecthing}
					variant='filled'
					size='lg'
					label={switched ? 'Français' : 'Anglais'}
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
				<div className='progress-bars-container'>
					<Progress percentage={progressPercentage} />
				</div>
			)}

			<div className='progress-text'>{progress}</div>
			{runtimeStats && <p>Performances : {runtimeStats}</p>}
			<p>
				Motorisé par {''}
				<a href='https://huggingface.co/croissantllm' target='_blank'>
					🥐CroissantLLM
				</a>
				, un LLM souverain par CentraleSupélec.
			</p>
		</>
	);
}

export default App;
