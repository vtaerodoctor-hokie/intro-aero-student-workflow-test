import { it,expect } from 'vitest';
import { answerFields,replaceAnswer } from '../../src/core/missions/answerFields.js';
it('preserves every keystroke including spaces, tabs, and blank lines',()=>{
 let text='# Stage\n\n## First\n\n## Second\nOther answer\n\n';
 const typed='Two words  \n\nNext paragraph\t ';
 for(let i=1;i<=typed.length;i++){text=replaceAnswer(text,'First',typed.slice(0,i));expect(answerFields(text).First).toBe(typed.slice(0,i));expect(answerFields(text).Second).toBe('Other answer');}
 expect(answerFields(JSON.parse(JSON.stringify(text))).First).toBe(typed);
});
it('keeps final-section whitespace and does not accumulate separator lines',()=>{
 let text='## Last\n\n';for(let i=0;i<10;i++)text=replaceAnswer(text,'Last',' \n\n');expect(answerFields(text).Last).toBe(' \n\n');expect(text).toBe('## Last\n \n\n\n\n');
});
