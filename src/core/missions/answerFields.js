// Strip Markdown section separators, never the student's typed whitespace.
function ranges(text){return [...text.matchAll(/^## ([^\r\n]+)\r?\n/gm)];}
export function answerFields(text){const headings=ranges(text);return Object.fromEntries(headings.map((h,i)=>[h[1],text.slice(h.index+h[0].length,headings[i+1]?.index??text.length).replace(/\r\n/g,'\n').replace(/\n{1,2}$/,'')]));}
export function replaceAnswer(text,heading,value){const headings=ranges(text),i=headings.findIndex(h=>h[1]===heading);if(i<0)return text;const start=headings[i].index+headings[i][0].length,end=headings[i+1]?.index??text.length;return text.slice(0,start)+value+'\n\n'+text.slice(end);}
