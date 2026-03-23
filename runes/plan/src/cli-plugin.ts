interface CliPluginCommand {
	name: string;
	description: string;
	handler: (args: string[]) => void | Promise<void>;
}

interface CliPlugin {
	namespace: string;
	commands: CliPluginCommand[];
}

function notYetImplemented(name: string) {
	return () => {
		console.error(`Error: "plan ${name}" is not yet implemented.`);
		process.exit(1);
	};
}

const plugin: CliPlugin = {
	namespace: 'plan',
	commands: [
		{ name: 'status', description: 'Terminal status summary', handler: notYetImplemented('status') },
		{ name: 'next', description: 'Find next work item', handler: notYetImplemented('next') },
		{ name: 'update', description: 'Update plan item attributes', handler: notYetImplemented('update') },
		{ name: 'validate', description: 'Validate plan structure', handler: notYetImplemented('validate') },
		{ name: 'create', description: 'Scaffold new plan items', handler: notYetImplemented('create') },
		{ name: 'init', description: 'Scaffold plan structure', handler: notYetImplemented('init') },
		{ name: 'serve', description: 'Browse the plan dashboard', handler: notYetImplemented('serve') },
		{ name: 'build', description: 'Build static plan site', handler: notYetImplemented('build') },
	],
};

export default plugin;
