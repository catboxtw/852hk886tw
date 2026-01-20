const SPREADSHEET_ID = '1Z3xaacD4N1Piagjg7mWAH2bzGadCUX8zS24RbInF4QM';
const GAS_PRODUCT_URL = 'https://script.google.com/macros/s/AKfycby0WRTp_F33uuVYp1tq8wAYWIw80XM3v3vdPErq8joVZoZu5DpLW_qNtVruHJ5o1AFw/exec';
const tabs = ["Content", "About Us", "Business Scope", "Product Catalog", "Join Us", "Contact Us"];

let currentLang = 'zh';
let currentPage = 'Content'; 
let rawDataCache = {};
let allProductsCache = null;

// --- 路由與導覽邏輯 ---
function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) { u.searchParams.set(key, params[key]); }
    window.history.pushState({}, '', u);
    
    currentPage = page;
    renderNav();
    loadPage(page, false); 
}

const getSheetUrl = (sheetName) => https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)};

async function fetchSheetData(sheetName) {
    try {
        const response = await fetch(getSheetUrl(sheetName));
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        return json.table.rows.map(row => 
            row.c.map(cell => (cell ? (cell.v || "").toString() : ""))
        );
    } catch (e) { return []; }
}

async function fetchGASProducts() {
    if (allProductsCache) return allProductsCache;
    try {
        const response = await fetch(GAS_PRODUCT_URL);
        const data = await response.json();
        allProductsCache = data;
        return allProductsCache;
    } catch (e) { console.error("GAS Error:", e); throw e; }
}

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page && (tabs.includes(page)  page === 'category'  page === 'product')) {
        currentPage = page;
    }
}

async function initWebsite() {
    handleRouting();
    rawDataCache['Content'] = await fetchSheetData('Content');
    renderLogoAndStores();
    updateLangButton();
    await renderNav();
    loadPage(currentPage, false);
}

function updateLangButton() {
    const btn = document.getElementById('lang-toggle-btn');
    btn.innerText = (currentLang === 'zh') ? 'EN' : '中';
}

function toggleLang() {
    currentLang = (currentLang === 'zh') ? 'en' : 'zh';
    updateLangButton();
    renderNav();
    loadPage(currentPage, false);
}

function renderLogoAndStores() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');
    const data = rawDataCache['Content'] || [];
    logoContainer.innerHTML = ''; storeContainer.innerHTML = '';
    data.forEach(row => {
        const aCol = (row[0] || "").toLowerCase().trim();
        const imgUrl = (row[3] || "").trim();
        const linkUrl = (row[4]  "").trim()  "#";
        if (aCol === 'logo' && imgUrl) {
            logoContainer.innerHTML = <a href="javascript:void(0)" onclick="switchPage('Content')"><img src="${imgUrl}" class="logo-img" alt="Logo"></a>;
        }
        if (aCol.includes('store') && imgUrl) {
            const a = document.createElement('a');
            a.href = linkUrl; a.target = "_blank";
            a.innerHTML = <img src="${imgUrl}" class="store-img hover:opacity-75 transition">;
            storeContainer.appendChild(a);
        }
    });
}

async function renderNav() {
    const nav = document.getElementById('main-nav');
    const langIdx = (currentLang === 'zh') ? 1 : 2;
    let navHtml = '';
    for (const tab of tabs) {
        if (!rawDataCache[tab]) { rawDataCache[tab] = await fetchSheetData(tab); }
        const data = rawDataCache[tab];
        const titleRow = data.find(r => r[0] && r[0].toLowerCase().trim() === 'title');
        const displayName = (titleRow && titleRow[langIdx]) ? titleRow[langIdx] : tab;
        
        let isActive = (currentPage === tab) ? 'active' : '';
        if ((currentPage === 'product' || currentPage === 'category') && tab === 'Product Catalog') {
isActiv
g') {
            isActi
ve = 'active';
        }
        navHtml += <li class="nav-item ${isActive} px-6 py-3 cursor-pointer" onclick="switchPage('${tab}')">${displayName}</li>;
    }
    nav.innerHTML = navHtml;
}

// --- 頁面渲染邏輯 ---

async function loadPage(pageName, updateUrl = true) {
    if (updateUrl) switchPage(pageName);
    const app = document.getElementById('app');
    const langIdx = (currentLang === 'zh') ? 1 : 2;

    if (pageName === 'category') { renderCategoryList(); return; }
    if (pageName === 'product') { renderProductDetail(); return; }

    if (!rawDataCache[pageName]) { rawDataCache[pageName] = await fetchSheetData(pageName); }
    const data = rawDataCache[pageName];

    if (pageName === "Product Catalog") {
        renderProductCatalog(data, langIdx);
    } else if (pageName === "Content" || pageName === "About Us") {
        renderAboutOrContent(data, langIdx, pageName);
    } else if (pageName === "Business Scope") {
        renderBusinessScope(data, langIdx, pageName);
    } else if (pageName === "Join Us") {
        renderJoinUs(data, langIdx, pageName);
    } else if (pageName === "Contact Us") {
        renderContactUs(data, langIdx, pageName);
    }
    window.scrollTo(0, 0);
}

// --- 各分頁子渲染函數 (修正 undefined 邏輯) ---

function renderJoinUs(data, langIdx, pageName) {
    const app = document.getElementById('app');
    const titleRow = data.find(r => r[0] && r[0].toLowerCase().trim() === 'title');
    let jobs = {};
    
    data.forEach(row => {
        const key = (row[0] || "").toLowerCase().trim();
        const match = key.match(/\d+/);
        if (match) {
            const id = match[0];
            if (!jobs[id]) jobs[id] = { title: "", desc: "" };
            if (key.includes('position')) jobs[id].title = row[langIdx] || "";
            if (key.includes('description')) jobs[id].desc = row[langIdx] || "";
        }
    });

    // 關鍵修正：使用 Object.values 並 filter 掉沒有標題的職位，避免出現 undefined
    let jobsHtml = Object.values(jobs)
        .filter(job => job.title.trim() !== "") 
        .map(job => `
            <div class="bg-white border rounded-2xl p-8 text-left shadow-sm">
                <h3 class="text-2xl font-black mb-4 border-b pb-4 text-blue-700">${job.title}</h3>
                <p class="text-gray-600 leading-relaxed" style="white-space: pre-line;">${job.desc}</p>
            </div>`).join('');

    app.innerHTML = `
        <div class="flex flex-col items-center py-10 px-4">
            <h1 class="text-4xl font-black mb-12 text-gray-800">${(titleRow && titleRow[langIdx]) || pageName}</h1>
            <div class="grid md:grid-cols-2 gap-8 w-full max-w-6xl">${jobsHtml || '<p class="text-gray-400">目前暫無職缺。</p>'}</div>
        </div>`;
}

// --- 輔助函式：根據分類原始名，尋找 Product Catalog 分頁中對應語系的名稱 ---
function getLocalizedCategoryName(rawCatName) {
    const data = rawDataCache["Product Catalog"];
    if (!data) return rawCatName;

    const langIdx = (currentLang === 'zh') ? 1 : 2; // B欄是1, C欄是2
    // 尋找第5欄(E欄, 連結名稱) 與原始名稱匹配的行
    const row = data.find(r => r[4] && r[4].trim() === rawCatName.trim());
    
    return (row && row[langIdx]) ? row[langIdx] : rawCatName;
}

// --- 修正後的類別列表渲染 ---
async function renderCategoryList() {
    const params = new URLSearchParams(window.location.search);
    const rawCatName = params.get('cat');
    const app = document.getElementById('app');
    
    app.innerHTML = <div class="flex justify-center items-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    
    try {
        const allProducts = await fetchGASProducts();
        const filtered = allProducts.filter(p => String(p["Category"]).trim() === String(rawCatName).trim());
        
        // 取得對應語系的分類名稱 (從 Product Catalog 的 B或C 欄)
        const localizedCatName = getLocalizedCategoryName(rawCatName);
        const breadcrumbLabel = (currentLang === 'zh') ? '商品目錄' : 'Product Catalog';

        let itemsHtml = filtered.map(item => {
            const name = (currentLang === 'zh') ? item["Chinese product name"] : item["English product name"];
            const img =
item["圖片"] ? item["圖片"].split(",")[0].trim() : "";
            const code = item["Item code (ERP)"];
            return `<div class="category-card group cursor-pointer" onclick="switchPage('product', {id: '${code}'})">
                <div class="category-img-container"><img src="${img}" class="hover:scale-110 transition duration-500"></div>
                <div class="p-4 text-center"><p class="text-xs text-blue-600 font-bold mb-1">${code}</p><h4 class="font-bold text-gray-800">${name}</h4></div>
            </div>`;
        }).join('');

        app.innerHTML = `
            <div class="max-w-6xl mx-auto px-4 text-left">
                <nav class="text-gray-500 text-sm mb-8 italic">
                    <a href="javascript:void(0)" onclick="switchPage('Product Catalog')" class="hover:text-blue-600">${breadcrumbLabel}</a> 
                    <span class="mx-2">&gt;</span> 
                    <span class="text-gray-900 font-bold">${localizedCatName}</span>
                </nav>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">${itemsHtml || (currentLang === 'zh' ? '目前無產品' : 'No products found')}</div>
            </div>`;
    } catch (e) { 
        app.innerHTML = <div class="text-center py-20 text-red-500">載入失敗。</div>; 
    }
}

// --- 新增：將文字中的 Markdown 表格語法轉換為 HTML 表格 ---
function parseMarkdownTable(text) {
    if (!text.includes('|')) return text; 

    const lines = text.split('\n');
    let inTable = false;
    let html = '';
    let tableBuffer = [];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        // 判斷是否為表格行：包含 | 且不是分隔線 (如 |---|)
        if (trimmedLine.startsWith('|') || trimmedLine.includes('|')) {
            // 分離欄位並過濾掉頭尾因 | 產生的空字串
            const cells = line.split('|')
                              .map(c => c.trim())
                              .filter((c, index, arr) => {
                                  // 只有當欄位在中間，或者雖然在頭尾但不是空值時才保留
                                  if (index === 0 && c === "") return false;
                                  if (index === arr.length - 1 && c === "") return false;
                                  return true;
                              });

            // 跳過 Markdown 的分隔線行 (|---|---|)
            if (trimmedLine.match(/^[|:\s-]+$/)) return;

            if (cells.length > 0) {
                if (!inTable) {
                    inTable = true;
                    html += '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 text-sm shadow-sm">';
                }

                const isHeader = tableBuffer.length === 0;
                const tag = isHeader ? 'th' : 'td';
                const rowClass = isHeader ? 'bg-gray-100 font-bold text-gray-700' : 'bg-white hover:bg-gray-50';
                
                html += <tr class="${rowClass}">;
                cells.forEach(cell => {
                    html += <${tag} class="border border-gray-300 px-4 py-3 text-left">${cell}</${tag}>;
                });
                html += '</tr>';
                tableBuffer.push(cells);
            }
        } else {
            if (inTable) {
                html += '</table></div>';
                inTable = false;
                tableBuffer = [];
            }
            if (trimmedLine !== "") {
                html += <p class="mb-2">${line}</p>;
            } else {
                html += '<div class="h-2"></div>'; // 空行間距
            }
        }
    });

    if (inTable) html += '</table></div>';
    return html;
}

// --- 修正後的商品詳情渲染 ---
async function renderProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const itemCode = params.get('id');
    const app = document.getElementById('app');
    
    app.innerHTML = <div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    
    try {
        const allProducts = await fetchGASProducts();
        const item = allProducts.find(p => String(p["Item code (ERP)"]).trim() == String(itemCode).trim());
if (!item) {
            app.innerHTML = <div class="text-center py-20">找不到商品內容。</div>;
            return;
        }

        const rawCatName = item["Category"];
        const localizedCatName = getLocalizedCategoryName(rawCatName);
        const name = (currentLang === 'zh') ? item["Chinese product name"] : item["English product name"];
        const desc = (currentLang === 'zh') ? item["中文描述"] : item["英文描述"];
        const breadcrumbLabel = (currentLang === 'zh') ? '商品目錄' : 'Product Catalog';
        const formattedDesc = parseMarkdownTable(desc);
        const images = item["圖片"] ? item["圖片"].split(",").map(s => s.trim()) : [];

        app.innerHTML = `
            <div class="max-w-6xl mx-auto px-4 text-left">
                <nav class="flex text-gray-500 text-sm mb-8 italic">
                    <a href="javascript:void(0)" onclick="switchPage('Product Catalog')" class="hover:text-blue-600">${breadcrumbLabel}</a>
                    <span class="mx-2">&gt;</span>
                    <a href="javascript:void(0)" onclick="switchPage('category', {cat: '${rawCatName}'})" class="hover:text-blue-600">${localizedCatName}</a>
                    <span class="mx-2">&gt;</span>
                    <span class="text-gray-900 font-bold">${name}</span>
                </nav>

                <div class="flex flex-col md:flex-row gap-12">
                    <div class="w-full md:w-1/2">
                        <img id="main-prod-img" src="${images[0]}" class="w-full aspect-square object-cover rounded-2xl border shadow-sm">
                        <div class="flex gap-3 mt-4 overflow-x-auto pb-2">
                            ${images.map(img => `
                                <img src="${img}" 
                                     onclick="document.getElementById('main-prod-img').src='${img}'" 
                                     class="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition shadow-sm bg-white">
                            `).join('')}
                        </div>
                    </div>

                    <div class="w-full md:w-1/2">
                        <h1 class="text-3xl font-black mb-2 text-gray-900">${name}</h1>
                        <p class="text-xl text-blue-600 font-bold mb-6">${itemCode}</p>
                        
                        <div class="border-y py-6 mb-6">
                            <p class="flex items-center">
                                <span class="text-gray-400 w-24">${currentLang === 'zh' ? '包裝規格' : 'Packing'}</span>
                                <b class="text-gray-800">${item["Pcs / Packing"]  '--'} ${item["計量單位"]  ''}</b>
                            </p>
                        </div>

                        <h4 class="font-bold text-gray-900 mb-3">${currentLang === 'zh' ? '商品描述' : 'Description'}</h4>
                        <div class="text-gray-600 leading-loose">${formattedDesc}</div>
                    </div>
                </div>
            </div>`;
    } catch (e) {
        app.innerHTML = <div class="text-center py-20 text-red-500">載入失敗。</div>;
    }
}

function renderProductCatalog(data, langIdx) {
    const app = document.getElementById('app');
    let catHtml = '';
    data.forEach(row => {
        if (row[0].toLowerCase().trim().includes('categories') && row[langIdx]) {
            catHtml += <div class="category-card group cursor-pointer" onclick="switchPage('category', {cat: '${row[4]}'})"><div class="category-img-container"><img src="${row[3]}"></div><div class="p-5 text-center bg-white border-t"><h4 class="font-bold text-gray-800">${row[langIdx]}</h4></div></div>;
        }
    });
    app.innerHTML = <div class="flex flex-col items-center py-6 w-full"><div class="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-6xl px-4">${catHtml}</div></div>;
}

function renderAboutOrContent(data, langIdx, pageName) {
    const app = document.getElementById('app');
    let upperImages = ''; let companyNames = ''; let introContent = ''; let addressBlock = ''; let
bottomImages = '';
    data.forEach(row => {
        const key = (row[0] || "").toLowerCase().trim();
        if (key.includes('upper image') && row[3]) upperImages += <img src="${row[3]}" class="home-bottom-image">;
        if (key.includes('company name')) companyNames += <div class="mb-6"><h2 class="text-3xl font-black text-gray-900">${row[1]}</h2><h3 class="text-xl font-bold text-gray-400 mt-2">${row[2]}</h3></div>;
        if (key.includes('introduction title')) introContent += <h4 class="text-2xl font-bold mb-4 text-gray-800">${row[langIdx]}</h4>;
        if (key.includes('introduction') && !key.includes('title')) introContent += <p class="text-lg leading-loose text-gray-700 mb-6" style="white-space: pre-line;">${row[langIdx]}</p>;
        if (key.includes('address')) addressBlock += <p class="text-lg font-medium text-gray-500">${row[langIdx]}</p>;
        if (key.includes('bottom image') && row[3]) bottomImages += <img src="${row[3]}" class="home-bottom-image">;
    });
    if (pageName === "About Us") {
        app.innerHTML = <div class="w-full flex flex-col items-center py-10">${upperImages ? `<div class="image-grid-container px-4 mb-16">${upperImages}</div> : ''}<div class="max-w-6xl w-full px-4 flex flex-col md:flex-row gap-12 items-start text-left"><div class="w-full md:w-1/3">${companyNames}</div><div class="w-full md:w-2/3">${introContent}</div></div><div class="text-center py-10 w-full border-t mt-16 px-4">${addressBlock}</div>${bottomImages ? <div class="image-grid-container px-4 mt-10">${bottomImages}</div> : ''}</div>`;
    } else {
        app.innerHTML = <div class="flex flex-col items-center text-center py-10 w-full px-4"><div class="w-full mb-8">${companyNames}</div><div class="w-full mb-8 text-gray-500">${addressBlock}</div><div class="image-grid-container px-4">${bottomImages}</div></div>;
    }
}

function renderBusinessScope(data, langIdx, pageName) {
    const app = document.getElementById('app');
    const titleRow = data.find(r => r[0] && r[0].toLowerCase().trim() === 'title');
    let contentImages = '';
    data.forEach(row => {
        const key = (row[0] || "").toLowerCase().trim();
        const target = (currentLang === 'zh') ? 'chinese content' : 'english content';
        if (key.includes(target) && row[3]) contentImages += <img src="${row[3]}" class="home-bottom-image mb-8 max-w-2xl mx-auto block">;
    });
    app.innerHTML = <div class="flex flex-col items-center py-10 w-full"><h1 class="text-4xl font-black mb-12 text-gray-800">${(titleRow && titleRow[langIdx]) || pageName}</h1><div class="w-full px-4">${contentImages}</div></div>;
}

function renderContactUs(data, langIdx, pageName) {
    const app = document.getElementById('app');
    const titleRow = data.find(r => r[0] && r[0].toLowerCase().trim() === 'title');
    let info = ''; let map = '';
    data.forEach(row => {
        if (row[0].toLowerCase().includes('info') && row[langIdx]) info += <p class="text-xl text-gray-700 mb-4 font-medium">${row[langIdx]}</p>;
        if (row[0].toLowerCase().includes('map') && row[4]) map = row[4];
    });
    app.innerHTML = <div class="flex flex-col items-center py-10 px-4 text-center"><h1 class="text-4xl font-black mb-12 text-gray-800">${(titleRow && titleRow[langIdx]) || pageName}</h1><div class="w-full max-w-2xl border-y py-8 mb-16">${info}</div><iframe src="${map}" width="100%" height="500" class="max-w-6xl rounded-2xl shadow-sm border" loading="lazy"></iframe></div>;
}

// --- 事件監聽 ---
window.onpopstate = function() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'Content';
    currentPage = page;
    loadPage(page, false);
    renderNav();
};

initWebsite();
