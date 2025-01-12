import { title as getTitle } from '@/components/utils/publicodesUtils'
import Link from 'next/link'
import { utils } from 'publicodes'

export const Breadcrumb = ({ rules, dottedName, pathPrefix }) => {
	const elements = utils
		.ruleParents(dottedName)
		.reverse()
		.map((parentDottedName) => {
			const rule = rules[parentDottedName]
			const href = utils.encodeRuleName(parentDottedName)
			return rule === undefined ? null : (
				<span key={parentDottedName}>
					{rule?.icônes !== undefined && <span>{rule.icônes}</span>}
					<Link href={pathPrefix + '/documentation/' + href}>
						{getTitle({ ...rule, dottedName: parentDottedName })}
					</Link>

					<span aria-hidden>{' › '}</span>
				</span>
			)
		})
	if (!elements.length) {
		return null
	}

	return <small>{elements}</small>
}
