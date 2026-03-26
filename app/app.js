
const STORAGE_KEYS = {
  section: 'obesity-tool.section',
  filter: 'obesity-tool.filter',
  search: 'obesity-tool.search',
  templates: 'obesity-tool.plan-templates'
};

function wlBar(pct) {
  if (!pct) return '<div style="color:#888;font-size:13px">Variable — specialized indication</div>';
  const w = Math.min((pct / 25) * 100, 100);
  return '<div class="wl-bar"><div class="wl-track"><div class="wl-fill" style="width:' + w + '%"></div></div><span style="font-size:13px;color:#555;min-width:50px">~' + pct + '%</span></div>';
}
function pillsHtml(d) {
  let p = '';
  if (d.approval==='long') p+='<span class="pill p-green">Long-term FDA</span>';
  else if (d.approval==='short') p+='<span class="pill p-gray">Short-term only</span>';
  if (d.route==='injectable') p+='<span class="pill p-blue">Injectable</span>';
  else p+='<span class="pill p-gray">Oral</span>';
  if (d.tags.includes('glp1')) p+='<span class="pill p-purple">GLP-1 / dual agonist</span>';
  if (d.tags.includes('schedule')) p+='<span class="pill p-red">DEA Scheduled</span>';
  if (d.tags.includes('mono')) p+='<span class="pill p-amber">Monogenic only</span>';
  return p;
}
function renderCard(d) {
  return '<div class="card"><div class="card-header" onclick="toggleCard(this)"><div style="flex:1"><div class="card-title">'+d.name+'<span style="font-size:12px;color:#888;font-weight:400;margin-left:6px">'+d.brand+'</span></div><div class="card-sub">'+d.mechShort+'</div></div><div class="card-pills">'+pillsHtml(d)+'</div><span class="chevron">▼</span></div>'
    +'<div class="card-body"><div class="section"><div class="slabel">Average weight loss</div>'+wlBar(d.wl)+'</div>'
    +'<div class="grid2"><div class="section"><div class="slabel">Indications</div><div class="sval">'+d.indications+'</div></div><div class="section"><div class="slabel">Dosing &amp; titration</div><div class="sval">'+d.dose+'</div></div></div>'
    +'<div class="section"><div class="slabel">🔴 Contraindications</div><div class="tags">'+d.contraindications.map(x=>'<span class="tag t-red">'+x+'</span>').join('')+'</div></div>'
    +'<div class="section"><div class="slabel">✅ Pre-prescribing checklist</div><div class="tags">'+d.preScreen.map(x=>'<span class="tag t-green">'+x+'</span>').join('')+'</div></div>'
    +'<div class="grid2"><div class="section"><div class="slabel">Side effects</div><div class="tags">'+d.sideEffects.map(x=>'<span class="tag t-gray">'+x+'</span>').join('')+'</div></div>'
    +'<div class="section"><div class="slabel">⚠️ Warnings</div><div class="tags">'+d.warnings.map(x=>'<span class="tag t-amber">'+x+'</span>').join('')+'</div></div></div>'
    +'<div class="section"><div class="slabel">🔵 Drug interactions</div><div class="tags">'+d.interactions.map(x=>'<span class="tag t-blue">'+x+'</span>').join('')+'</div></div>'
    +'<div class="section"><div class="slabel">📊 Ongoing monitoring</div><div class="sval">'+d.monitoring.join(' &nbsp;·&nbsp; ')+'</div></div>'
    +'<div class="note"><strong>Clinical notes:</strong> '+d.specialNotes+'</div>'
    +'</div></div>';
}
function toggleCard(hdr) {
  const body = hdr.nextElementSibling;
  const chev = hdr.querySelector('.chevron');
  body.classList.toggle('open');
  chev.classList.toggle('open');
}
function showHandout(handoutId, buttonEl) {
  document.querySelectorAll('#panel-nutrition .handout-card').forEach(card => {
    card.style.display = card.id === handoutId ? 'block' : 'none';
  });
  document.querySelectorAll('#panel-nutrition .handout-chip').forEach(btn => {
    btn.classList.toggle('active', buttonEl ? btn === buttonEl : btn.dataset.handout === handoutId);
  });
}
let currentPlanResult = null;
function printableHtmlFor(element) {
  if (!element) return '';
  const clone = element.cloneNode(true);
  clone.removeAttribute('style');
  clone.style.display = 'block';
  clone.classList.add('print-visible');
  return clone.outerHTML;
}
function printHandout(handoutId, title) {
  const handout = document.getElementById(handoutId);
  if (!handout) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('');

  printWindow.document.open();
  printWindow.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>'
      + styles
      + '<style>@page{size:auto;margin:0.5in}html,body{display:block !important;width:100% !important;min-height:auto !important}body{font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;padding:24px;color:#1a1a18;background:#fff;margin:0 !important}.btn-print,.handout-menu,.sidebar,.topbar{display:none !important}.main,.content{display:block !important;margin:0 !important;padding:0 !important;width:100% !important}.handout-card{display:block !important;border:none;padding:0;margin:0;box-shadow:none;width:100% !important}.note,.plate-item,.checklist li,tr{break-inside:avoid;page-break-inside:avoid}.handout-header,.handout-grid,.handout-plate,.handout-footer{break-inside:avoid;page-break-inside:avoid}table{width:100%;border-collapse:collapse}</style>'
      + '</head><body>'
      + printableHtmlFor(handout)
      + '</body></html>'
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
const planRules = {
  diabetes: {
    priorities: ['Emphasize lower-carbohydrate, higher-fiber meal structure and liquid-calorie review.', 'Check for diabetes-medication adjustment needs as intake and weight change.'],
    sections: ['diabetes', 'nutrition', 'concomitant'],
    handouts: [{id:'nutrition-handout', title:'Nutrition Handout'}, {id:'protein-handout', title:'Protein Guide'}],
    cautions: ['Watch for hypoglycemia if insulin or sulfonylureas are on board.'],
    meds: ['Consider incretin-based therapy when appropriate because diabetes and obesity treatment goals may align.', 'Review metformin, insulin, sulfonylurea, and other concomitant diabetes agents as weight and intake change.'],
    candidates: ['Semaglutide or tirzepatide if no contraindication and access is realistic.', 'Metformin if insulin resistance / prediabetes pattern fits and additional glycemic support is useful.']
  },
  glp1: {
    priorities: ['Protect protein, fluids, and fiber even when appetite is very low.', 'Use smaller meals and symptom-focused nutrition guidance.'],
    sections: ['nutrition', 'aom'],
    handouts: [{id:'glp1-handout', title:'GLP-1 Eating Tips'}, {id:'nutrition-handout', title:'Nutrition Handout'}],
    cautions: ['Screen for undernutrition, dehydration, constipation, and overly rapid intake reduction.'],
    meds: ['If side effects are limiting intake, think about dose pace, adherence to smaller meals, and whether escalation is too fast.', 'For patients doing well, continue protecting lean mass and hydration rather than just chasing more appetite suppression.'],
    candidates: ['Usually this is a management/tolerability issue, not a reason to add another appetite suppressant immediately.']
  },
  constipation: {
    priorities: ['Increase fluids, movement, and fiber thoughtfully.', 'Review whether total intake has become too low.'],
    sections: ['nutrition', 'sleep'],
    handouts: [{id:'constipation-handout', title:'Constipation Tips'}],
    cautions: ['Escalate if severe pain, vomiting, or inability to pass stool/gas.'],
    meds: ['Check whether incretin therapy, under-fueling, or low fluid intake is contributing before changing the whole obesity plan.'],
    candidates: ['Adjust the current plan first before assuming the patient needs a different anti-obesity medication.']
  },
  menopause: {
    priorities: ['Address sleep, appetite shifts, muscle preservation, and cardiometabolic risk together.', 'Keep protein and resistance training in the plan.'],
    sections: ['women', 'nutrition', 'activity'],
    handouts: [{id:'protein-handout', title:'Protein Guide'}, {id:'activity-handout', title:'Physical Activity Starter Plan'}],
    cautions: ['Weight change may reflect body-composition change and hormonal transition, not just calorie issues.'],
    meds: ['Think beyond calories alone: choose medications and counseling strategies that support satiety, sleep, and muscle preservation.'],
    candidates: ['GLP-1 / dual agonist therapy may still fit, but pair it with protein and resistance training planning.']
  },
  sarcopenia: {
    priorities: ['Prioritize protein and resistance training before pushing more deficit.', 'Think about lean-mass preservation, not just scale loss.'],
    sections: ['bodycomp', 'nutrition', 'activity'],
    handouts: [{id:'protein-handout', title:'Protein Guide'}, {id:'activity-handout', title:'Physical Activity Starter Plan'}],
    cautions: ['Avoid aggressive under-fueling in older adults or low-muscle-mass patients.'],
    meds: ['Be more careful with highly effective AOMs if intake is falling too low or lean mass is dropping.', 'Use body-composition follow-up to judge whether the current plan is muscle-sparing.'],
    candidates: ['If using semaglutide or tirzepatide, explicitly add protein and strength-preservation counseling rather than relying on the drug alone.']
  },
  neurodiversity: {
    priorities: ['Simplify routines, reduce decision fatigue, and use repeatable food/activity patterns.', 'Account for sensory preferences and executive-function barriers.'],
    sections: ['psychiatric', 'behavioral', 'nutrition'],
    handouts: [{id:'nutrition-handout', title:'Nutrition Handout'}],
    cautions: ['A realistic routine beats an ideal plan with high cognitive load.'],
    meds: ['Medication plans may succeed or fail based on routine complexity, sensory burden, and adherence friction rather than efficacy alone.'],
    candidates: ['Prefer simpler regimens and highly repeatable routines over plans with a lot of moving parts.']
  },
  restaurant: {
    priorities: ['Pre-decide meals, reduce liquid calories, and use backup travel foods.', 'Focus on repeatable strategies rather than perfection.'],
    sections: ['nutrition'],
    handouts: [{id:'restaurant-handout', title:'Restaurant and Travel Tips'}],
    cautions: ['Frequent restaurant intake often hides calories in beverages, sauces, and portions.'],
    meds: ['If adherence is the issue, avoid assuming medication failure before addressing environment and decision structure.'],
    candidates: ['Keep the medication plan simple and focus first on travel/restaurant structure.']
  },
  low_activity: {
    priorities: ['Start with short bouts of walking or seated movement and add strength work twice weekly.', 'Frame progress around consistency, not intensity.'],
    sections: ['activity', 'bodycomp'],
    handouts: [{id:'activity-handout', title:'Physical Activity Starter Plan'}],
    cautions: ['Mobility limits may call for chair work, aquatic therapy, or PT referral.'],
    meds: ['If lean-mass risk is present, pair any effective medication plan with explicit resistance-training counseling.'],
    candidates: ['Do not rely on medication alone when deconditioning is a major part of the problem.']
  },
  bariatric: {
    priorities: ['Review protein intake, supplementation, GI symptoms, and lab surveillance.', 'Tailor nutrition and medication decisions to surgery history.'],
    sections: ['surgery', 'nutrients', 'labs'],
    handouts: [{id:'protein-handout', title:'Protein Guide'}],
    cautions: ['Micronutrient deficiency risk remains central long after surgery.'],
    meds: ['Medication tolerability, absorption, and nutrition status all matter after bariatric procedures.', 'Do not let weight regain management overshadow micronutrient surveillance.'],
    candidates: ['Choose medication plans with bariatric anatomy, GI tolerance, and protein status in mind.']
  },
  emotional: {
    priorities: ['Identify the highest-risk time of day and create one concrete replacement plan.', 'Keep counseling behaviorally specific and nonjudgmental.'],
    sections: ['behavioral', 'psychiatric', 'nutrition'],
    handouts: [{id:'nutrition-handout', title:'Nutrition Handout'}, {id:'restaurant-handout', title:'Restaurant and Travel Tips'}],
    cautions: ['A structured plan usually works better than relying on restraint late in the day.'],
    meds: ['Consider whether the eating pattern is more craving-, reward-, or mood-driven when thinking about medication options.', 'Psychiatric and concomitant-medication review may matter as much as calorie counseling here.'],
    candidates: ['Naltrexone / bupropion may be worth reviewing when craving/reward eating and mood issues are central.', 'Topiramate may fit when evening cravings, binge-like eating, or migraine coexist.']
  },
  nutrition_plan: {
    priorities: ['Identify the top 1–2 nutrition barriers and prescribe a specific, achievable change.', 'Review protein target, meal structure, and liquid calorie sources.'],
    sections: ['nutrition'],
    handouts: [{id:'nutrition-handout', title:'Nutrition Guide'}, {id:'protein-handout', title:'Protein Guide'}, {id:'lifestyle-handout', title:'Lifestyle Prescription'}],
    cautions: [],
    meds: [],
    candidates: []
  },
  activity_plan: {
    priorities: ['Prescribe activity concretely: type, days/week, and minutes per session.', 'Address the primary barrier before giving generic advice.', 'Add resistance training 2x/week — especially if on AOM therapy or sarcopenia risk.'],
    sections: ['activity'],
    handouts: [{id:'activity-handout', title:'Activity Starter Plan'}, {id:'lifestyle-handout', title:'Lifestyle Prescription'}],
    cautions: [],
    meds: [],
    candidates: []
  },
  start_phent: {
    priorities: ['Review take-in-morning counseling and DEA Schedule IV restrictions.', 'Set expectations: 5–8% weight loss, stimulant side effects.', 'Check BP and HR today before dispensing.'],
    sections: ['aom'],
    handouts: [{id:'phent-handout', title:'Phentermine Patient Guide'}],
    cautions: ['Hold if BP >145/90 or HR >100 at rest.', 'DEA Schedule IV — cannot phone in; check state e-prescribing rules.', 'No MAO inhibitors within 14 days.'],
    meds: ['Phentermine selected — confirm no cardiovascular contraindication.'],
    candidates: []
  },
  start_qsymia: {
    priorities: ['Enroll patient in Qsymia REMS before prescribing.', 'Confirm negative pregnancy test and two forms of effective contraception.', 'Review titration schedule (3.75/23 mg start → evaluate at 14 weeks).'],
    sections: ['aom'],
    handouts: [{id:'qsymia-handout', title:'Qsymia Patient Guide'}],
    cautions: ['REMS required — certified pharmacy only.', 'Teratogenic (cleft palate risk) — contraception is critical.', 'Monitor bicarb for metabolic acidosis (topiramate effect).', 'Word-finding difficulty and paresthesias are common — counsel proactively.'],
    meds: ['Start Qsymia 3.75/23 mg qAM x 14 DAYS, then 7.5/46 mg; evaluate at 12 weeks — escalate or stop if <3% weight loss.'],
    candidates: []
  },
  start_contrave: {
    priorities: ['Review 4-week titration schedule — take with food to reduce nausea.', 'Critical warning: naltrexone blocks opioid pain medications — alert all providers.', 'Screen for depression/suicidality at this visit and follow-up.'],
    sections: ['aom'],
    handouts: [{id:'contrave-handout', title:'Contrave Patient Guide'}],
    cautions: ['No opioids while on naltrexone — patient must inform ER and surgeons.', 'Seizure risk: avoid alcohol withdrawal; no bulimia/anorexia active.', 'Black box warning: suicidality — monitor closely first 4 weeks.'],
    meds: ['Start Contrave 1 tab (8/90 mg) qAM x 1 week per titration.'],
    candidates: []
  },
  start_orlistat: {
    priorities: ['Set dietary fat guidance: keep fat <30% per meal to minimize GI effects.', 'Frame GI effects as dietary feedback — a teaching tool, not a side effect.', 'Prescribe fat-soluble vitamin supplement (separate by ≥2 hours).'],
    sections: ['aom'],
    handouts: [{id:'orlistat-handout', title:'Orlistat Patient Guide'}],
    cautions: ['Check INR within 4 weeks if on warfarin.', 'Levothyroxine: separate by ≥4 hours.', 'Kidney stone risk (oxalate) — hydrate well.'],
    meds: ['Orlistat 120 mg TID with each fat-containing meal (Xenical) or 60 mg OTC (Alli).'],
    candidates: []
  },
  start_saxenda: {
    priorities: ['Review daily injection technique — return demonstration preferred.', 'Nausea peaks during titration — smaller, lower-fat meals help.', 'Set realistic expectations: 5–7% expected weight loss.'],
    sections: ['aom'],
    handouts: [{id:'saxenda-handout', title:'Saxenda Patient Guide'}],
    cautions: ['MTC boxed warning — confirm no personal/family history.', 'Check resting HR — caution if >100 bpm.', 'Pen storage: refrigerate; room temp up to 30 days after first use.'],
    meds: ['Saxenda: start 0.6 mg SC daily, advance by 0.6 mg weekly to 3.0 mg.'],
    candidates: []
  },
  start_wegovy: {
    priorities: ['Review weekly injection technique.', 'Emphasize protein (≥1.2 g/kg IBW) and resistance training — GLP-1s cause fat AND lean mass loss.', 'Counsel on nausea during titration — slow the pace if needed.'],
    sections: ['aom'],
    handouts: [{id:'wegovy-handout', title:'Wegovy Patient Guide'}, {id:'protein-handout', title:'Protein Guide'}],
    cautions: ['MTC boxed warning reviewed.', 'PA/insurance status — confirm coverage before patient leaves.', 'No dual GLP-1 use — discontinue Saxenda/Ozempic first.'],
    meds: ['Wegovy: start 0.25 mg SC weekly, advance every 4 weeks, target 2.4 mg.'],
    candidates: []
  },
  start_zepbound: {
    priorities: ['Review weekly injection technique.', 'Protein and resistance training are non-negotiable adjuncts — lean mass loss is proportionally higher at large weight losses.', 'Counsel on constipation proactively — common at higher doses.'],
    sections: ['aom'],
    handouts: [{id:'zepbound-handout', title:'Zepbound Patient Guide'}, {id:'protein-handout', title:'Protein Guide'}],
    cautions: ['MTC boxed warning reviewed.', 'PA/insurance status — confirm before patient leaves.', 'Missed dose: take within 4 days; if >4 days, skip and resume next scheduled day.', 'Prior GLP-1 (Saxenda, Wegovy, Ozempic): discontinue before starting.'],
    meds: ['Zepbound: start 2.5 mg SC weekly, advance every 4 weeks, target 5–15 mg.'],
    candidates: []
  }
};
function uniq(arr) {
  return [...new Set(arr)];
}
function getPlanTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.templates) || '[]');
  } catch {
    return [];
  }
}
function setPlanTemplates(templates) {
  localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
}
function renderTemplates() {
  const container = document.getElementById('template-list');
  if (!container) return;
  const templates = getPlanTemplates();
  if (!templates.length) {
    container.innerHTML = '<div class="note" style="margin-bottom:0">No saved templates yet.</div>';
    return;
  }
  container.innerHTML = templates.map((template, idx) =>
    '<div class="template-item">'
      + '<div><div class="template-name">' + template.name + '</div><div class="template-meta">' + template.factors.map(selectedFactorLabel).join(', ') + '</div></div>'
      + '<div class="template-actions"><button class="fbtn" type="button" onclick="loadPlanTemplate(' + idx + ')">Load</button><button class="fbtn" type="button" onclick="deletePlanTemplate(' + idx + ')">Delete</button></div>'
    + '</div>'
  ).join('');
}
function savePlanTemplate() {
  const input = document.getElementById('template-name');
  const selected = Array.from(document.querySelectorAll('#panel-planner input[type="checkbox"]:checked')).map(node => node.value);
  if (!input || !input.value.trim() || !selected.length) return;
  const templates = getPlanTemplates();
  templates.unshift({name: input.value.trim(), factors: selected});
  setPlanTemplates(templates.slice(0, 12));
  input.value = '';
  renderTemplates();
}
function setPlannerSelections(factors) {
  document.querySelectorAll('#panel-planner input[type="checkbox"]').forEach(node => {
    node.checked = factors.includes(node.value);
  });
}
function clearPlanFactors() {
  setPlannerSelections([]);
  buildPlan();
}
function applyPlanPreset(factors) {
  setPlannerSelections(factors);
  buildPlan();
}
function loadPlanTemplate(index) {
  const templates = getPlanTemplates();
  const template = templates[index];
  if (!template) return;
  setPlannerSelections(template.factors);
  buildPlan();
}
function deletePlanTemplate(index) {
  const templates = getPlanTemplates();
  templates.splice(index, 1);
  setPlanTemplates(templates);
  renderTemplates();
}
function linkButtons(items, mode) {
  return items.map(item => {
    if (mode === 'section') return '<button class="fbtn" type="button" onclick="showSection(\'' + item + '\')">' + (sectionTitles[item] || item) + '</button>';
    return '<button class="fbtn" type="button" onclick="showSection(\'nutrition\'); showHandout(\'' + item.id + '\', null)">' + item.title + '</button>';
  }).join('');
}
function selectedFactorLabel(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function renderVisitSummary(selected, priorities, sections, handouts, cautions, meds, candidates) {
  const wrap = document.getElementById('visit-summary-wrap');
  const card = document.getElementById('visit-summary-card');
  if (!wrap || !card) return;

  const followUp = [
    'Reassess adherence to the top 1-2 counseling goals.',
    'Check tolerance, hydration, protein intake, and bowel pattern if on AOM therapy.',
    'Update handout needs and next-step exercise/nutrition targets.'
  ];

  card.innerHTML =
    '<div class="visit-summary-meta">Visit summary generated from the Plan Builder</div>'
    + '<p class="sh">Main problem list</p><ul class="planner-list">' + selected.map(item => '<li>' + selectedFactorLabel(item) + '</li>').join('') + '</ul>'
    + '<div class="visit-summary-grid">'
    + '<div class="visit-summary-block"><p class="sh">Top counseling goals</p><ul class="planner-list">' + priorities.map(item => '<li>' + item + '</li>').join('') + '</ul></div>'
    + '<div class="visit-summary-block"><p class="sh">Medication / clinical cautions</p><ul class="planner-list">' + cautions.map(item => '<li>' + item + '</li>').join('') + '</ul></div>'
    + '</div>'
    + '<div class="visit-summary-grid">'
    + '<div class="visit-summary-block"><p class="sh">Sections to review</p><ul class="planner-list">' + sections.map(item => '<li>' + (sectionTitles[item] || item) + '</li>').join('') + '</ul></div>'
    + '<div class="visit-summary-block"><p class="sh">Handouts to use</p><ul class="planner-list">' + handouts.map(item => '<li>' + item.title + '</li>').join('') + '</ul></div>'
    + '</div>'
    + '<p class="sh">Medication takeaways</p><ul class="planner-list">' + meds.map(item => '<li>' + item + '</li>').join('') + '</ul>'
    + '<p class="sh">Possible meds to review</p><ul class="planner-list">' + candidates.map(item => '<li>' + item + '</li>').join('') + '</ul>'
    + '<p class="sh">Follow-up focus</p><ul class="planner-list">' + followUp.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  wrap.style.display = 'block';
}
function printVisitSummary() {
  const summary = document.getElementById('visit-summary-card');
  if (!summary || !summary.innerHTML.trim()) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('');

  printWindow.document.open();
  printWindow.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Visit Summary</title>'
      + styles
      + '<style>@page{size:auto;margin:0.5in}html,body{display:block !important;width:100% !important;min-height:auto !important}body{font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;padding:24px;color:#1a1a18;background:#fff;margin:0 !important}.btn-print,.handout-menu,.sidebar,.topbar{display:none !important}.main,.content{display:block !important;margin:0 !important;padding:0 !important;width:100% !important}.visit-summary-card{display:block !important;border:none;padding:0;margin:0;background:#fff;width:100% !important}.planner-list li{break-inside:avoid;page-break-inside:avoid}.visit-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}table{width:100%;border-collapse:collapse}</style>'
      + '</head><body>'
      + summary.outerHTML
      + '</body></html>'
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
function printSelectedPlan() {
  if (!currentPlanResult) return;

  const summary = document.getElementById('visit-summary-card');
  if (!summary || !summary.innerHTML.trim()) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('');

  const handoutHtml = currentPlanResult.handouts.map(item => {
    const handout = document.getElementById(item.id);
    return handout ? '<div class="plan-page-break"></div>' + printableHtmlFor(handout) : '';
  }).join('');
  const includedHandouts = currentPlanResult.handouts.map(item => '<li>' + item.title + '</li>').join('');

  const printWindow = window.open('', '_blank', 'width=1000,height=1200');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Selected Plan</title>'
      + styles
      + '<style>@page{size:auto;margin:0.5in}html,body{display:block !important;width:100% !important;min-height:auto !important}body{font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;padding:24px;color:#1a1a18;background:#fff;margin:0 !important}.btn-print,.handout-menu,.sidebar,.topbar{display:none !important}.main,.content{display:block !important;margin:0 !important;padding:0 !important;width:100% !important}.visit-summary-card,.handout-card{display:block !important;border:none;padding:0;margin:0;background:#fff;box-shadow:none;width:100% !important}.print-visible{display:block !important}.planner-list li,.note,.plate-item,.checklist li,tr{break-inside:avoid;page-break-inside:avoid}.visit-summary-grid,.handout-grid,.handout-plate{display:grid;grid-template-columns:1fr 1fr;gap:16px}.plan-page-break{page-break-before:always;height:0}.plan-bundle-note{display:block !important;margin:16px 0 20px;width:100% !important}.plan-bundle-note h3{font-size:16px;margin-bottom:8px}table{width:100%;border-collapse:collapse}</style>'
      + '</head><body>'
      + summary.outerHTML
      + '<div class="plan-bundle-note"><h3>Included handouts in this print bundle</h3><ul class="planner-list">' + includedHandouts + '</ul></div>'
      + handoutHtml
      + '</body></html>'
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
function buildPlan() {
  const selected = Array.from(document.querySelectorAll('#panel-planner input[type="checkbox"]:checked')).map(input => input.value);
  const output = document.getElementById('plan-output');
  const wrap = document.getElementById('visit-summary-wrap');
  if (!selected.length) {
    output.innerHTML = '<div class="coming-soon" style="padding:28px"><div class="cs-icon">🧭</div><h3>Choose patient factors</h3><p>The tool will suggest the most useful counseling targets, sections to open, and handouts to print.</p></div>';
    if (wrap) wrap.style.display = 'none';
    currentPlanResult = null;
    return;
  }

  const priorities = uniq(selected.flatMap(key => planRules[key].priorities));
  const sections = uniq(selected.flatMap(key => planRules[key].sections));
  const handouts = uniq(selected.flatMap(key => planRules[key].handouts.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
  const cautions = uniq(selected.flatMap(key => planRules[key].cautions));
  const meds = uniq(selected.flatMap(key => planRules[key].meds || []));
  const candidates = uniq(selected.flatMap(key => planRules[key].candidates || []));
  currentPlanResult = {selected, priorities, sections, handouts, cautions, meds, candidates};

  output.innerHTML =
    '<div class="note"><strong>Selected factors:</strong> ' + selected.map(selectedFactorLabel).join(', ') + '</div>'
    + '<p class="sh">Top counseling priorities</p><ul class="planner-list">' + priorities.map(item => '<li>' + item + '</li>').join('') + '</ul>'
    + '<p class="sh">Sections to review</p><div class="planner-actions">' + linkButtons(sections, 'section') + '</div>'
    + '<p class="sh" style="margin-top:14px">Handouts to print</p><div class="planner-actions">' + linkButtons(handouts, 'handout') + handouts.map(item => '<button class="fbtn" type="button" onclick="printHandout(\'' + item.id + '\',\'' + item.title + '\')">Print ' + item.title + '</button>').join('') + '</div>'
    + '<p class="sh" style="margin-top:14px">Medication takeaways</p><ul class="planner-list">' + meds.map(item => '<li>' + item + '</li>').join('') + '</ul>'
    + '<p class="sh" style="margin-top:14px">Possible meds to review</p><ul class="planner-list">' + candidates.map(item => '<li>' + item + '</li>').join('') + '</ul>'
    + '<p class="sh" style="margin-top:14px">Medication / clinical cautions</p><ul class="planner-list">' + cautions.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  renderVisitSummary(selected, priorities, sections, handouts, cautions, meds, candidates);
}
let activeFilter = 'all', searchVal = '';
function filterMatch(d) {
  if (activeFilter==='long' && d.approval!=='long') return false;
  if (activeFilter==='short' && d.approval!=='short') return false;
  if (activeFilter==='injectable' && d.route!=='injectable') return false;
  if (activeFilter==='glp1' && !d.tags.includes('glp1')) return false;
  if (activeFilter==='schedule' && !d.tags.includes('schedule')) return false;
  if (activeFilter==='mono' && !d.tags.includes('mono')) return false;
  if (searchVal) {
    const q = searchVal.toLowerCase();
    const blob = [d.name,d.brand,d.mechShort,d.indications,...d.contraindications,...d.sideEffects,...d.warnings,...d.interactions,...d.preScreen,d.specialNotes].join(' ').toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}
function render() {
  const filtered = drugs.filter(filterMatch);
  document.getElementById('drug-cards').innerHTML = filtered.length ? filtered.map(renderCard).join('') : '<div class="no-results">No medications match.</div>';
  document.getElementById('count').textContent = 'Showing ' + filtered.length + ' of ' + drugs.length + ' medications';
}
document.querySelectorAll('#filter-row .fbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#filter-row .fbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.f;
    localStorage.setItem(STORAGE_KEYS.filter, activeFilter);
    render();
  });
});
document.getElementById('search').addEventListener('input', e => {
  searchVal = e.target.value.trim();
  localStorage.setItem(STORAGE_KEYS.search, searchVal);
  render();
});

// ——— NAVIGATION ———
const sectionTitles = {
  aom:'Anti-Obesity Medications', offlabel:'Off-Label Options', concomitant:'Concomitant Medications', phenotype:'Phenotype Matching',
  trials:'Trial Data (STEP & SURMOUNT)', pearls:'Clinical Pearls',
  disease:'Disease of Obesity', classification:'Classification & Staging',
  adiposopathy:'Adiposopathy & Fat Mass Disease', metabolic:'Metabolic Adaptation',
  hxpe:'History & Physical Exam', labs:'Labs & Diagnostics', bodycomp:'Body Composition',
  nutrition:'Nutrition Therapy', activity:'Physical Activity', behavioral:'Behavioral Modification',
  psychiatric:'Obesity & Psychiatric Disease', diabetes:'Diabetes & Blood Glucose',
  cardio:'Cardiovascular Disease', masld:'MASLD / Liver Disease', sleep:'Sleep & OSA',
  women:'Obesity & Women', surgery:'Bariatric Surgery', endoscopic:'Endoscopic Procedures',
  nutrients:'Post-Bariatric Nutrients', notes:'Note Templates', planner:'Plan Builder', clinic:'Clinic Setup & SOPs', pdfs:'PDF Library', billing:'Billing & Coding'
};
let currentSection = 'aom';
function showSection(name) {
  document.querySelectorAll('.section-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.style.display = 'block';
  const navItem = document.querySelector('[data-section="' + name + '"]');
  if (navItem) navItem.classList.add('active');
  document.getElementById('section-title').textContent = sectionTitles[name] || name;
  document.title = (sectionTitles[name] || name) + ' | Obesity Medicine Knowledge Base';
  const searchBox = document.getElementById('search-box');
  searchBox.style.display = name === 'aom' ? 'block' : 'none';
  currentSection = name;
  localStorage.setItem(STORAGE_KEYS.section, name);
}
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => showSection(item.dataset.section));
});

const savedFilter = localStorage.getItem(STORAGE_KEYS.filter);
const savedSearch = localStorage.getItem(STORAGE_KEYS.search);
const savedSection = localStorage.getItem(STORAGE_KEYS.section);

if (savedFilter && document.querySelector('.fbtn[data-f="' + savedFilter + '"]')) {
  activeFilter = savedFilter;
  document.querySelectorAll('#filter-row .fbtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.f === savedFilter);
  });
}

if (savedSearch) {
  searchVal = savedSearch;
  document.getElementById('search').value = savedSearch;
}

render();
renderTemplates();
showSection(savedSection || currentSection);

document.querySelectorAll('#panel-planner input[type="checkbox"]').forEach(node => {
  node.addEventListener('change', () => {
    buildPlan();
  });
});

// Note Templates tab switching
document.querySelectorAll('.note-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.note-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.note-template').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const target = document.getElementById('note-' + tab.dataset.note);
    if (target) target.classList.add('active');
  });
});

function copyNoteTemplate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.closest('.note-template').querySelector('.btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#22c55e';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
  });
}
