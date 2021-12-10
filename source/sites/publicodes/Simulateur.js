import { setSimulationConfig } from 'Actions/actions'
import PeriodSwitch from 'Components/PeriodSwitch'
import { extractCategories } from 'Components/publicodesUtils'
import { buildEndURL } from 'Components/SessionBar'
import Simulation from 'Components/Simulation'
import { useEngine } from 'Components/utils/EngineContext'
import { Markdown } from 'Components/utils/markdown'
import { TrackerContext } from 'Components/utils/withTracker'
import { utils } from 'publicodes'
import { compose, isEmpty, symmetricDifference } from 'ramda'
import React, { useContext, useEffect } from 'react'
import emoji from 'react-easy-emoji'
import { Helmet } from 'react-helmet'
import { useDispatch, useSelector } from 'react-redux'
import { Redirect } from 'react-router'
import tinygradient from 'tinygradient'
import {
	deletePreviousSimulation,
	resetSimulation,
} from '../../actions/actions'
import {
	sessionBarMargin,
	useSafePreviousSimulation,
} from '../../components/SessionBar'
import { useNextQuestions } from '../../components/utils/useNextQuestion'
import FuturecoMonochrome from '../../images/FuturecoMonochrome'
import {
	answeredQuestionsSelector,
	situationSelector,
} from '../../selectors/simulationSelectors'
import { Almost, Done, Half, NotBad, QuiteGood } from './Congratulations'
import { Link } from 'react-router-dom'

const eqValues = compose(isEmpty, symmetricDifference)
export const colorScale = [
	'#16a085',
	'#78e08f',
	'#e1d738',
	'#f6b93b',
	'#b71540',
]
const gradient = tinygradient(colorScale),
	colors = gradient.rgb(21),
	incompressible = 1112,
	durable = 2000,
	limit = durable + incompressible

const getBackgroundColor = (score) => {
	const cursor =
		score < incompressible
			? 0
			: score > limit
			? 19
			: ((score - incompressible) / durable) * 20

	console.log(score, cursor)

	return colors[Math.round(cursor)]
}

const Simulateur = (props) => {
	const objectif = props.match.params.name,
		decoded = utils.decodeRuleName(objectif),
		rules = useSelector((state) => state.rules),
		rule = rules[decoded],
		engine = useEngine(),
		situation = useSelector(situationSelector),
		evaluation = engine.evaluate(decoded),
		dispatch = useDispatch(),
		config = {
			objectifs: [decoded],
		},
		configSet = useSelector((state) => state.simulation?.config),
		categories = decoded === 'bilan' && extractCategories(rules, engine)
	const tutorials = useSelector((state) => state.tutorials)

	useEffect(
		() =>
			!eqValues(config.objectifs, configSet?.objectifs || [])
				? dispatch(setSimulationConfig(config))
				: () => null,
		[]
	)

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!(e.ctrlKey && e.key === 'c')) return
			dispatch(resetSimulation())
			dispatch(deletePreviousSimulation())
			e.preventDefault()
			return false
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [])
	useSafePreviousSimulation()

	const nextQuestions = useNextQuestions(),
		answeredQuestions = useSelector(answeredQuestionsSelector)
	const messages = useSelector((state) => state.simulation?.messages)

	const isMainSimulation = decoded === 'bilan'
	if (!configSet) return null

	const gameOver = evaluation.nodeValue > limit
	const answeredRatio =
		answeredQuestions.length / (answeredQuestions.length + nextQuestions.length)

	const doomColor = getBackgroundColor(evaluation.nodeValue).toHexString()

	if (isMainSimulation) {
		if (answeredRatio >= 0.1 && !messages['notBad'])
			return <NotBad answeredRatio={answeredRatio} />
		if (answeredRatio >= 0.3 && !messages['quiteGood'])
			return <QuiteGood answeredRatio={answeredRatio} />
		if (answeredRatio >= 0.5 && !messages['half'])
			return <Half answeredRatio={answeredRatio} />
		if (answeredRatio >= 0.75 && !messages['almost'])
			return <Almost answeredRatio={answeredRatio} />
		if (!nextQuestions.length) return <Done />
	}
	return (
		<>
			<Link to="/">
				<div
					css={`
						display: flex;
						justify-content: center;
						height: 10%;
						svg {
							height: 4rem;
						}
					`}
				>
					<FuturecoMonochrome color={doomColor} />
				</div>
			</Link>
			<div
				css={`
					height: 90%;
					border: 1.4rem solid ${doomColor};
					${false && sessionBarMargin}
					overflow: auto; /* Some questions are very high, the mosaic ones*/
				`}
			>
				<Helmet>
					<title>{rule.title}</title>
					{rule.description && (
						<meta name="description" content={rule.description} />
					)}
				</Helmet>

				{isMainSimulation && gameOver ? (
					<Redirect to="/fin" />
				) : (
					<Simulation
						noFeedback
						orderByCategories={categories}
						customEnd={
							decoded === 'bilan' ? (
								<RedirectionToEndPage {...{ rules, engine }} />
							) : rule.description ? (
								<Markdown source={rule.description} />
							) : (
								<EndingCongratulations />
							)
						}
						targets={<>{rule.period === 'flexible' && <PeriodBlock />}</>}
						explanations={null}
					/>
				)}
			</div>
		</>
	)
}

let PeriodBlock = () => (
	<div css="display: flex; justify-content: center">
		<PeriodSwitch />
	</div>
)

const RedirectionToEndPage = ({ rules, engine }) => {
	// Necessary to call 'buildEndURL' with the latest situation
	const situation = useSelector(situationSelector)
	const tracker = useContext(TrackerContext)

	useEffect(() => {
		tracker.push([
			'trackEvent',
			'NGC',
			'A terminé la simulation',
			null,
			rules['bilan'].nodeValue,
		])
	}, [tracker])

	return <Redirect to={buildEndURL(rules, engine)} />
}

export default Simulateur

const EndingCongratulations = () => (
	<h3>{emoji('🌟')} Vous avez complété cette simulation</h3>
)
