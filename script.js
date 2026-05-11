function determinant3x3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function replaceColumn(matrix, columnIndex, values) {
  return matrix.map((row, rowIndex) => {
    const copy = [...row];
    copy[columnIndex] = values[rowIndex];
    return copy;
  });
}

function formatCoefficient(value, variable) {
  const n = Number(value);
  if (n === 0) return '';
  if (variable === 'x') return n === 1 ? 'x' : n === -1 ? '-x' : `${n}x`;
  if (variable === 'y') return n === 1 ? 'y' : n === -1 ? '-y' : `${n}y`;
  return n === 1 ? 'z' : n === -1 ? '-z' : `${n}z`;
}

function buildEquation(a, b, c, d) {
  const parts = [formatCoefficient(a, 'x'), formatCoefficient(b, 'y'), formatCoefficient(c, 'z')]
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.startsWith('-') ? ` - ${part.slice(1)}` : ` + ${part}`));
  return `${parts.join('')} = ${d}`;
}

function solveSystem() {
  const a1 = Number(document.getElementById('a1').value);
  const b1 = Number(document.getElementById('b1').value);
  const c1 = Number(document.getElementById('c1').value);
  const d1 = Number(document.getElementById('d1').value);
  const a2 = Number(document.getElementById('a2').value);
  const b2 = Number(document.getElementById('b2').value);
  const c2 = Number(document.getElementById('c2').value);
  const d2 = Number(document.getElementById('d2').value);
  const a3 = Number(document.getElementById('a3').value);
  const b3 = Number(document.getElementById('b3').value);
  const c3 = Number(document.getElementById('c3').value);
  const d3 = Number(document.getElementById('d3').value);

  const matrix = [
    [a1, b1, c1],
    [a2, b2, c2],
    [a3, b3, c3],
  ];
  const constants = [d1, d2, d3];

  const det = determinant3x3(matrix);
  const stepsEl = document.getElementById('steps');
  const solutionEl = document.getElementById('solution');
  const numberLineEl = document.getElementById('numberLine');
  stepsEl.innerHTML = '';
  solutionEl.innerHTML = '';
  numberLineEl.innerHTML = '';

  const equationText = [
    buildEquation(a1, b1, c1, d1),
    buildEquation(a2, b2, c2, d2),
    buildEquation(a3, b3, c3, d3),
  ];

  const eqStep = document.createElement('div');
  eqStep.className = 'step-item';
  eqStep.innerHTML = `<strong>已輸入方程式：</strong><br>${equationText.join('<br>')}`;
  stepsEl.appendChild(eqStep);

  if (det === 0) {
    const errorStep = document.createElement('div');
    errorStep.className = 'step-item';
    errorStep.innerHTML = '<strong>無解或無唯一解：</strong>這組係數的行列式為 0，無法用此方法求出唯一解。請調整方程式。</div>';
    stepsEl.appendChild(errorStep);
    return;
  }

  const xDet = determinant3x3(replaceColumn(matrix, 0, constants));
  const yDet = determinant3x3(replaceColumn(matrix, 1, constants));
  const zDet = determinant3x3(replaceColumn(matrix, 2, constants));

  const x = xDet / det;
  const y = yDet / det;
  const z = zDet / det;

  const stepList = [
    `計算原始係數行列式: D = ${det}`,
    `將常數項代入 x 的位置：D_x = ${xDet}`,
    `將常數項代入 y 的位置：D_y = ${yDet}`,
    `將常數項代入 z 的位置：D_z = ${zDet}`,
    `因此 x = D_x / D = ${x.toFixed(6)}，y = D_y / D = ${y.toFixed(6)}，z = D_z / D = ${z.toFixed(6)}`,
  ];

  stepList.forEach((text) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.textContent = text;
    stepsEl.appendChild(stepEl);
  });

  const solutionHtml = `
    <p><strong>解答：</strong></p>
    <p>x = <strong>${x}</strong></p>
    <p>y = <strong>${y}</strong></p>
    <p>z = <strong>${z}</strong></p>
  `;
  solutionEl.innerHTML = solutionHtml;

  renderNumberLine(numberLineEl, x, y, z);
}

function renderNumberLine(container, x, y, z) {
  const values = [x, y, z].map((value) => Number(value));
  const min = Math.floor(Math.min(...values, 0)) - 1;
  const max = Math.ceil(Math.max(...values, 0)) + 1;
  const range = max - min;
  const line = document.createElement('div');
  line.className = 'number-line-wrap';
  line.innerHTML = `<strong>數線</strong>`;

  const bar = document.createElement('div');
  bar.className = 'number-line';

  for (let i = min; i <= max; i += 1) {
    const position = ((i - min) / range) * 100;
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.left = `${position}%`;

    const label = document.createElement('div');
    label.className = 'tick-label';
    label.style.left = `${position}%`;
    label.textContent = i;

    bar.appendChild(tick);
    bar.appendChild(label);
  }

  const points = [
    { name: 'x', value: x, color: '#2563eb' },
    { name: 'y', value: y, color: '#10b981' },
    { name: 'z', value: z, color: '#ef4444' },
  ];

  points.forEach((point) => {
    const position = ((point.value - min) / range) * 100;
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.textContent = `${point.name} = ${point.value}`;
    marker.style.left = `${position}%`;
    marker.style.background = point.color;
    bar.appendChild(marker);
  });

  line.appendChild(bar);
  container.appendChild(line);
}

document.getElementById('solveButton').addEventListener('click', solveSystem);
window.addEventListener('DOMContentLoaded', solveSystem);
