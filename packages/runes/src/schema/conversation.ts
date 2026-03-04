export class ConversationMessage {
	speaker: string = '';
	alignment: 'left' | 'right' = 'left';
}

export class Conversation {
	message: ConversationMessage[] = [];
}
