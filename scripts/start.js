const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const backendEnv = {
	...process.env,
	PORT: '3000',
};

const frontendEnv = {
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
console.log('Backend:  http://localhost:3000');

const backend = run('npm', ['run', 'dev'], backendDir, backendEnv, 'backend');
const frontend = run('npm', ['run', 'dev'], frontendDir, frontendEnv, 'frontend');

const shutdown = () => {
	backend.kill();
	frontend.kill();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
