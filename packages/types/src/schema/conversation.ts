import { ComponentType } from "../interfaces.js";

export class ConversationMessage {
	speaker: string = '';
	alignment: 'left' | 'right' = 'left';
}

export interface ConversationMessageComponent extends ComponentType<ConversationMessage> {
	tag: 'div',
	properties: {
		speaker: 'span',
		alignment: 'meta',
	},
	refs: {
		body: 'div',
	}
}

export class Conversation {
	message: ConversationMessage[] = [];
}

export interface ConversationComponent extends ComponentType<Conversation> {
	tag: 'div',
	properties: {
		message: 'div',
	},
	refs: {
		messages: 'div',
	}
}
