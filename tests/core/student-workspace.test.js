import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { saveFile,readFile,repository,safeFile,checkpoint } from '../../scripts/student-workspace.mjs';
import { digest } from '../../scripts/mission-state.mjs';
const file='student-work/missions/week06/stage01-question.md';
function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'student-save-'));try{fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
describe('student workspace boundaries',()=>{
 it('saves a draft and rejects stale overwrites',()=>fixture(root=>{const a=saveFile(root,{name:file,text:'first',expectedHash:digest('')});expect(readFile(root,file)).toBe('first');expect(()=>saveFile(root,{name:file,text:'stale',expectedHash:digest('')})).toThrow('another window');saveFile(root,{name:file,text:'second',expectedHash:a.hash});expect(readFile(root,file)).toBe('second');}));
 it('rejects protected paths, traversal and symlink escapes',()=>fixture(root=>{for(const p of ['src/core/App.jsx','../escape','src/student/physics/trim-response.js'])expect(()=>safeFile(root,p)).toThrow();fs.symlinkSync(os.tmpdir(),path.join(root,'student-work'));expect(()=>safeFile(root,file)).toThrow('Symbolic');}));
 it('refuses instructor, shared-course, and credential-bearing remotes',()=>fixture(root=>{const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init');git('remote','add','origin','https://github.com/Chula-Aero-Engineering/intro-aero-digital-twin.git');expect(()=>repository(root)).toThrow('disabled');for(const remote of ['https://github.com/me/intro-aero-digital-twin-instructor.git','https://secret@github.com/me/course.git']){git('remote','set-url','origin',remote);expect(()=>repository(root)).toThrow();}git('remote','set-url','origin','https://github.com/test-student/course.git');expect(repository(root).owner).toBe('test-student');}));
});

it('keeps a failed-push checkpoint and retries without an extra commit',()=>fixture(root=>{
 const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(root,['init','-b','main']);git(root,['config','user.email','test@example.invalid']);git(root,['config','user.name','Workflow Test']);
 fs.writeFileSync(path.join(root,'README.md'),'blank shell');git(root,['add','.']);git(root,['commit','-m','baseline']);
 git(root,['remote','add','origin','https://github.com/test-student/course.git']);
 saveFile(root,{name:file,text:'synthetic checkpoint test',expectedHash:digest('')});
 fs.writeFileSync(path.join(root,'unrelated.txt'),'leave uncommitted');
 expect(()=>checkpoint(root,{name:file},(cwd,args)=>{if(args[0]==='push')throw Error('Offline');return git(cwd,args);})).toThrow('Offline');
 const revision=git(root,['rev-parse','HEAD']);expect(git(root,['show','--format=','--name-only','HEAD'])).toBe(file);
 const bare=path.join(root,'.git','test-remote.git');git(root,['init','--bare',bare]);
 const result=checkpoint(root,{name:file},(cwd,args)=>args[0]==='push'?git(cwd,['push',bare,args[2]]):git(cwd,args));
 expect(result.revision).toBe(revision);expect(git(bare,['rev-parse','refs/heads/main'])).toBe(revision);
 expect(git(root,['status','--porcelain'])).toContain('?? unrelated.txt');
}));
