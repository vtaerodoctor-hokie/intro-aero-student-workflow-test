// A small arithmetic language. No JavaScript evaluation, property access, or calls.
export function evaluate(expression,variables={}) {
 if(typeof expression!=='string'||expression.length>1000)throw Error('Enter an equation of at most 1,000 characters.');
 const tokens=expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[()+\-*/^]/gi)||[];
 if(tokens.join('')!==expression.replace(/\s/g,''))throw Error('Use numbers, named variables, + − * / ^ and parentheses only.');
 let i=0;
 function atom(){const t=tokens[i++];if(t==='('){const n=sum();if(tokens[i++]!==')')throw Error('Close the parentheses.');return n;}if(/^\d|^\./.test(t||''))return Number(t);if(Object.hasOwn(variables,t)&&Number.isFinite(variables[t]))return variables[t];throw Error(`Unknown quantity: ${t||'missing value'}.`);}
 function power(){let n=atom();if(['^','**'].includes(tokens[i])){i++;n=n**unary();}return n;}
 function unary(){if(tokens[i]==='-'){i++;return -unary();}if(tokens[i]==='+'){i++;return unary();}return power();}
 function product(){let n=unary();while(['*','/'].includes(tokens[i])){const op=tokens[i++],r=unary();n=op==='*'?n*r:n/r;}return n;}
 function sum(){let n=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],r=product();n=op==='+'?n+r:n-r;}return n;}
 const result=sum();if(i!==tokens.length||!Number.isFinite(result))throw Error('The equation must produce one finite number. Check missing operators and division by zero.');return result;
}
