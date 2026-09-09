const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const webDir = path.join(rootDir, 'web');

const serverEnv = {
	...process.env,
	PORT: process.env.PORT || '4000',
};

const webEnv = {
	...process.env,
};

const run = (command, args, cwd, env, label) => {
	const child = spawn(command, args, {
		cwd,
		env,
		stdio: 'inherit',
		shell: true,
	});

	child.on('exit', (code) => {
		if (code && code !== 0) {
			console.error(`[${label}] exited with code ${code}`);
		}
	});

	return child;
};

console.log('PNDA start script');
console.log('Frontend: http://localhost:5173');
console.log('API Supabase: http://localhost:4000');

const server = run('npm', ['run', 'dev'], serverDir, serverEnv, 'server');
const web = run('npm', ['run', 'dev'], webDir, webEnv, 'web');

const shutdown = () => {
	server.kill();
	web.kill();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
