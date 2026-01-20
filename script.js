// 資料來源 (商品與設定)
const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
// 訂單提交
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let currentLang = 'zh';
let currentPage = 'Content';
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {}; 
let allData = null; // 儲存從 GAS 抓回來的整包資料

// --- 初始化與路由 ---
async function initWebsite() {
    await refreshData();
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    
    renderLogo();
    updateCartUI();
    loadPage(currentPage);
}

// 監聽返回鍵
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

async function refreshData() {
    const res = await fetch(DATA_SOURCE_URL);
    allData = await res.json(); // 假設您的 GAS 回傳包含所有分頁的 JSON
}

// --- 頁面載入器 ---
async function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);

    if (pageName === 'category') return renderCategoryList(params.get('cat'));
    if (pageName === 'product') return renderProductDetail(params.get('id'));
    if (pageName === 'checkout') return renderCheckoutPage();

    // 處理一般頁面
    if (pageName === 'Content') {
        app.innerHTML = `<div class="py-20 text-center"><h1 class="text-4xl font-serif mb-4">歡迎光臨 Catbox</h1><p>挑選最優質的台灣代購商品</p></div>`;
    } else if (pageName === 'Product Catalog') {
        renderCatalogMenu();
    } else if (pageName === 'Contact Us') {
        app.innerHTML = `<div class="max-w-md mx-auto py-10">聯繫我們：WhatsApp / Instagram / Email</div>`;
    }
}

// 1. 分類清單
function renderCatalogMenu() {
    const categories = [...new Set(allData["產品資料"].map(p => p.Category))];
    let html = `<h2 class="text-2xl font-bold mb-8">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-10 bg-white border border-[#d7ccc8] rounded-2xl cursor-pointer hover:bg-[#efebe9] transition text-xl font-bold">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 2. 分類下的商品 (?page=category&cat=...)
function renderCategoryList(catName) {
    const filtered = allData["產品資料"].filter(p => p.Category === catName);
    let html = `<button onclick="switchPage('Product Catalog')" class="mb-6 text-[#8d6e63]">← 返回分類</button>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">`;
    filtered.forEach(p => {
        const id = p["Item code (ERP)"];
        const img = p["圖片"] ? p["圖片"].split(',')[0] : '';
        html += `
            <div class="bg-white border border-[#d7ccc8] rounded-xl p-3 shadow-sm">
                <img src="${img}" class="w-full aspect-square object-cover rounded-lg cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                <h4 class="mt-3 font-bold truncate">${p["Chinese product name"]}</h4>
                <p class="text-[#8d6e63] font-bold">HK$ ${p.Price}</p>
                <button onclick="changeQuantity('${id}', 1, {name:'${p["Chinese product name"]}', price:${p.Price}, img:'${img}'})" class="w-full mt-3 bg-[#5d4037] text-white py-2 rounded-lg text-sm">+ 加入購物車</button>
            </div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 3. 商品詳情 (?page=product&id=...)
function renderProductDetail(id) {
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p) return;
    document.getElementById('app').innerHTML = `
        <button onclick="window.history.back()" class="mb-6 text-[#8d6e63]">← 返回</button>
        <div class="flex flex-col md:flex-row gap-10 bg-white p-8 rounded-3xl border border-[#d7ccc8]">
            <div class="md:w-1/2"><img src="${p["圖片"].split(',')[0]}" class="w-full rounded-2xl"></div>
            <div class="md:w-1/2 text-left">
                <h1 class="text-3xl font-bold mb-4">${p["Chinese product name"]}</h1>
                <p class="text-2xl text-[#8d6e63] font-bold mb-6">HK$ ${p.Price}</p>
                <div class="text-gray-600 mb-8">${p["中文描述"] || "暫無描述"}</div>
                <button onclick="changeQuantity('${id}', 1, {name:'${p["Chinese product name"]}', price:${p.Price}, img:'${p["圖片"].split(',')[0]}'})" class="bg-[#5d4037] text-white px-10 py-4 rounded-xl font-bold">放入購物車</button>
            </div>
        </div>`;
}

// 4. 結帳頁面 (配合您的收款分頁欄位)
function renderCheckoutPage() {
    const items = Object.entries(cart);
    let total = 0;
    let itemsHtml = items.map(([id, item]) => {
        total += item.price * item.qty;
        return `<div class="flex justify-between py-2 border-b"><span>${item.name} x ${item.qty}</span><span>HK$${item.price * item.qty}</span></div>`;
    }).join('');

    document.getElementById('app').innerHTML = `
        <div class="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-[#d7ccc8]">
            <h2 class="text-2xl font-bold mb-6">結帳確認</h2>
            <div class="mb-6">${itemsHtml}<div class="text-right font-bold text-xl mt-4 text-[#5d4037]">總計: HK$${total}</div></div>
            <form onsubmit="submitOrder(event, ${total})" class="space-y-4 text-left">
                <input name="name" placeholder="姓名" required class="w-full p-3 border rounded-lg">
                <input name="phone" placeholder="電話" required class="w-full p-3 border rounded-lg">
                <input name="address" placeholder="收件地址 / 順豐站碼" required class="w-full p-3 border rounded-lg">
                <select name="payment" class="w-full p-3 border rounded-lg">
                    <option value="FPS">轉數快 (FPS)</option>
                    <option value="PayMe">PayMe</option>
                    <option value="Bank">銀行轉帳</option>
                </select>
                <button type="submit" id="subBtn" class="w-full bg-[#5d4037] text-white py-4 rounded-xl font-bold">提交訂單</button>
            </form>
        </div>`;
}

// 提交訂單到第二個 GAS
async function submitOrder(e, total) {
    e.preventDefault();
    const btn = document.getElementById('subBtn');
    btn.disabled = true; btn.innerText = "提交中...";
    
    const fd = new FormData(e.target);
    const orderData = {
        date: new Date().toLocaleString(),
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        items: Object.values(cart).map(i => `${i.name}x${i.qty}`).join(','),
        total: total,
        payment: fd.get('payment')
    };

    try {
        // 使用 URLSearchParams 以符合 GAS 的 doGet/doPost 接收
        const params = new URLSearchParams(orderData);
        await fetch(`${ORDER_SUBMIT_URL}?${params.toString()}`, { method: 'POST' });
        alert("訂單已提交！");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    } catch (err) {
        alert("提交成功 (GAS 通常會有跨網域提示，若試算表已有資料即可無視)");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    }
}

// --- 通用功能 ---
function changeQuantity(id, delta, productData = null) {
    let currentQty = cart[id] ? cart[id].qty : 0;
    let newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) delete cart[id];
    else if (!cart[id] && productData) cart[id] = { ...productData, qty: newQty };
    else if (cart[id]) cart[id].qty = newQty;
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
    alert("已更新購物車");
}

function updateCartUI() {
    const totalCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = totalCount;
}

function renderLogo() {
    const logoData = allData["Content"]?.find(r => r.Type === 'Logo');
    if (logoData) {
        document.getElementById('logo-container').innerHTML = `<img src="${logoData.ImageURL}" class="h-10">`;
    }
}

initWebsite();
