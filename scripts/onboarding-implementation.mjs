export function implementationFiles(id,work,lesson){
 if(!['mission11','mission13'].includes(id))return {};
 const base=`student-work/onboarding/implementation/${id}`;
 // These three files are an export for review, never imported by the application or instructor service.
 return {
  [`${base}/physics.js`]:String(work.answer.code)+'\n',
  [`${base}/feature.json`]:JSON.stringify({id,entry:'physics.js',function:'calculate',input:lesson.codeContract.input,output:lesson.codeContract.output,contract:lesson.codeContract.description,version:lesson.version},null,2)+'\n',
  [`${base}/verification.json`]:JSON.stringify({cases:lesson.codeCases,studentBrowserEvidence:work.attempt?.result,notice:'Not independently executed by the instructor service.'},null,2)+'\n',
 };
}
