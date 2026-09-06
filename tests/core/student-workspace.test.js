import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { saveFile,readFile,repository,safeFile } from '../../scripts/student-workspace.mjs';
import { digest } from '../../scripts/mission-state.mjs';
const file='student-work/missions/week06/stage01-question.md';
function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'student-save-'));try{fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
describe('student workspace boundaries',()=>{
 it('saves a draft and rejects stale overwrites',()=>fixture(root=>{const a=saveFile(root,{name:file,text:'first',expectedHash:digest('')});expect(readFile(root,file)).toBe('first');expect(()=>saveFile(root,{name:file,text:'stale',expectedHash:digest('')})).toThrow('another window');saveFile(root,{name:file,text:'second',expectedHash:a.hash});expect(readFile(root,file)).toBe('second');}));
 it('rejects protected paths, traversal and symlink escapes',()=>fixture(root=>{for(const p of ['src/core/App.jsx','../escape','src/student/physics/trim-response.js'])expect(()=>safeFile(root,p)).toThrow();fs.symlinkSync(os.tmpdir(),path.join(root,'student-work'));expect(()=>safeFile(root,file)).toThrow('Symbolic');}));
 it('refuses instructor, shared-course, and credential-bearing remotes',()=>fixture(root=>{const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init');git('remote','add','origin','https://github.com/Chula-Aero-Engineering/intro-aero-digital-twin.git');expect(()=>repository(root)).toThrow('disabled');for(const remote of ['https://github.com/me/intro-aero-digital-twin-instructor.git','https://secret@github.com/me/course.git']){git('remote','set-url','origin',remote);expect(()=>repository(root)).toThrow();}git('remote','set-url','origin','https://github.com/test-student/course.git');expect(repository(root).owner).toBe('test-student');}));
});
