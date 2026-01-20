const SPREADSHEET_ID = '1Z3xaacD4N1Piagjg7mWAH2bzGadCUX8zS24RbInF4QM';
const GAS_PRODUCT_URL = 'https://script.google.com/macros/s/AKfycby0WRTp_F33uuVYp1tq8wAYWIw80XM3v3vdPErq8joVZoZu5DpLW_qNtVruHJ5o1AFw/exec';
const SUBMIT_URL = "https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec";

const tabs = ["Content", "About Us", "Business Scope", "Product Catalog", "Join Us", "Contact Us"];
let currentLang = 'zh';
let currentPage = 'Content';
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {}; 
let rawDataCache = {};
let allProductsCache = null;

// --- 路由與初始化 ---
async function initWebsite() {
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    
    await fetchSheetData('Content'); // 預載 Logo
    renderLogoAndStores();
    updateLangButton();
    updateCartUI();
    await renderNav();
    loadPage(currentPage);
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    renderNav();
    loadPage(currentPage);
};

function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) u.searchParams.set(key, params[key]);
    window.history.pushState({}, '', u);
    currentPage = page;
    renderNav();
    loadPage(page);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// --- 核心載入器 ---
async function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);

    if (pageName === 'category') { renderCategoryList(params.get('cat')); return; }
    if (pageName === 'product') { renderProductDetail(params.get('id')); return; }
    if (pageName === 'checkout') { renderCheckoutPage(); return; }

    const data = await fetchSheetData(pageName);
    const langIdx = (currentLang === 'zh') ? 1 : 2;

    if (pageName === "Product Catalog") renderProductCatalog(data, langIdx);
    else if (pageName === "Content" || pageName === "About Us") renderAboutOrContent(data, langIdx, pageName);
    else if (pageName === "Business Scope") renderBusinessScope(data, langIdx, pageName);
    else if (pageName === "Join Us") renderJoinUs(data, langIdx, pageName);
    else if (pageName === "Contact Us") renderContactUs(data, langIdx, pageName);
}

// 分類商品列表 (?page=category&cat=...)
async function renderCategoryList(catName) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="py-20 text-center">正在加載商品...</div>';
    
    const products = await fetchGASProducts();
    const filtered = products.filter(p => String(p.Category).trim() === String(catName).trim());

    let html = `
        <nav class="mb-6 flex gap-2 text-sm text-gray-500">
            <button onclick="switchPage('Product Catalog')" class="hover:text-orange-600">商品目錄</button>
            <span>/</span> <span class="font-bold text-gray-900">${catName}</span>
        </nav>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    `;

    filtered.forEach(p => {
        const id = p["Item code (ERP)"];
        const name = currentLang === 'zh' ? p["Chinese product name"] : p["English product name"];
        const img = p["圖片"] ? p["圖片"].split(',')[0] : '';
        const qty = cart[id] ? cart[id].qty : 0;
        const price = p.Price || 0;

        html += `
            <div class="bg-white rounded-2xl border p-3 hover:shadow-lg transition">
                <img src="${img}" class="w-full aspect-square object-cover rounded-xl mb-3 cursor-pointer" 
                     onclick="switchPage('product', {id:'${id}'})">
                <h4 class="font-bold text-gray-800 text-sm truncate">${name}</h4>
                <p class="text-orange-600 font-black mb-3">HK$ ${price}</p>
                <div class="flex items-center justify-between bg-gray-100 rounded-lg p-1">
                    <button onclick="changeQuantity('${id}', -1)" class="w-8 h-8 flex items-center justify-center hover:bg-white rounded">-</button>
                    <span id="qty-${id}" class="font-bold">${qty}</span>
                    <button onclick="changeQuantity('${id}', 1, {name:'${name}', price:${price}, img:'${img}'})" class="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded">+</button>
                </div>
            </div>`;
    });
    app.innerHTML = html + `</div>`;
}

// 商品詳情頁 (?page=product&id=...)
async function renderProductDetail(id) {
    const app = document.getElementById('app');
    const products = await fetchGASProducts();
    const p = products.find(item => String(item["Item code (ERP)"]) === String(id));

    if (!p) { app.innerHTML = `<div class="py-20">找不到該商品。</div>`; return; }

    const name = currentLang === 'zh' ? p["Chinese product name"] : p["English product name"];
    const imgs = p["圖片"] ? p["圖片"].split(',') : [];
    const qty = cart[id] ? cart[id].qty : 0;

    app.innerHTML = `
        <button onclick="window.history.back()" class="mb-6 text-orange-600 font-bold">← 返回</button>
        <div class="flex flex-col md:flex-row gap-8 bg-white p-6 rounded-3xl border shadow-sm">
            <div class="md:w-1/2"><img src="${imgs[0]}" class="w-full rounded-xl"></div>
            <div class="md:w-1/2 text-left">
                <h1 class="text-3xl font-black mb-2">${name}</h1>
                <p class="text-gray-400 text-sm mb-4">商品編號: ${id}</p>
                <p class="text-2xl text-orange-600 font-black mb-6">HK$ ${p.Price || 0}</p>
                <div class="prose text-gray-600 mb-8">${(p["中文描述"] || "").replace(/\n/g, '<br>')}</div>
                <div class="flex items-center gap-4 border-t pt-6">
                    <div class="flex border-2 border-orange-100 rounded-xl overflow-hidden">
                        <button onclick="changeQuantity('${id}', -1)" class="px-4 py-2 hover:bg-orange-50">-</button>
                        <span id="qty-${id}" class="px-6 py-2 font-bold bg-orange-50">${qty}</span>
                        <button onclick="changeQuantity('${id}', 1, {name:'${name}', price:${p.Price}, img:'${imgs[0]}'})" class="px-4 py-2 hover:bg-orange-50">+</button>
                    </div>
                </div>
            </div>
        </div>`;
}

// 結帳頁面
function renderCheckoutPage() {
    const app = document.getElementById('app');
    const items = Object.entries(cart);
    let total = 0;

    if (items.length === 0) {
        app.innerHTML = `<div class="py-20 text-center text-gray-400">購物車是空的</div>`;
        return;
    }

    let itemsHtml = items.map(([id, item]) => {
        const sub = item.price * item.qty;
        total += sub;
        return `
            <div class="flex items-center gap-4 p-4 border-b">
                <img src="${item.img}" class="w-16 h-16 object-cover rounded-lg">
                <div class="flex-1 text-left"><h4 class="font-bold">${item.name}</h4><p class="text-xs text-gray-400">HK$${item.price} x ${item.qty}</p></div>
                <div class="font-bold text-orange-600">HK$${sub}</div>
            </div>`;
    }).join('');

    app.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h1 class="text-2xl font-black mb-6 text-left">購物清單</h1>
            <div class="bg-white rounded-2xl border mb-6">${itemsHtml}
                <div class="p-4 bg-orange-50 text-right font-black text-xl text-orange-600">總計：HK$${total}</div>
            </div>
            <form onsubmit="submitOrder(event)" class="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-left">
                <input name="name" placeholder="收件人姓名" required class="w-full p-3 border rounded-xl">
                <input name="phone" placeholder="聯絡電話" required class="w-full p-3 border rounded-xl">
                <input name="address" placeholder="地址 / 順豐站碼" required class="w-full p-3 border rounded-xl">
                <button type="submit" id="subBtn" class="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg">確認提交</button>
            </form>
        </div>`;
}

// --- 購物車與資料抓取 ---
function changeQuantity(id, delta, productData = null) {
    let currentQty = cart[id] ? cart[id].qty : 0;
    let newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) delete cart[id];
    else if (!cart[id] && productData) cart[id] = { ...productData, qty: newQty };
    else if (cart[id]) cart[id].qty = newQty;
    
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
    const d = document.getElementById(`qty-${id}`);
    if (d) d.innerText = newQty;
}

function updateCartUI() {
    const totalCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = totalCount;
}

async function fetchSheetData(sheetName) {
    if (rawDataCache[sheetName]) return rawDataCache[sheetName];
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const data = json.table.rows.map(row => row.c.map(cell => (cell ? (cell.v || "").toString() : "")));
        rawDataCache[sheetName] = data;
        return data;
    } catch (e) { return []; }
}

async function fetchGASProducts() {
    if (allProductsCache) return allProductsCache;
    try {
        const res = await fetch(GAS_PRODUCT_URL);
        allProductsCache = await res.json();
        return allProductsCache;
    } catch (e) { return []; }
}

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('subBtn');
    btn.disabled = true; btn.innerText = "提交中...";
    const formData = new FormData(e.target);
    const summary = Object.entries(cart).map(([id, item]) => `${item.name} x${item.qty}`).join(", ");
    formData.append("summary", summary);
    try {
        await axios.post(SUBMIT_URL, formData);
        alert("訂單已提交！我們會儘快聯絡您。");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    } catch (err) { alert("提交失敗"); btn.disabled = false; btn.innerText = "確認提交"; }
}

// 渲染 UI 組件 (Logo, Nav...)
function renderLogoAndStores() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');
    const data = rawDataCache['Content'] || [];
    data.forEach(row => {
        const aCol = (row[0] || "").toLowerCase().trim();
        if (aCol === 'logo' && row[3]) logoContainer.innerHTML = `<img src="${row[3]}" class="h-10 cursor-pointer" onclick="switchPage('Content')">`;
        if (aCol.includes('store') && row[3]) {
            storeContainer.innerHTML += `<a href="${row[4] || '#'}" target="_blank"><img src="${row[3]}" class="h-8 hover:opacity-75 transition"></a>`;
        }
    });
}

async function renderNav() {
    const nav = document.getElementById('main-nav');
    const langIdx = (currentLang === 'zh') ? 1 : 2;
    let navHtml = '';
    for (const tab of tabs) {
        const data = await fetchSheetData(tab);
        const titleRow = data.find(r => r[0] && r[0].toLowerCase().trim() === 'title');
        const displayName = (titleRow && titleRow[langIdx]) ? titleRow[langIdx] : tab;
        const isActive = (currentPage === tab || (tab === 'Product Catalog' && (currentPage === 'category' || currentPage === 'product'))) ? 'active' : '';
        navHtml += `<li class="nav-item ${isActive} px-6 py-3 cursor-pointer" onclick="switchPage('${tab}')">${displayName}</li>`;
    }
    nav.innerHTML = navHtml;
}

function updateLangButton() { document.getElementById('lang-toggle-btn').innerText = (currentLang === 'zh') ? 'EN' : '中'; }
function toggleLang() { currentLang = (currentLang === 'zh') ? 'en' : 'zh'; initWebsite(); }

// 初始化其他頁面渲染函數 (renderProductCatalog, renderAboutOrContent, etc. 保持與先前版本一致)
// ... [其餘渲染函數省略，邏輯不變] ...

initWebsite();
