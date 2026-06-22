/**
 * 多功能方程式求解與幾何視覺化平台 - 核心邏輯腳本
 * 
 * 本腳本負責：
 * 1. 頁籤切換與動態表單生成。
 * 2. 一元一次、二元聯立、三元聯立方程式求解（克拉瑪公式與基礎代數）。
 * 3. 輸出詳細的中文化教學解題步驟。
 * 4. 呼叫 Chart.js (2D) 與 Plotly.js (3D) 繪製對應的幾何圖形。
 */

// 全域狀態管理
let currentTab = 3; // 目前選取的頁籤模式 (1=一元, 2=二元, 3=三元)
let systemSolution = null; // 儲存目前的解
let equationCoefficients = null; // 儲存輸入的係數
let equationChartInstance = null; // Chart.js 的實例，用以重新整理圖表時銷毀舊圖表

/**
 * 網頁載入完成後的初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  // 預設渲染三元一次輸入框並計算
  switchEquationType(3);
  
  // 綁定計算按鈕與選單變更事件
  document.getElementById('solveButton').addEventListener('click', solveSystem);
  document.getElementById('chartModeSelect').addEventListener('change', updateChartUI);
  document.getElementById('chartVarSelect').addEventListener('change', updateChartUI);
  document.getElementById('projectionSelect').addEventListener('change', updateChartUI);
});

/**
 * 切換方程式類型並動態生成對應的 HTML 輸入表單
 * @param {number} type 方程式類型 (1=一元, 2=二元, 3=三元)
 */
function switchEquationType(type) {
  currentTab = type;
  systemSolution = null;
  equationCoefficients = null;

  // 更新頁籤 Active 樣式
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab${type}`).classList.add('active');

  // 取得輸入表單容器並清空
  const container = document.getElementById('equationInputsContainer');
  container.innerHTML = '';

  // 根據選擇的類型動態生成輸入表單，並填入預設值
  if (type === 1) {
    // 一元一次方程式： ax + b = c (預設為 6x + 5 = 14)
    container.innerHTML = `
      <div class="equation-row">
        <label>輸入一元一次方程式 (格式：a x + b = c)</label>
        <div class="inputs">
          <input type="number" id="eq1_a" value="6" /> x +
          <input type="number" id="eq1_b" value="5" /> =
          <input type="number" id="eq1_c" value="14" />
        </div>
      </div>
    `;
  } else if (type === 2) {
    // 二元一次聯立方程式 (預設解為 x=3, y=2)
    container.innerHTML = `
      <div class="equation-grid equation-grid-2">
        <div>
          <label>方程式 1 (格式：a₁ x + b₁ y = c₁)</label>
          <div class="inputs">
            <input type="number" id="eq2_a1" value="2" /> x +
            <input type="number" id="eq2_b1" value="1" /> y =
            <input type="number" id="eq2_c1" value="8" />
          </div>
        </div>
        <div>
          <label>方程式 2 (格式：a₂ x + b₂ y = c₂)</label>
          <div class="inputs">
            <input type="number" id="eq2_a2" value="1" /> x +
            <input type="number" id="eq2_b2" value="-1" /> y =
            <input type="number" id="eq2_c2" value="1" />
          </div>
        </div>
      </div>
    `;
  } else {
    // 三元一次聯立方程式 (預設解為 x=6, y=4, z=2)
    container.innerHTML = `
      <div class="equation-grid equation-grid-3">
        <div>
          <label>方程式 1 (a₁x + b₁y + c₁z = d₁)</label>
          <div class="inputs">
            <input type="number" id="a1" value="1" /> x +
            <input type="number" id="b1" value="1" /> y +
            <input type="number" id="c1" value="1" /> z =
            <input type="number" id="d1" value="12" />
          </div>
        </div>
        <div>
          <label>方程式 2 (a₂x + b₂y + c₂z = d₂)</label>
          <div class="inputs">
            <input type="number" id="a2" value="1" /> x +
            <input type="number" id="b2" value="-1" /> y +
            <input type="number" id="c2" value="0" /> z =
            <input type="number" id="d2" value="2" />
          </div>
        </div>
        <div>
          <label>方程式 3 (a₃x + b₃y + c₃z = d₃)</label>
          <div class="inputs">
            <input type="number" id="a3" value="1" /> x +
            <input type="number" id="b3" value="0" /> y +
            <input type="number" id="c3" value="-1" /> z =
            <input type="number" id="d3" value="4" />
          </div>
        </div>
      </div>
    `;
  }

  // 重新整理輸出步驟與隱藏圖表
  document.getElementById('steps').innerHTML = '';
  document.getElementById('solution').innerHTML = '';
  document.getElementById('chartControls').style.display = 'none';
  document.getElementById('chartContainer').style.display = 'none';
  
  if (equationChartInstance) {
    equationChartInstance.destroy();
    equationChartInstance = null;
  }
  document.getElementById('plotlyChart').innerHTML = '';

  // 動態切換後自動進行計算
  solveSystem();
}

/**
 * 主計算控制程序：依據當前選取的頁籤讀取數值、計算、生成步驟並呼叫圖表渲染
 */
function solveSystem() {
  const stepsEl = document.getElementById('steps');
  const solutionEl = document.getElementById('solution');
  stepsEl.innerHTML = '';
  solutionEl.innerHTML = '';

  // 隱藏並清空圖表區域，避免舊殘影
  document.getElementById('chartControls').style.display = 'none';
  document.getElementById('chartContainer').style.display = 'none';
  if (equationChartInstance) {
    equationChartInstance.destroy();
    equationChartInstance = null;
  }
  document.getElementById('plotlyChart').innerHTML = '';

  // 執行對應的求解邏輯
  if (currentTab === 1) {
    solveOneVariable();
  } else if (currentTab === 2) {
    solveTwoVariables();
  } else {
    solveThreeVariables();
  }
}

/**
 * ----------------------------------------------------
 * 一元一次方程式求解與 2D 直線繪製邏輯
 * ----------------------------------------------------
 */
function solveOneVariable() {
  const a = Number(document.getElementById('eq1_a').value);
  const b = Number(document.getElementById('eq1_b').value);
  const c = Number(document.getElementById('eq1_c').value);

  equationCoefficients = { a, b, c };

  const stepsEl = document.getElementById('steps');
  const solutionEl = document.getElementById('solution');

  // 方程式字串表示
  const eqStr = `${a}x + (${b}) = ${c}`;
  const step0 = document.createElement('div');
  step0.className = 'step-item';
  step0.innerHTML = `<strong>已輸入方程式：</strong><br>${eqStr}`;
  stepsEl.appendChild(step0);

  if (a === 0) {
    const errorStep = document.createElement('div');
    errorStep.className = 'step-item';
    let isInfinite = false;
    if (b === c) {
      errorStep.innerHTML = `<strong>無限多個解：</strong> 方程式簡化為 ${b} = ${c}，恆成立。任何實數 x 皆為方程式的解。`;
      isInfinite = true;
    } else {
      errorStep.innerHTML = `<strong>無解：</strong> 方程式簡化為 ${b} = ${c}，此等式不成立，方程式無解。`;
    }
    stepsEl.appendChild(errorStep);

    // 顯示圖表控制項並繪製圖表
    const modeSelect = document.getElementById('chartModeSelect');
    modeSelect.innerHTML = '<option value="oneVar2D">一元方程式函數圖 (2D)</option>';
    
    document.getElementById('chartControls').style.display = 'block';
    document.getElementById('variableSelectGroup').style.display = 'none';
    document.getElementById('projectionSelectGroup').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'block';

    renderOneVarNoSolutionChart(a, b, c, isInfinite);
    return;
  }

  // 解題步驟
  const stepList = [
    `步驟 1：將常數項移到等號右邊： ${a}x = ${c} - (${b})`,
    `步驟 2：進行減法運算： ${a}x = ${c - b}`,
    `步驟 3：等號同除以 x 的係數 ${a}： x = ${c - b} / ${a}`,
    `因此解為 x = ${(c - b) / a}`
  ];

  stepList.forEach(text => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.textContent = text;
    stepsEl.appendChild(stepEl);
  });

  const solX = (c - b) / a;
  systemSolution = { x: solX };

  solutionEl.innerHTML = `
    <p><strong>解答：</strong></p>
    <p>x = <strong>${solX.toFixed(4)}</strong></p>
  `;

  // 顯示圖表控制項並繪製圖表
  const modeSelect = document.getElementById('chartModeSelect');
  modeSelect.innerHTML = '<option value="oneVar2D">一元方程式函數圖 (2D)</option>';
  
  document.getElementById('chartControls').style.display = 'block';
  document.getElementById('variableSelectGroup').style.display = 'none';
  document.getElementById('projectionSelectGroup').style.display = 'none';
  document.getElementById('chartContainer').style.display = 'block';

  renderOneVarChart(solX, a, b, c);
}

/**
 * 繪製一元一次方程式的 2D 幾何圖形 (y = ax+b 與 y = c 的交點)
 */
function renderOneVarChart(solX, a, b, c) {
  const minVal = solX - 5;
  const maxVal = solX + 5;
  const step = 0.2;
  const dataPoints = [];
  const targetPoints = [];

  for (let x = minVal; x <= maxVal; x = Number((x + step).toFixed(2))) {
    dataPoints.push({ x: x, y: a * x + b });
    targetPoints.push({ x: x, y: c });
  }

  const ctx = document.getElementById('equationChart').getContext('2d');
  document.getElementById('equationChart').style.display = 'block';
  document.getElementById('plotlyChart').style.display = 'none';

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `函數 y = ${a}x + ${b}`,
          data: dataPoints,
          borderColor: '#2563eb',
          borderWidth: 3,
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `目標常數線 y = ${c}`,
          data: targetPoints,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `解的交點 (x = ${solX.toFixed(4)}, y = ${c})`,
          data: [{ x: solX, y: c }],
          borderColor: '#f43f5e',
          backgroundColor: '#f43f5e',
          pointStyle: 'circle',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: `一元一次方程式函數幾何圖`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: minVal,
          max: maxVal,
          title: { display: true, text: '變數 x' }
        },
        y: {
          title: { display: true, text: 'y 值' }
        }
      }
    }
  });
}

/**
 * 繪製一元一次方程式無解或無限多解的 2D 幾何圖形 (平行或重合線)
 */
function renderOneVarNoSolutionChart(a, b, c, isInfinite) {
  const minVal = -5;
  const maxVal = 5;
  const step = 0.2;
  const dataPoints = [];
  const targetPoints = [];

  for (let x = minVal; x <= maxVal; x = Number((x + step).toFixed(2))) {
    dataPoints.push({ x: x, y: a * x + b }); // a 是 0，所以 y = b
    targetPoints.push({ x: x, y: c });
  }

  const ctx = document.getElementById('equationChart').getContext('2d');
  document.getElementById('equationChart').style.display = 'block';
  document.getElementById('plotlyChart').style.display = 'none';

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `函數 y = ${a}x + ${b}`,
          data: dataPoints,
          borderColor: '#2563eb',
          borderWidth: 3,
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `目標常數線 y = ${c}`,
          data: targetPoints,
          borderColor: isInfinite ? '#10b981' : '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: isInfinite ? `一元一次方程式幾何圖 (無限多個解 - 兩線重合)` : `一元一次方程式幾何圖 (無解 - 兩線平行)`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: minVal,
          max: maxVal,
          title: { display: true, text: '變數 x' }
        },
        y: {
          title: { display: true, text: 'y 值' },
          min: Math.min(b, c) - 2,
          max: Math.max(b, c) + 2
        }
      }
    }
  });
}


/**
 * ----------------------------------------------------
 * 二元一次聯立方程式求解與 2D 雙線交點繪製邏輯
 * ----------------------------------------------------
 */
function solveTwoVariables() {
  const a1 = Number(document.getElementById('eq2_a1').value);
  const b1 = Number(document.getElementById('eq2_b1').value);
  const c1 = Number(document.getElementById('eq2_c1').value);
  
  const a2 = Number(document.getElementById('eq2_a2').value);
  const b2 = Number(document.getElementById('eq2_b2').value);
  const c2 = Number(document.getElementById('eq2_c2').value);

  equationCoefficients = { a1, b1, c1, a2, b2, c2 };

  const stepsEl = document.getElementById('steps');
  const solutionEl = document.getElementById('solution');

  const eqText = [
    `${a1}x + (${b1})y = ${c1}`,
    `${a2}x + (${b2})y = ${c2}`
  ];

  const step0 = document.createElement('div');
  step0.className = 'step-item';
  step0.innerHTML = `<strong>已輸入聯立方程式：</strong><br>${eqText.join('<br>')}`;
  stepsEl.appendChild(step0);

  // 計算二階行列式
  const D = a1 * b2 - a2 * b1;
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;

  if (D === 0) {
    const errorStep = document.createElement('div');
    errorStep.className = 'step-item';
    let isInfinite = false;
    if (Dx === 0 && Dy === 0) {
      errorStep.innerHTML = '<strong>無限多組解：</strong> 行列式值 D = 0 且 D_x = D_y = 0，代表兩條直線完全重合。';
      isInfinite = true;
    } else {
      errorStep.innerHTML = '<strong>無解：</strong> 行列式值 D = 0，但 D_x 或 D_y 不為 0，代表兩條直線平行且無交點。';
    }
    stepsEl.appendChild(errorStep);

    // 顯示圖表控制項並繪製圖表
    const modeSelect = document.getElementById('chartModeSelect');
    modeSelect.innerHTML = '<option value="twoVar2D">二元聯立直線圖 (2D)</option>';
    
    document.getElementById('chartControls').style.display = 'block';
    document.getElementById('variableSelectGroup').style.display = 'none';
    document.getElementById('projectionSelectGroup').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'block';

    renderTwoVarNoSolutionChart(a1, b1, c1, a2, b2, c2, isInfinite);
    return;
  }

  // 解題步驟
  const stepList = [
    `步驟 1：計算主行列式 D = a₁b₂ - a₂b₁ = (${a1})*(${b2}) - (${a2})*(${b1}) = ${D}`,
    `步驟 2：將常數項替換為 x 軸，計算 D_x = c₁b₂ - c₂b₁ = (${c1})*(${b2}) - (${c2})*(${b1}) = ${Dx}`,
    `步驟 3：將常數項替換為 y 軸，計算 D_y = a₁c₂ - a₂c₁ = (${a1})*(${c2}) - (${a2})*(${c1}) = ${Dy}`,
    `步驟 4：套用克拉瑪公式求解： x = D_x / D = ${Dx} / ${D} = ${(Dx / D).toFixed(4)}， y = D_y / D = ${Dy} / ${D} = ${(Dy / D).toFixed(4)}`
  ];

  stepList.forEach(text => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.textContent = text;
    stepsEl.appendChild(stepEl);
  });

  const solX = Dx / D;
  const solY = Dy / D;
  systemSolution = { x: solX, y: solY };

  solutionEl.innerHTML = `
    <p><strong>解答：</strong></p>
    <p>x = <strong>${solX.toFixed(4)}</strong></p>
    <p>y = <strong>${solY.toFixed(4)}</strong></p>
  `;

  // 顯示圖表控制項並繪製圖表
  const modeSelect = document.getElementById('chartModeSelect');
  modeSelect.innerHTML = '<option value="twoVar2D">二元聯立直線交會圖 (2D)</option>';
  
  document.getElementById('chartControls').style.display = 'block';
  document.getElementById('variableSelectGroup').style.display = 'none';
  document.getElementById('projectionSelectGroup').style.display = 'none';
  document.getElementById('chartContainer').style.display = 'block';

  renderTwoVarChart(solX, solY, a1, b1, c1, a2, b2, c2);
}

/**
 * 繪製二元一次聯立方程式的 2D 幾何圖形 (兩條直線的交會點)
 */
function renderTwoVarChart(solX, solY, a1, b1, c1, a2, b2, c2) {
  // 利用與三元投影相同的 getLinePoints 來計算端點，以相容垂直線 (b = 0) 的極端情況
  const points1 = getLinePoints(a1, b1, c1, solX, solY);
  const points2 = getLinePoints(a2, b2, c2, solX, solY);

  const ctx = document.getElementById('equationChart').getContext('2d');
  document.getElementById('equationChart').style.display = 'block';
  document.getElementById('plotlyChart').style.display = 'none';

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `方程式 1: ${a1}x + ${b1}y = ${c1}`,
          data: points1,
          borderColor: '#3b82f6',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 2: ${a2}x + ${b2}y = ${c2}`,
          data: points2,
          borderColor: '#10b981',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `聯立方程式的交點解 (${solX.toFixed(2)}, ${solY.toFixed(2)})`,
          data: [{ x: solX, y: solY }],
          borderColor: '#f43f5e',
          backgroundColor: '#f43f5e',
          pointStyle: 'circle',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `二元一次聯立方程式幾何交點圖`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: solX - 5,
          max: solX + 5,
          title: { display: true, text: '變數 x' }
        },
        y: {
          type: 'linear',
          min: solY - 5,
          max: solY + 5,
          title: { display: true, text: '變數 y' }
        }
      }
    }
  });
}

/**
 * 繪製二元一次聯立方程式無解或無限多解的 2D 幾何圖形 (平行或重合線)
 */
function renderTwoVarNoSolutionChart(a1, b1, c1, a2, b2, c2, isInfinite) {
  let centerX = 0;
  let centerY = 0;
  if (Math.abs(b1) > 0.000001 && Math.abs(b2) > 0.000001) {
    centerY = (c1 / b1 + c2 / b2) / 2;
  } else if (Math.abs(a1) > 0.000001 && Math.abs(a2) > 0.000001) {
    centerX = (c1 / a1 + c2 / a2) / 2;
  }

  const points1 = getLinePoints(a1, b1, c1, centerX, centerY);
  const points2 = getLinePoints(a2, b2, c2, centerX, centerY);

  const ctx = document.getElementById('equationChart').getContext('2d');
  document.getElementById('equationChart').style.display = 'block';
  document.getElementById('plotlyChart').style.display = 'none';

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `方程式 1: ${a1}x + ${b1}y = ${c1}`,
          data: points1,
          borderColor: '#3b82f6',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 2: ${a2}x + ${b2}y = ${c2}`,
          data: points2,
          borderColor: isInfinite ? '#3b82f6' : '#10b981',
          borderDash: isInfinite ? [5, 5] : [],
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: isInfinite ? `二元一次聯立方程式幾何圖 (無限多組解 - 兩線重合)` : `二元一次聯立方程式幾何圖 (無解 - 兩線平行)`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: centerX - 5,
          max: centerX + 5,
          title: { display: true, text: '變數 x' }
        },
        y: {
          type: 'linear',
          min: centerY - 5,
          max: centerY + 5,
          title: { display: true, text: '變數 y' }
        }
      }
    }
  });
}

/**
 * ----------------------------------------------------
 * 三元一次聯立方程式求解與 2D/3D 圖表整合邏輯
 * ----------------------------------------------------
 */
function solveThreeVariables() {
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

  // 儲存係數以供繪圖邏輯使用
  equationCoefficients = {
    eq1: { a: a1, b: b1, c: c1, d: d1 },
    eq2: { a: a2, b: b2, c: c2, d: d2 },
    eq3: { a: a3, b: b3, c: c3, d: d3 }
  };

  const matrix = [
    [a1, b1, c1],
    [a2, b2, c2],
    [a3, b3, c3],
  ];
  const constants = [d1, d2, d3];

  const det = determinant3x3(matrix);
  const stepsEl = document.getElementById('steps');
  const solutionEl = document.getElementById('solution');
  
  stepsEl.innerHTML = '';
  solutionEl.innerHTML = '';

  const equationText = [
    buildEquation(a1, b1, c1, d1),
    buildEquation(a2, b2, c2, d2),
    buildEquation(a3, b3, c3, d3),
  ];

  const eqStep = document.createElement('div');
  eqStep.className = 'step-item';
  eqStep.innerHTML = `<strong>已輸入聯立方程式：</strong><br>${equationText.join('<br>')}`;
  stepsEl.appendChild(eqStep);

  // 行列式為 0 時，代表無唯一解
  if (det === 0) {
    const errorStep = document.createElement('div');
    errorStep.className = 'step-item';
    
    // 計算分子行列式以協助判斷是無解還是無限多解
    const xDet = determinant3x3(replaceColumn(matrix, 0, constants));
    const yDet = determinant3x3(replaceColumn(matrix, 1, constants));
    const zDet = determinant3x3(replaceColumn(matrix, 2, constants));
    
    let isInfinite = false;
    if (xDet === 0 && yDet === 0 && zDet === 0) {
      errorStep.innerHTML = '<strong>無限多組解或無解：</strong> 行列式值 D = 0 且 D_x = D_y = D_z = 0，代表平面可能共線相交、部分重合或完全重合。';
      isInfinite = true;
    } else {
      errorStep.innerHTML = '<strong>無解：</strong> 行列式值 D = 0，但 D_x, D_y 或 D_z 至少有一個不為 0，代表平面無共同交點（可能互相平行，或兩兩交線互相平行）。';
    }
    stepsEl.appendChild(errorStep);
    systemSolution = null;

    // 顯示圖表控制項並繪製 3D 圖表
    const modeSelect = document.getElementById('chartModeSelect');
    modeSelect.innerHTML = '<option value="intersection3d">空間平面關係圖 (3D 立體圖)</option>';
    
    document.getElementById('chartControls').style.display = 'block';
    document.getElementById('variableSelectGroup').style.display = 'none';
    document.getElementById('projectionSelectGroup').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'block';

    renderThreeVarNoSolutionChart(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, isInfinite);
    return;
  }

  // 克拉瑪公式 (Cramer's Rule) 計算分子行列式
  const xDet = determinant3x3(replaceColumn(matrix, 0, constants));
  const yDet = determinant3x3(replaceColumn(matrix, 1, constants));
  const zDet = determinant3x3(replaceColumn(matrix, 2, constants));

  // 求出解值
  const x = xDet / det;
  const y = yDet / det;
  const z = zDet / det;

  systemSolution = { x, y, z };

  const stepList = [
    `步驟 1：計算主行列式 D = ${det}`,
    `步驟 2：將常數項代入 x 位置計算 D_x = ${xDet}`,
    `步驟 3：將常數項代入 y 位置計算 D_y = ${yDet}`,
    `步驟 4：將常數項代入 z 位置計算 D_z = ${zDet}`,
    `步驟 5：利用克拉瑪公式求出唯一的空間交點： x = D_x / D = ${x.toFixed(4)}， y = D_y / D = ${y.toFixed(4)}， z = D_z / D = ${z.toFixed(4)}`
  ];

  stepList.forEach((text) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.textContent = text;
    stepsEl.appendChild(stepEl);
  });

  solutionEl.innerHTML = `
    <p><strong>解答：</strong></p>
    <p>x = <strong>${x.toFixed(4)}</strong></p>
    <p>y = <strong>${y.toFixed(4)}</strong></p>
    <p>z = <strong>${z.toFixed(4)}</strong></p>
  `;

  // 動態設定三元一次模式下的下拉選單選項
  const modeSelect = document.getElementById('chartModeSelect');
  const oldVal = modeSelect.value;
  modeSelect.innerHTML = `
    <option value="intersection3d">空間平面交會圖 (3D 立體圖)</option>
    <option value="functionValue">方程式函數值變化圖 (2D 曲線圖)</option>
    <option value="intersection2d">變數交會圖 (2D 投影)</option>
  `;
  // 如果先前就是三元模式下的有效選項，保持其選取狀態
  if (['intersection3d', 'functionValue', 'intersection2d'].includes(oldVal)) {
    modeSelect.value = oldVal;
  }

  // 顯示圖表控制項與容器，並執行首次渲染
  document.getElementById('chartControls').style.display = 'block';
  document.getElementById('chartContainer').style.display = 'block';
  updateChartUI();
}

/**
 * 依據選取的圖表展示模式，控制面板的可見性，並呼叫對應渲染函數
 */
function updateChartUI() {
  if (currentTab !== 3) return; // 僅三元模式需要處理複雜的圖表切換
  if (!systemSolution || !equationCoefficients) return;

  const mode = document.getElementById('chartModeSelect').value;
  const varSelectGroup = document.getElementById('variableSelectGroup');
  const projectionSelectGroup = document.getElementById('projectionSelectGroup');

  if (mode === 'intersection3d') {
    varSelectGroup.style.display = 'none';
    projectionSelectGroup.style.display = 'none';
    render3DChart();
  } else if (mode === 'functionValue') {
    varSelectGroup.style.display = 'flex';
    projectionSelectGroup.style.display = 'none';
    const activeVar = document.getElementById('chartVarSelect').value;
    renderFunctionValueChart(activeVar);
  } else {
    varSelectGroup.style.display = 'none';
    projectionSelectGroup.style.display = 'flex';
    const projectionPlane = document.getElementById('projectionSelect').value;
    renderProjectionChart(projectionPlane);
  }
}

/**
 * 1. 繪製「3D 空間平面交會圖」
 * 繪製三個一次方程所代表的空間平面，並以一顆顯眼圓點表示唯一的空間交點（聯立解）
 */
function render3DChart() {
  const sol = systemSolution;
  const eq = equationCoefficients;
  
  // 顯示 Plotly, 隱藏 Chart.js Canvas
  document.getElementById('equationChart').style.display = 'none';
  const plotlyChartEl = document.getElementById('plotlyChart');
  plotlyChartEl.style.display = 'block';

  // 生成三個方程式對應的 3D 平面網格點 (X, Y, Z 各 2D 矩陣)
  const plane1 = generatePlaneSurface(eq.eq1.a, eq.eq1.b, eq.eq1.c, eq.eq1.d, sol);
  const plane2 = generatePlaneSurface(eq.eq2.a, eq.eq2.b, eq.eq2.c, eq.eq2.d, sol);
  const plane3 = generatePlaneSurface(eq.eq3.a, eq.eq3.b, eq.eq3.c, eq.eq3.d, sol);

  // 建立方程式 1 平面 trace (藍色)
  const trace1 = {
    type: 'surface',
    x: plane1.x,
    y: plane1.y,
    z: plane1.z,
    name: '方程式 1 平面',
    colorscale: [[0, '#3b82f6'], [1, '#3b82f6']],
    showscale: false,
    opacity: 0.6,
  };

  // 建立方程式 2 平面 trace (綠色)
  const trace2 = {
    type: 'surface',
    x: plane2.x,
    y: plane2.y,
    z: plane2.z,
    name: '方程式 2 平面',
    colorscale: [[0, '#10b981'], [1, '#10b981']],
    showscale: false,
    opacity: 0.6,
  };

  // 建立方程式 3 平面 trace (紅色)
  const trace3 = {
    type: 'surface',
    x: plane3.x,
    y: plane3.y,
    z: plane3.z,
    name: '方程式 3 平面',
    colorscale: [[0, '#f43f5e'], [1, '#f43f5e']],
    showscale: false,
    opacity: 0.6,
  };

  // 建立解的交點 trace (顯眼的黑色大圓點)
  const traceSol = {
    type: 'scatter3d',
    x: [sol.x],
    y: [sol.y],
    z: [sol.z],
    mode: 'markers',
    marker: {
      size: 9,
      color: '#1e293b',
      symbol: 'circle',
      line: {
        color: '#ffffff',
        width: 3
      }
    },
    name: `交點解 (${sol.x.toFixed(2)}, ${sol.y.toFixed(2)}, ${sol.z.toFixed(2)})`
  };

  const layout = {
    title: {
      text: '空間平面交會立體幾何圖 (滑鼠可旋轉/縮放)',
      font: { size: 16, family: 'Outfit, sans-serif', weight: 'bold' }
    },
    scene: {
      xaxis: { title: 'X 軸', range: [sol.x - 5, sol.x + 5] },
      yaxis: { title: 'Y 軸', range: [sol.y - 5, sol.y + 5] },
      zaxis: { title: 'Z 軸', range: [sol.z - 5, sol.z + 5] }
    },
    margin: { l: 0, r: 0, b: 0, t: 40 },
    legend: {
      x: 0,
      y: 1,
      traceorder: 'normal',
      font: { family: 'sans-serif', size: 12, color: '#000' },
      bgcolor: 'rgba(255, 255, 255, 0.5)'
    }
  };

  Plotly.newPlot('plotlyChart', [trace1, trace2, trace3, traceSol], layout, { responsive: true });
}

/**
 * 繪製三元一次聯立方程式無解或無限多解的 3D 空間平面圖
 */
function renderThreeVarNoSolutionChart(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, isInfinite) {
  const dummySol = { x: 0, y: 0, z: 0 };
  
  // 顯示 Plotly, 隱藏 Chart.js Canvas
  document.getElementById('equationChart').style.display = 'none';
  const plotlyChartEl = document.getElementById('plotlyChart');
  plotlyChartEl.style.display = 'block';

  // 取得儲存的係數
  const eq = equationCoefficients;

  // 生成三個方程式對應的 3D 平面網格點 (中心為 0,0,0)
  const plane1 = generatePlaneSurface(a1, b1, c1, d1, dummySol);
  const plane2 = generatePlaneSurface(a2, b2, c2, d2, dummySol);
  const plane3 = generatePlaneSurface(a3, b3, c3, d3, dummySol);

  // 建立方程式 1 平面 trace (藍色)
  const trace1 = {
    type: 'surface',
    x: plane1.x,
    y: plane1.y,
    z: plane1.z,
    name: '方程式 1 平面',
    colorscale: [[0, '#3b82f6'], [1, '#3b82f6']],
    showscale: false,
    opacity: 0.6,
  };

  // 建立方程式 2 平面 trace (綠色)
  const trace2 = {
    type: 'surface',
    x: plane2.x,
    y: plane2.y,
    z: plane2.z,
    name: '方程式 2 平面',
    colorscale: [[0, '#10b981'], [1, '#10b981']],
    showscale: false,
    opacity: 0.6,
  };

  // 建立方程式 3 平面 trace (紅色)
  const trace3 = {
    type: 'surface',
    x: plane3.x,
    y: plane3.y,
    z: plane3.z,
    name: '方程式 3 平面',
    colorscale: [[0, '#f43f5e'], [1, '#f43f5e']],
    showscale: false,
    opacity: 0.6,
  };

  const layout = {
    title: {
      text: isInfinite ? '空間平面關係圖 (無限多組解/無解 - 3D 立體圖)' : '空間平面關係圖 (無解 - 3D 立體圖)',
      font: { size: 16, family: 'Outfit, sans-serif', weight: 'bold' }
    },
    scene: {
      xaxis: { title: 'X 軸', range: [-5, 5] },
      yaxis: { title: 'Y 軸', range: [-5, 5] },
      zaxis: { title: 'Z 軸', range: [-5, 5] }
    },
    margin: { l: 0, r: 0, b: 0, t: 40 },
    legend: {
      x: 0,
      y: 1,
      traceorder: 'normal',
      font: { family: 'sans-serif', size: 12, color: '#000' },
      bgcolor: 'rgba(255, 255, 255, 0.5)'
    }
  };

  Plotly.newPlot('plotlyChart', [trace1, trace2, trace3], layout, { responsive: true });
}

/**
 * 輔助函數：計算平面 ax + by + cz = d 在中心點附近的 3D 坐標網絡
 * 為了解決某些係數為 0 時的除以零問題（例如當 c = 0 代表垂直於 Z 軸之平面），
 * 我們會尋找絕對值最大者（最具代表性的變數）作為因變數來計算 grid。
 */
function generatePlaneSurface(a, b, c, d, sol, range = 5, resolution = 11) {
  const xGrid = [];
  const yGrid = [];
  const zGrid = [];

  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const absC = Math.abs(c);

  // 定義步長範圍 (中心點解的前後 5)
  const steps = [];
  for (let i = 0; i < resolution; i++) {
    steps.push(-range + (2 * range * i) / (resolution - 1));
  }

  if (absC >= absB && absC >= absA && absC > 0.00001) {
    // 1. z 作為因變數： x, y 為自變數， z = (d - ax - by) / c
    const xVals = steps.map(s => sol.x + s);
    const yVals = steps.map(s => sol.y + s);

    for (let i = 0; i < resolution; i++) {
      const rowX = [];
      const rowY = [];
      const rowZ = [];
      for (let j = 0; j < resolution; j++) {
        const x = xVals[i];
        const y = yVals[j];
        const z = (d - a * x - b * y) / c;
        rowX.push(x);
        rowY.push(y);
        rowZ.push(z);
      }
      xGrid.push(rowX);
      yGrid.push(rowY);
      zGrid.push(rowZ);
    }
  } else if (absB >= absA && absB >= absC && absB > 0.00001) {
    // 2. y 作為因變數： x, z 為自變數， y = (d - ax - cz) / b
    const xVals = steps.map(s => sol.x + s);
    const zVals = steps.map(s => sol.z + s);

    for (let i = 0; i < resolution; i++) {
      const rowX = [];
      const rowY = [];
      const rowZ = [];
      for (let j = 0; j < resolution; j++) {
        const x = xVals[i];
        const z = zVals[j];
        const y = (d - a * x - c * z) / b;
        rowX.push(x);
        rowY.push(y);
        rowZ.push(z);
      }
      xGrid.push(rowX);
      yGrid.push(rowY);
      zGrid.push(rowZ);
    }
  } else if (absA > 0.00001) {
    // 3. x 作為因變數： y, z 為自變數， x = (d - by - cz) / a
    const yVals = steps.map(s => sol.y + s);
    const zVals = steps.map(s => sol.z + s);

    for (let i = 0; i < resolution; i++) {
      const rowX = [];
      const rowY = [];
      const rowZ = [];
      for (let j = 0; j < resolution; j++) {
        const y = yVals[i];
        const z = zVals[j];
        const x = (d - b * y - c * z) / a;
        rowX.push(x);
        rowY.push(y);
        rowZ.push(z);
      }
      xGrid.push(rowX);
      yGrid.push(rowY);
      zGrid.push(rowZ);
    }
  }

  return { x: xGrid, y: yGrid, z: zGrid };
}

/**
 * 2. 繪製「方程式函數值變化圖」
 */
function renderFunctionValueChart(activeVar) {
  const sol = systemSolution;
  const eq = equationCoefficients;
  
  // 顯示 Chart.js Canvas, 隱藏 Plotly
  document.getElementById('plotlyChart').style.display = 'none';
  const canvas = document.getElementById('equationChart');
  canvas.style.display = 'block';

  let centerVal = 0;
  if (activeVar === 'x') centerVal = sol.x;
  else if (activeVar === 'y') centerVal = sol.y;
  else centerVal = sol.z;

  const minVal = Number((centerVal - 5).toFixed(2));
  const maxVal = Number((centerVal + 5).toFixed(2));
  const step = 0.2;
  
  const xValues = [];
  for (let v = minVal; v <= maxVal; v = Number((v + step).toFixed(2))) {
    xValues.push(v);
  }

  const data1 = [];
  const data2 = [];
  const data3 = [];
  const target1 = [];
  const target2 = [];
  const target3 = [];

  xValues.forEach(v => {
    let val1, val2, val3;
    if (activeVar === 'x') {
      val1 = eq.eq1.a * v + eq.eq1.b * sol.y + eq.eq1.c * sol.z;
      val2 = eq.eq2.a * v + eq.eq2.b * sol.y + eq.eq2.c * sol.z;
      val3 = eq.eq3.a * v + eq.eq3.b * sol.y + eq.eq3.c * sol.z;
    } else if (activeVar === 'y') {
      val1 = eq.eq1.a * sol.x + eq.eq1.b * v + eq.eq1.c * sol.z;
      val2 = eq.eq2.a * sol.x + eq.eq2.b * v + eq.eq2.c * sol.z;
      val3 = eq.eq3.a * sol.x + eq.eq3.b * v + eq.eq3.c * sol.z;
    } else {
      val1 = eq.eq1.a * sol.x + eq.eq1.b * sol.y + eq.eq1.c * v;
      val2 = eq.eq2.a * sol.x + eq.eq2.b * sol.y + eq.eq2.c * v;
      val3 = eq.eq3.a * sol.x + eq.eq3.b * sol.y + eq.eq3.c * v;
    }
    data1.push({ x: v, y: val1 });
    data2.push({ x: v, y: val2 });
    data3.push({ x: v, y: val3 });
    target1.push({ x: v, y: eq.eq1.d });
    target2.push({ x: v, y: eq.eq2.d });
    target3.push({ x: v, y: eq.eq3.d });
  });

  const ctx = canvas.getContext('2d');
  if (equationChartInstance) {
    equationChartInstance.destroy();
  }

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `方程式 1 左式值`,
          data: data1,
          borderColor: '#3b82f6',
          borderWidth: 3,
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 2 左式值`,
          data: data2,
          borderColor: '#10b981',
          borderWidth: 3,
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 3 左式值`,
          data: data3,
          borderColor: '#f43f5e',
          borderWidth: 3,
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 1 目標值 (d1 = ${eq.eq1.d})`,
          data: target1,
          borderColor: '#93c5fd',
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 2 目標值 (d2 = ${eq.eq2.d})`,
          data: target2,
          borderColor: '#6ee7b7',
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 3 目標值 (d3 = ${eq.eq3.d})`,
          data: target3,
          borderColor: '#fda4af',
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `聯立方程式解 (${activeVar} = ${centerVal.toFixed(4)})`,
          data: [
            { x: centerVal, y: eq.eq1.d },
            { x: centerVal, y: eq.eq2.d },
            { x: centerVal, y: eq.eq3.d }
          ],
          borderColor: '#1e293b',
          backgroundColor: '#1e293b',
          pointStyle: 'rectRot',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: `方程式函數值變化圖 (自變數 ${activeVar} 於 X 軸，固定其他為解值)`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: minVal,
          max: maxVal,
          title: { display: true, text: `自變數 ${activeVar} 的數值` }
        },
        y: {
          title: { display: true, text: '函數評估值' }
        }
      }
    }
  });
}

/**
 * 3. 繪製「2D 投影交會圖」
 */
function renderProjectionChart(plane) {
  const sol = systemSolution;
  const eq = equationCoefficients;
  
  // 顯示 Chart.js Canvas, 隱藏 Plotly
  document.getElementById('plotlyChart').style.display = 'none';
  const canvas = document.getElementById('equationChart');
  canvas.style.display = 'block';

  let labelX = '';
  let labelY = '';
  let centerX = 0;
  let centerY = 0;
  
  let points1 = [];
  let points2 = [];
  let points3 = [];

  if (plane === 'xy') {
    labelX = 'x';
    labelY = 'y';
    centerX = sol.x;
    centerY = sol.y;
    points1 = getLinePoints(eq.eq1.a, eq.eq1.b, eq.eq1.d - eq.eq1.c * sol.z, centerX, centerY);
    points2 = getLinePoints(eq.eq2.a, eq.eq2.b, eq.eq2.d - eq.eq2.c * sol.z, centerX, centerY);
    points3 = getLinePoints(eq.eq3.a, eq.eq3.b, eq.eq3.d - eq.eq3.c * sol.z, centerX, centerY);
  } else if (plane === 'xz') {
    labelX = 'x';
    labelY = 'z';
    centerX = sol.x;
    centerY = sol.z;
    points1 = getLinePoints(eq.eq1.a, eq.eq1.c, eq.eq1.d - eq.eq1.b * sol.y, centerX, centerY);
    points2 = getLinePoints(eq.eq2.a, eq.eq2.c, eq.eq2.d - eq.eq2.b * sol.y, centerX, centerY);
    points3 = getLinePoints(eq.eq3.a, eq.eq3.c, eq.eq3.d - eq.eq3.b * sol.y, centerX, centerY);
  } else {
    labelX = 'y';
    labelY = 'z';
    centerX = sol.y;
    centerY = sol.z;
    points1 = getLinePoints(eq.eq1.b, eq.eq1.c, eq.eq1.d - eq.eq1.a * sol.x, centerX, centerY);
    points2 = getLinePoints(eq.eq2.b, eq.eq2.c, eq.eq2.d - eq.eq2.a * sol.x, centerX, centerY);
    points3 = getLinePoints(eq.eq3.b, eq.eq3.c, eq.eq3.d - eq.eq3.a * sol.x, centerX, centerY);
  }

  const ctx = canvas.getContext('2d');
  if (equationChartInstance) {
    equationChartInstance.destroy();
  }

  equationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `方程式 1 投影線`,
          data: points1,
          borderColor: '#3b82f6',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 2 投影線`,
          data: points2,
          borderColor: '#10b981',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `方程式 3 投影線`,
          data: points3,
          borderColor: '#f43f5e',
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: `交點 (${labelX} = ${centerX.toFixed(4)}, ${labelY} = ${centerY.toFixed(4)})`,
          data: [{ x: centerX, y: centerY }],
          borderColor: '#1e293b',
          backgroundColor: '#1e293b',
          pointStyle: 'circle',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `2D 投影交會圖 (在 ${labelX}-${labelY} 平面，固定第三個變數為解)`,
          font: { size: 15, weight: 'bold', family: 'Outfit, sans-serif' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.showLine === false) {
                return context.dataset.label;
              }
              return `${context.dataset.label}: (${context.parsed.x.toFixed(4)}, ${context.parsed.y.toFixed(4)})`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: centerX - 5,
          max: centerX + 5,
          title: { display: true, text: `變數 ${labelX}` }
        },
        y: {
          type: 'linear',
          min: centerY - 5,
          max: centerY + 5,
          title: { display: true, text: `變數 ${labelY}` }
        }
      }
    }
  });
}

/**
 * ----------------------------------------------------
 * 共用數學與格式化工具函數
 * ----------------------------------------------------
 */

/**
 * 計算行列式或投影直線端點 (相容垂直直線)
 */
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
  return `${parts.join('') || '0'} = ${d}`;
}

/**
 * 給定平面投影直線 ax + by = K，在 centerX, centerY 前後範圍計算直線的兩個端點座標。
 * 若 b = 0 代表一條垂直線 x = K/a，此時直接返回垂直的 yMin 到 yMax 直線點。
 */
function getLinePoints(a, b, K, centerX, centerY, range = 5) {
  const xMin = centerX - range;
  const xMax = centerX + range;
  const yMin = centerY - range;
  const yMax = centerY + range;

  if (Math.abs(b) > 0.000001) {
    return [
      { x: xMin, y: (K - a * xMin) / b },
      { x: xMax, y: (K - a * xMax) / b }
    ];
  } else if (Math.abs(a) > 0.000001) {
    return [
      { x: K / a, y: yMin },
      { x: K / a, y: yMax }
    ];
  }
  return [];
}
