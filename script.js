const $ = (id) => document.getElementById(id);

const SAMPLE = {
  states: 'q0,q1,q2',
  symbols: '0,1',
  start: 'q0',
  outputs: 'q0:0,q1:1,q2:0',
  transitions: 'q0,0,q1\nq0,1,q2\nq1,0,q1\nq1,1,q2\nq2,0,q0\nq2,1,q1'
};

let machine = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function parseList(value) {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

function parseMachine() {
  const states = parseList($('states').value);
  const symbols = parseList($('symbols').value);
  const start = $('start').value.trim();
  const outputs = {};
  const transitions = {};

  if (!states.length) throw new Error('Enter at least one state.');
  if (!symbols.length) throw new Error('Enter at least one input symbol.');
  if (!start) throw new Error('Enter a start state.');
  if (!states.includes(start)) throw new Error('Start state must be one of the listed states.');
  if (new Set(states).size !== states.length) throw new Error('Duplicate states are not allowed.');
  if (new Set(symbols).size !== symbols.length) throw new Error('Duplicate input symbols are not allowed.');

  parseList($('outputs').value).forEach(item => {
    const parts = item.split(':');
    if (parts.length < 2) throw new Error('Output format must be state:output.');
    const state = parts[0].trim();
    const output = parts.slice(1).join(':').trim();
    if (!states.includes(state)) throw new Error(`Output contains unknown state: ${state}`);
    outputs[state] = output;
  });

  states.forEach(state => {
    if (outputs[state] === undefined || outputs[state] === '') {
      throw new Error(`Missing output for state ${state}.`);
    }
    transitions[state] = {};
  });

  const rows = $('transitions').value.split(/\n|;/).map(v => v.trim()).filter(Boolean);
  if (!rows.length) throw new Error('Enter transition rules.');

  rows.forEach(row => {
    const parts = row.split(',').map(v => v.trim());
    if (parts.length !== 3) throw new Error(`Invalid transition: ${row}. Use state,input,nextState.`);
    const [from, input, to] = parts;
    if (!states.includes(from)) throw new Error(`Unknown source state: ${from}`);
    if (!symbols.includes(input)) throw new Error(`Unknown input symbol: ${input}`);
    if (!states.includes(to)) throw new Error(`Unknown destination state: ${to}`);
    if (transitions[from][input] !== undefined) throw new Error(`Duplicate transition for ${from} with input ${input}.`);
    transitions[from][input] = to;
  });

  states.forEach(state => symbols.forEach(input => {
    if (transitions[state][input] === undefined) {
      throw new Error(`Missing transition for ${state} with input ${input}.`);
    }
  }));

  return { states, symbols, start, outputs, transitions };
}

function markFlow(step) {
  document.querySelectorAll('.flow-item').forEach((item, index) => {
    item.classList.toggle('active', index === step - 1);
    item.classList.toggle('done', index < step);
  });
}

function renderMooreTable(m) {
  let html = '<table><thead><tr><th>State</th>';
  m.symbols.forEach(s => html += `<th>Input ${escapeHtml(s)}</th>`);
  html += '<th>Output</th></tr></thead><tbody>';
  m.states.forEach(state => {
    html += `<tr><td class="state">${escapeHtml(state)}${state === m.start ? ' <span class="start-star">★</span>' : ''}</td>`;
    m.symbols.forEach(input => html += `<td>${escapeHtml(m.transitions[state][input])}</td>`);
    html += `<td><span class="out">${escapeHtml(m.outputs[state])}</span></td></tr>`;
  });
  html += '</tbody></table>';
  $('mooreTable').innerHTML = html;
}

function renderMealyTable(m) {
  let html = '<table><thead><tr><th>State</th>';
  m.symbols.forEach(s => html += `<th>Input ${escapeHtml(s)}</th>`);
  html += '</tr></thead><tbody>';
  m.states.forEach(state => {
    html += `<tr><td class="state">${escapeHtml(state)}${state === m.start ? ' <span class="start-star">★</span>' : ''}</td>`;
    m.symbols.forEach(input => {
      const next = m.transitions[state][input];
      html += `<td>${escapeHtml(next)} <span class="slash">/</span> <span class="out">${escapeHtml(m.outputs[next])}</span></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  $('mealyTable').innerHTML = html;
}

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function makeDiagram(m, isMealy) {
  const width = 980, height = 470;
  const centerX = width / 2, centerY = height / 2;
  const radius = Math.min(175, 85 + m.states.length * 14);
  const points = {};

  m.states.forEach((state, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / m.states.length);
    points[state] = { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });

  const markerId = isMealy ? 'arrowMealy' : 'arrowMoore';
  let svg = `<svg class="machine-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${isMealy ? 'Mealy' : 'Moore'} machine diagram">
    <defs><marker id="${markerId}" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#64748b"></path></marker></defs>`;

  const seen = new Set();
  m.states.forEach(from => {
    m.symbols.forEach(input => {
      const to = m.transitions[from][input];
      const p = points[from], q = points[to];
      const label = isMealy ? `${input} / ${m.outputs[to]}` : input;
      if (from === to) {
        const key = `${from}-loop`;
        const y = p.y - 36;
        svg += `<path class="edge" marker-end="url(#${markerId})" d="M ${p.x-25} ${p.y-24} C ${p.x-85} ${p.y-105}, ${p.x+85} ${p.y-105}, ${p.x+25} ${p.y-24}"></path>`;
        if (!seen.has(key)) {
          svg += `<text class="edge-label" x="${p.x}" y="${y-52}" text-anchor="middle">${escapeHtml(label)}</text>`;
          seen.add(key);
        }
        return;
      }
      const dx = q.x-p.x, dy = q.y-p.y, len = Math.hypot(dx,dy) || 1;
      const ux = dx/len, uy = dy/len;
      const px = -uy, py = ux;
      const offset = (from < to ? 10 : -10);
      const sx = p.x + ux*39, sy = p.y + uy*39;
      const ex = q.x - ux*39, ey = q.y - uy*39;
      const mx = (sx+ex)/2 + px*offset, my = (sy+ey)/2 + py*offset;
      svg += `<line class="edge" marker-end="url(#${markerId})" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"></line>`;
      svg += `<text class="edge-label" x="${mx}" y="${my-8}" text-anchor="middle">${escapeHtml(label)}</text>`;
    });
  });

  m.states.forEach(state => {
    const p = points[state];
    const fill = state === m.start ? ' node-start' : '';
    const text = isMealy ? state : `${state} / ${m.outputs[state]}`;
    svg += `<circle class="node${fill}" cx="${p.x}" cy="${p.y}" r="39"></circle>`;
    svg += `<text class="node-text" x="${p.x}" y="${p.y+5}" text-anchor="middle">${escapeHtml(text)}</text>`;
  });

  const startPoint = points[m.start];
  svg += `<line class="start-line" x1="${startPoint.x-90}" y1="${startPoint.y}" x2="${startPoint.x-43}" y2="${startPoint.y}" marker-end="url(#${markerId})"></line>`;
  svg += `<text class="start-label" x="${startPoint.x-94}" y="${startPoint.y-12}" text-anchor="end">START</text>`;
  svg += '</svg>';
  return svg;
}

function generate() {
  try {
    machine = parseMachine();
    hide('error');
    renderMooreTable(machine);
    $('mooreDiagram').innerHTML = makeDiagram(machine, false);
    show('moore-table'); show('moore-diagram'); show('convert');
    hide('mealy-table'); hide('mealy-diagram');
    $('conversionNote').textContent = '';
    $('summary').textContent = '';
    markFlow(3);
    $('moore-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    $('error').textContent = err.message;
    show('error');
  }
}

function convert() {
  if (!machine) {
    $('error').textContent = 'Generate the Moore machine first.';
    show('error');
    return;
  }
  renderMealyTable(machine);
  $('mealyDiagram').innerHTML = makeDiagram(machine, true);
  show('mealy-table'); show('mealy-diagram');
  $('summary').textContent = `${machine.states.length} states • ${machine.symbols.length} inputs • ${machine.states.length * machine.symbols.length} transitions`;
  $('conversionNote').innerHTML = '✓ Conversion complete: for every transition <b>qᵢ -- input → qⱼ</b>, the Mealy output is the output of destination state <b>qⱼ</b>.';
  markFlow(6);
  $('mealy-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fillSample() {
  Object.entries(SAMPLE).forEach(([key, value]) => $(key).value = value);
  generate();
}

function resetApp() {
  $('states').value = '';
  $('symbols').value = '';
  $('start').value = '';
  $('outputs').value = '';
  $('transitions').value = '';
  machine = null;
  ['moore-table','moore-diagram','convert','mealy-table','mealy-diagram'].forEach(hide);
  ['mooreTable','mooreDiagram','mealyTable','mealyDiagram'].forEach(id => $(id).innerHTML = '');
  $('conversionNote').textContent = '';
  $('summary').textContent = '';
  hide('error');
  markFlow(1);
  $('input').scrollIntoView({ behavior: 'smooth' });
}

$('generate').addEventListener('click', generate);
$('convertBtn').addEventListener('click', convert);
$('sample').addEventListener('click', fillSample);
$('reset').addEventListener('click', resetApp);

// Make the demo immediately usable on first open.
generate();
