// Reusable workflow metadata only. Reference answers are supplied by private verification.
const stages = [
 ['question','Engineering question',['Mission event','Aircraft condition','Required response','Engineering question','Failure']],
 ['model','Physics model',['Relationships','Sign convention','Model chain']],
 ['inputs','Inputs',['Variables','Units','Provenance']],
 ['outputs','Outputs',['Required outputs','Units','Purpose']],
 ['assumptions','Assumptions',['Assumptions','Consequences']],
 ['validity','Validity',['Supported claim','Excluded claims','Operating limits']],
 ['predictions','Predictions',['Speed prediction','Inertia prediction','Opposing moment prediction']],
 ['reference','Manual reference',['Reference case','Work','Unit check']],
 ['verification','Verification cases',['Numerical','Behavioral','Boundary']],
 ['requirements','Feature requirements',['Visual behavior','File allowlist','Limitations']],
 ['implementation','Implementation',['Interpretation approval','Test evidence']],
 ['decision','Engineering decision',['Decision','Claim','Condition','Largest uncertainty','Evidence needed next']],
].map(([id,title,headings],i)=>({id,title,number:i+1,file:`stage${String(i+1).padStart(2,'0')}-${id}.md`,headings}));
export const mission = {
 schemaVersion:1,id:'week06',title:'Flight Test 01 · Pitch control authority',previousWeek:'week05',stages,
 directory:'student-work/missions/week06',featureId:'rotation-authority',capabilityId:'control.pitch.authority',
 implementationPaths:['src/student/physics/rotation-authority.js','src/student/features/rotation-authority.feature.js','tests/student/rotation-authority.test.js'],
 requiredChecks:['student-tests','independent-verification','complete-suite','production-build'],
 challenges:['baseline','low-speed','high-inertia','opposing-moment','degraded-effector','insufficient-authority'],
};
export const aiPrompt = `Implement the completed specification exactly. First provide an Implementation Interpretation and wait for APPROVE ENGINEERING INTERPRETATION. Only modify:\n${mission.implementationPaths.join('\n')}\nPreserve previous-week files and all instructor-owned files. Export calculateRotationAuthority from the physics file and a Version 4 feature and model from the feature file. Run all tests. Do not change a test to make an incorrect implementation pass. Report assumptions and unsupported claims.`;
export function implementationSpecification(files){return mission.stages.slice(0,11).map(s=>files[s.file]||`# Missing ${s.title}`).join('\n\n---\n\n')+'\n\n# AI implementation contract\n'+aiPrompt;}
