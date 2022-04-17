import { ButtonStyle, MessageOptions, ComponentType } from 'slash-create';

export default (): MessageOptions => {
	return {
		content: 'Press pick one of the following energy option!',
		components: [
			{
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.BUTTON,
						custom_id: 'Oil',
						style: ButtonStyle.PRIMARY,
						label: 'Oil',
					},
					{
						type: ComponentType.BUTTON,
						custom_id: 'Gas',
						style: ButtonStyle.SECONDARY,
						label: 'Gas',
						// emoji: { 'name': 'Gas', 'id': '123456789012345678' },
					},
					{
						type: ComponentType.BUTTON,
						custom_id: 'Renewables',
						style: ButtonStyle.SUCCESS,
						label: 'Renewables',
					},
					{
						type: ComponentType.BUTTON,
						custom_id: 'Coal',
						style: ButtonStyle.DESTRUCTIVE,
						label: 'Coal',
					},
					{
						type: ComponentType.BUTTON,
						url: 'https://www.governator.xyz/',
						style: ButtonStyle.LINK,
						label: 'Link',
					},
				],
			},
			{
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.BUTTON,
						custom_id: 'Nuclear',
						style: ButtonStyle.SECONDARY,
						label: 'Nuclear',
					},
				],
			}],
	};
};
