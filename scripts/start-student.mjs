import { spawn } from 'node:child_process';
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port','5173','--strictPort'],{stdio:'inherit',env:{...process.env,LAB_STUDENT_WORKSPACE:'1'}});
child.on('exit',code=>process.exit(code??1));
