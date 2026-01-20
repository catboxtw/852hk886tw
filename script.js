const SPREADSHEET_ID = '1Z3xaacD4N1Piagjg7mWAH2bzGadCUX8zS24RbInF4QM';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let currentPage = 'Content';
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {}; 
let allData = { "Content": [], "產品資料": [] };

// 使用萬無一失的索引讀取法
async function fetchSheet(sheetName) {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        // rows 代表每一行，c 代表每一列
        return json.table.rows.map(row => row.c.map(cell => cell ? (cell.v || "") : ""));
    } catch (e) {
        console.error(`${sheetName} 加載失敗:`, e);
        return [];
    }
}

async function initWebsite() {
    allData["Content"] = await fetchSheet("Content");
    allData["產品資料"] = await fetchSheet("產品資料");
    
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    
    renderLogoAndSocial();
    updateCartUI();
    loadPage(currentPage);
}

function renderLogoAndSocial() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');

    // 根據 Content 分頁的順序：Index 0=Type, Index 1=Image, Index 2=URLLink
    const contentRows = allData["Content"];
    
    // 渲染 Logo
    const logoRow = contentRows.find(r => r[0] === 'Logo');
    if (logoRow) {
        logoContainer.innerHTML = `<img src="${logoRow[1]}" class="h-10 cursor-pointer" onclick="switchPage('Content')">`;
    }

    // 渲染 Social 圖標
    const socials = contentRows.filter(r => r[0] === 'Social');
    if (socials.length > 0) {
        storeContainer.innerHTML = socials.map(s => 
            `<a href="${s[2]}" target="_blank" class="hover:scale-110 transition-transform">
                <img src="${s[1]}" class="h-6 w-6 object-contain opacity-80 hover:opacity-100">
            </a>`
        ).join('');
    }
}

// 路由跳轉邏輯
window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    loadPage(currentPage);
};

function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) u.searchParams.set(key, params[key]);
    window.history.pushState({}, '', u);
    currentPage = page;
    loadPage(page);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// 頁面渲染邏輯
function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);

    if (pageName === 'category') return renderCategoryList(params.get('cat'));
    if (pageName === 'product') return renderProductDetail(params.get('id'));
    if (pageName === 'checkout') return renderCheckoutPage();

    if (pageName === 'Content') {
        app.innerHTML = `
            <div class="py-20 text-center animate-fade-in">
                <h1 class="text-4xl font-bold mb-4 text-[#5D4037]">Catbox 台灣代購</h1>
                <p class="text-lg text-[#8D6E63] mb-8 font-medium">佛系台灣代購．台灣直送</p>
                <button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-10 py-4 rounded-full hover:bg-[#4E342E] shadow-lg transition font-bold">查看所有商品</button>
            </div>`;
    } else if (pageName === 'Product Catalog') {
        renderCatalogMenu();
    } else if (pageName === 'Contact Us') {
        app.innerHTML = `<div class="max-w-md mx-auto py-10 text-center bg-white border border-[#D7CCC8] rounded-3xl p-10"><h2 class="text-2xl font-bold mb-6">聯絡我們</h2><p class="text-[#8D6E63]">如有查詢請透過上方社群圖標聯繫</p></div>`;
    }
}

function renderCatalogMenu() {
    // 產品資料分頁順序假設：Category 在 Index 3 (D欄)
    // 注意：這裡如果 Category 不在 D 欄，請修改索引值
    const categories = [...new Set(allData["產品資料"].slice(1).map(p => p[3]).filter(Boolean))];
    let html = `<h2 class="text-2xl font-bold mb-8 text-left border-l-4 border-[#8D6E63] pl-4">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:shadow-xl hover:border-[#8D6E63] transition-all text-xl font-bold">${cat}</div>`;
    });
    app.innerHTML = html + `</div>`;
}

// 更多渲染函數與先前邏輯一致，唯資料存取改為索引值
// 範例：p[0] 是 Item Code, p[1] 是名稱, p[2] 是價格, p[3] 是分類, p[4] 是圖片, p[5] 是描述
function renderCategoryList(catName) {
    const filtered = allData["產品資料"].slice(1).filter(p => p[3] === catName);
    let html = `<div class="flex items-center gap-2 mb-8"><button onclick="switchPage('Product Catalog')" class="text-[#8D6E63] hover:underline">商品分類</button> <span>/</span> <span class="font-bold">${catName}</span></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">`;
    filtered.forEach(p => {
        const id = p[0];
        const img = p[4] ? p[4].split(',')[0] : '';
        html += `<div class="bg-white border border-[#D7CCC8] rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <img src="${img}" class="w-full aspect-square object-cover rounded-xl cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                    <h4 class="mt-4 font-bold truncate text-[#5D4037] text-sm">${p[1]}</h4>
                    <p class="text-[#8D6E63] font-bold mt-1">HK$ ${p[2]}</p>
                    <button onclick="changeQuantity('${id}', 1, {name:'${p[1]}', price:${p[2]}, img:'${img}'})" class="w-full mt-4 bg-[#5D4037] text-white py-2 rounded-lg text-xs">+ 加入購物車</button>
                </div>`;
    });
    app.innerHTML = html + `</div>`;
}

function renderProductDetail(id) {
    const p = allData["產品資料"].find(item => String(item[0]) === String(id));
    if (!p) return;
    app.innerHTML = `
        <button onclick="window.history.back()" class="mb-8 text-[#8D6E63] flex items-center gap-2">← 返回</button>
        <div class="flex flex-col md:flex-row gap-12 bg-white p-6 md:p-10 rounded-3xl border border-[#D7CCC8]">
            <div class="md:w-1/2"><img src="${p[4].split(',')[0]}" class="w-full rounded-2xl"></div>
            <div class="md:w-1/2 text-left">
                <h1 class="text-2xl md:text-3xl font-bold mt-2 mb-4">${p[1]}</h1>
                <p class="text-3xl text-[#8D6E63] font-bold mb-8">HK$ ${p[2]}</p>
                <div class="text-gray-600 text-sm leading-relaxed mb-10 border-t pt-6">${(p[5] || "商品詳情準備中...").replace(/\n/g, '<br>')}</div>
                <button onclick="changeQuantity('${id}', 1, {name:'${p[1]}', price:${p[2]}, img:'${p[4].split(',')[0]}'})" class="w-full md:w-auto bg-[#5D4037] text-white px-12 py-4 rounded-xl font-bold">加入購物車</button>
            </div>
        </div>`;
}

function renderCheckoutPage() {
    const items = Object.entries(cart);
    let total = 0;
    if (items.length === 0) {
        app.innerHTML = `<div class="py-20 text-center"><p class="text-gray-400 mb-6 font-bold">您的購物車目前是空的</p></div>`;
        return;
    }
    let itemsHtml = items.map(([id, item]) => {
        total += item.price * item.qty;
        return `<div class="flex justify-between py-4 border-b text-sm"><span>${item.name} x ${item.qty}</span><span class="font-bold">HK$${item.price * item.qty}</span></div>`;
    }).join('');

    app.innerHTML = `<div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8]">
            <h2 class="text-xl font-bold mb-6">訂單內容</h2>${itemsHtml}
            <div class="text-right font-bold text-2xl text-[#5D4037] pt-4">總計: HK$${total}</div>
        </div>
        <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8]">
            <h2 class="text-xl font-bold mb-6">收件資料</h2>
            <form onsubmit="submitOrder(event, ${total})" class="space-y-4 text-left">
                <input name="name" placeholder="姓名" required class="w-full p-4 border rounded-xl bg-[#FAFAFA]">
                <input name="phone" placeholder="電話" required class="w-full p-4 border rounded-xl bg-[#FAFAFA]">
                <textarea name="address" placeholder="地址" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] h-28"></textarea>
                <button type="submit" id="subBtn" class="w-full bg-[#5D4037] text-white py-4 mt-6 rounded-xl font-bold">提交訂單</button>
            </form>
        </div>
    </div>`;
}

async function submitOrder(e, total) {
    e.preventDefault();
    const btn = document.getElementById('subBtn');
    btn.disabled = true;
    const fd = new FormData(e.target);
    const summary = Object.values(cart).map(i => `${i.name}x${i.qty}`).join(', ');
    const params = new URLSearchParams({
        date: new Date().toLocaleString(),
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        items: summary,
        total: total
    });
    try {
        await fetch(`${ORDER_SUBMIT_URL}?${params.toString()}`, { method: 'POST', mode: 'no-cors' });
        alert("提交完成！");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    } catch (err) { alert("提交完成！"); cart = {}; localStorage.removeItem('catbox_cart'); switchPage('Content'); }
}

function changeQuantity(id, delta, productData = null) {
    let currentQty = cart[id] ? cart[id].qty : 0;
    let newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) delete cart[id];
    else if (!cart[id] && productData) cart[id] = { ...productData, qty: newQty };
    else if (cart[id]) cart[id].qty = newQty;
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = totalCount;
}

initWebsite();
